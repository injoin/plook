"use strict";

var https = require( "https" );
var bower = require( "bower" );
var mime = require( "mime" );

// Express and middlewares
var express = require( "express" );
var compression = require( "compression" );

// -------------------------------------------------------------------------------------------------

var app = express();

// Set the default mime type to an object, so we know that it didn't found anything that could
// conflict with a valid mimetype.
mime.default_type = {};

app.use( compression({
    threshold: 1024
}));

app.route( "/:package/:version/*" ).get(function( req, res ) {
    var command = bower.commands.lookup( req.params.package );

    command.on( "end", function( pkg ) {
        var slug, url;

        if ( !pkg ) {
            return res.send( 404, "Not Found" );
        }

        slug = getSlug( pkg.url );
        url = getGithubUrl( slug );
        url += req.params.version + "/";
        url += req.params[ 0 ];

        https.get( url, function( ghResp ) {
            var type = findMimetype( url, ghResp );

            res.statusCode = ghResp.statusCode;
            res.set( "Content-Type", type );
            res.set( "X-Expanded-Url", url );

            ghResp.pipe( res );
        });
    });
});

app.listen( process.env.PORT || 3000, function() {
    console.log( "Listening on port " + this.address().port );
});

// -------------------------------------------------------------------------------------------------

function getSlug( url ) {
    url = url.replace( "git://github.com/", "" );
    url = url.replace( /\.git$/, "" );

    return url;
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