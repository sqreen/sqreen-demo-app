/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const ExpressListEndpoints = require('express-list-endpoints');

module.exports.getListSession = function (resultList) {

    for (let i = 0; i < resultList.length; ++i) {
        if (resultList[i].originalSession) {
            return resultList[i].originalSession;
        }
    }
    return null;
};

module.exports.mergeHrtime = function (time) {

    return time[0] * 1000 + time[1] * 1e-6; // sec * 1000 + 1e-6 * microsec
};

module.exports.collectRoutingTableAndReportIt = function (app, cb) {

    if (!app) {
        return cb(new Error('no Express app found'));
    }

    try {
        return cb(null, ExpressListEndpoints(app));
    }
    catch (e) {
        return cb(e);
    }

};
