"use strict";

var https = require( "https" );
var bower = require( "bower" );

// Express and middlewares
var express = require( "express" );
var compression = require( "compression" );

// -------------------------------------------------------------------------------------------------

var app = express();

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
            res.statusCode = ghResp.statusCode;
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
