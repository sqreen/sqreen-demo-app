/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const NS = require('./util').getNS();
module.exports = function (identity, module) {

    const CLSBluebird = require('cls-bluebird');

    try {
        CLSBluebird(NS, module);
    }
    catch (_) {}
};
