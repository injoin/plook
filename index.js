"use strict";

// Export the server if we're the main module
// Export the Plook class otherwise
module.exports = require.main === module ? require( "./server" ) : require( "./lib/plook" );