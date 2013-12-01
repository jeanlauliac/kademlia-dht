'use strict';

var routing      = require('./routing.js');

// Store key/value pairs on a distributed network. `protocol` must provide
// the necessary Kademlia RPC methods.
//
var DistHashTable = module.exports = function(protocol) {
    this._protocol = protocol;
    this._routes = new routing.RoutingTable();
};

// Set a key/value pair.
//
DistHashTable.prototype.set = function(key, value) {

};

// Get a value from a key.
//
DistHashTable.prototype.get = function(key) {

};
