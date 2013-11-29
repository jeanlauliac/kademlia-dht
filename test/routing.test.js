'use strict';

require('chai').should();

var routing = require('../lib/routing.js');
var Bucket = require('../lib/bucket.js').Bucket;
var id = require('../lib/id.js');

var CONTACT1 = {id: id.fromKey('foo')};
var CONTACT2 = {id: id.fromKey('bar')};
var CONTACT3 = {id: id.fromKey('glo')};
var CONTACT4 = {id: id.fromKey('arf')};

// Add `n` random IDs to a table and call `cb(table)`.
//
function addSome(table, n, cb) {
    if (n === 0) return cb();
    id.generate(function(err, cid) {
        if (err) return cb(err);
        table.store({id: cid});
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

describe('routing.RoutingTable', function() {
    describe('#split()', function() {
        it('should split', function() {
            var bucket = new Bucket(routing.BUCKET_SIZE);
            bucket.store(CONTACT1);
            bucket.store(CONTACT2);
            bucket.store(CONTACT3);
            bucket.store(CONTACT4);

            var node = routing.split(bucket, 1);
            node.left.size.should.equal(2);
            node.right.size.should.equal(2);

            node.left.obtain(2)[0].should.equal(CONTACT1);
            node.left.obtain(2)[1].should.equal(CONTACT3);

            node.right.obtain(2)[0].should.equal(CONTACT2);
            node.right.obtain(2)[1].should.equal(CONTACT4);
        });
    });

    describe('#store()', function() {
        it('should observe the splitting rules', function(cb) {
            var table = new routing.RoutingTable(id.fromKey('foo'));
            addSome(table, 1000, function(err) {
                if (err) return cb(err);
                checkNode(table._root, []);
                cb();
            });
        });
    });
});
