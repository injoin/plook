"use strict";

// Constants
var STATUS_CODES = require( "http" ).STATUS_CODES;
var EXPANDED_URL_HEADER = "X-Expanded-Url";

// Modules
var https = require( "https" );
var bower = require( "bower" );
var mime = require( "mime" );

// Express and middlewares
var express = require( "express" );
var compression = require( "compression" );
var Promise = require( "bluebird" );

// -------------------------------------------------------------------------------------------------

var app = express();

// Set the default mime type to an object, so we know that it didn't found anything that could
// conflict with a valid mimetype.
mime.default_type = {};

app.use( compression({
    threshold: 1024
}));

app.route( "/:package/:version/*" ).get(function( req, res ) {
    var pkgname = req.params.package;
    var ver = req.params.version.trim().replace( /^v/, "" );

    var cmd = bower.commands.lookup( pkgname );
    cmd.on( "end", function( pkg ) {
        var slug = pkg ? getSlug( pkg.url ) : null;

        if ( !pkg || !slug ) {
            return send( res, 404 );
        }

        cmd = bower.commands.info( pkgname );
        cmd.on( "end", function( pkg ) {
            var promises;

            if ( !~pkg.versions.indexOf( ver ) ) {
                return send( res, 404 );
            }

            promises = [ "v", "" ].map(function( prefix ) {
                return new Promise(function( resolve, reject ) {
                    var url = getGithubUrl(slug);
                    url += prefix + ver + "/";
                    url += req.params[ 0 ];

                    https.get( url, function( ghResp ) {
                        var method = ghResp.statusCode >= 400 ? reject : resolve;
                        method({
                            gh: ghResp,
                            url: url
                        });
                    });
                });
            });

            Promise.any( promises ).then(function( resp ) {
                var type = findMimetype( resp.url, resp.gh );

                res.statusCode = resp.gh.statusCode;
                res.set( "Content-Type", type );
                res.set( EXPANDED_URL_HEADER, resp.url );

                resp.gh.pipe( res );
            }, function( err ) {
                var resp = err[ 0 ];
                send( res, resp.gh.status, resp.url );
            });
        });
    });
});

app.route( "/*" ).all(function( req, res ) {
    send( res, 404 );
});

app.listen( process.env.PORT || 3000, function() {
    console.log( "Listening on port " + this.address().port );
});

// -------------------------------------------------------------------------------------------------

function getSlug( url ) {
    // Regexp taken from
    // https://github.com/bower/bower/blob/337c0f2d0adc4a04a8c282f8fa2eef85b48616a4/lib/core/resolvers/GitHubResolver.js#L114
    var match = url.match( /(?:@|:\/\/)github.com[:\/]([^\/\s]+?)\/([^\/\s]+?)(?:\.git)?\/?$/i );
    if ( !match ) {
        return;
    }

    return match[ 1 ] + "/" + match[ 2 ];
}

function getGithubUrl( slug ) {
    return "https://raw.githubusercontent.com/" + slug + "/";
}

function findMimetype( url, ghResp ) {
    var type = mime.lookup( url );

    // If the defaule mime type was used, this means we should rely on GitHub and return their
    // content-type (which is usually plain text or octet-stream).
    // Otherwise, we simply use the mime module returned value.
    return type === mime.default_type ? ghResp.headers[ "content-type" ] : type;
}

function send( res, status, url ) {
    res.set( "Content-Type", "text/plain" );
    if ( url ) {
        res.set( EXPANDED_URL_HEADER, url );
    }

    return res.send( status, STATUS_CODES[ status ] );
}