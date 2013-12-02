'use strict';

var RoutingTable      = require('./routing-table.js');

// Store key/value pairs on a distributed network. `rpc` must provide the
// necessary Kademlia RPC methods for the local node of the DHT.
//
var DistHashTable = module.exports = function (rpc) {
    this._node = node;
    this._routes = new RoutingTable();
    this._cache = {};
};

// Set a key/value pair.
//
DistHashTable.prototype.set = function (key, value) {

};

// Get a value from a key.
//
DistHashTable.prototype.get = function (key) {

};

// Process a new discovered node.
//
DistHashTable.prototype._discovered = function (contact, cb) {
    this._routes.store(contact, cb);
}

// Ping this DHT on the behalf of the specified `contact`.
//
DistHashTable.prototype.ping = function (contact, cb) {
    this._discovered(contact, cb);
};

// Store a key/value pair on the behalf of the specified `contact`.
//
DistHashTable.prototype.store = function (contact, key, value, cb) {
    var self = this;
    this._discovered(contact, function() {
        self._cache[key] = value;
        cb();
    });
};

// Obtain the closest known nodes from the specified `id`.
//
DistHashTable.prototype.findNode = function (contact, id, cb) {
    var self = this;
    this._discovered(contact, function() {
        self._routes.find(id, cb);
    });
};

// Obtain the closest known nodes from the specified `id`, or return the
// value associated with `id` directly. Call `cb(err, )`.
//
DistHashTable.prototype.findValue = function (contact, id, cb) {
    var self = this;
    this._discovered(contact, function() {
        if (this._cache.hasOwnProperty(id)) {
            return cb();
        }
        self._routes.find(id, cb);
    });
};
