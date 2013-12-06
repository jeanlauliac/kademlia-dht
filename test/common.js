'use strict';

global.chai = require('chai');
global.sinon = require('sinon');
global.should = global.chai.should();

var sinonChai = require('sinon-chai');
global.chai.use(sinonChai);

var Id = require('../lib/id.js');

function generateIdsRecur(arr, n, cb) {
    if (n === 0) return cb(null, arr);
    Id.generate(function (err, id) {
        if (err) return cb(err, arr);
        arr.push(id);
        generateIdsRecur(arr, n - 1, cb);
    });
}

// Generate an array of random IDs.
//
global.generateIds = function (n, cb) {
    generateIdsRecur([], n, cb);
};

