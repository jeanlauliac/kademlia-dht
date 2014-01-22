'use strict';

var util = require('util');
var Id = require('./id.js');

function Contact(id, endpoint) {
    if (!(id instanceof Id))
        throw new Error('the contact must have a valid id');
    Object.defineProperty(this, 'id', {value: id});
    Object.defineProperty(this, 'endpoint', {value: endpoint});
}

Contact.prototype.toString = function (shortId) {
    var ids = this.id.toString(shortId);
    if (typeof this.endpoint === 'undefined')
        return ids;
    return util.format('%s/%s', ids, this.endpoint);
};

module.exports = Contact;
