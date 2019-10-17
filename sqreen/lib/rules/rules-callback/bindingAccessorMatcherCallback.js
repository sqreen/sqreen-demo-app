'use strict';
const MatcherRule = require('./matcherRule');
const CB_STATUS = require('../../enums/cbReturn').STATUS;
const getCleanSession = require('./callbackBuilder').getCleanSession;
const bindThis = require('./callbackBuilder').bindThis;
const IUtil = require('../../instrumentation/utils');

const getTimeSpent = function (t0) {

    const time = process.hrtime(t0);
    return IUtil.mergeHrtime(time);
};

const MAX_LENGTH = 1024 * 128;

const BindingAccessorMatcherCallback = class {

    constructor(rule) {

        this.block = !!rule.block;
        this.data = rule.data.values
            .map((item) => {

                return {
                    binding_accessor: item.binding_accessor,
                    id: item.id,
                    matcher: MatcherRule.getMatcherList([item.matcher]),
                    min_length: item.matcher.min_length || (item.matcher.type === 'string' && item.matcher.value.length) || 0
                };
            });

        const self = this;
        this.pre = function (args, value, _, selfObject, session, timeout) {

            return self.action(session, args, timeout);
        };
    }

    action(sess, args, timeout) {

        const t0 = process.hrtime();
        sess = getCleanSession(sess);

        const cache = {};

        for (let i = 0; i < this.data.length; ++i) {
            const item = this.data[i];
            const matcher = item.matcher;

            for (let j = 0; j < item.binding_accessor.length; ++j) {

                // this is extremely hard to cover right. test should cover it but make CI very flacky
                //$lab:coverage:off$
                if (getTimeSpent(t0) >= timeout) {
                    return null;
                }
                //$lab:coverage:on$

                let input = '';
                if (cache[item.binding_accessor[j]] !== undefined) {
                    input = cache[item.binding_accessor[j]];
                }
                else {
                    input = bindThis.apply({ data: {} }, [item.binding_accessor[j], args, {}, {}, sess]);

                    if (!Array.isArray(input)) {
                        input = [input];
                    }
                    input = input.filter((x) => typeof x === 'string');
                    cache[item.binding_accessor[j]] = input;
                }


                for (let k = 0; k < input.length; ++k) {

                    // this is extremely hard to cover right. test should cover it but make CI very flacky
                    //$lab:coverage:off$
                    if (getTimeSpent(t0) >= timeout) {
                        return null;
                    }
                    //$lab:coverage:on$


                    const current = input[k];
                    if (current.length < item.min_length || current.length > MAX_LENGTH) {
                        continue;
                    }

                    if (matcher[0].matcher(current)) {

                        const result = {
                            record: {
                                id: item.id,
                                binding_accessor: item.binding_accessor[j],
                                matcher: matcher[0].name,
                                found: current
                            }
                        };

                        if (this.block) {
                            result.status = CB_STATUS.RAISE;
                        }
                        return result;
                    }
                }
            }
        }
        return null;
    }
};

module.exports.getCbs = function (rule) {

    if (!rule || !rule.data || !rule.data.values) {
        return null;
    }
    return new BindingAccessorMatcherCallback(rule);
};

module.exports._ = { BindingAccessorMatcherCallback };
