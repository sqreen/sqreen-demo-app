'use strict';
const IP = require('ip');
const IPRouter = require('ip-router');
const Feature = require('../../command/features');
const Logger = require('../../logger');
const Utils = require('../../util');

const METRIC_NAME = 'blacklisted';

const CB = class {

    constructor(rangeList) {

        this.router = new IPRouter();
        const max = Feature.read().max_radix_size;
        if (rangeList.length > max) {
            const msg = `Tried to blacklist ${rangeList.length} IP addresses. MAX: ${max}`;
            Logger.INFO(msg);
            throw new Error(msg);
        }
        for (const range of rangeList) {
            this.router.insert(range, range);
        }
    }

    isBlocked(_ip) {

        const ip = Utils.ensureProperIP(_ip);
        if (ip === '' || (IP.isV4Format(ip) === false && IP.isV6Format(ip) === false)) {
            return null;
        }
        const dst = this.router.route(ip);
        if (dst === undefined) {
            return null;
        }
        return {
            status: 'raise',
            observations: [[METRIC_NAME, dst, 1]]
        };
    }
};

// goes to virtual request hook

module.exports.getCBs = function (rule) {

    const runner = new CB(rule.data.values);
    return {
        pre: (args) => runner.isBlocked(args[0])
    };
};


