'use strict';

var Id      = require('./id.js');

// Store contacts ordered from oldest to latest. A contact is an object
// containing its `id` and arbitrary `endpoint` information.
//
var Bucket = module.exports = function (capacity) {
    this._store = [];
    this._capacity = capacity;
};

// Store a new contact. Return `false` if there's no more space in the bucket.
// Moves the contact at the tail if it exists already.
//
Bucket.prototype.store = function (contact) {
    if (!(contact.id instanceof Id))
        throw new Error('the contact must have a valid id');
    for (var i = 0; i < this._store.length; ++i) {
        if (this._store[i].id.equal(contact.id)) {
            this._store.splice(i, 1);
            break;
        }
    }
    if (this._store.length == this._capacity)
        return false;
    this._store.push(contact);
    return true;
};

// Obtain `n` contact or less from the bucket.
//
Bucket.prototype.obtain = function (n) {
    if (typeof n === 'undefined') n = this._store.length;
    if (this._store.length <= n) return this._store;
    return this._store.slice(0, n);
};

// Eliminate the oldest contact.
//
Bucket.prototype.shift = function () {
    this._store.shift();
};

// Get a string representation.
//
Bucket.prototype.toString = function (indent) {
    if (typeof indent === 'undefined') indent = 0;
    var res = 'Bucket (' + this.size + '/' + this._capacity + ')\n';
    for (var i = 0; i < this._store.length; ++i) {
        res += new Array(indent).join(' ') +
               this._store[i].id.toString() + '\n';
    }
    return res;
};

// Get the current bucket size.
//
Object.defineProperty(Bucket.prototype, 'size', {
    get: function () { return this._store.length; }
});

// Get the oldest contact of the bucket. Return `null` if the bucket is
// empty.
//
Object.defineProperty(Bucket.prototype, 'oldest', {
    get: function () {
        if (this._store.length === 0) return null;
        return this._store[0];
    }
});
