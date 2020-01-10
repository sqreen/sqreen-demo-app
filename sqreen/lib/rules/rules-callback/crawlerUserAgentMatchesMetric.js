/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const MatcherRule = require('./matcherRule');

module.exports.getCbs = function (rule_) {

    if (!rule_ || !rule_.data || !rule_.data.values) {
        //noinspection JSValidateTypes
        return null;
    }

    const matcherList = MatcherRule.getMatcherList(rule_.data.values);

    return {
        pre: function (args) {

            const userAgent = args && args[0] && args[0].headers && args[0].headers['user-agent'];

            if (!userAgent) {
                return null;
            }

            for (let i = 0; i < matcherList.length; ++i) {
                const currentMatch = matcherList[i].matcher(userAgent);
                if (currentMatch) {
                    return { observations: [['crawler', userAgent, 1]] };
                }
            }
            return null;
        }
    };
};
