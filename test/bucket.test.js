'use strict';

var Id = require('../lib/id.js');
var Bucket = require('../lib/bucket.js');
var Contact = require('../lib/contact.js');

var Contacts = [
    new Contact(Id.fromKey('foo')),
    new Contact(Id.fromKey('bar')),
    new Contact(Id.fromKey('glo')),
    new Contact(Id.fromKey('arf'))
];

describe('Bucket', function () {
    var bt;

    beforeEach(function () {
        bt = new Bucket(3);
    });

    describe('#store()', function () {
        it('should store an item', function () {
            bt.store(Contacts[0]);
            bt.obtain(1)[0].should.equal(Contacts[0]);
            bt.length.should.equal(1);
        });

        it('should store other items', function () {
            bt.store(Contacts[0]);
            bt.store(Contacts[1]);
            bt.store(Contacts[2]);
            bt.length.should.equal(3);
            var contacts = bt.obtain(3);
            contacts[1].should.equal(Contacts[1]);
            contacts[2].should.equal(Contacts[2]);
        });

        it('should refresh items', function () {
            bt.store(Contacts[0]);
            bt.store(Contacts[1]);
            bt.store(Contacts[2]);
            bt.store(Contacts[1]);
            bt.length.should.equal(3);
            var contacts = bt.obtain(3);
            contacts[0].should.equal(Contacts[0]);
            contacts[1].should.equal(Contacts[2]);
            contacts[2].should.equal(Contacts[1]);
        });

        it('shouldn\'t accept more items', function () {
            bt.store(Contacts[0]);
            bt.store(Contacts[1]);
            bt.store(Contacts[2]);
            bt.store(Contacts[3]);
            bt.length.should.equal(3);
            var contacts = bt.obtain(3);
            contacts[0].should.equal(Contacts[0]);
            contacts[1].should.equal(Contacts[1]);
            contacts[2].should.equal(Contacts[2]);
        });
    });

    describe('#obtain()', function () {
        it('should return a sublist', function () {
            bt.store(Contacts[0]);
            bt.store(Contacts[1]);
            bt.store(Contacts[2]);
            var contacts = bt.obtain(2);
            contacts.length.should.equal(2);
        });
    });

    describe('#split()', function () {
        it('should split', function () {
            var bucket = new Bucket(4);
            bucket.store(Contacts[0]);
            bucket.store(Contacts[1]);
            bucket.store(Contacts[2]);
            bucket.store(Contacts[3]);

            var left = new Bucket(4);
            var right = new Bucket(4);
            bucket.split(1, left, right);
            left.length.should.equal(2);
            right.length.should.equal(2);

            left.obtain(2)[0].should.equal(Contacts[0]);
            left.obtain(2)[1].should.equal(Contacts[2]);

            right.obtain(2)[0].should.equal(Contacts[1]);
            right.obtain(2)[1].should.equal(Contacts[3]);
        });
    });

    describe('#toString()', function () {
        it('should work with empty list', function () {
            bt.toString().should.equal('<( :3: )>');
        });

        it('should work with some items', function () {
            bt.store(Contacts[0]);
            bt.store(Contacts[1]);
            bt.toString().should.equal('<( ' + Contacts[0].id.toString(true) +
                                       ' ' + Contacts[1].id.toString(true) +
                                       ' :1: )>');
        });

        it('should work being full', function () {
            bt.store(Contacts[0]);
            bt.store(Contacts[1]);
            bt.store(Contacts[2]);
            bt.toString().should.equal('<( ' + Contacts[0].id.toString(true) +
                                       ' ' + Contacts[1].id.toString(true) +
                                       ' ' + Contacts[2].id.toString(true) +
                                       ' )>');
        });
    });

});
