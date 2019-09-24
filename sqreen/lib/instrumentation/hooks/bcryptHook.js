/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Shimmer = require('shimmer');
const NS = require('./util').getNS();

module.exports = function (identity, module) {

    Shimmer.massWrap(module, ['genSalt', 'hash', 'compare'], (original) => {

        return function () {

            const ln = arguments.length;
            const lastArg = arguments[ln - 1];
            if (typeof lastArg === 'function') {

                arguments[ln - 1] = NS.bind(lastArg);
            }
            return original.apply(this, arguments);
        };
    });
};

