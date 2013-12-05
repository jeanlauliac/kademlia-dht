'use strict';

var crypto  = require('crypto');

// Create an id from a `buffer`.
//
var Id = function (buf) {
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
Id.prototype.distanceTo = function (other) {
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
Id.prototype.equal = function (other) {
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
Id.prototype.at = function (i) {
    return (this._buf[i / 8 | 0] & (1 << (7 - i % 8))) > 0;
};

// Set the bit at the specified index. The index must be between the
// range [0, id.BIT_SIZE[.
//
Id.prototype.set = function (i, v) {
    var index = i / 8 | 0;
    var mask = 1 << (7 - i % 8);
    if (v)
        this._buf[index] |= mask;
    else
        this._buf[index] &= 255 ^ mask;
};

// Get the hex representation of the ID.
//
Id.prototype.toString = function () {
    return this._buf.toString('hex');
};

// Generate randomly a node identifer and call `cb(err, id)`.
//
Id.generate = function (cb) {
    crypto.randomBytes(Id.SIZE, function (err, buf) {
        if (err) cb(err);
        cb(null, new Id(buf));
    });
};

// Create an identifier from a String `key`.
//
Id.fromKey = function (key) {
    var shasum = crypto.createHash('sha1');
    shasum.update(key);
    return new Id(shasum.digest());
};

// Create an Array prefix from a String composed of 1s and 0s.
// Eg. '101' gives [true, false, true].
//
function convertPrefix(str) {
    var res = new Array(str.length);
    for (var i = 0; i < str.length; ++i)
        res[i] = str[i] === '1';
    return res;
}

// Create a predictable identifier from an Array of Boolean `prefix`. The
// prefix can also be a String of 0s and 1s.
//
Id.fromPrefix = function (prefix) {
    var id = Id.zero();
    if (typeof prefix === 'string')
        prefix = convertPrefix(prefix);
    if (prefix.length >= Id.BIT_SIZE)
        throw new Error('id prefix is too long');
    for (var j = 0; j < prefix.length; ++j)
        id.set(j, prefix[j]);
    return id;
};

// Create the zero identifier.
//
Id.zero = function () {
    var buf = new Buffer(Id.SIZE);
    for (var i = 0; i < Id.SIZE; ++i) {
        buf[i] = 0;
    }
    return new Id(buf);
}

module.exports = Id
