'use strict';

var routing      = require('./routing.js');

// Store key/value pairs on a distributed network. `protocol` must provide
// the necessary Kademlia RPC methods.
//
exports.HashTable = function(protocol) {
    this._protocol = protocol;
    this._routes = new routing.RoutingTable();
};

// Set a key/value pair.
//
exports.HashTable.prototype.set = function(key, value) {

};

// Get a value from a key.
//
exports.HashTable.prototype.get = function(key) {

};
