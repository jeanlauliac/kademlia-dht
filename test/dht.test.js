'use strict';

var Dht = require('../lib/dht.js');

var SOURCE_ENDPOINT = 'localhost:9876';
var TARGET_ENDPOINT = 'localhost:4321';

describe('Dht', function () {
    var dht;
    var rpc;
    var spyTarget = {
        ping: sinon.stub().callsArgAsync(2),
        store: sinon.stub().callsArgAsync(4),
        findNode: sinon.stub().callsArgAsync(3),
        findValue: sinon.stub().callsArgAsync(3)
    };

    beforeEach(function (cb) {
        spyTarget.ping.reset();
        spyTarget.store.reset();
        spyTarget.findNode.reset();
        spyTarget.findValue.reset();
        Dht.spawn(spyTarget, function (err, inst) {
            if (err) return cb(err);
            dht = inst;
            return cb();
        });
    });

    describe('#ctor()', function () {
        it('should refuse bad RPC objects', function () {
            (function throwing() {
                new Dht({ping: function() {}});
            }).should.throw(Error);
        });
    });

    describe('#set()', function () {
        it('should add a value', function () {
            dht.set('foo', 12, function() {

            });
        });

    });
});
