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

    // ---------------------------------------------------------------------------------------------

    describe( ".extend()", function() {
        it( "should return the input if not object", function() {
            expect( utils.extend() ).to.be.undefined;
            expect( utils.extend( 1 ) ).to.equal( 1 );
            expect( utils.extend( "foo" ) ).to.equal( "foo" );
        });

        it( "should mix all source objects into destiny object", function() {
            expect( utils.extend( { a: 1 }, { b: 2 }, { c: 3 } ) ).to.deep.equal({
                a: 1,
                b: 2,
                c: 3
            });
        });

        it( "should return destiny object", function() {
            var dest = { a: 1 };
            var actual = utils.extend( dest, {
                b: 2
            });

            expect( actual ).to.equal( dest );
        });
    });
});