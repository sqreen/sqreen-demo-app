/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const RegexpRule = require('./regexpRule');
const CB_STATUS = require('../../enums/cbReturn').STATUS;

const REQUEST_CACHE = new WeakSet();
const UARegexpCB = class {

    constructor(rule) {

        this.matcherList = rule.data.values.map((val) => RegexpRule.getRegexpMatcherObject(val));
        this.superMatcher = RegexpRule.getRegexpMatcherObject(rule.data.values.join('|'));
        this.rule = rule;
        const self = this;
        this.pre = function (args) {

            const req = args[1];
            if (args[0] === 'request' && req && req.headers) {
                if (REQUEST_CACHE.has(req)) {
                    return null;
                }
                REQUEST_CACHE.add(req);
                return  self.executePre(req.headers['user-agent'], args);
            }
            return null;
        };
    }

    executePre(userAgent, args) {

        if (!userAgent) {
            return null;
        }

        if (!this.superMatcher.match(userAgent)) {
            return null;
        }

        for (let i = 0; i < this.matcherList.length; ++i) {

            if (this.matcherList[i].match(userAgent)) {

                const result = { record: { found: this.matcherList[i].pattern }, originalSession: { req: args[1], res: args[2] } };
                if (this.rule.block) {
                    result.status = CB_STATUS.RAISE;
                }
                return result;
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

    return new UARegexpCB(rule_);
};
