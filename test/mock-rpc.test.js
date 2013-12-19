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

    it('#endpoint should be correct', function () {
        rpc.endpoint.should.equal(SOURCE_ENDPOINT);
    });

    describe('#send()', function () {
        it('should callback when the message is replied to', function (cb) {
            rpc2.receive('ping', sinon.spy(function (endpoint, payload, cb) {
                payload.id.should.equal(SOURCE_ID);
                endpoint.should.equal(SOURCE_ENDPOINT);
                cb();
            }));
            rpc.send('ping', TARGET_ENDPOINT, {id: SOURCE_ID}, function (err) {
                should.not.exist(err);
                rpc2.receive('ping').should.be.have.been.called;
                cb();
            });
        });

        it('should timeout when no answer', function (cb) {
            rpc2.receive('ping', sinon.spy());
            rpc.send('ping', TARGET_ENDPOINT, {id: SOURCE_ID}, function(err) {
                should.exist(err);
                err.code.should.equal('ETIMEDOUT');
                rpc2.receive('ping').should.be.have.been.called;
                cb();
            });
        });

        it('should timeout when no remote node', function (cb) {
            rpc.send('ping', 'invalid endpoint', {id: SOURCE_ID},
                     function (err) {
                should.exist(err);
                err.code.should.equal('ETIMEDOUT');
                cb();
            });
        });
    });
});
