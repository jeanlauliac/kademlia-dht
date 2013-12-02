'use strict';

var chai = require('chai');
var sinon = require("sinon");
var sinonChai = require("sinon-chai");
var nodeMock = require('../lib/node-mock.js');

var should = chai.should();
chai.use(sinonChai);

describe('NodeMock', function () {
    var network, node1, node2, node3;

    before(function () {
        network = new nodeMock.NetworkMock();
        node1 = new nodeMock.NodeMock(network);
        node2 = new nodeMock.NodeMock(network);
        node3 = new nodeMock.NodeMock(network);
    });

    after(function () {
        node3.close();
        node2.close();
        node1.close();
    });

    describe('#ping()', function () {
        it('should ping', function (cb) {
            var pingSpy = sinon.spy(function (endpoint, , reply) {
                contact.endpoint.should.equal(node1.endpoint);
                reply();
            });
            node2.once('ping', pingSpy);
            node1.ping(node2.endpoint, null, function (err) {
                should.not.exist(err);
                pingSpy.should.be.have.been.called;
                cb();
            });
        });

        it('should timeout when no answer', function (cb) {
            var pingSpy = sinon.spy(function () {
            });
            node2.once('ping', pingSpy);
            node1.ping(node2.endpoint, function(err) {
                should.exist(err);
                err.code.should.equal('ETIMEDOUT');
                pingSpy.should.be.have.been.called;
                cb();
            });
        });

        it('should timeout when no remote node', function (cb) {
            node1.ping('invalid endpoint', function (err) {
                should.exist(err);
                err.code.should.equal('ETIMEDOUT');
                cb();
            });
        });
    });
});
