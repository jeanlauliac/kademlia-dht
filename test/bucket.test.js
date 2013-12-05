'use strict';

require('chai').should();
var Id      = require('../lib/id.js'),
    Bucket  = require('../lib/bucket.js');

var CONTACT1 = {id: Id.fromKey('foo')},
    CONTACT2 = {id: Id.fromKey('bar')},
    CONTACT3 = {id: Id.fromKey('glo')},
    CONTACT4 = {id: Id.fromKey('arf')};

describe('Bucket', function() {
    var bt;

    before(function() {
        bt = new Bucket(3);
    });

    describe('#store()', function() {
        it('should store an item', function() {
            bt.store(CONTACT1);
            bt.obtain(1)[0].should.equal(CONTACT1);
            bt.size.should.equal(1);
        });

        it('should store other items', function() {
            bt.store(CONTACT2);
            bt.store(CONTACT3);
            var contacts = bt.obtain(3);
            contacts[1].should.equal(CONTACT2);
            contacts[2].should.equal(CONTACT3);
            bt.size.should.equal(3);
        });

        it('should refresh items', function() {
            bt.store(CONTACT2);
            var contacts = bt.obtain(3);
            contacts[0].should.equal(CONTACT1);
            contacts[1].should.equal(CONTACT3);
            contacts[2].should.equal(CONTACT2);
            bt.size.should.equal(3);
        });

        it('shouldn\'t accept more items', function() {
            bt.store(CONTACT4);
            var contacts = bt.obtain(3);
            contacts[0].should.equal(CONTACT1);
            contacts[1].should.equal(CONTACT3);
            contacts[2].should.equal(CONTACT2);
            bt.size.should.equal(3);
        });
    });

    describe('#obtain()', function() {
        it('should return a sublist', function() {
            var contacts = bt.obtain(2);
            contacts.length.should.equal(2);
        });
    });
});
