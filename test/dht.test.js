'use strict';

var Dht = require('../lib/dht.js');
var MockRpc = require('../lib/mock-rpc.js');

var SOURCE_ENDPOINT = 'localhost:9876';
var TARGET_ENDPOINT = 'localhost:4321';

function spawnNodeFromRpc(rpc, seed, cb) {
    Dht.spawn(rpc, seed, function (err, dht) {
        return cb(err, dht);
    });
}

// Spawn a node. A node is composed of two elements: the local Dht and the Rpc.
//
function spawnNode(endpoint, seed, cb) {
    MockRpc.spawn(endpoint, function (err, rpc) {
        if (err) return cb(err);
        return spawnNodeFromRpc(rpc, seed, cb);
    });
}

var nextGlobalEpIndex = 1000;

function spawnSomeNodesRecur(arr, seeds, nb, cb) {
    if (nb === 0) {
        return process.nextTick(function () {
            return cb(null, arr);
        });
    }
    spawnNode('localhost:' + nextGlobalEpIndex, seeds, function (err, dht) {
        ++nextGlobalEpIndex;
        if (err) return cb(err);
        arr.push(dht);
        if (seeds.length < 10)
            seeds.push(dht.rpc.endpoint);
        return spawnSomeNodesRecur(arr, seeds, nb - 1, cb);
    });
}

// Spawn `count` nodes with unique endpoints.
//
function spawnSomeNodes(nb, cb) {
    spawnSomeNodesRecur([], [], nb, cb);
}

describe('Dht', function () {
    describe('constructor', function () {
        it('should refuse bad RPC objects', function () {
            (function throwing() {
                new Dht({ping: function () {}});
            }).should.throw(Error);
        });
    });

    describe('#set()', function () {
        it('should store locally, with error', function (cb) {
            spawnNode('localhost', [], function (err, dht) {
                should.not.exist(err);
                dht.set('foo', 12, function (err) {
                    should.exist(err);
                    dht.peek('foo').should.equal(12);
                    cb();
                });
            });
        });
    });

    it('should store and get with a lot of nodes', function (cb) {
        spawnSomeNodes(3, function (err, dhts) {
            console.log();
            for (var i = 0; i < dhts.length; ++i) {
                console.log('=== %s ===\n%s', dhts[i].rpc.endpoint,
                            dhts[i]._routes);
            }
            should.not.exist(err);
            dhts.should.have.length(100);
            var dht = dhts[0];
            cb();
        });
    });
});
