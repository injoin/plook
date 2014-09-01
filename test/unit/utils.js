describe( "utils", function() {
    "use strict";

    var utils = require( "../../lib/utils" );

    describe( ".slug()", function() {
        it( "should return nothing when arg is not a GitHub repo URL", function() {
            expect( utils.slug( "github.com/" ) ).to.be.undefined;
            expect( utils.slug( "git://github.com" ) ).to.be.undefined;
            expect( utils.slug( "git://github.com" ) ).to.be.undefined;
        });

        it( "should return slug when arg is a GitHub repo URL", function() {
            expect( utils.slug( "git@github.com/foo/bar.git" ) ).to.equal( "foo/bar" );
            expect( utils.slug( "git://github.com:foo/bar.git" ) ).to.equal( "foo/bar" );
        });
    });

    // ---------------------------------------------------------------------------------------------

    describe( ".githubUrl()", function() {
        it( "should return URL with all path segments joined", function() {
            var actual = utils.githubUrl( "foo/bar", "1.0.0", "baz.js" );
            expect( actual ).to.equal( "https://raw.githubusercontent.com/foo/bar/1.0.0/baz.js" );
        });
    });
});