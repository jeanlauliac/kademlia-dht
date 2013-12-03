'use strict';

var MockRpc = require('../lib/mock-rpc.js');
var Id = require('../lib/id.js');

var SOURCE_ENDPOINT = 'localhost:9876';
var TARGET_ENDPOINT = 'localhost:4321';

var SOURCE_ID = Id.fromKey('fake');

describe('MockRpc', function () {
    var rpc, rpc2;

    beforeEach(function () {
        rpc = new MockRpc(SOURCE_ENDPOINT);
        rpc2 = new MockRpc(TARGET_ENDPOINT);
    });

    describe('#ping()', function () {
        it('should ping', function (cb) {
            var targetSpy = {
                ping: sinon.spy(function (contact, reply) {
                    contact.id.should.equal(SOURCE_ID);
                    contact.endpoint.should.equal(SOURCE_ENDPOINT);
                    reply();
                })
            };
            rpc2.recipient(targetSpy);
            rpc.ping(TARGET_ENDPOINT, SOURCE_ID, function (err) {
                should.not.exist(err);
                targetSpy.ping.should.be.have.been.called;
                cb();
            });
        });

        it('should timeout when no answer', function (cb) {
            var targetSpy = {
                ping: sinon.spy()
            };
            rpc2.recipient(targetSpy);
            rpc.ping(TARGET_ENDPOINT, SOURCE_ID, function(err) {
                should.exist(err);
                err.code.should.equal('ETIMEDOUT');
                targetSpy.ping.should.be.have.been.called;
                cb();
            });
        });

        it('should timeout when no remote node', function (cb) {
            rpc.ping('invalid endpoint', SOURCE_ID, function (err) {
                should.exist(err);
                err.code.should.equal('ETIMEDOUT');
                cb();
            });
        });
    });
});
