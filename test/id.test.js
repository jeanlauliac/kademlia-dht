'use strict';

require('chai').should();
var Id = require('../lib/id.js');

describe('id', function() {
    it('#generate() should generate proper id', function(cb) {
        Id.generate(function(err, id) {
            if (err) cb(err);
            id._buf.length.should.equal(Id.SIZE);
            cb();
        });
    });

    it('#fromKey() should generate proper id', function() {
        var id = Id.fromKey('the cake is a lie');
        id._buf.length.should.equal(Id.SIZE);
    });

    describe('#distanceTo()', function() {
        it('should yield zero', function() {
            var id = Id.fromKey('the cake is a lie')
            var dist = id.distanceTo(id);
            for (var i = 0; i < dist.length; ++i)
                dist[i].should.equal(0);
        });

        it('should handle invalid ids', function() {
            var id = Id.fromKey('the cake is a lie');
            try {
                var dist = kadmelia.distance(id, 'fubar');
                throw new Error('failed');
            } catch (err) {}
        });

        it('should yield the correct distance', function() {
            var id = Id.fromKey('the cake is a lie');
            var id2 = Id.fromKey('fubar');
            var dist = id.distanceTo(id2);
            var target = 'd4a6bfe55a3715cad428cedd03de6e39a04b43b6';
            dist.toString('hex').should.equal(target);
        })
    });

    describe('#equal()', function() {
        it('should return true', function() {
            var id = Id.fromKey('the cake is a lie')
            id.equal(id).should.equal(true);
        });

        it('should return false', function() {
            var id = Id.fromKey('the cake is a lie');
            var id2 = Id.fromKey('fubar');
            id.equal(id2).should.equal(false);
        });
    });

    describe('#at()', function() {
        it('should let us reconstruct the id', function() {
            var id = Id.fromKey('the cake is a lie');
            var buf = new Buffer(new Array(Id.SIZE));
            for (var i = 0; i < Id.BIT_SIZE; ++i) {
                var bit = id.at(i);
                if (bit) buf[i/8 | 0] += 1 << (7 - i%8);
            }
            buf.toString('hex').should.equal(id.toString());
        });
    });
});
