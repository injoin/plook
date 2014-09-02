"use strict";

/**
 * Extend a
 * @param   {Object} dest
 * @param   {Object} src...
 * @returns {*}
 */
exports.extend = function( dest, src ) {
    src = [].slice.call( arguments, 1 );

    if ( typeof dest !== "object" ) {
        return dest;
    }

    src.forEach(function( src ) {
        var prop;

        for ( prop in src ) {
            if ( src.hasOwnProperty( prop ) ) {
                dest[ prop ] = src[ prop ];
            }
        }
    });

    return dest;
};

/**
 * Extract a GitHub slug from a URL
 *
 * @param   {String} url
 * @returns {String}
 */
exports.slug = function( url ) {
    // Regexp taken from
    // https://github.com/bower/bower/blob/337c0f2d0adc4a04a8c282f8fa2eef85b48616a4/lib/core/resolvers/GitHubResolver.js#L114
    var match = url.match( /(?:@|:\/\/)github.com[:\/]([^\/\s]+?)\/([^\/\s]+?)(?:\.git)?\/?$/i );
    if ( !match ) {
        return;
    }

    return match[ 1 ] + "/" + match[ 2 ];
};

/**
 * Join a series of path segments creating a raw GitHub URL
 *
 * @param   {String...} path    A series of path segments to join
 * @returns {string}
 */
exports.githubUrl = function( path ) {
    path = [].slice.call( arguments );
    return "https://raw.githubusercontent.com/" + path.join( "/" );
};

/**
 * Create a standard error suitable for sending to our HTTP server
 *
 * @param   {Number} status The desired HTTP status code
 * @param   {String} msg    The error message
 * @returns {Error}
 */
exports.createHttpError = function( status, msg ) {
    var err = new Error( msg );
    err.status = status;

    return err;
};