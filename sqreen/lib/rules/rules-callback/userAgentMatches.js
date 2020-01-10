/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Http = require('http');
const MatcherRule = require('./matcherRule');
const CB_STATUS = require('../../enums/cbReturn').STATUS;

/**
 * Return the callback blocking unwanted user agents
 * @author vdeturckheim
 * @framework none
 * @target events['']['']['prototype:emit']
 * @param rule
 * @returns {{pre: pre}}
 */
module.exports.getCbs = function (rule_) {

    if (!rule_ || !rule_.data || !rule_.data.values) {
        //noinspection JSValidateTypes
        return;
    }

    const matcherList = MatcherRule.getMatcherList(rule_.data.values);

    return {
        pre: function (args, value, rule) {

            rule = rule || rule_;

            if (args[0] === 'request' && args[1] instanceof Http.IncomingMessage && args[2] instanceof Http.ServerResponse) {

                const userAgent = args[1].headers['user-agent'];

                if (!userAgent) {
                    return;
                }

                let match = false;
                let foundName = '';
                for (let i = 0; i < matcherList.length; ++i) {
                    const currentMatch = matcherList[i].matcher(userAgent);
                    if (currentMatch) {
                        match = true;
                        foundName = matcherList[i].name;
                        break;
                    }
                }
                if (match) {
                    const result = { record: { found: foundName } };
                    if (rule.block) {
                        result.status = CB_STATUS.RAISE;
                    }
                    return result;
                }
            }
        }
    };
};
