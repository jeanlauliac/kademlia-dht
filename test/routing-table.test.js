'use strict';

var RoutingTable = require('../lib/routing-table.js');
var Bucket = require('../lib/bucket.js');
var Id = require('../lib/id.js');
var Contact = require('../lib/contact.js');

var CONTACT1 = new Contact(Id.fromKey('foo'));
var CONTACT2 = new Contact(Id.fromKey('bar'));
var CONTACT3 = new Contact(Id.fromKey('glo'));
var CONTACT4 = new Contact(Id.fromKey('arf'));

var BUCKET_SIZE = 3;

// Add `n` random IDs to a table and call `cb(table)`.
//
function addSome(table, n, cb) {
    if (n === 0) return cb();
    Id.generate(function (err, cid) {
        if (err) return cb(err);
        table.store(new Contact(cid));
        addSome(table, n - 1, cb);
    });
}

// Check if routing table node is valid, eg that there's no misplaced
// contact in the tree. `prefix` is an array of bool.
//
function checkNode(node, prefix) {
    if (node instanceof Bucket) {
        var contacts = node.obtain();
        for (var i = 0; i < contacts.length; ++i) {
            for (var j = 0; j < prefix.length; ++j) {
                contacts[i].id.at(j).should.equal(prefix[j]);
            }
        }
    } else {
        checkNode(node.left, prefix.concat(false));
        checkNode(node.right, prefix.concat(true));
    }
}

function storeIds(table, ids, cb) {
    for (var i = 0; i < ids.length; ++i)
        table.store(new Contact(ids[i]));
}

describe('RoutingTable', function () {
    describe('#store()', function () {
        it('should observe the splitting rules', function (cb) {
            var table = new RoutingTable(Id.fromKey('foo'), BUCKET_SIZE);
            addSome(table, 1000, function (err) {
                if (err) return cb(err);
                checkNode(table._root, []);
                cb();
            });
        });

        it('should work deeply nested', function () {
            var table = new RoutingTable(Id.zero(), BUCKET_SIZE);
            var bits = [];
            var ids = [];

            for (var i = 0; i < Id.BIT_SIZE - 1; ++i) {
                ids.push(Id.fromPrefix(bits.concat(false)));
                ids.push(Id.fromPrefix(bits.concat(true)));
                bits.push(false);
            }
            storeIds(table, ids);
            checkNode(table._root, []);
        });
    });

    describe('#find()', function () {
        it('should work', function () {
            var table = new RoutingTable(Id.zero(), BUCKET_SIZE);
            var bits = [];
            var ids = [];

            for (var i = 0; i < 10; ++i) {
                ids.push(Id.fromPrefix(bits.concat(false)));
                ids.push(Id.fromPrefix(bits.concat(true)));
                bits.push(false);
            }
            storeIds(table, ids);
            ids = table.find(Id.fromPrefix('000000111'));
            ids = ids.map(function (x) {
                return x.id.toString(true);
            });
            ids.length.should.equal(BUCKET_SIZE);
            ids[0].should.equal('02000..00');
            ids[1].should.equal('01000..00');
            ids[2].should.equal('00800..00');
        });
    });
});
