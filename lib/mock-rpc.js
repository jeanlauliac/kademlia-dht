'use strict';

var glNetwork = {};

var events = require('events');
var util = require('util');

// Simple no-network RPC implementation, for testing purposes.
//
function MockRpc(endpoint) {
    events.EventEmitter.call(this);
    this._endpoint = endpoint;
    this._handlers = {};
    glNetwork[endpoint] = this;
}

util.inherits(MockRpc, events.EventEmitter);

// Timeout duration while waiting for responses for a 'remote' mock node.
//
Object.defineProperty(MockRpc, 'TIMEOUT', {value: 500});

// Get this RPC endpoint.
//
Object.defineProperty(MockRpc.prototype, 'endpoint', {
    get: function () {
        return this._endpoint;
    }
});

// Spawn a new RPC node.
//
MockRpc.spawn = function (endpoint, cb) {
    process.nextTick(function () {
        cb(null, new MockRpc(endpoint));
    });
};

function error(code, message) {
    var err = new Error(message);
    err.code = code;
    return err;
}

MockRpc.prototype.close = function () {
    delete glNetwork[this._enpoint];
};

// Send a message to a specific `endpoint`. The `message` should be one of
// ping, store, findNode or findValue. `payload` is an abitrary object.
// `cb` is called `(err, result)` once the target replies. If the endpoint does
// not exist then timeout with an error.
//
// Here, 'sending' a message is actually just emitting an event on the 'remote'
// node, providing a callback that must be called back for the 'response' to
// be sent.
//
MockRpc.prototype.send = function (message, endpoint, payload, cb) {
    if (!endpoint) {
        return process.nextTick(function () {
            return cb(error('EINVALIDEP', 'invalid endpoint'));
        });
    }
    var self = this;
    var node = glNetwork[endpoint];
    var res = false;
    setTimeout(function onTimeout() {
        if (res) return;
        res = true;
        return cb(error('ETIMEDOUT', 'mock rpc timeout'));
    }, MockRpc.TIMEOUT);
    if (typeof node === 'undefined') return;
    setTimeout(function onDeliverRpc() {
        var result;
        if (res) return;
        res = true;
        try {
            result = node._handlers[message](self._endpoint, payload);
        } catch (err) {
            node.emit('error', err);
            return cb(error('EREMOTEERR', 'remote node errored'));
        }
        return cb(null, result);
    }, Math.random() * 20 | 0);
};

MockRpc.prototype.ping = function (endpoint, payload, cb) {
    this.send('ping', endpoint, payload, cb);
};

MockRpc.prototype.store = function (endpoint, payload, cb) {
    this.send('store', endpoint, payload, cb);
};

MockRpc.prototype.findNode = function (endpoint, payload, cb) {
    this.send('findNode', endpoint, payload, cb);
};

MockRpc.prototype.findValue = function (endpoint, payload, cb) {
    this.send('findValue', endpoint, payload, cb);
};

MockRpc.prototype.receive = function (message, handler) {
    if (typeof handler === 'undefined')
        return this._handlers[message];
    if (this._handlers.hasOwnProperty(message))
        throw error('EHANDLEREXISTS',
                    'a handler is already registered for: ' + message);
    this._handlers[message] = handler;
};

module.exports = MockRpc;
