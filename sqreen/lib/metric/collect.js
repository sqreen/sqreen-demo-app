/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Metric = require('./index');
const Util = require('./util');

module.exports = class extends Metric {

    add(realKey, value, date) {

        const strKey = Util.getKey(realKey);
        if (strKey === '') {
            return;
        }
        this.process(date);
        this.currentKeys.set(strKey, realKey);
        this.currentValue[strKey] = this.currentValue[strKey] || [];
        this.currentValue[strKey].push(value);
    }
};
