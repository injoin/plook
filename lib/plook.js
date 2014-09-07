"use strict";

// Core modules
var https = require( "https" );
var url = require( "url" );

// Dependencies
var bower = require( "bower" );
var Promise = require( "bluebird" );
var LRU = require( "lru-cache" );
var winston = require( "winston" );

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

    Object.defineProperty( this, "_cache", {
        value: LRU({
            max: 500
        }),
        enumerable: false,
        writable: false
    });

    this.logger = new winston.Logger({
        levels: {
            debug:  0,
            server: 5,
            info:  10,
            warn:  40,
            error: 50
        },
        colors: {
            debug:  "white",
            server: "blue",
            info:   "cyan",
            warn:   "yellow",
            error:  "red"
        }
    });

    // Configure Console transport
    this.logger.add( winston.transports.Console, {
        level: "debug",
        timestamp: true,
        colorize: true
    });
}

/**
 * Lookup a package slug by its name
 *
 * @param   {String} name   The name of the package
 * @returns {Promise}
 */
Plook.prototype.lookup = function( name ) {
    var plook = this;

    return new Promise(function( resolve, reject ) {
        var cmd;

        if ( !name ) {
            plook.logger.error( "package name not provided" );
            return reject( utils.createHttpError( 400, "Package name not provided" ) );
        }

        // If this package is already cached, let's use that cached value
        if ( plook._cache.has( name ) ) {
            return resolve( plook._cache.get( name ).slug );
        }

        cmd = bower.commands.lookup( name );
        cmd.on( "end", function( pkg ) {
            var err;
            var slug = pkg ? utils.slug( pkg.url ) : null;

            if ( slug ) {
                // Put this slug in the cache object
                plook._cache[ name ] = {
                    slug: slug
                };

                return resolve( slug );
            } else if ( pkg ) {
                plook.logger.error( "not a github repository: %s", name );
                err = utils.createHttpError( 412, "Not a GitHub repository" );
            } else {
                plook.logger.error( "package not found: %s", name );
                err = utils.createHttpError( 404, "Package not found" );
            }

            reject( err );
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
    var plook = this;

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
                    plook.logger.error( "version not found: %s#%s", name, version );
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
    var plook = this;

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
                    plook.logger.debug( "getting: %s#%s - %s", name, version, file );

                    resolve({
                        url: reqUrl,
                        response: response
                    });
                }
            });
        });
    });

    return Promise.any( promise ).catch( Promise.AggregateError, function( err ) {
        plook.logger.error( "file not found: %s#%s - %s", name, version, file );
        throw err[ 0 ];
    });
};

/**
 * Branch the current plook instance to allow for logging an object with every log message.
 *
 * @param   {Object} [custom]   The custom meta object to use in the logs
 * @returns {Plook}             The new Plook instance
 */
Plook.prototype.branch = function( custom ) {
    var logger = this.logger;
    var branch = new Plook( this );

    branch.logger.log = function() {
        var meta, callback;
        var args = [].slice.call( arguments );

        // Handle log callback
        callback = typeof args[ args.length - 1 ] === "function" ? args.pop() : null;

        // Handle message meta
        meta = typeof args[ args.length - 1 ] === "object" ? args.pop() : {};
        utils.extend( meta, custom );

        // Readd meta object and callback as necessary
        args.push( meta );
        callback ? args.push( callback ) : null;

        return logger.log.apply( logger, args );
    };

    return branch;
};