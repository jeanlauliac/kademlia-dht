'use strict';

var Id = require('../lib/id.js');
var LookupList = require('../lib/lookup-list.js');

describe('LookupList', function() {
    it('constructor should create empty list', function () {
        var list = new LookupList(Id.zero(), 3);
        list.length.should.equal(0);
        list.capacity.should.equal(3);
    });

    describe('#insert()', function () {
        it('should fill', function (cb) {
            var list = new LookupList(Id.zero(), 20);
            generateIds(10, function (err, ids) {
                for (var i = 0; i < ids.length; ++i) {
                    list.insert({id: ids[i]});
                }
                list.length.should.equal(10);
                cb();
            });
        });

        it('should observe ordering', function (cb) {
            var id = Id.zero();
            var list = new LookupList(id, 20);
            generateIds(100, function (err, ids) {
                for (var i = 0; i < ids.length; ++i) {
                    list.insert({id: ids[i]});
                }
                list.length.should.equal(20);
                var contacts = list.getContacts();
                for (var i = 0; i < contacts.length - 1; ++i) {
                    var d = id.compareDistance(contacts[i].id,
                                               contacts[i + 1].id);
                    d.should.be.above(0);
                }
                cb();
            });
        });
    });
});
