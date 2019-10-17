/**
 * Copyright (c) 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';
const Semver = require('semver');

const canLoadReveal = Semver.satisfies(process.version, '>= 6.0.0');

const HOLDER = {};

HOLDER.hasFuzzer = function () {

    return canLoadReveal;
};
//$lab:coverage:off$
if (canLoadReveal) {
    //$lab:coverage:on$

    HOLDER.main = require('./main');
    HOLDER.fuzzer = require('./fuzzer');
    HOLDER.metrics  = require('./metrics');
    HOLDER.stats  = require('./stats');
}

module.exports = HOLDER;
