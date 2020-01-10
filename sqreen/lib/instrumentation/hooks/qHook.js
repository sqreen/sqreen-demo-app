/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
// code inspired from https://github.com/othiym23/cls-q by Forrest L Norvell
const ns = require('./util').getNS();
const Shimmer = require('shimmer');

module.exports = function (identity, module) {

    const proto = module && module.makePromise && module.makePromise.prototype;
    if (!proto) {
        return false;
    }
    Shimmer.wrap(proto, 'then', (then) => {

        return function nsThen(fulfilled, rejected, progressed) {

            if (typeof fulfilled === 'function') {
                fulfilled = ns.bind(fulfilled);
            }
            if (typeof rejected === 'function') {
                rejected = ns.bind(rejected);
            }
            if (typeof progressed === 'function') {
                progressed = ns.bind(progressed);
            }
            return then.call(this, fulfilled, rejected, progressed);
        };
    });
    return true;
};
