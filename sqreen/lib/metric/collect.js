/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
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
            this.currentValue[key] = this.currentValue[key] || [];
            this.currentValue[key].push(value);
        }
        else {
            this.currentObjectValue[key] = this.currentObjectValue[key] || [];
            this.currentObjectValue[key].push(value);
            this.currentObjectValueKeys.add(key);
        }

    }
};
