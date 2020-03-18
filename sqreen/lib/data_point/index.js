/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Event = require('../events');
const TYPES = require('../enums/events').TYPE;
const Logger = require('../logger');
const Feature = require('../command/features');

const DataPoint = class {

    constructor(kind, k1, k2, infos, date) {

        if (Feature.featureHolder.use_signals === true) {
            this.kind = kind;
        }
        this.signal_identifier = `${kind}:${k1}:${k2}`;
        this.time = date || new Date();
        this.infos = infos;
        Logger.INFO(`Creating data point for ${this.signal_identifier}`);
    }

    report() {

        Logger.INFO(`Reporting data point for ${this.signal_identifier}`);
        return Event.writeEvent(TYPES.DATA_POINT, this)
            .catch(() => {});
    }

    static reportList(list) {

        let p = Promise.resolve();
        for (let i = 0; i < list.length; ++i) {
            p = p.then(() => list[i].report()); // this will report them one by one
        }
        return p.catch(() => {});
    }
};

DataPoint.KIND = {
    RULE: 'rule',
    COMMAND: 'cmd'
};


module.exports.DataPoint = DataPoint;
module.exports.write = function (rule, infos) {

    return (new DataPoint(DataPoint.KIND.RULE, rule.rulesPack, rule.name, infos)).report();
};
