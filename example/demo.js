'use strict';

var Dht = require('../lib/dht');
var MockRpc = require('../lib/mock-rpc');

// Store a value on one side and get it back on the other side.
//
function demo(dht1, dht2) {
    dht1.set('beep', 'boop', function (err) {
        if (err) throw err;
        dht2.get('beep', function (err, value) {
            if (err) throw err;
            console.log('%s === %s', 'boop', value);
        });
    });
}

// Spawn a node. A node is composed of two elements: the local Dht and the Rpc.
//
function spawnNode(endpoint, seeds, cb) {
    MockRpc.spawn(endpoint, function (err, rpc) {
        if (err) return cb(err);
        Dht.spawn(rpc, seeds, function (err, dht) {
            if (err) return cb(err);
            cb(err, dht);
        });
    });
}

spawnNode('localhost:9876', [], function (err, dht1) {
    spawnNode('localhost:4321', [dht1.rpc.endpoint], function (err, dht2) {
        demo(dht1, dht2);
    });
});
