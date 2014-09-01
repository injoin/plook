"use strict";

// Core modules
var https = require( "https" );
var url = require( "url" );

// Dependencies
var bower = require( "bower" );
var Promise = require( "bluebird" );

// Locals
var utils = require( "./utils" );

// -------------------------------------------------------------------------------------------------

// Instantiate the default Plook instance
module.exports = exports = new Plook();

// Also allow access to the Plook constructor
exports.Plook = Plook;

// -------------------------------------------------------------------------------------------------

/**
 * Plook constructor
 *
 * @constructor
 */
function Plook() {
    if ( !( this instanceof Plook ) ) {
        return new Plook();
    }
}

/**
 * Lookup a package slug by its name
 *
 * @param   {String} name   The name of the package
 * @returns {Promise}
 */
Plook.prototype.lookup = function( name ) {
    return new Promise(function( resolve, reject ) {
        var cmd;

        if ( !name ) {
            return reject( utils.createHttpError( 400, "Package name not provided" ) );
        }

        cmd = bower.commands.lookup( name );
        cmd.on( "end", function( pkg ) {
            var err;
            var slug = pkg ? utils.slug( pkg.url ) : null;

            if ( slug ) {
                resolve( slug );
            } else {
                err = utils.createHttpError(
                    pkg ? 412 : 404,
                    pkg ? "Not a GitHub repository" : "Package not found"
                );
                reject( err );
            }
        });
    });
};

/**
 * Find possible resolution URLs for a file and a package version.
 * If version is not passed, will use "latest" as the version.
 *
 * @param   {String} name       The package name
 * @param   {String} [version]  The package version
 * @param   {String} file       The file path
 * @returns {Promise}
 */
Plook.prototype.findURLs = function( name, version, file ) {
    var latest;
    version = version.trim();

    // If a file arg is not available, let's use the version as the file and 'latest' as the version
    if ( !file ) {
        file = version;
        version = "latest";
    }

    latest = version.toLowerCase() === "latest";
    version = latest ? version : version.replace( /^v/, "" );

    return this.lookup( name ).then(function( slug ) {
        return new Promise(function( resolve, reject ) {
            var cmd = bower.commands.info( name );
            cmd.on( "end", function( pkg ) {
                var urls;
                version = latest ? pkg.versions[ 0 ] : version;

                if ( !~pkg.versions.indexOf( version ) ) {
                    return reject( utils.createHttpError( 404, "Version not found" ) );
                }

                urls = [ "v", "" ].map(function( prefix ) {
                    return utils.githubUrl( slug, prefix + version, file );
                });

                resolve( urls );
            });
        });
    });
};

/**
 * Get the content of a file in a package version.
 * Optionally, an ETag can also be provided.
 *
 * @param   {String} name       The package name
 * @param   {String} [version]  The package version
 * @param   {String} file       The file path
 * @param   {String} [etag]     An optional ETag string to act as a HTTP cache header
 * @returns {Promise}
 */
Plook.prototype.get = function( name, version, file, etag ) {
    var promise;

    if ( !file ) {
        file = version;
        version = null;
    }

    promise = this.findURLs( name, version, file ).call( "map", function( reqUrl ) {
        var options = url.parse( reqUrl );
        options.headers = {
            "if-none-match": etag
        };

        return new Promise(function( resolve, reject ) {
            https.get( options, function( response ) {
                var err;

                if ( response.statusCode >= 400 ) {
                    err = utils.createHttpError( response.statusCode, "File not found" );
                    err.url = reqUrl;

                    reject( err );
                } else {
                    resolve({
                        url: reqUrl,
                        response: response
                    });
                }
            });
        });
    });

    return Promise.any( promise ).catch( Promise.AggregateError, function( err ) {
        throw err[ 0 ];
    });
};