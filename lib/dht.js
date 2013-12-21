'use strict';

var Id = require('./id.js');
var RoutingTable = require('./routing-table.js');
var Lookup = require('./lookup.js');
var Contact = require('./contact.js');

var RPC_FUNCTIONS = ['ping', 'store', 'findNode', 'findValue', 'receive'];

// Check that an object possesses the specified functions.
//
function checkInterface(obj, funcs) {
    for (var i = 0; i < funcs.length; ++i) {
        if (typeof obj[funcs[i]] !== 'function')
            return false;
    }
    return true;
}

// Fill `opts` with the default options if needed.
//
function defaultOptions(opts) {
    opts.bucketSize = opts.bucketSize || 20;
    opts.concurrency = opts.concurrency || 3;
    opts.expireTime = opts.expireTime || 60 * 60 * 24;
    opts.refreshTime = opts.refreshTime || 60 * 60;
    opts.replicateTime = opts.replicateTime || 60 * 60;
    opts.republishTime = opts.republishTime || 60 * 60 * 24;
}

// Store key/value pairs on a distributed network. `rpc` must provide the
// necessary Kademlia RPC methods for the local node of the DHT.
//
var Dht = function (rpc, id, opts) {
    if (!checkInterface(rpc, RPC_FUNCTIONS))
        throw new Error('the RPC interface is not fully defined');
    rpc.receive('ping', this._onPing.bind(this));
    rpc.receive('store', this._onStore.bind(this));
    rpc.receive('findNode', this._onFindNode.bind(this));
    rpc.receive('findValue', this._onFindValue.bind(this));
    Object.defineProperty(this, 'rpc', {value: rpc});
    this._cache = {};
    this._locals = {};
    this._routes = new RoutingTable(id, opts.bucketSize);
    this._opts = opts;
    this._lookupOpts = {
        size: opts.bucketSize,
        concurrency: opts.concurrency,
        findNode: this._findNode.bind(this),
        selfId: id
    };
};

// Create a Dht instance with a random ID.
//
Dht.spawn = function (rpc, seeds, opts, cb) {
    if (typeof cb === 'undefined') {
        cb = opts;
        opts = {};
    }
    defaultOptions(opts);
    Id.generate(function onGotDhtId(err, id) {
        if (err) return cb(err);
        var dht = new Dht(rpc, id, opts);
        dht.bootstrap(seeds, function (err) {
            cb(null, dht);
        });
    });
};

// Do a lookup on the Dht self id. This will fill the routing table as a
// side effect.
//
Dht.prototype._bootstrapLookup = function (cb) {
    var seeds = this._routes.find(this._routes.id, this._opts.concurrency);
    Lookup.proceed(this._routes.id, seeds, this._lookupOpts,
                   function (err, contacts) {
        return cb();
    });
};

Dht.prototype.bootstrap = function (seeds, cb) {
    if (seeds.length === 0)
        return process.nextTick(function () {
            return cb();
        });
    var self = this;
    var payload = {id: this._routes.id};
    payload.targetId = payload.id;
    var remain = seeds.length;
    function bootstrapSome(endpoint, err, res) {
        --remain;
        if (err) {
            if (remain === 0) return self._bootstrapLookup(cb);
            return;
        }
        var contact = new Contact(res.remoteId, endpoint);
        self._routes.store(contact);
        if (remain === 0)
            return self._bootstrapLookup(cb);
    }
    for (var i = 0; i < seeds.length; ++i) {
        this.rpc.ping(seeds[i], payload, bootstrapSome.bind(null, seeds[i]));
    }
};

// Set a key/value pair.
//
Dht.prototype.set = function (key, value, cb) {
    var self = this;
    var id = Id.fromKey(key);
    this._locals[key] = value;
    var seeds = this._routes.find(id, this._opts.concurrency);
    Lookup.proceed(id, seeds, this._lookupOpts, function (err, contacts) {
        if (err) return cb(err);
        if (contacts.length === 0) return cb();
        var state = {key: key, value: value};
        self._setNext(state, contacts, cb);
    });
};

Dht.prototype._setNext = function (state, contacts, cb) {
    var self = this;
    var contact = contacts.shift();
    function onSet(err) {
        if (contacts.length === 0) return cb();
        return self._setNext(state, contacts, cb);
    }
    if (contact.id.equal(this._routes.id)) {
        this._cache[state.key] = state.value;
        return process.nextTick(onSet);
    }
    var payload = {id: this._routes.id, key: state.key, value: state.value};
    this.rpc.store(contact.endpoint, payload, onSet);
};

// Get a value synchronously if locally available. Return `null` if no value
// is to be found (but it may exist in the network).
//
Dht.prototype.peek = function (key) {
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
    var seeds = this._routes.find(id, this._opts.concurrency);
    Lookup.proceed(id, seeds, this._lookupOpts, function (err, contacts) {
        if (err) return cb(err);
        if (contacts.length === 0) return cb(null, void 0);
        return self._getFrom(id, key, contacts, cb);
    });
};

Dht.prototype._getFrom = function (id, key, contacts, cb) {
    var contact = contacts.shift();
    var payload = {id: this._routes.id, targetId: id, key: key};
    var self = this;
    this.rpc.findValue(contact.endpoint, payload, function (err, result) {
        if (err || typeof result.value === 'undefined') {
            if (contacts.length === 0) return cb(null, void 0);
            return self._getFrom(id, key, contacts, cb);
        }
        return cb(null, result.value);
    });
};

// Helper provided to the Lookup algo.
//
Dht.prototype._findNode = function (contact, targetId, cb) {
    var payload = {id: this._routes.id, targetId: targetId};
    var self = this;
    this.rpc.findNode(contact.endpoint, payload,
                      function onNodesFound(err, result) {
        if (err) return cb(err);
        self._discovered(contact.id, contact.endpoint);
        return cb(null, result.contacts);
    });
};

// Process a newly discovered contact.
//
Dht.prototype._discovered = function (id, endpoint) {
    if (!(id instanceof Id))
        throw new Error('invalid id');
    var contact = new Contact(id, endpoint);
    // FIXME @jeanlauliac If we are still pinging and we get the same old
    // contact, we are pinging it anew. Bad. Opening for a DoS attack.
    var oldContact = this._routes.store(contact);
    if (oldContact) {
        var self = this;
        this.rpc.ping(oldContact.endpoint, {id: this._routes.id},
                       function onPong(err, res) {
            if (!(err || !res.remoteId.equal(contact.id))) return;
            self._routes.remove(oldContact);
            self._routes.store(contact);
        });
    }
};

// Ping this DHT on the behalf of the specified `contact`.
//
Dht.prototype._onPing = function (endpoint, payload) {
    this._discovered(payload.id, endpoint);
    return {remoteId: this._routes.id};
};

// Store a key/value pair on the behalf of the specified `contact`.
//
Dht.prototype._onStore = function (endpoint, payload) {
    this._discovered(payload.id, endpoint);
    this._cache[payload.key] = payload.value;
};

// Obtain the closest known nodes from the specified `id`. Call `cb(err, ids)`.
//
Dht.prototype._onFindNode = function (endpoint, payload) {
    this._discovered(payload.id, endpoint);
    var res;
    res = this._routes.find(payload.targetId);
    return {contacts: res};
};

// Obtain the closest known nodes from the specified `id`, or return the
// value associated with `id` directly. Call `cb(err, ids)`.
//
Dht.prototype._onFindValue = function (endpoint, payload) {
    this._discovered(payload.id, endpoint);
    if (this._cache.hasOwnProperty(payload.key))
        return {value: this._cache[payload.key]};
    var res;
    res = this._routes.find(payload.targetId);
    return {contacts: res};
};

module.exports = Dht;
