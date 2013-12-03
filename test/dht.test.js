'use strict';

var Dht = require('../lib/dht.js');
var MockRpc = require('../lib/mock-rpc.js');

describe('Dht', function () {
    var dht;
    var rpc;
    var spyTarget = {
        ping: sinon.spy(function (contact, cb) {
            cb();
        })
    };

    beforeEach(function (cb) {
        spyTarget.reset();
        rpc = new MockRpc({lemon: spyTarget}, 'apple');
        Dht.spawn(rpc, function (err, inst) {
            dht = inst;
        });
    });

    describe('#ctor()', function () {
        it('should refuse bad RPC objects', function () {
            expect(function throwing() {
                new Dht({ping: function() {}});
            }).to.throw(Error);
        });
    });

    describe('#set()', function () {
        it('should add a value', function () {
            dht.set('foo', 12, function() {

            });
        });

    });
});
