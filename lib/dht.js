'use strict';

var RoutingTable      = require('./routing-table.js');

// Check that an object possesses the specified functions.
//
function checkInterface(obj, funcs) {
    for (var i = 0; i < funcs.length; ++i) {
        if (typeof obj[funcs[i]] !== 'function')
            return false;
    }
    return true;
}

// Store key/value pairs on a distributed network. `rpc` must provide the
// necessary Kademlia RPC methods for the local node of the DHT.
//
var Dht = function (rpc, id) {
    this._rpc = rpc;
    if (!checkInterface(rpc, ['ping', 'store', 'findNode', 'findValue']))
        throw new Error('the RPC interface is not fully defined');
    this._cache = {};
    this._routes = new RoutingTable(id);
};

// Create a Dht instance with a random ID.
//
Dht.spawn = function(rpc, cb) {
    Id.generate(function(err, id) {
        if (err) return cb(err);
        cb(null, new Dht(id));
    });
};

// Get the associated RPC.
//
Object.defineProperty(Dht, 'rpc', {
    get: function () {
        return this._rpc;
    }
});

// Set a key/value pair.
//
Dht.prototype.set = function (key, value, cb) {

};

// Get a value from a key.
//
Dht.prototype.get = function (key, cb) {

};

// Process a new discovered node.
//
Dht.prototype._discovered = function (contact, cb) {
    this._routes.store(contact, cb);
};

// Ping this DHT on the behalf of the specified `contact`.
//
Dht.prototype.ping = function (contact, cb) {
    this._discovered(contact, cb);
};

// Store a key/value pair on the behalf of the specified `contact`.
//
Dht.prototype.store = function (contact, key, value, cb) {
    var self = this;
    this._discovered(contact, function () {
        self._cache[key] = value;
        cb();
    });
};

// Obtain the closest known nodes from the specified `id`.
//
Dht.prototype.findNode = function (contact, id, cb) {
    var self = this;
    this._discovered(contact, function () {
        self._routes.find(id, cb);
    });
};

// Obtain the closest known nodes from the specified `id`, or return the
// value associated with `id` directly. Call `cb(err, )`.
//
Dht.prototype.findValue = function (contact, id, cb) {
    var self = this;
    this._discovered(contact, function () {
        if (this._cache.hasOwnProperty(id)) {
            return cb();
        }
        self._routes.find(id, cb);
    });
};

module.exports = Dht
