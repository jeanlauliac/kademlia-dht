'use strict';

var Id = require('./id.js');
var RoutingTable = require('./routing-table.js');
var Lookup = require('./lookup.js');

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
    this._locals = {};
    this._routes = new RoutingTable(id, Dht.BUCKET_SIZE);
    this._lookupOpts = {
        size: Dht.BUCKET_SIZE,
        concurrency: Dht.CONCURRENCY,
        findNode: this._findNode.bind(this)
    }
};

// Maximum number of parallel request during lookup.
//
Object.defineProperty(Dht, 'CONCURRENCY', {value: 3});

// Size of each bucket in the routing table.
//
Object.defineProperty(Dht, 'BUCKET_SIZE', {value: 20});

// Create a Dht instance with a random ID.
//
Dht.spawn = function (rpc, cb) {
    Id.generate(function (err, id) {
        if (err) return cb(err);
        cb(null, new Dht(rpc, id));
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
    var self = this;
    var id = Id.fromKey(key);
    this._locals[key] = value;
    var seeds = this._routes.find(id, Dht.CONCURRENCY);
    Lookup.proceed(id, seeds, this._lookupOpts, function (err, contacts) {
        if (err) return cb(err);
        var state = {key: key, value: value};
        self._setNext(state, contacts[0], contacts.slice(1), cb);
    });
};

Dht.prototype._setNext = function (state, contact, others, cb) {
    var self = this;
    this._rpc.store(this._id, contact.endpoint, state.key, state.value,
                    function (err) {
        if (others.length === 0) return cb();
        return self._setNext(state, others[0], others.slice(1), cb);
    });
};

// Get a value synchronously if locally available. Return `null` if no value
// is to be found (but it may exist in the network).
//
Dht.prototype.peek = function (key) {
    if (this._locals.hasOwnProperty(key))
        return this._locals[key];
    if (this._cache.hasOwnProperty(key))
        return this._cache[key];
    return null;
};

// Get a value from a key. Call `cb(err, value)` async. If the key/value pair
// does not exist in the system, `value` is merely `undefined` and no error is
// raised.
//
Dht.prototype.get = function (key, cb) {
    var self = this;
    var val = this.peek(key);
    if (val) {
        return process.nextTick(function () {
            return cb(null, val);
        });
    }
    var id = Id.fromKey(key);
    var seeds = this._routes.find(id, Dht.CONCURRENCY);
    Lookup.proceed(id, seeds, this._lookupOpts, function (err, contacts) {
        if (err) return cb(err);
        return self._getFrom(id, contacts[0], contacts.slice(1), cb);
    });
};

Dht.prototype._getFrom = function (id, contact, others, cb) {
    this._rpc.findValue(this._id, contact.endpoint, id,
                        function (err, value, isValue) {
        if (err || !isValue) {
            if (others.length === 0) return cb();
            return this._getFrom(id, others[0], others.slice(1), cb);
        }
        return cb(null, value);
    });
};

Dht.prototype._findNode = function (contact, targetId, cb) {
    this._rpc.findNode(this._id, contact.endpoint, targetId,
                       function (err, contacts) {
        this._discovered(contact, function (err) {});   
        return cb(err, contacts);                 
    });
}

// Validate a contact.
//
Dht.prototype._validate = function (contact, cb) {
    this._rpc.ping(this._id, contact.endpoint, function (err) {
        if (err) return cb(null, false);
        return cb(null, true);
    });
};

// Process a newly discovered contact.
//
Dht.prototype._discovered = function (contact, cb) {
    this._routes.store(contact, this._validate.bind(this), cb);
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
    this._discovered(contact, function (err) {
        if (err) return cb(err);
        self._cache[key] = value;
        cb();
    });
};

// Obtain the closest known nodes from the specified `id`. Call `cb(err, ids)`.
//
Dht.prototype.findNode = function (contact, id, cb) {
    var self = this;
    this._discovered(contact, function (err) {
        if (err) return cb(err);
        var res;
        try {
            res = self._routes.find(id);
        } catch (err) {
            return cb(err);
        }
        return cb(null, res);
    });
};

// Obtain the closest known nodes from the specified `id`, or return the
// value associated with `id` directly. Call `cb(err, ids)`.
//
Dht.prototype.findValue = function (contact, id, key, cb) {
    var self = this;
    this._discovered(contact, function (err) {
        if (err) return cb(err);
        if (this._cache.hasOwnProperty(key))
            return cb(null, this._cache[key], true);
        var res;
        try {
            res = self._routes.find(id);
        } catch (err) {
            return cb(err);
        }
        return cb(null, res, false);
    });
};

module.exports = Dht;
