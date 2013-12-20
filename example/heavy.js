'use strict';

var Dht = require('../lib/dht');
var MockRpc = require('../lib/mock-rpc');

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

var nextPort = '1000';

function spawnSome(dhts, seeds, nb, cb) {
    ++nextPort;
    spawnNode('local:' + nextPort, seeds, function (err, dht) {
        if (err) return cb(err);
        dhts.push(dht);
        --nb;
        if (nb === 0)
            return cb(null, dhts);
        if (seeds.length < 3)
            seeds.push(dht.rpc.endpoint);
        return spawnSome(dhts, seeds, nb, cb);
    });
}

var WORDS = ['foo']; //, 'bar']; //, 'baz', 'glo', 'ick'];
var locals = {};

function doStuff(dhts, count) {
    setTimeout(function () {
        if (count === 0) return;
        var key = '';
        for (var i = 0; i < 1; ++i) {
            key += WORDS[Math.random() * WORDS.length | 0];
        }
        var ix = Math.random() * dhts.length | 0;
        if (Math.random() < 0.333) {
            var value = Math.random() * 256 | 0;
            console.log('[master] set %s=%d on #%s', key, value,
                        dhts[ix].rpc.endpoint);
            locals[key] = value;
            dhts[ix].set(key, value, function (err) {
                if (err) return console.log('  ERROR! %s', err.message);
                doStuff(dhts, count - 1);
            });
        } else if (Math.random() < 0.666) {
            console.log('[master] get %s on #%s', key, dhts[ix].rpc.endpoint);
            dhts[ix].get(key, function (err, value) {
                if (err) return console.log('  ERROR! %s', err.message);
                if (value !== locals[key]) {
                    console.log('/!\\ warning:' +
                                ' expected %s=%d but got %s', key,
                                locals[key], value);
                }
                doStuff(dhts, count - 1);
            });
        } else {
            var seeds = [dhts[Math.random() * dhts.length | 0].rpc.endpoint];
            spawnNode('local:' + nextPort, seeds, function (err, dht) {
                ++nextPort;
                if (err) return console.log('  ERROR! %s', err.message);
                dhts.push(dht);
                console.log('[master] NEW node! %s', dht.rpc.endpoint);
                doStuff(dhts, count - 1);
            });
        }
    }, (Math.random() * 20) | 0);
}

spawnSome([], [], 20, function (err, dhts) {
    if (err) throw err;
    doStuff(dhts, 200);
});
