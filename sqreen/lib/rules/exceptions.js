/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Features = require('../command/features');
const DataPoint = require('../data_point').DataPoint;

const VAL_HAD_EXCEPTION = 1;
const VAL_HAD_NO_EXCEPTION = 0;

// TODO: someday create a rule class for real Vlad!!
module.exports = class {

    constructor(rule) {

        this.ruleName = rule.name;
        this.rulesPack = rule.rulesPack;
        this.ema = 0;
        this.alpha = Features.read().exception_cap_alpha;
    }

    tick(had_exception, error) {

        const V = had_exception === true ? VAL_HAD_EXCEPTION : VAL_HAD_NO_EXCEPTION;
        this.ema += this.alpha * (V - this.ema);
        if (this.ema < Features.read().exception_cap_threshold_percentage / 100 * VAL_HAD_EXCEPTION) {
            return true;
        }

        error = error || new Error('failed Error');
        this.report(error);
        return false;
    }

    report(error) {

        const payload = {
            kind: 'rule_deactivated',
            exception_cap_alpha: this.alpha, // Related feature flags
            exception_cap_threshold_percentage: Features.read().exception_cap_threshold_percentage,
            current_ema_value: this.ema,
            current_had_exception: VAL_HAD_EXCEPTION,
            exception_klass: error.name,
            exception_message: error.message
        };

        return (new DataPoint(DataPoint.KIND.RULE, this.ruleName, this.rulesPack, payload, new Date()))
            .report();
    }
};

