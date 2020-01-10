/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Metric = require('./index');
const Util = require('./util');

module.exports = class extends Metric {

    add(key_, value, date) {

        const key = Util.getKey(key_);
        if (key === null) {
            return;
        }
        this.process(date);
        if (typeof key_ === 'string') {
            this.currentValue[key] = this.currentValue[key] || { value: 0, length: 0 };
            this.currentValue[key].value += value;
            this.currentValue[key].length++;
        }
        else {
            this.currentObjectValue[key] = this.currentObjectValue[key] || { value: 0, length: 0 };
            this.currentObjectValue[key].value += value;
            this.currentObjectValue[key].length++;
            this.currentObjectValueKeys.add(key);
        }

    }

    build() {

        const current = this.currentValue;
        this.currentValue = {};

        Object.keys(current).forEach((key) => {

            this.currentValue[key] = current[key].value / current[key].length;
        });
    }
};
