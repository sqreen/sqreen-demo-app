/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const CB_STATUS = require('../../enums/cbReturn').STATUS;

module.exports.getCbs = function (rule_) {

    if (!rule_ || !rule_.data || !rule_.data.values || !rule_.data.values[0]) {
        //noinspection JSValidateTypes
        return;
    }
    const msToWait = rule_.data.values[0];
    const max = rule_.data.values[1] || 1e15;

    const pre = function () {

        const timeStart = Date.now();
        let sum = 0;
        for (let i = 0; i < max; ++i) {
            if (Date.now() - timeStart > msToWait) {
                break;
            }
            sum += Math.sqrt(i);
        }
        return {
            status: CB_STATUS.RAISE,
            record: {
                waited_for: Date.now() - timeStart,
                sum
            }
        };
    };
    pre.noBudget = true;

    return { pre };
};
