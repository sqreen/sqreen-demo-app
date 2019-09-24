/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Util = require('./utils');
const Flat = require('flat');
const Escape = require('escape-html');

const GetRegexpMatcherObject = require('./regexpRule').getRegexpMatcherObject;

// goes to sqreen[""][""].__sqreen_escape

const XSSCB = class {

    constructor(rule) {

        this.patternList = rule && rule.data && rule.data.values || [];
        this.block = !!rule && rule.block;
        const self = this;

        this.matchers = this.patternList.map((p) => GetRegexpMatcherObject(p));

        this.pre = function (args, value, _rule, selfObj, session) {

            if (!session.req) {
                return null;
            }

            let lookup = [];
            if ( session.req.__sqreen_xss_lookup) {
                lookup = session.req.__sqreen_xss_lookup;
            }
            else {
                const tmp = Flat(Util.getLookableClaims(session.req));
                const keys = Object.keys(tmp);
                for (let i = 0; i < keys.length; ++i) {
                    lookup.push(tmp[keys[i]]);
                }
                // lookup = new Set(Object.keys(tmp).map(k => tmp[k]));
                session.req.__sqreen_xss_lookup = lookup;
            }
            const str = args[0];

            self.action(str, lookup, args, session, rule);
            return {};
        };
    }

    action(insertedStr, lookup, args, session, rule) {

        if (lookup.indexOf(insertedStr) > -1) {

            for (let i = 0; i < this.matchers.length; ++i) {
                if (this.matchers[i].match(insertedStr)) {
                    if (this.block) {
                        args[0] = Escape(insertedStr);
                    }
                    setImmediate(() => {

                        require('../../instrumentation/patch')._actOnCbResult([{
                            record: { found: this.matchers[i].pattern, payload: insertedStr },
                            rule,
                            session
                        }], session);
                    });
                    return;
                }
            }
        }
    }
};

module.exports.getCbs = (r) => new XSSCB(r);
