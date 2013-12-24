'use strict';

var Id = require('./id.js');
var Contact = require('./contact.js');

// Store contacts ordered from oldest to latest. A contact is an object
// containing its `id` and arbitrary `endpoint` information.
//
var Bucket = function (capacity) {
    this._store = [];
    if (typeof capacity !== 'number' || capacity <= 0)
        throw new Error('invalid bucket capacity');
    Object.defineProperty(this, 'capacity', {value: capacity});
};

// Store a new contact. Return `false` if there's no more space in the bucket.
// Moves the contact at the tail if it exists already.
//
Bucket.prototype.store = function (contact) {
    this.remove(contact);
    if (this._store.length == this.capacity)
        return false;
    this._store.push(contact);
    return true;
};

// Remove a contact. Return `true` if the contact has been removed, `false`
// if it is nowhere to be found.
//
Bucket.prototype.remove = function (contact) {
    if (!(contact instanceof Contact))
        throw new Error('invalid or null contact');
    for (var i = 0; i < this._store.length; ++i) {
        if (this._store[i].id.equal(contact.id)) {
            this._store.splice(i, 1);
            return true;
        }
    }
    return false;
};

// Obtain `n` contact or less from the bucket.
//
Bucket.prototype.obtain = function (n) {
    if (typeof n === 'undefined') n = this._store.length;
    if (this._store.length <= n) return this._store;
    return this._store.slice(0, n);
};

// Split a bucket into two new buckets `left` and `right`. The split is made by
// checking the `nth` bit of each contact id. Return an object with 'left' and
// 'right' buckets.
//
Bucket.prototype.split = function (nth, left, right) {
    for (var i = 0; i < this._store.length; ++i) {
        var contact = this._store[i];
        if (contact.id.at(nth))
            right.store(contact);
        else
            left.store(contact);
    }
};

// Get a string representation.
//
Bucket.prototype.toString = function () {
    var res = '<( ';
    for (var i = 0; i < this._store.length; ++i) {
        res += this._store[i].toString(true) + ' ';
    }
    if (this.length < this.capacity)
        res += ':' + (this.capacity - this.length) + ': ';
    res += ')>';
    return res;
};

// Get the current bucket size.
//
Object.defineProperty(Bucket.prototype, 'length', {
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

module.exports = Bucket;
