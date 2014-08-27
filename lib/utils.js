"use strict";

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