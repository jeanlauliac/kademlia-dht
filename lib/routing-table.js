'use strict';

var Bucket      = require('./bucket.js');
var Id          = require('./id.js');

// Associate Kademlia IDs with their endpoints. `localId` must be the ID of the
// local node, more close contacts are effectively stored than far contacts.
//
var RoutingTable = function (localId, bucketSize) {
    if (!(localId instanceof Id))
        throw new Error('id must be a valid identifier');
    this._bucketSize = bucketSize;
    this._root = new Bucket(bucketSize);
    Object.defineProperty(this, 'id', {value: localId});
};

// Force a callback to be async.
//
function makeAsync(cb) {
    return function () {
        var args = arguments;
        process.nextTick(function () {
            cb.apply(null, args);
        });
    };
}

// Split a bucket into a routing tree node. The split is made by checking
// the `nth` bit of each contact id.
//
RoutingTable._splitBucket = function (bucket, nth, bucketSize) {
    var node = {left: new Bucket(bucketSize),
                right: new Bucket(bucketSize)};
    var contacts = bucket.obtain();
    for (var i = 0; i < contacts.length; ++i) {
        var contact = contacts[i];
        if (contact.id.at(nth))
            node.right.store(contact);
        else
            node.left.store(contact);
    }
    return node;
};

// Split a bucket, creating a new node, and insert the new contact. `this` is
// assumed to be the RoutingTable. The `opt.bucket` is split left/right
// depending on the `opt.nth` bit of the contact IDs.
//
RoutingTable.prototype._splitAndStore = function (contact, opt) {
    var newNode = RoutingTable._splitBucket(opt.bucket, opt.nth,
                                            this._bucketSize);
    if (opt.parent === null)
        this._root = newNode;
    else if (opt.parent.left === opt.bucket)
        opt.parent.left = newNode;
    else
        opt.parent.right = newNode;
    var bucket = opt.bit ? newNode.right : newNode.left;
    return bucket.store(contact);
};

// Test if we can invalidate the oldest of the bucket, and try to insert the
// contact anew if so, then call `cb(err, added)`.
//
RoutingTable._invalidateAndStore = function (contact, bucket, validate, cb) {
    var asyncCb = makeAsync(cb);
    if (validate === null) return asyncCb(null, false);
    validate(contact, function contactValidated(err, valid) {
        if (err) return cb(err);
        if (valid) return cb(null, false);
        // FIXME: validation is async, the state of the bucket may have
        // changed in-between. We need some safeguard.
        bucket.shift();
        if (!bucket.store(contact))
            return cb(new Error('inconsistent state'));
        return cb(null, true);
    });
};

// Store (or update) a contact. `validate(contact, cb)` is called async. when
// we need to check the validity of a contact and must call `cb(err, valid)`
// where `valid` is a boolean. `cb(err, added)` is called async. when it's
// done.
//
RoutingTable.prototype.store = function (contact, validate, cb) {
    if (typeof cb === 'undefined') {
        cb = validate;
        validate = null;
    }
    var asyncCb = makeAsync(cb);
    if (contact.id.equal(this.id))
        return asyncCb(null, false);
    var res = this.findBucket(contact);
    if (res.bucket.store(contact))
        return asyncCb(null, true);
    // FIXME: add the special mode splitting buckets even when we're not close.
    // The whitepaper is not very clear about it.
    if (!res.allowSplit || res.nth + 1 === Id.BIT_SIZE)
        return RoutingTable._invalidateAndStore(contact, res.bucket,
                                                validate, cb);
    this._splitAndStore(contact, res);
    return asyncCb(null, true);
};

// Store several contacts.
//
RoutingTable.prototype.storeSome = function (contacts, validate, cb) {
    if (typeof cb === 'undefined') {
        cb = validate;
        validate = null;
    }
    if (contacts.length === 0)
        return process.nextTick(function () {
            return cb();
        });
    this.store(contacts[contacts.length - 1], validate, function (err) {
        if (err) return cb(err);
        this.storeSome(contacts.slice(1), validate, cb);
    });
};

// Find the bucket closest to the specified ID. Return an object containing
// `{parent, bucket, allowSplit, nth, bit}`
//
RoutingTable.prototype.findBucket = function (contact) {
    var parent = null;
    var node = this._root;
    var allowSplit = true;
    for (var i = 0; i < Id.BIT_SIZE; ++i) {
        var bit = contact.id.at(i);
        allowSplit &= bit === this.id.at(i);
        if (node instanceof Bucket)
            return {parent: parent, bucket: node,
                    allowSplit: allowSplit, nth: i, bit: bit};
        parent = node;
        node = bit ? node.right : node.left;
    }
};

RoutingTable.prototype._find = function (id, rank, node, count, res) {
    if (node instanceof Bucket) {
        return res.concat(node.obtain(count - res.length));
    }
    if (id.at(rank)) {
        res = this._find(id, rank + 1, node.right, count, res);
        if (res.length < count)
            res = this._find(id, rank + 1, node.left, count, res);
    } else {
        res = this._find(id, rank + 1, node.left, count, res);
        if (res.length < count)
            res = this._find(id, rank + 1, node.right, count, res);
    }
    return res;
};

// Get the `count` known contacts closest from `id`.
// Ideally, it returns all contacts of the bucket closest to id. It completes
// with neighbour bucket contacts if RoutingTable.BUCKET_SIZE is not attained.
//
RoutingTable.prototype.find = function (id, count) {
    if (typeof count === 'undefined') count = this._bucketSize;
    return this._find(id, 0, this._root, count, []);
};

function nodeToString(node, prefix, indent) {
    var res = '';
    if (node instanceof Bucket) {
        res += new Array(indent).join(' ') + node.toString(indent + 4) + '\n';
    } else {
        res += new Array(indent).join(' ') + '+ ' + prefix + '0:\n';
        res += nodeToString(node.left, prefix + '0', indent + 4);
        res += new Array(indent).join(' ') + '+ ' + prefix + '1:\n';
        res += nodeToString(node.right, prefix + '1', indent + 4);
    }
    return res;
}

// Get a string representation.
//
RoutingTable.prototype.toString = function (indent) {
    if (typeof indent === 'undefined') indent = 0;
    return nodeToString(this._root, '', indent);
};

module.exports = RoutingTable
