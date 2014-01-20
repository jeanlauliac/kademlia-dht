'use strict';

var Dht = require('../lib/dht');
var MockRpc = require('../lib/mock-rpc');
var log = require('npmlog');
var util = require('util');

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

var nextPort = 1000;

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


function setSome(name, dhts, key, ix, cb) {
    var value = Math.random() * 256 | 0;
    log.info('SET!', '%s/%s %s=%d', name, dhts[ix].rpc.endpoint, key, value);
    locals[key] = value;
    dhts[ix].set(key, value, function (err) {
        if (err) return console.log('  ERROR! %s', err.message);
        cb();
    });
}

function getSome(name, dhts, key, ix, cb) {
    log.info('GET?', '%s/%s %s', name, dhts[ix].rpc.endpoint, key);
    dhts[ix].get(key, function (err, value) {
        if (err) return console.log('  ERROR! %s', err.message);
        if (value !== locals[key]) {
            log.warn('GET?', 'expected %s=%d but got %s', key,
                     locals[key], value);
        }
        cb();
    });
}

function newNode(name, dhts, cb) {
    var seeds = [dhts[Math.random() * dhts.length | 0].rpc.endpoint];
    spawnNode('local:' + nextPort, seeds, function (err, dht) {
        ++nextPort;
        if (err) return console.log('  ERROR! %s', err.message);
        dhts.push(dht);
        log.info('NEW+', '%s/%s', name, dht.rpc.endpoint);
        cb();
    });
}

function oldNode(name, dhts, ix, cb) {
    log.info('RMN-', '%s/%s', name, dhts[ix].rpc.endpoint);
    dhts[ix].close();
    dhts.splice(ix, 1);
    process.nextTick(function () {
        cb();
    });
}

var degree = 6;

function doStuff(name, dhts, count) {
    setTimeout(function () {
        if (count === 0) return;
        var key = WORDS[Math.random() * WORDS.length | 0];
        var ix = Math.random() * dhts.length | 0;
        var action = Math.random() * degree | 0;
        function cont() {
            doStuff(name, dhts, count - 1);
        }
        switch (action) {
            case 0:
            case 1:
                return setSome(name, dhts, key, ix, cont);
            case 2:
            case 3:
                return getSome(name, dhts, key, ix, cont);
            case 4:
                return newNode(name, dhts, cont);
            case 5:
                return oldNode(name, dhts, ix, cont);
        }
    }, (Math.random() * 20) | 0);
}

log.heading = 'dht';
log.info(null, 'spawning %s nodes', 100);
spawnSome([], [], 100, function (err, dhts) {
    if (err) throw err;
    doStuff('1', dhts, 100);
    doStuff('2', dhts, 100);
});
