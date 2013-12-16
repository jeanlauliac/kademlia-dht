'use strict';

var Dht = require('../lib/dht.js');
var MockRpc = require('../lib/mock-rpc.js');

var SOURCE_ENDPOINT = 'localhost:9876';
var TARGET_ENDPOINT = 'localhost:4321';

function spawnNodeFromRpc(rpc, seed, cb) {
    Dht.spawn(rpc, seed, function (err, dht) {
        if (err) return cb(err);
        rpc.recipient(dht);
        return cb(err, dht);
    });
}

// Spawn a node. A node is composed of two elements: the local Dht and the Rpc.
//
function spawnNode(endpoint, seed, cb) {
    MockRpc.spawn(endpoint, function (err, rpc) {
        if (err) return cb(err);
        return spawnNodeFromRpc(rpc, cb);
    });
}

var nextGlobalEpIndex = 1000;

function spawnSomeNodesRecur(arr, nb, cb) {
    if (nb === 0) {
        return process.nextTick(function () {
            return cb(null, arr);
        });
    }
    spawnNode('localhost' + nextGlobalEpIndex, null, function (err, node) {
        if (err) return cb(err);
        arr.push(node);
        return spawnSomeNodesRecur(arr, nb - 1, cb);
    });
}

// Spawn `count` nodes with unique endpoints.
//
function spawnSomeNodes(nb, cb) {
    spawnSomeNodesRecur([], nb, cb);
}

describe('Dht', function () {

    describe('constructor', function () {
        it('should refuse bad RPC objects', function () {
            (function throwing() {
                new Dht({ping: function () {}});
            }).should.throw(Error);
        });
    });

    describe('member', function () {
        var dht;
        var rpc;
        var spyTarget = {
            ping: sinon.stub().callsArgAsync(2),
            store: sinon.stub().callsArgAsync(4),
            findNode: sinon.stub().callsArgAsync(3),
            findValue: sinon.stub().callsArgAsync(3)
        };

        beforeEach(function (cb) {
            spyTarget.ping.reset();
            spyTarget.store.reset();
            spyTarget.findNode.reset();
            spyTarget.findValue.reset();
            Dht.spawn(spyTarget, function (err, inst) {
                if (err) return cb(err);
                dht = inst;
                return cb();
            });
        });

        describe('#set()', function () {
            it('should work locally', function () {
                dht.set('foo', 12, function () {
                    dht.peek('foo').should.equal(12);
                });
            });
        });
    });

    describe('load test', function () {


    });
});
