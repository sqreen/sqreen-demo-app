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
        this.currentValue[strKey] = this.currentValue[strKey] || { value: 0, length: 0 };
        this.currentValue[strKey].value += value;
        this.currentValue[strKey].length++;
    }

    getValues() {

        const values = [];
        for (const keyTuple of this.currentKeys) {
            const curr = this.currentValue[keyTuple[0]];
            values.push({
                key: keyTuple[1],
                value: curr.value / curr.length
            });
        }
        return values;
    }
};
