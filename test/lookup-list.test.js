'use strict';

var Id = require('../lib/id.js');
var Contact = require('../lib/contact.js');
var LookupList = require('../lib/lookup-list.js');

function generateIds(num, cb, ids) {
    if (ids === undefined) ids = [];
    if (num <= 0) return cb(undefined, ids);
    var id = Id.generate(function(err, buf) {
        if (err) return cb(err);
        ids.push(buf);
        generateIds(num - 1, cb, ids);
    });
}

describe('LookupList', function () {
    it('constructor should create empty list', function () {
        var list = new LookupList(Id.zero(), 3);
        list.length.should.equal(0);
        list.capacity.should.equal(3);
    });

    describe('#insert()', function () {
        it('should fill the list', function (cb) {
            var list = new LookupList(Id.zero(), 20);
            generateIds(10, function (err, ids) {
                for (var i = 0; i < ids.length; ++i) {
                    list.insert(new Contact(ids[i]));
                }
                list.length.should.equal(10);
                cb();
            });
        });

        it('should observe ordering', function (cb) {
            var id = Id.fromHex('abcd', '1234');
            var list = new LookupList(id, 20);
            generateIds(100, function (err, ids) {
                for (var i = 0; i < ids.length; ++i) {
                    list.insert(new Contact(ids[i]));
                }
                list.length.should.equal(20);
                var contacts = list.getContacts();
                for (i = 0; i < contacts.length - 1; ++i) {
                    var d = id.compareDistance(contacts[i].id,
                                               contacts[i + 1].id);
                    d.should.be.above(0);
                }
                cb();
            });
        });
    });

    describe('#next()', function () {
        it('should not return the same contact twice', function () {
            var list = new LookupList(Id.zero(), 3);
            list.insert(new Contact(Id.fromHex('af')));
            list.insert(new Contact(Id.fromHex('4a')));
            list.insert(new Contact(Id.fromHex('a3')));
            list.next().id.toString(true).should.equal('4a000..00');
            list.insert(new Contact(Id.fromHex('4a')));
            list.next().id.toString(true).should.equal('a3000..00');
            list.next().id.toString(true).should.equal('af000..00');
            should.not.exist(list.next());
        });
    });
});
