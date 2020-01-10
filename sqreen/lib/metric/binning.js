/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Metric = require('./index');

module.exports = class extends Metric {

    constructor(metric, options) {

        super(metric);
        this.base = options.base;
        this.factor = options.factor;
        this.logBase = Math.log(this.base);
        this.logFactor = Math.log(this.factor);
        this.invLogBase = 1 / this.logBase;
        this.addParcel = this.logFactor * this.invLogBase;
        this._initCurrent();
    }

    isEmpty() {

        return this.currentValue.v.max === 0; // only max
    }

    _initCurrent() {

        this.currentValue = { u: this.factor, b: this.base, v: { max: 0 } }; // TODO: this could be faster with an array
    }

    process(date, force) {

        super.process(date, force);
        if (this.currentValue.u === undefined) {
            this._initCurrent();
        }
    }

    add(value, date) {

        this.process(date);
        const bin = value < this.factor ? 1 : (2 + Math.floor(this.invLogBase * Math.log(value) - this.addParcel));
        this.currentValue.v[bin] = this.currentValue.v[bin] === undefined ? 1 : this.currentValue.v[bin] + 1;
        this.currentValue.v.max = Math.max(this.currentValue.v.max, value);
    }
};
