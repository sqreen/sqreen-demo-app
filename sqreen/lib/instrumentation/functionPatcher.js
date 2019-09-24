/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Logger = require('../logger');
const Shimmer = require('shimmer');

Shimmer({ logger: Logger.DEBUG }); // prevents the shimmer to write in the console

const Patch = require('./patch');

const isRo = function (holder, key, holderName, moduleIdentity) {

    try {
        const orig = holder[key];
        holder[key] = 1;
        holder[key] = orig;
        return false;
    }
    catch (err) {
        Logger.DEBUG(`method ${holderName}.${key} in ${moduleIdentity.name}/${moduleIdentity.relativePath} is read only`);
        return true;
    }
};

// there is no blind patching anymore
/*
const isNotToWrap = function (holder, key) {

    return holder[key].toString().indexOf('{ [native code] }') > -1;
};
*/

module.exports.patchFunction = function (holder, key, moduleIdentity, holderName) {

    if (key === '__unwrap' || key === '__original') {
        return;
    }

    holderName = holderName || '';

    // ensure that the property can be wrapped
    // ugly but working
    if (isRo(holder, key, holderName, moduleIdentity)) {
        return;
    }

    if (!holder[key] || holder[key].__sqreenable) {
        return;
    }

    Shimmer.wrap(holder, key, (original) => {

        return (new Patch(original, moduleIdentity, holderName, key)).instrumented;
    });

    const __unwrap = holder[key].__unwrap;
    const __original = holder[key].__original;
    const __wrapped = holder[key].__wrapped;

    Object.defineProperty(holder[key], '__unwrap', { enumerable: false, value: __unwrap });
    Object.defineProperty(holder[key], '__original', { enumerable: false, value: __original });
    Object.defineProperty(holder[key], '__wrapped', { enumerable: false, value: __wrapped });
    Object.defineProperty(holder[key], '__sqreenable', { enumerable: false, value: true });
};

module.exports._runCbs = Patch._runCbs;

// prevent issue due to circular deps
require('../rules/rules-callback/utils').init();
