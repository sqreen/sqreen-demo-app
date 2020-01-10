/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const RegexpRule = require('./regexpRule');
const CB_STATUS = require('../../enums/cbReturn').STATUS;

const toArray = function (obj) {

    return Object.keys(obj).map((key) => ({ key, value: obj[key] }));
};

const getEnv = module.exports._getEnv = function (args) {

    // find the option object
    const MAX_ARG = 3;
    const MIN_ARG = 1;

    const nbArgs = Math.min(MAX_ARG, args.length);

    for (let i = MIN_ARG; i < nbArgs; ++i) {
        if (typeof args[i] === 'object' && !Array.isArray(args[i]) && args[i].hasOwnProperty
            && args[i].hasOwnProperty('env')) {
            return toArray(args[i].env);
        }
    }

    return toArray(process.env);
};

const ShellEnvCB = class {

    constructor(rule) {

        this.matcherList = rule.data.values.map((val) => RegexpRule.getRegexpMatcherObject(val));
        this.rule = rule;
        const self = this;
        this.pre = function (args) {

            return self.executePre(args);
        };
    }

    executePre(args) {

        const envList = getEnv(args);

        for (let i = 0; i < this.matcherList.length; ++i) {

            for (let j = 0; j < envList.length; ++j) {

                if (this.matcherList[i].match(envList[j].value)) {

                    const result = {
                        record: {
                            found: this.matcherList[i].pattern,
                            variable_name: envList[j].key,
                            variable_value: envList[j].value
                        }
                    };
                    if (this.rule.block) {
                        result.status = CB_STATUS.RAISE;
                    }
                    return result;
                }
            }
        }
        return null;
    }


};
module.exports.getCbs = function (rule_) {

    if (!rule_ || !rule_.data || !rule_.data.values) {
        //noinspection JSValidateTypes
        return null;
    }

    return new ShellEnvCB(rule_);
};
