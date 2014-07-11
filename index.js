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
        var slug = getSlug( pkg.url );
        var url = getGithubUrl( slug );
        url += req.params.version + "/";
        url += req.params[ 0 ];

        https.get( url, function( ghResp ) {
            res.set( "X-Expanded-Url", url );
            ghResp.pipe( res );
        });
    });
});

app.listen( 3000 );

// -------------------------------------------------------------------------------------------------

function getSlug( url ) {
    url = url.replace( "git://github.com/", "" );
    url = url.replace( /\.git$/, "" );

    return url;
}

function getGithubUrl( slug ) {
    return "https://raw.githubusercontent.com/" + slug + "/";
}