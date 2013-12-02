'use strict';

var Bucket      = require('./bucket.js');
var Id          = require('./id.js');

// Associate Kademlia IDs with their endpoints. `localId` must be the ID of the
// local node, more close contacts are effectively stored than far contacts.
//
var RoutingTable = module.exports = function (localId) {
    this._root = new Bucket(RoutingTable.BUCKET_SIZE);
    if (!(localId instanceof Id))
        throw new Error('id must be a valid identifier');
    this._id = localId;
};

Object.defineProperty(RoutingTable, 'BUCKET_SIZE', {value: 20});

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
RoutingTable._splitBucket = function (bucket, nth) {
    var node = {left: new Bucket(RoutingTable.BUCKET_SIZE),
                right: new Bucket(RoutingTable.BUCKET_SIZE)};
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
    var newNode = RoutingTable._splitBucket(opt.bucket, opt.nth);
    if (opt.parent === null)
        this._root = newNode;
    else if (opt.parent.left === opt.bucket)
        opt.parent.left = newNode;
    else
        opt.parent.right = newNode;
    var bucket = opt.bit ? newNode.right : newNode.left;
    return bucket.store(contact);
};

// Store the contact if we can invalidate the oldest of the bucket, then call
// `cb(err, added)`.
//
RoutingTable._invalidateAndStore = function (contact, bucket, validate, cb) {
    var asyncCb = makeAsync(cb);
    if (validate === null) return asyncCb(null, false);
    validate(contact, function contactValidated(err, valid) {
        if (err) return cb(err);
        if (valid) return cb(null, false);
        bucket.shift();
        if (!bucket.store(contact))
            cb(new Error('inconsistent state'));
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

// Find the bucket closest to the specified ID. Return an object containing
// `{parent, bucket, allowSplit, nth, bit}`
//
RoutingTable.prototype.findBucket = function (contact) {
    var parent = null;
    var node = this._root;
    var allowSplit = true;
    for (var i = 0; i < Id.BIT_SIZE; ++i) {
        var bit = contact.id.at(i);
        allowSplit &= bit === this._id.at(i);
        if (node instanceof Bucket)
            return {parent: parent, bucket: node,
                    allowSplit: allowSplit, nth: i, bit: bit};
        parent = node;
        node = bit ? node.right : node.left;
    }
};

// Get the RoutingTable.BUCKET_SIZE known contacts closest from `id`.
// Ideally, it returns all contacts of the bucket closest to id. It completes
// with neighbour bucket contacts if RoutingTable.BUCKET_SIZE is not attained.
//
RoutingTable.prototype.find = function (id, cb) {

};

function nodeToString(node, indent) {
    var res = '';
    if (node instanceof Bucket) {
        res += new Array(indent).join(' ') + node.toString(indent + 4) + '\n';
    } else {
        res += new Array(indent).join(' ') + '+ left:\n';
        res += nodeToString(node.left, indent + 4);
        res += new Array(indent).join(' ') + '+ right:\n';
        res += nodeToString(node.right, indent + 4);
    }
    return res;
}

// Get a string representation.
//
RoutingTable.prototype.toString = function (indent) {
    if (typeof indent === 'undefined') indent = 0;
    return nodeToString(this._root, indent);
};
