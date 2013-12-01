'use strict';

var events  = require('events');
var util    = require('util');
var crypto  = require('crypto');

exports.ID_SIZE = 20;
exports.BUCKET_SIZE = 20;
exports.LOOKUP_CONCURRENCY = 3;

// Generate randomly a node identifer and call `cb(err, buffer)`.
//
exports.generateId = function(cb) {
    crypto.randomBytes(exports.ID_SIZE, cb);
}

// Create a `key` identifier and call `cb(err, buffer)`.
//
exports.createKeyId = function(key) {
    var shasum = crypto.createHash('sha1');
    shasum.update(key);
    return shasum.digest();
}

// Compute the distance between two node ids `a` and `b` expressed as Buffer.
//
exports.distance = function(a, b) {
    if (a.length !== b.length) throw new Error('buffer sizes must be equal');
    var res = new Buffer(a.length);
    for (var i = 0; i < a.length; ++i) {
        res[i] = a[i] ^ b[i];
    }
    return res;
}

// Get the bucket index corresponding to distance `buf`.
//
exports.distanceIndex = function(buf) {
    var index = buf.length * 8;
    for (var i = 0; i < buf.length; ++i) {
        if (buf[i] === 0) {
            index -= 8;
            continue;
        }
        var oct = buf[i];
        var last = 8;
        while (oct > 0) {
            --last;
            oct >>>= 1;
        }
        index -= last;
        break;
    }
    return index - 1;
}

// Store buckets in a prefix-driven tree.
//
exports.RoutingTable = function() {

}

// Create a node.
//
exports.Node = function() {
    events.EventEmitter.call(this);
    this._routing = new Array(exports.ID_SIZE);
    for (var i = 0; i < this._buckets.length; ++i) {
        this._routing[i] = new Bucket();
    }
}

util.inherits(exports.Node, events.EventEmitter);
