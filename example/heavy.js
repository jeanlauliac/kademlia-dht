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

var WORDS = ['foo', 'bar', 'baz']; //, 'glo', 'ick'];
var locals = {};


function setSome(dhts, key, ix, cb) {
    var value = Math.random() * 256 | 0;
    console.log('[master] set %s=%d on #%s', key, value,
                dhts[ix].rpc.endpoint);
    locals[key] = value;
    dhts[ix].set(key, value, function (err) {
        if (err) return console.log('  ERROR! %s', err.message);
        cb();
    });
}

function getSome(dhts, key, ix, cb) {
    console.log('[master] get %s on #%s', key, dhts[ix].rpc.endpoint);
    dhts[ix].get(key, function (err, value) {
        if (err) return console.log('  ERROR! %s', err.message);
        if (value !== locals[key]) {
            console.log('/!\\ warning:' +
                        ' expected %s=%d but got %s', key,
                        locals[key], value);
        }
        cb();
    });
}

function newNode(dhts, cb) {
    var seeds = [dhts[Math.random() * dhts.length | 0].rpc.endpoint];
    spawnNode('local:' + nextPort, seeds, function (err, dht) {
        ++nextPort;
        if (err) return console.log('  ERROR! %s', err.message);
        dhts.push(dht);
        console.log('[master] NEW node! %s', dht.rpc.endpoint);
        cb();
    });
}

function oldNode(dhts, ix, cb) {
    console.log('[master] REMOVING node! %s', dhts[ix].rpc.endpoint);
    dhts[ix].close();
    dhts.splice(ix, 1);
    process.nextTick(function () {
        cb();
    });
}

var degree = 4;

function doStuff(dhts, count) {
    setTimeout(function () {
        if (count === 0) return;
        var key = WORDS[Math.random() * WORDS.length | 0];
        var ix = Math.random() * dhts.length | 0;
        var action = Math.random() * degree | 0;
        function cont() {
            doStuff(dhts, count - 1);
        }
        switch (action) {
            case 0:
                return setSome(dhts, key, ix, cont);
            case 1:
                return getSome(dhts, key, ix, cont);
            case 2:
                return newNode(dhts, cont);
            case 3:
                return oldNode(dhts, ix, cont);
        }
    }, (Math.random() * 20) | 0);
}

spawnSome([], [], 100, function (err, dhts) {
    if (err) throw err;
    doStuff(dhts, 200);
});
