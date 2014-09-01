"use strict";

var chai = require( "chai" );
var chaiAsPromised = require( "chai-as-promised" );

chai.use( chaiAsPromised );
global.expect = chai.expect;
global.bower = require( "bower" );
global.sinon = require( "sinon" );