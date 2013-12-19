'use strict';

var glNetwork = {};

// Simple no-network RPC implementation, for testing purposes.
//
function MockRpc(endpoint) {
    this._endpoint = endpoint;
    this._handlers = {};
    glNetwork[endpoint] = this;
}

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

// Send an arbitrary message to another node. If the node does not exist
// then timeout with an error. It it exists, and reply something, then
// call `cb(err, result)` with the replied arguments.
//
// Here, 'sending' a message is actually just emitting an event on the 'remote'
// node, providing a callback that must be called back for the 'response' to
// be sent.
//
MockRpc.prototype._sendMessage = function (node, message, payload, cb) {
    var res = false;
    setTimeout(function onTimeout() {
        if (res) return;
        res = true;
        return cb(error('ETIMEDOUT', 'mock rpc timeout'));
    }, MockRpc.TIMEOUT);
    if (typeof node === 'undefined') return;
    function onMessageReply(err, result) {
        if (res) return;
        res = true;
        return cb(err, result);
    }
    node._handlers[message](this._endpoint, payload, onMessageReply);
};

// Send a message to a specific `endpoint`. The `message` should be one of
// ping, store, findNode or findValue. `payload` is an abitrary object.
// `cb` is called `(err, result)` once the target replies.
//
MockRpc.prototype.send = function (message, endpoint, payload, cb) {
    this._sendMessage(glNetwork[endpoint], message, payload, cb);
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
