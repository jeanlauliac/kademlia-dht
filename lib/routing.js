'use strict';

var Bucket = require('./bucket.js').Bucket;
var id = require('./id.js');

Object.defineProperty(exports, 'BUCKET_SIZE', {value: 20});

// Associate Kademlia IDs with endpoints.
//
exports.RoutingTable = function() {
    this._root = new Bucket(exports.BUCKET_SIZE);
};

// Store (or update) a contact.
//
exports.RoutingTable.prototype.store = function(contact) {
    var parent = null;
    var node = this._root;
    var self = this;
    for (var i = 0; i < id.SIZE * 8; ++i) {
        var bit = contact.id.at(i);
        if (!(node instanceof Bucket)) {
            parent = node;
            node = bit ? node.right : node.left;
            continue;
        }
        if (node.store(contact)) return false;
        if (i + 1 === id.SIZE * 8) {
            // TODO: check if it's possible to remove oldest node from the
            // bucket, then reinsert ours.
            break;
        }
        var newNode = exports.split(node, i);
        if (parent === null)
            self._root = newNode;
        else if (parent.left === node)
            parent.left = newNode;
        else
            parent.right = newNode;
        parent = newNode;
        node = bit ? newNode.right : newNode.left;
    }
};

// Get the `n` known contacts nearest from `id`.
//
exports.RoutingTable.prototype.getNearestFrom = function(id, n) {

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
exports.RoutingTable.prototype.toString = function(indent) {
    if (typeof indent === 'undefined') indent = 0;
    return nodeToString(this._root, indent);
}

// Split a bucket into a routing tree node. The split is made by checking
// the bit `n` of each contact id.
//
exports.split = function(bucket, n) {
    var node = {left: new Bucket(exports.BUCKET_SIZE),
                right: new Bucket(exports.BUCKET_SIZE)};
    var contacts = bucket.obtain();
    for (var i = 0; i < contacts.length; ++i) {
        var contact = contacts[i];
        if (contact.id.at(n))
            node.right.store(contact);
        else
            node.left.store(contact);
    }
    return node;
}
