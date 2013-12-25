'use strict';

var Id = require('./id.js');
var Contact = require('./contact.js');

// Store contacts in a sorted manner, from closest to fartest from the
// specified `id`.
//
function LookupList(id, capacity) {
    if (!(id instanceof Id))
        throw new Error('invalid id or selfId');
    if (!(typeof capacity === 'number' && capacity > 0))
        throw new Error('invalid capacity');
    this._id = id;
    this._capacity = capacity;
    this._slots = [];
}

// Find an unprocessed contact from the list. Return `null` if all contacts
// in the list have been processed already.
//
LookupList.prototype.next = function () {
    for (var i = 0; i < this._slots.length; ++i) {
        if (!this._slots[i].processed) {
            this._slots[i].processed = true;
            return this._slots[i].contact;
        }
    }
    return null;
};

// Update the list with new discovered contacts.
//
LookupList.prototype.insertMany = function (contacts) {
    for (var i = 0; i < contacts.length; ++i) {
        this.insert(contacts[i]);
    }
};

// Update the list with a discovered `contact`. If the contact is known
// already, it is discarded. If the contact is more distant than the farthest
// of the list, it is discarded. Otherwise, it is inserted and the farthest
// contact of the list is discarded.
//
LookupList.prototype.insert = function (contact) {
    if (!(contact instanceof Contact))
        throw new Error('invalid contact');
    for (var i = 0; i < this._slots.length; ++i) {
        var slot = this._slots[i];
        var res = this._id.compareDistance(contact.id, slot.contact.id);
        if (res === 0) return;
        if (res < 0) continue;
        this._slots.splice(i, 0, {contact: contact, processed: false});
        if (this._slots.length > this._capacity) this._slots.pop();
        return;
    }
    if (this._slots.length < this._capacity)
        this._slots.push({contact: contact, processed: false});
};

// Remove a contact from the list. This is useful, for example, to remove
// unresponding contacts. Return `true` is the contact has been found and
// removed.
//
LookupList.prototype.remove = function (contact) {
    if (!(contact instanceof Contact))
        throw new Error('invalid contact');
    for (var i = 0; i < this._slots.length; ++i) {
        var slot = this._slots[i];
        var res = this._id.compareDistance(contact.id, slot.contact.id);
        if (res > 0) return false;
        if (res < 0) continue;
        this._slots.splice(i, 1);
        return true;
    }
    return false;
}; 

// Get all the known contacts.
//
LookupList.prototype.getContacts = function () {
    return this._slots.map(function (slot) {
        return slot.contact;
    });
};

// Get the current list length.
//
Object.defineProperty(LookupList.prototype, 'length', {
    get: function () { return this._slots.length; }
});

// Get the list capacity.
//
Object.defineProperty(LookupList.prototype, 'capacity', {
    get: function () { return this._capacity; }
});

// Get a string representation.
//
LookupList.prototype.toString = function (shortIds) {
    var res = '<[ ';
    for (var i = 0; i < this._slots.length; ++i) {
        res += this._slots[i].processed ? '[X]' : '[ ]';
        res += this._slots[i].contact.toString(shortIds) + ' ';
    }
    if (this._slots.length < this._capacity)
        res += ':' + (this._capacity - this._slots.length) + ': ';
    res += ']>';
    return res;
};

module.exports = LookupList;
