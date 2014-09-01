describe( "Plook", function() {
    "use strict";

    var Plook = require( "../../lib/plook" ).Plook;
    var utils = require( "../../lib/utils" );

    beforeEach(function() {
        this.plook = new Plook();

        this.lookupEvt = sinon.stub().yields({
            url: "git://github.com/foo/bar.git"
        });
        this.lookup = sinon.stub( bower.commands, "lookup" ).returns({
            on: this.lookupEvt
        });

        this.infoEvt = sinon.stub().yields({
            versions: [ "1.0.0" ]
        });
        this.info = sinon.stub( bower.commands, "info" ).returns({
            on: this.infoEvt
        });
    });

    afterEach(function() {
        this.lookup.restore();
        this.info.restore();
    });

    // ---------------------------------------------------------------------------------------------

    describe( ".lookup()", function() {
        it( "should reject when name not provided", function() {
            return expect( this.plook.lookup() ).to.be.rejectedWith( "Package name not provided" );
        });

        it( "should reject when package not found", function() {
            this.lookupEvt.yields( null );
            return expect( this.plook.lookup( "foo" ) ).to.be.rejectedWith( "Package not found" );
        });

        it( "should reject when package not in GitHub", function() {
            this.lookupEvt.yields({
                url: "foo.com/bar/baz.git"
            });

            return expect( this.plook.lookup( "foo" ) ).to.be.rejectedWith(
                "Not a GitHub repository"
            );
        });

        it( "should resolve with repository slug when package in GitHub", function() {
            return expect( this.plook.lookup( "foo" ) ).to.eventually.equal( "foo/bar" );
        });
    });

    // ---------------------------------------------------------------------------------------------

    describe( ".findURLs()", function() {
        var expected = [
            utils.githubUrl( "foo/bar", "v1.0.0", "bar.js" ),
            utils.githubUrl( "foo/bar", "1.0.0", "bar.js" )
        ];

        it( "should reject when specied version is not found", function() {
            var promise = this.plook.findURLs( "foo", "2.0.0", "bar.js" );
            return expect( promise ).to.be.rejectedWith( "Version not found" );
        });

        it( "should create array of URLs", function() {
            var promise = this.plook.findURLs( "foo", "1.0.0", "bar.js" );
            return expect( promise ).to.eventually.deep.equal( expected );
        });

        it( "should ignore 'v' prefix in version string when used", function() {
            var promise = this.plook.findURLs( "foo", "v1.0.0", "bar.js" );
            return expect( promise ).to.eventually.deep.equal( expected );
        });

        it( "should use latest version", function() {
            var promise;
            this.infoEvt.yields({
                versions: [ "1.0.0", "0.9.1", "0.9.0" ]
            });

            promise = this.plook.findURLs( "foo", "bar.js" );
            return expect( promise ).to.eventually.deep.equal( expected );
        });
    });

    // ---------------------------------------------------------------------------------------------

    describe( ".get()", function() {
        beforeEach(function() {
            this.request = sinon.stub( require( "https" ), "get" );
        });

        afterEach(function() {
            this.request.restore();
        });

        it( "should trigger requests for every found URL", function() {
            var req = this.request.yields({
                statusCode: 200
            });

            return this.plook.get( "foo", "1.0.0", "bar.js" ).finally(function() {
                return expect( req.callCount ).to.equal( 2 );
            });
        });

        it( "should reject when all requests fail", function() {
            var actual;
            this.request.yields({
                statusCode: 400
            });

            actual = this.plook.get( "foo", "1.0.0", "bar.js" );
            return expect( actual ).to.be.rejectedWith( "File not found" );
        });

        it( "should fulfill with the only successful request", function() {
            this.request.onCall( 0 ).yields({
                statusCode: 200
            });
            this.request.onCall( 1 ).yields({
                statusCode: 404
            });

            return expect( this.plook.get( "foo", "1.0.0", "bar.js" ) ).to.be.fulfilled;
        });
    });
});