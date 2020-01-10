/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const HeaderInsert = class {


    constructor(rule) {

        this.values = rule.data && rule.data.values || [];

        const self = this;
        this.pre = function (args, value, _, selfObject, session) {

            if (!session || !session.res) {
                return;
            }
            return self.action(session.res);
        };
    }

    action(res) {

        if (res.setHeader && !res._header) {
            for (let i = 0; i < this.values.length; ++i) {
                res.setHeader(this.values[i][0], this.values[i][1]);
            }
        }
    }
};



module.exports.getCbs = function (rule) {

    return new HeaderInsert(rule);
};
