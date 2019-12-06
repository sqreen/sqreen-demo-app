/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const UuidV4 = require('uuid/v4');
const OnFinished = require('on-finished');
const Record = require('../record');
const FunctionPatcher = require('../functionPatcher');
const Whitelist = require('../whitelist');
const Utils = require('../../util');
const Actions = require('../../actions/index');
const Budget = require('../budget');
const Fuzzer = require('../../fuzzer');

const isEmitter = module.exports.isEmitter = module.exports._isEmitter = function (emitter) {

    return !!emitter.on && !!emitter.addListener && !!emitter.emit;
};

const finished = new WeakSet();
const seen = new WeakSet();

module.exports.enable = function (module, identity) {

    if (seen.has(module)) {
        return module;
    }
    seen.add(module);

    const Features = require('../../command/features');

    const Server = module.Server;
    const addListener = Server.prototype.addListener;
    const session = require('./util').getNS();

    const holder = {
        end: function () {},
        request: function (ip) {

            return true;
        },
        request_second_hook: function () {

            return true;
        }
    };

    const cleanup = function (req, res, record, budgetSum, budget, monitBudget) {

        if (finished.has(req)) {
            return;
        }

        req.__sqreen = undefined;
        req.__sqreen_lookable = undefined;
        req.__sqreen_res = undefined;
        req.__sqreen_url = undefined;
        // req.__sqreen_uuid = undefined;
        if (record) {
            try {
                session.run(() => {

                    session.set('req', req);
                    session.set('res', res);
                    holder.end.apply(res, [req]);
                    record.close(req, budgetSum, budget, res, monitBudget);
                    if (process.sqreenAsyncListener !== undefined) {
                        process.sqreenAsyncListener.cleanup(req);
                    }
                });
            }
            catch (e) {
                require('../../exception').report(e).catch(() => {});
                Record.STORE.delete(req); // paranoia
            }
        }
        finished.add(req);
    };

    FunctionPatcher.patchFunction(holder, 'end', identity, 'ServerResponse.on');
    FunctionPatcher.patchFunction(holder, 'request', identity, 'Server.on');
    FunctionPatcher.patchFunction(holder, 'request_second_hook', identity, 'Server.on');

    Server.prototype.addListener = function (type, listener) {

        if (type === 'request') {
            //$lab:coverage:off$
            if (Fuzzer.hasFuzzer()) {
                //$lab:coverage:on$
                Fuzzer.registerServer(this);
            }

            return addListener.apply(this, [type, function (req, res) {

                if (!isEmitter(req) || !isEmitter(res)) {
                    return listener.apply(this, arguments);
                }

                const budget = Budget.getBudget(Features.perfmon(), req); // perf level enabled ?
                const monitBudget = Budget.getMonitoringBudget(Features.perfmon(), req);
                budget.startCount();

                const ipAddress = Utils.ensureProperIP(Utils.getXFFOrRemoteAddress(req)) || '';
                const whiteListRange = Whitelist.ipIsWhiteListed(ipAddress);
                const whiteListPath = Whitelist.pathIsWhiteListed(req.url);
                if (whiteListRange || whiteListPath) {

                    req._sqreen_ip_whitelist = true;

                    const Feature = require('../../command/features');
                    if (Feature.read().whitelisted_metric) {

                        const Metric = require('../../metric');
                        Metric.addObservations([['whitelisted', whiteListRange || whiteListPath, 1]], new Date());
                    }
                }
                else {
                    // Test for actions (block and redirect)
                    if (Actions.shouldLetThisGo(req, res, ipAddress) === false) {
                        return;
                    }
                }

                req.__sqreen_uuid = UuidV4();
                let record = Record.lazyGet(req, ipAddress);

                session.bindEmitter(req);
                session.bindEmitter(res);

                OnFinished(res, () => {

                    cleanup(req, res, record, budget.sum, budget, monitBudget);
                    record = undefined; // paranoid much
                });

                res.on('finish', () => {

                    cleanup(req, res, record, budget.sum, budget, monitBudget);
                    record = undefined; // paranoid much
                });

                // prevent double writing if request was sqreen_dropped
                // see rule-callback/utils.js:11
                const write = res.write;
                res.write = function () {

                    if (!this.__sqreen_finisehd) {
                        return write.apply(this, arguments);
                    }
                };

                session.run(() => {

                    // save url properly for sqreen
                    req.__sqreen_url = req.url;
                    req.__sqreen_res = res;

                    res.__original_end = res.end;

                    session.set('req', req);
                    session.set('res', res);
                    session.set('budget', budget);
                    session.set('monitBudget', monitBudget);

                    if (holder.request(ipAddress)) {
                        if (req._sqreen_ip_whitelist || holder.request_second_hook('request', req, res)) {
                            budget.stopCount();
                            return listener.apply(this, arguments);
                        }
                    }
                });
            }]);
        }

        return addListener.apply(this, arguments);
    };
    Server.prototype.on = Server.prototype.addListener; // see core: lib/events: EventEmitter.prototype.on = EventEmitter.prototype.addListener;
};
