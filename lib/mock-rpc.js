'use strict';

var glNetwork = {};

// Simple no-network RPC implementation, for testing purposes.
//
var MockRpc = function (endpoint) {
    this._endpoint = endpoint;
    glNetwork[endpoint] = this;
};

// Timeout duration while waiting for responses for a 'remote' mock node.
//
Object.defineProperty(MockRpc, 'TIMEOUT', {value: 500});

// Get this RPC endpoint.
//
Object.defineProperty(MockRpc, 'endpoint', {
    get: function () {
        return this._endpoint;
    }
});

// Spawn a new RPC node.
//
MockRpc.spawn = function (endpoint, cb) {
    process.nextTick(function() {
        cb(null, new MockRpc(endpoint));
    });
};

// Set the node recipient.
//
MockRpc.prototype.recipient = function (rp) {
    if (typeof rp === 'undefined') return rp;
    this._recipient = rp;
};

// Send an arbitrary message to another node. If the node does not exist
// then timeout with an error. It it exists, and reply something, then
// call `cb(err, ...)` with the replied arguments.
//
// Here, 'sending' a message is actually just emitting an event on the 'remote'
// node, providing a callback that must be called back for the 'response' to
// be sent.
//
MockRpc.prototype._sendMessage = function (node, message, id, args, cb) {
    var res = false;
    setTimeout(function onTimeout() {
        if (res) return;
        res = true;
        var err = new Error('mock rpc timeout');
        err.code = 'ETIMEDOUT';
        cb(err);
    }, MockRpc.TIMEOUT);
    if (typeof node === 'undefined') return;
    var reply = function onMessageReply() {
        if (res) return;
        res = true;
        cb.apply(null, arguments);
    };
    var contact = {endpoint: this._endpoint, id: id};
    node._recipient[message].apply(node._recipient,
                                   [contact].concat(args, reply));
};

// PING the specified endpoint and calls `cb(err, replied)`. `replied`
// specify if the remote node replied positively to the ping.
//
MockRpc.prototype.ping = function (ep, id, cb) {
    this._sendMessage(glNetwork[ep], 'ping', id,
                      [], cb);
};

// Try a STORE operation of the key/value pair at the specified endpoint.
//
MockRpc.prototype.store = function (ep, id, key, value, cb) {
    this._sendMessage(glNetwork[ep], 'store', id,
                      [key, value], cb);
};

// Ask the specified endpoint about the specified key closest nodes with
// a FIND_NODE.
//
MockRpc.prototype.findNode = function (ep, id, key, cb) {
    this._sendMessage(glNetwork[ep], 'findNode', id,
                      [id], cb);
};

// Ask the specified endpoint about the specified node ID value with a
// FIND_VALUE.
//
MockRpc.prototype.findValue = function (ep, id, key, cb) {
    this._sendMessage(glNetwork[ep], 'findValue', id,
                      [key], cb);
};

module.exports = MockRpc
