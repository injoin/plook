"use strict";

var bower = require( "bower" );
var chai = require( "chai" );
var chaiAsPromised = require( "chai-as-promised" );
var sinon = require( "sinon" );

chai.use( chaiAsPromised );
global.bower = bower;
global.expect = chai.expect;
global.sinon = sinon;