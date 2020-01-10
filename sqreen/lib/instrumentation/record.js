/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const ReportUtil = require('./reportUtil');
const Util = require('../util');
const InstruUtils = require('./utils');
const Rules = require('../rules');
const Metric = require('../metric');
const DefaultMetrics = require('../metric/default');
const Events = require('../events');
const TYPE = require('../enums/events').TYPE;
const SDK_TYPE = require('../enums/sdk').TYPE;
const Feature = require('../command/features');
const FORMAT_VERSION = '20171208';
const Logger = require('../logger');

const WAF_RULE_NAME_START = 'waf_node'; // FIXME: remove when we do the proper thing in the WAF lib

const STORE = module.exports.STORE = new WeakMap();
let INSTRU_ENABLED = false;

const TODO = module.exports.TODO = {
    reportExpressTable: false,
    reportExpressTableCB: () => {}
};

const resetTODO = function () {

    TODO.reportExpressTable = false;
    TODO.reportExpressTableCB = () => {};
};
resetTODO();

module.exports.collectTable = function (cb) {

    TODO.reportExpressTable = true;
    TODO.reportExpressTableCB = cb;
};

const Record = class {

    constructor(req, client_ip) { // TODO: remove req to avoid storing in closure?

        Logger.INFO('Create Request Record');
        this.version = FORMAT_VERSION;
        this.rulespack_id = Rules.rulespack;
        this.client_ip = client_ip || Util.getXFFOrRemoteAddress(req);
        this.request = {};
        // this.response = {}; // TODO: future
        this.observed = {
            attacks: [],
            sqreen_exceptions: [],
            observations: [],
            data_points: [],
            // TODO: add agent_message here and spec it too
            sdk: []
        };
        this.identity = null;
        this.response = {};

        this.isClosed = false;
        this.mustReport = false;

        STORE.set(req, this);
        this.user = null;
        this.reportPayload = false;

        this.perfMon = Feature.perfmon();
        if (this.perfMon === true) {
            this.timeStart = process.hrtime();
        }
        this.isRevealReplayed = !!req.__sqreen_replayed;
        this.wafAttack = undefined;
    }

    attack(atk, rpid) {

        this.reportPayload = true;

        if (rpid) {
            this.rulespack_id = rpid;
        }
        if (atk.rule_name !== undefined && atk.rule_name.indexOf(WAF_RULE_NAME_START) === 0) {
            this.mustReport = true;
            this.wafAttack = atk; // there should be only 1 waf attack
            return;
        }
        this.observed.attacks.push(atk);
    }

    except(exc) {

        this.reportPayload = true;
        this.observed.sqreen_exceptions.push(exc);
    }

    observe(observationList, date) {

        date = date || new Date();
        for (let i = 0; i < observationList.length; ++i) {
            this.observed.observations.push({
                category: observationList[i][0],
                key: observationList[i][1],
                value: observationList[i][2],
                time: date
            });
        }
    }

    identify(record, traits) {

        this.identity = record;
        this.user = record;
        return this.addSDK(SDK_TYPE.IDENTIFY, [record, traits]);
    }

    pushDataPoints(dataPointList) {

        for (let i = 0; i < dataPointList.length; ++i) {
            this.observed.data_points.push(dataPointList[i]); // faster than concat
        }
    }

    addSDK(name, args) {

        let time;
        if (name === SDK_TYPE.TRACK) {
            this.mustReport = true;
            time = args[1].timestamp;
        }
        else {
            time = new Date();
        }
        this.observed.sdk.push({ time, name, args });
    }

    shouldReport() {

        return this.observed.attacks.length > 0 || this.observed.sqreen_exceptions.length > 0 || this.observed.data_points.length > 0;
    }

    reportMetric() {

        this.observed.observations.forEach((x) => {

            Metric.addObservations([[x.category, x.key, x.value]], x.time);
        });
    }

    report(req, res) {

        if (INSTRU_ENABLED === false) {
            Logger.INFO('Not reporting Request Record as agent is disabled.');
            return;
        }

        if (this.mustReport || this.shouldReport()) {
            Logger.INFO(`Reporting Request Record with ${this.observed.sdk.length} SDK events`);
            const sanitized = [];
            this.request = ReportUtil.mapRequestAndArrayHeaders(req, this.reportPayload, sanitized);
            if (sanitized.length > 0 && this.wafAttack) {
                this.wafAttack.infos.waf_data = JSON.stringify(ReportUtil.safeFromArray(JSON.parse(this.wafAttack.infos.waf_data), sanitized, 0));
            }
            if (this.wafAttack) {
                this.observed.attacks.push(this.wafAttack);
                this.wafAttack = undefined;
            }
            this.response = {
                status: res.statusCode
            };
            if (typeof res.getHeaders === 'function') {
                const headers = res.getHeaders(); // only available starting Node 7.7.0 https://nodejs.org/dist/latest-v10.x/docs/api/http.html#http_response_getheaders
                this.response.content_length = headers['content-length'] || headers['Content-Length'];
                this.response.content_type = headers['content-type'] || headers['Content-Type'];
            }

            Events.writeEvent(TYPE.REQUEST_RECORD, this);
            return;
        }
        Logger.INFO('Not reporting Request Record');
        return this.reportMetric();
    }

    close(req, sqreenSum, budget, res, monitBudget) {

        if (TODO.reportExpressTable === true) {
            InstruUtils.collectRoutingTableAndReportIt(req.app, TODO.reportExpressTableCB);
            resetTODO();
        }

        if (this.perfMon === true && INSTRU_ENABLED === true) {
            const requestTime = InstruUtils.mergeHrtime(process.hrtime(this.timeStart));
            Metric.addObservations([
                [DefaultMetrics.NAME.REQ, requestTime],
                [DefaultMetrics.NAME.SQ, sqreenSum],
                [DefaultMetrics.NAME.PCT, 100.0 * sqreenSum / (requestTime - sqreenSum)]
            ], new Date());
            this.timeStart = undefined; // won't be serialized
        }

        Logger.INFO('closing Request Record');
        this.user = null;
        this.perfMon = undefined; // won't be serialized

        if (this.isClosed) {
            return;
        }

        if (this.identity !== null) {
            this.observed.sdk.forEach((item) => {

                if (item.name !== SDK_TYPE.TRACK) {
                    return;
                }
                item.args[1] = item.args[1] || {};
                if (!item.args[1].user_identifiers) {
                    item.args[1].user_identifiers = this.identity;
                }
            });
        }

        this.isClosed = true;
        this.report(req, res);
        STORE.delete(req);
    }
};

module.exports.Record = Record;
module.exports.lazyGet = function (req, client_ip) {

    if (req === undefined || !req) {
        return null;
    }
    const current = STORE.get(req);
    if (current === undefined) {
        return new Record(req, client_ip);
    }
    return current;
};

module.exports.switchInstru = function (state) {

    INSTRU_ENABLED = state;
};
