/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Semver = require('semver');

let CLS;
//$lab:coverage:off$
if (Semver.satisfies(process.version, '< 8.2.0') || process.env.SQREEN_USE_CLS === '1') {
    CLS = require('../../../vendor/continuation-local-storage/context');
}
else {
    CLS = require('./clsAH');
}
//$lab:coverage:on$

const Shimmer = require('shimmer');

const shimBind = function (bind) {

    return function () {

        const fn = bind.apply(this, arguments);

        return function () {

            try {
                return fn.apply(this, arguments);
            }
            catch (err) {
                if (err && typeof err === 'object') {
                    err['error@context'] = undefined;
                }
                throw err;
            }
        };
    };
};

const shimRun = function (run) {

    return function () {

        try {
            return run.apply(this, arguments);
        }
        catch (err) {
            if (err && typeof err === 'object') {
                err['error@context'] = undefined;
            }
            throw err;
        }
    };
};

const getNSByName = module.exports.getNSByName = function (name) {

    if (CLS.getNamespace(name)) { // TODO: use expressive check here.
        return CLS.getNamespace(name);
    }
    const NS = CLS.createNamespace(name);

    // this will override the methods for all instances of NameSpace...
    const prototype = Object.getPrototypeOf(NS);
    if (prototype.bind.__wrapped !== true) {
        Shimmer.wrap(prototype, 'bind', shimBind);
        Shimmer.wrap(prototype, 'run', shimRun);
    }

    return NS;
};

module.exports.getNS = function () {

    return getNSByName('sqreen_session');
};

module.exports._shimBind = shimBind;
module.exports._shimRun = shimRun;
