'use strict';

var crypto  = require('crypto');

// Create an id from a `buffer`.
//
var Id = module.exports = function(buf) {
    if (!(buf instanceof Buffer) || buf.length !== Id.SIZE)
        throw new Error('invalid buffer');
    this._buf = buf;
};

// Standard size for ids, in bytes. It matchs the length of a SHA-1.
//
Object.defineProperty(Id, 'SIZE', {value: 20});
Object.defineProperty(Id, 'BIT_SIZE', {value: Id.SIZE * 8});

// Compute the distance between two node ids `a` and `b` expressed as Buffer.
//
Id.prototype.distanceTo = function(other) {
    if (!(other instanceof Id))
        throw new Error('can only compare to another identifier');
    var res = new Buffer(Id.SIZE);
    for (var i = 0; i < Id.SIZE; ++i) {
        res[i] = this._buf[i] ^ other._buf[i];
    }
    return res;
};

// Test if the id is equal to another.
//
Id.prototype.equal = function(other) {
    if (!(other instanceof Id))
        throw new Error('can only compare to another identifier');
    for (var i = 0; i < Id.SIZE; ++i) {
        if (this._buf[i] != other._buf[i]) return false;
    }
    return true;
};

// Extract the bit at the specified index. The index must be between the
// range [0, id.BIT_SIZE[.
//
Id.prototype.at = function(i) {
    return (this._buf[i/8 | 0] & (1 << (7 - i%8))) > 0;
};

// Get the hex representation of the ID.
//
Id.prototype.toString = function() {
    return this._buf.toString('hex');
};

// Generate randomly a node identifer and call `cb(err, id)`.
//
Id.generate = function(cb) {
    crypto.randomBytes(Id.SIZE, function(err, buf) {
        if (err) cb(err);
        cb(null, new Id(buf));
    });
};

// Create a `key` identifier and call `cb(err, buffer)`.
//
Id.fromKey = function(key) {
    var shasum = crypto.createHash('sha1');
    shasum.update(key);
    return new Id(shasum.digest());
};
