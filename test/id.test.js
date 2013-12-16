'use strict';

var Id = require('../lib/id.js');

describe('Id', function() {
    it('.generate() should generate proper id', function (cb) {
        Id.generate(function (err, id) {
            if (err) cb(err);
            id.toString().length.should.equal(Id.SIZE * 2);
            cb();
        });
    });

    it('.fromKey() should generate proper id', function () {
        var id = Id.fromKey('the cake is a lie');
        id.toString().should.equal('4e13b0c28e17087366ac4d67801ae0835bf9e9a1');
    });

    describe('.zero()', function() {
        it('should give a zero id', function () {
            var id = Id.zero();
            id.toString().should.equal('0000000000000000000000000000000000000000');
        });
    });

    describe('.fromPrefix()', function() {
        it('should work with an Array', function () {
            var id = Id.fromPrefix([false, true, true, false, true]);
            id.toString().should.equal('6800000000000000000000000000000000000000');
        });

        it('should work with a String', function () {
            var id = Id.fromPrefix('01101');
            id.toString().should.equal('6800000000000000000000000000000000000000');
        });
    });

    describe('.fromHex()', function () {
        it('should work with prefix', function () {
            var id = Id.fromHex('abcd');
            id.toString(true).should.equal('abcd0..00');
        });

        it('should work with both prefix and suffix', function () {
            var id = Id.fromHex('abcd', '1234');
            id.toString(true).should.equal('abcd0..34');
        });
    });

    describe('#distanceTo()', function () {
        it('should yield zero', function () {
            var id = Id.fromKey('the cake is a lie')
            var dist = id.distanceTo(id);
            for (var i = 0; i < dist.length; ++i)
                dist[i].should.equal(0);
        });

        it('should handle invalid ids', function () {
            var id = Id.fromKey('the cake is a lie');
            try {
                var dist = kadmelia.distance(id, 'fubar');
                throw new Error('failed');
            } catch (err) {}
        });

        it('should yield the correct distance', function () {
            var id = Id.fromKey('the cake is a lie');
            var id2 = Id.fromKey('fubar');
            var dist = id.distanceTo(id2);
            var target = 'd4a6bfe55a3715cad428cedd03de6e39a04b43b6';
            dist.toString('hex').should.equal(target);
        })
    });

    describe('#compareDistance()', function () {
        it('should work', function () {
            var id  = Id.fromPrefix('001100101');
            var id1 = Id.fromPrefix('011110011');
            var id2 = Id.fromPrefix('001010101');
            id.compareDistance(id1, id2).should.be.below(0);
            id.compareDistance(id2, id1).should.be.above(0);
            id.compareDistance(id1, id1).should.equal(0);
        });
    });

    describe('#equal()', function () {
        it('should return true', function () {
            var id = Id.fromKey('the cake is a lie')
            id.equal(id).should.equal(true);
        });

        it('should return false', function () {
            var id = Id.fromKey('the cake is a lie');
            var id2 = Id.fromKey('fubar');
            id.equal(id2).should.equal(false);
        });
    });

    describe('#at()', function () {
        it('should let us reconstruct the id', function () {
            var id = Id.fromKey('the cake is a lie');
            var buf = new Buffer(new Array(Id.SIZE));
            for (var i = 0; i < Id.BIT_SIZE; ++i) {
                var bit = id.at(i);
                if (bit) buf[i/8 | 0] += 1 << (7 - i%8);
            }
            buf.toString('hex').should.equal(id.toString());
        });
    });

    describe('#set()', function() {
        it('should let us fill the buffer', function () {
            var id = Id.zero();
            id.set(0, true);
            id.set(6, true);
            id.set(9, true);
            id.set(11, true);
            id.toString().should.equal('8250000000000000000000000000000000000000');
        });
    });
});
