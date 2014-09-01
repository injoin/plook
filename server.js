"use strict";

// Constants
var EXPANDED_URL_HEADER = "X-Expanded-Url";

// Modules
var mime = require( "mime" );
var express = require( "express" );
var compression = require( "compression" );

// Package modules
var plook = require( "./lib/plook" );
var utils = require( "./lib/utils" );

// -------------------------------------------------------------------------------------------------

var app = express();

// Set the default mime type to an object, so we know that it didn't found anything that could
// conflict with a valid mimetype.
mime.default_type = {};

app.use( compression({
    threshold: 1024
}));

app.route( "/:package/:version/*" ).get(function( req, res ) {
    plook.get(
        req.params.package,
        req.params.version,
        req.params[ 0 ],
        req.get( "if-none-match" )
    ).then(function( result ) {
        var etag = result.response.headers.etag;
        var type = findMimetype( result.url, result.response );

        res.statusCode = result.response.statusCode;
        res.set( "Content-Type", type );
        res.set( "ETag", etag );
        res.set( EXPANDED_URL_HEADER, result.url );

        result.response.pipe( res );
    }, function( err ) {
        send( res, err );
    });
});

app.route( "/*" ).all(function( req, res ) {
    send( res, utils.createHttpError( 404, "Not found" ) );
});

app.listen( process.env.PORT || 3000, function() {
    console.log( "Listening on port " + this.address().port );
});

// -------------------------------------------------------------------------------------------------

function findMimetype( url, ghResp ) {
    var ghContentType = ghResp.headers[ "content-type" ] || "";
    var type = mime.lookup( url );

    // If the defaule mime type was used, this means we should rely on GitHub and return their
    // content-type (which is usually plain text or octet-stream).
    // Otherwise, we simply use the mime module returned value.
    if ( type === mime.default_type ) {
        type = ghContentType;
    } else {
        // If a charset is available from the GitHub response,
        // we'll use UTF-8 to the returned string as well. GitHub only sends UTF-8 responses.
        type += ~ghContentType.indexOf( "charset" ) ? "; charset=UTF-8" : "";
    }

    return type;
}

function send( res, err ) {
    res.set( "Content-Type", "text/plain" );
    if ( err.url ) {
        res.set( EXPANDED_URL_HEADER, err.url );
    }

    return res.send( err.status, err.message );
}