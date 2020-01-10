/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const METRIC_NAME = 'http_code';

// http['']['']['OutgoingMessage.prototype:end'][0]

const pre = function (args, value, rule, selfObject) {

    if (selfObject.statusCode) {
        return { observations: [[METRIC_NAME, selfObject.statusCode + '', 1]] };
    }
};

pre.noBudget = true;

module.exports.getCbs = function () {

    return { pre };
};
