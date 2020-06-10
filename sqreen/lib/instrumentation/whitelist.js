'use strict';
const IPRouter = require('ip-router');
const WHITELIST_ROUTER = new IPRouter();
let init = false;

const DefaultMetrics = require('../metric/default');

module.exports.ipIsWhiteListed = function (ip_address) {

    if (!init) {
        return '';
    }
    try {
        const res = WHITELIST_ROUTER.route(ip_address);
        if (res === undefined) {
            return '';
        }

        return res;
    }
    catch (_) {
        return '';
    }
};

module.exports.whitelistTheseIPs = function (rangeList) {

    WHITELIST_ROUTER.clear();
    for (let i = 0; i < rangeList.length; ++i) {
        WHITELIST_ROUTER.insert(rangeList[i], rangeList[i]);
    }
    init = true;
};

let list = [];
module.exports.whitelistThesePaths = function (pathList) {

    list = pathList;
};

module.exports.pathIsWhiteListed = function (path) {

    if (!path || typeof path !== 'string' || list.length === 0) {
        return '';
    }

    for (let i = 0; i < list.length; ++i) {
        if (path.indexOf(list[i]) === 0) {
            return list[i];
        }
    }
    return '';
};

DefaultMetrics.enableWhitelisted();
