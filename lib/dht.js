'use strict';

var Id = require('./id.js');
var RoutingTable = require('./routing-table.js');
var LookupList = require('./lookup-list.js');

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
    this._lookup(id, function (err, contacts) {
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

// Get a value from a key. Call `cb(err, value)`. If the key/value pair does
// not exist in the system, `value` will be `undefined`.
//
Dht.prototype.get = function (key, cb) {
    var self = this;
    if (this._locals.hasOwnProperty(key)) {
        process.nextTick(function () {
            return cb(null, self._locals[key]);
        });
    }
    var id = Id.fromKey(key);
    this._lookup(id, function (err, contacts) {
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

// Main algorithm of the Kademlia Dht. It finds the closest contacts from `id`
// by successively emitting findNode requests.
//
Dht.prototype._lookup = function (id, cb) {
    var contacts = this._routes.find(id, Dht.CONCURRENCY);
    var state = {
        list: new LookupList(id, Dht.BUCKET_SIZE),
        concurrency: 0,
        cb: cb
    };
    state.list.insertMany(contacts);
    for (var i = 0; i < Dht.CONCURRENCY; ++i) {
        ++state.concurrency;
        this._lookupContact(id, state, state.list.next());
    }
};

// Process a single contact as part of the lookup algorithm. `state` must
// contain a `list` of the Dht.BUCKET_SIZE closest contacts known so far,
// the current `concurrency` and the final `cb` to call.
//
Dht.prototype._lookupContact = function (id, state, contact) {
    var self = this;
    this._rpc.findNode(this._id, contact.endpoint, id,
                       function (err, contacts) {
        if (!err) {
            state.list.update(contacts);
            var next = state.list.next();
            if (next) return self._lookupContact(state, next);
        }
        --state.concurrency;
        if (state.concurrency === 0) {
            return state.cb(state.list.getContacts());
        }
    });
};

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
