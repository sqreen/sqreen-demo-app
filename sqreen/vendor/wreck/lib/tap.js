'use strict';
//$lab:coverage:off$

// Load modules

const Hoek = require('../../hoek/lib/index');
const Stream = require('stream');
const Payload = require('./payload');


// Declare internals

const internals = {};


module.exports = internals.Tap = function () {

    Stream.Transform.call(this);
    this.buffers = [];
};

Hoek.inherits(internals.Tap, Stream.Transform);


internals.Tap.prototype._transform = function (chunk, encoding, next) {

    this.buffers.push(chunk);
    next(null, chunk);
};


internals.Tap.prototype.collect = function () {

    return new Payload(this.buffers);
};
//$lab:coverage:on$
