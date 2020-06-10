/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const EcosystemInterface = require('../ecosystem/ecosystemInterface');
const MainUtils = require('../util');
const Whitelist = require('./whitelist');
const Actions = require('../actions');
const TracingInterface = require('./tracingInterface');
const Ecosystem = require('sq-ecosystem');

const NAME = 'transport';
const transportInterface = module.exports = new EcosystemInterface(NAME);


const FINISHED_TRANSACTIONS = new WeakSet();

transportInterface.utils = {
    getXFFOrRemoteAddress: function () {

        return require('../util').getXFFOrRemoteAddress.apply(this, arguments);
    },
    ensureProperIP: function () {

        return require('../util').ensureProperIP.apply(this, arguments);
    }
};

const ACTIONS = {
    PREVENT: 'prevent',
    NONE: 'none'
};
const checkIPandPath = function (ipAddress, req, res) {

    const whiteListRange = Whitelist.ipIsWhiteListed(ipAddress);
    const whiteListPath = Whitelist.pathIsWhiteListed(req.url);
    if (whiteListRange || whiteListPath) {

        req._sqreen_ip_whitelist = true;

        const Feature = require('../command/features');
        if (Feature.read().whitelisted_metric) {

            const Metric = require('../metric'); // FIXME: what if not signal?
            Metric.addObservations([['whitelisted', whiteListRange || whiteListPath, 1]], new Date());
        }
        return ACTIONS.NONE;
    }
    // Test for actions (block and redirect)
    if (Actions.shouldLetThisGo(req, res, ipAddress) === false) {
        return ACTIONS.PREVENT;
    }
    return ACTIONS.NONE;
};
transportInterface.ipAndPath = {
    ACTIONS, checkIPandPath
};

const checkReference = function (reference) {

    if (typeof reference !== 'object' || reference === null) {
        throw new Error('Invalid reference object');
    }
};

transportInterface.getHttpTrace = function (reference, ip) {

    checkReference(reference);
    return require('./record').lazyGet(reference, ip);
};

const unrefHttpTrace = function (httpTrace, req) {

    const legacy = httpTrace.isLegacyRecord;
    if (legacy === true) {
        require('./../../lib_old/instrumentation/record').STORE.delete(req);
    }
    else {
        require('./record').STORE.delete(req); // paranoia
    }
};


module.exports.stopIncomingTransaction = function (reference, cb) {

    checkReference(reference);
    if (FINISHED_TRANSACTIONS.has(reference)) {
        return;
    }
    FINISHED_TRANSACTIONS.add(reference);
    return cb();
};

module.exports.stopHttpTransaction = function (req, res, record, budgetSum, budget, monitBudget) {

    const legacy = record.isLegacyRecord;
    try {
        if (legacy === true) { // TODO: move in a close transaction!
            record.close(req, budgetSum, budget, res, monitBudget);
        }
        else {
            record.close(req, res, budgetSum);
        }
        //$lab:coverage:off$
        if (process.sqreenAsyncListener !== undefined) {
            //$lab:coverage:on$
            process.sqreenAsyncListener.cleanup(req);
        }
    }
    catch (e) {
        require('../exception/index').report(e).catch(() => {});
        unrefHttpTrace(record, req);
    }
};

transportInterface.getSession = function () {

    return require('./hooks/util').getNS();
};

transportInterface.startIncomingTransaction = function (reference, cb) {

    checkReference(reference);

    const Features = require('../command/features');
    const budget = require('./budget').getBudget(Features.perfmon(), reference); // perf level enabled ?
    const monitBudget = require('./budget').getMonitoringBudget(Features.perfmon(), reference);
    const session = require('./hooks/util').getNS();

    session.run(() => {

        session.set('budget', budget);
        session.set('monitBudget', monitBudget);
        session.set('available_data', {}); // TODO with more stuff
        return cb(session, budget, monitBudget);
    });
};

const PropagateInfos = class { // one day, this might save us in debugging times

    constructor(fields, trigger) {

        this.fields = fields;
        this.trigger = trigger;
    }
};

const FIELDS = module.exports._FIELDS = ['transport', 'ip', 'host', 'tracing_identifier', 'client_ip'];

transportInterface.shouldPropagate = function (scope) {

    const trigger = TracingInterface.shouldTrace(scope);
    if (trigger === null) { // nothing to collect here
        return new PropagateInfos([], null);
    }
    return new PropagateInfos(FIELDS, trigger);
};

transportInterface.propagate = function (scope, resolve, trigger) {

    const session = require('./hooks/util').getNS(); // TODO: recheck

    if (trigger !== null) {
        const traced = Ecosystem.trace(scope, resolve);
        if (traced) {
            require('../signals/signalInterface')
                .createPoint(traced.signal_name)
                .trigger(trigger)
                .payload(traced.payload_schema, traced.payload)
                .report();
        }
    }
    // TODO: other things here (like the BA thingy)
    const ad = session.get('available_data');
    const keys = Object.keys(resolve);
    if (ad !== undefined) {
        Object.assign(ad, resolve);
    }

    return function () {

        if (ad !== undefined) {
            for (let i = 0; i < keys.length; ++i) {
                const k = keys[i];
                // const val = resolve[k];
                // if (ad[k] === val) {
                ad[k] = undefined;
                // }
            }
        }
    }; // cleanup function for BA
};
