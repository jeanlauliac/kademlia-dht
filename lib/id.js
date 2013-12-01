'use strict';

var crypto  = require('crypto');

// Standard size for ids, in bytes. It matchs the length of a SHA-1.
//
Object.defineProperty(exports, 'SIZE', {value: 20});
Object.defineProperty(exports, 'BIT_SIZE', {value: exports.SIZE * 8});

// Create an id from a `buffer`.
//
exports.Id = function(buf) {
    if (!(buf instanceof Buffer) || buf.length !== exports.SIZE)
        throw new Error('invalid buffer');
    this._buf = buf;
};

// Compute the distance between two node ids `a` and `b` expressed as Buffer.
//
exports.Id.prototype.distanceTo = function(other) {
    if (!(other instanceof exports.Id))
        throw new Error('can only compare to another identifier');
    var res = new Buffer(exports.SIZE);
    for (var i = 0; i < exports.SIZE; ++i) {
        res[i] = this._buf[i] ^ other._buf[i];
    }
    return res;
};

// Test if the id is equal to another.
//
exports.Id.prototype.equal = function(other) {
    if (!(other instanceof exports.Id))
        throw new Error('can only compare to another identifier');
    for (var i = 0; i < exports.SIZE; ++i) {
        if (this._buf[i] != other._buf[i]) return false;
    }
    return true;
};

// Extract the bit at the specified index. The index must be between the
// range [0, id.BIT_SIZE[.
//
exports.Id.prototype.at = function(i) {
    return (this._buf[i/8 | 0] & (1 << (7 - i%8))) > 0;
};

// Get the hex representation of the ID.
//
exports.Id.prototype.toString = function() {
    return this._buf.toString('hex');
};

// Generate randomly a node identifer and call `cb(err, id)`.
//
exports.generate = function(cb) {
    crypto.randomBytes(exports.SIZE, function(err, buf) {
        if (err) cb(err);
        cb(null, new exports.Id(buf));
    });
};

// Create a `key` identifier and call `cb(err, buffer)`.
//
exports.fromKey = function(key) {
    var shasum = crypto.createHash('sha1');
    shasum.update(key);
    return new exports.Id(shasum.digest());
};
