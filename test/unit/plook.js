describe( "Plook", function() {
    "use strict";

    var plook;
    var Plook = require( "../../lib/plook" ).Plook;

    beforeEach(function() {
        plook = new Plook();
    });

    describe( ".lookup()", function() {
        it( "should reject when name not provided", function() {
            return expect( plook.lookup() ).to.be.rejectedWith( "Package name not provided" );
        });
    });
});