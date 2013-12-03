'use strict';

global.chai = require('chai');
global.sinon = require('sinon');
global.should = global.chai.should();

var sinonChai = require('sinon-chai');
global.chai.use(sinonChai);
