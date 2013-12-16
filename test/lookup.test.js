'use strict';

var Id = require('../lib/id.js');
var Contact = require('../lib/contact.js');
var Lookup = require('../lib/lookup.js');

var BUCKET_SIZE = 5;

// Return random nodes kind of close to the `targetId`. 
//
function fakeFindNode(contact, targetId, cb) {
    setTimeout(function () {
        var res = [];
        for (var i = 0; i < BUCKET_SIZE; ++i) {
            res[i] = new Contact(Id.zero());
        }
        var b = 0;
        for (; b < Id.BIT_SIZE - 3; ++b) {
            if (contact.id.at(b) !== targetId.at(b)) break;
            for (i = 0; i < res.length; ++i) {
                res[i].id.set(b, targetId.at(b));
            }
        }
        for (i = 0; i < res.length; ++i) {
            res[i].id.set(b, i % 2 === 1);
            res[i].id.set(b + 1, (i >> 1) % 2 === 1);
            res[i].id.set(b + 2, (i >> 2) % 2 === 1);
        }
        for (b += 2; b < Id.BIT_SIZE; ++b) {
            for (i = 0; i < res.length; ++i) {
                res[i].id.set(b, Math.random() > 0.5);
            }
        }
        cb(null, res);
    }, 0);
}

var opts = {
    size: BUCKET_SIZE,
    concurrency: 3,
    findNode: fakeFindNode
};

it('fakeFindNode should return Ids closer to the target', function (cb) {
    var targetId = Id.fromHex('ab12');
    var baseId = Id.fromHex('abcd');
    fakeFindNode(new Contact(baseId), targetId, function (err, contacts) {
        should.not.exist(err);
        contacts.should.have.length(BUCKET_SIZE);
        fakeFindNode(contacts[0], targetId, function (err, innerContacts) {
            for (var i = 0; i < innerContacts.length; ++i) {
                var dist = targetId.compareDistance(innerContacts[i].id,
                                                    baseId);
                dist.should.be.at.least(0, 'contact ' + i);             
            }
            cb();
        });
    });
});

describe('Lookup', function () {
    describe('.proceed()', function () {
        it('should callback with empty when it got no seed', function (cb) {
            Lookup.proceed(Id.fromHex('abab'), [], opts,
                           function (err, contacts) {
                contacts.should.have.length(0);
                cb();
            });
        });

        it('should callback with closest nodes', function (cb) {
            var seedHexs = ['ab12', 'acbd', 'f123'];
            var seeds = seedHexs.map(function (h) {
                return new Contact(Id.fromHex(h));
            });
            var id = Id.fromHex('abcd', '34');
            Lookup.proceed(id, seeds, opts, function (err, contacts) {
                var max = Id.fromHex('abcd', '0100');
                for (var i = 0; i < contacts.length; ++i) {
                    id.compareDistance(contacts[i].id, max)
                      .should.be.at.least(0);
                }
                cb(); 
            }); 
        });
    });
});
