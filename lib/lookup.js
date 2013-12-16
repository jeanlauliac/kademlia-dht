'use strict';

var util = require('util');
var events = require('events');
var LookupList = require('./lookup-list.js');

function Lookup(id, seeds, opts) {
    events.EventEmitter.call(this);
    this._targetId = id;
    this._opts = opts;
    this._list = new LookupList(id, opts.size);
    this._concurrents = 0;
    this._list.insertMany(seeds);
}

util.inherits(Lookup, events.EventEmitter);

// Find the closest contacts from `id` by successively emitting findNode
// requests.
//
Lookup.proceed = function (targetId, seeds, opts, cb) {
    var lookup = new Lookup(targetId, seeds, opts);
    lookup.proceed(cb);
    return lookup;
};

Lookup.prototype.proceed = function (cb) {
    for (var i = 0; i < this._opts.concurrency; ++i) {
        var next = this._list.next();
        if (!next) break;
        ++this._concurrents;
        this._forContact(next, cb);
    }
    if (this._concurrents === 0)
        return cb(null, []);
};

// Process a single contact as part of the lookup algorithm. `state` must
// contain a `list` of the Dht.BUCKET_SIZE closest contacts known so far,
// the current `concurrency` and the final `cb` to call.
//
Lookup.prototype._forContact = function (contact, cb) {
    var self = this;
    this._opts.findNode(contact, this._targetId, function (err, contacts) {
        if (!err) {
            self._list.insertMany(contacts);
            var next = self._list.next();
            if (next) return self._forContact(next, cb);
        }
        --self._concurrents;
        if (self._concurrents === 0) {
            return cb(null, self._list.getContacts());
        }
    });
};

module.exports = Lookup;
