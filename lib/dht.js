'use strict';

var routing      = require('./routing.js');

// Store key/value pairs on a distributed network. `node` must provide the
// necessary Kademlia RPC methods and events for the local node of the DHT.
//
var DistHashTable = module.exports = function(node) {
    this._node = node;
    this._routes = new routing.RoutingTable();
    node.on('ping', this._onPing.bind(this));
    node.on('store', this._onStore.bind(this));
    node.on('findNode', this._onFindNode.bind(this));
    node.on('findValue', this._onFindValue.bind(this));
};

DistHashTable.prototype._onPing = function(remoteEp, reply) {
    
};

DistHashTable.prototype._onStore = function(remoteEp, key, value, reply) {

};

DistHashTable.prototype._onFindNode = function(remoteEp, id, reply) {

};

DistHashTable.prototype._onFindValue = function(remoteEp, id, reply) {

};

// Set a key/value pair.
//
DistHashTable.prototype.set = function(key, value) {

};

// Get a value from a key.
//
DistHashTable.prototype.get = function(key) {

};
