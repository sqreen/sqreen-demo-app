/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const SqreenSDK = require('sqreen-sdk');

const Utils = require('../util');
const ReportUtil = require('./reportUtil');
const InstruUtils = require('./utils');
const Metric = require('../metric');
const DefaultMetrics = require('../metric/default');
const Feature = require('../command/features');
const Logger = require('../logger');
const SignalUtils = require('../signals/utils');
const Fuzzer = require('../fuzzer');
const LegacyRecord = require('../../lib_old/instrumentation/record');

const InstruState = require('../instrumentation/state');

const WAF_RULE_NAME_START = 'waf_node'; // FIXME: remove when we do the proper thing in the WAF lib

/**
 *
 * @type {WeakMap<http.IncomingMessage, RecordTrace>}
 */
const STORE = module.exports.STORE = new WeakMap();

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

/** @typedef {{ mustReport: boolean, reportPayload: boolean, wafAttack: Object, perfMon: boolean, timeStart?: [number] }} RecordMeta */
/** @typedef {{ ip_addresses: string[], identifiers?: Object, traits?: Object }} RecordActor */

const RecordTrace = class extends SqreenSDK.Trace {

    /**
     *
     * @param {http.IncomingMessage} req
     * @param client_ip {string}
     * @param {boolean} perfMon
     */
    constructor(req, client_ip, perfMon) {

        super();
        STORE.set(req, this);
        Logger.INFO('Create Request Record');
        /**
         * @type RecordActor
         */
        this.actor = {
            ip_addresses: [client_ip]
        };

        // $lab:coverage:off$
        this.isRevealReplayed = Fuzzer.hasFuzzer() && Fuzzer.isRequestReplayed(req);
        // $lab:coverage:on$

        /**
         * @type RecordMeta
         * @private
         */
        this._meta = {
            mustReport: false,
            reportPayload: false,
            wafAttack: null,
            perfMon,
            isRevealReplayed: this.isRevealReplayed
        };

        if (this._meta.perfMon  === true) {
            this._meta.timeStart = process.hrtime();
        }
        this.wafAttack = undefined;
    }

    /**
     *
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     * @param {RecordMeta} meta
     */
    build(req, res, meta) {

        this.location_infra = { infra: SignalUtils.infra };

        const response = { status: res.statusCode };
        if (typeof res.getHeaders === 'function') {
            const headers = res.getHeaders(); // only available starting Node 7.7.0 https://nodejs.org/dist/latest-v10.x/docs/api/http.html#http_response_getheaders
            response.content_length = headers['content-length'] || headers['Content-Length'];
            response.content_type = headers['content-type'] || headers['Content-Type'];
        }
        const sanitized = [];
        const request = ReportUtil.mapRequestAndArrayHeaders(req, meta.reportPayload, sanitized);
        this.context_schema = 'http/2020-01-01T00:00:00.000Z';
        this.context = {
            request, response
        };

        // $lab:coverage:off$
        if (Fuzzer.hasFuzzer() && Fuzzer.isRequestReplayed(req)) {
            this.context_schema = 'reveal/2020-06-03T11_11_00_000Z';
            this.context.reveal = {
                session_id: Fuzzer.getSessionID(req)
            };
        }
        // $lab:coverage:on$

        this.actor.user_agent = this.context.request.user_agent;

        if (sanitized.length > 0) {
            if (this.context.request.path) {
                for (let i = 0; i < sanitized.length; ++i) {
                    try {
                        this.context.request.path = this.context.request.path.split(sanitized[i]).join(ReportUtil.SAFETY);
                    }
                    catch (_) {}
                }
            }
            this.context.request.path = ReportUtil.safeFromArray(this.context.request.path, sanitized, 0);
            if (meta.wafAttack !== null) {
                // we must sanitize the WAF attack
                meta.wafAttack.payload.infos.waf_data = JSON.stringify(ReportUtil.safeFromArray(JSON.parse(meta.wafAttack.payload.infos.waf_data), sanitized, 0));
                meta.wafAttack = undefined; // attack is already in the points
            }
        }
    }

    /**
     *
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     * @param {number} sqreenSum
     */
    close(req, res, sqreenSum) {

        const meta = this._meta;
        this._meta = undefined;
        this.isRevealReplayed = undefined;
        if (InstruState.enabled === false) {
            return;
        }

        if (TODO.reportExpressTable === true) {
            InstruUtils.collectRoutingTableAndReportIt(req.app, TODO.reportExpressTableCB);
            resetTODO();
        }

        if (meta === undefined) { // the record is already closed
            return;
        }

        if (meta.perfMon === true) {
            const requestTime = InstruUtils.mergeHrtime(process.hrtime(meta.timeStart));
            Metric.addObservations([
                [DefaultMetrics.NAME.REQ, requestTime],
                [DefaultMetrics.NAME.SQ, sqreenSum],
                [DefaultMetrics.NAME.PCT, 100.0 * sqreenSum / (requestTime - sqreenSum)]
            ], new Date());
        }

        if (meta.mustReport === false) {
            return; // nothing to do (in the future, report metrics here)
        }
        Logger.INFO('closing Request Record');
        this.build(req, res, meta);
        STORE.delete(req);
        this.BATCH.add(this);
    }

    identify(identifiers, traits) {

        this.actor.identifiers = identifiers;
        this.actor.traits = traits;
    }

    makeReport() {

        this._meta.mustReport = true;
        this._meta.reportPayload = true;
    }

    /**
     *
     * @param {string} ruleName
     * @param {string} attackType
     * @param {Boolean} test
     * @param {Boolean} block
     * @param {Boolean} beta
     * @param {object} infos
     * @param {Date} time
     * @param {[STLine]} stack_trace
     * @param {string} rpid
     */
    attack(ruleName, attackType, test, block, beta, infos, time, stack_trace, rpid) {

        this.makeReport();
        // TODO: update attack Type to map on OWASP
        const payload = {
            test, block, beta, infos
        };
        const point = this.addPoint(
            `sq.agent.attack.${attackType}`,
            `sqreen:rule:${rpid}:${ruleName}`,
            payload,
            time);
        point.payload_schema = SignalUtils.PAYLOAD_SCHEMA.ATTACK;
        point.location = { stack_trace };

        if (ruleName.indexOf(WAF_RULE_NAME_START) === 0) {
            this._meta.wafAttack = point;
        }
    }

    except(klass, message, infos, ruleName, rulesPack, time, backtrace) {

        this.makeReport();
        let source;
        const name = 'sq.agent.exception';
        if (ruleName !== undefined) {
            source = `sqreen:rule:${rulesPack}:${ruleName}`;
        }
        else {
            source = SignalUtils.SIGNAL_AGENT_VERSION;
        }
        const point = this.addPoint(name, source, { infos, message, klass }, time);
        point.location = { stack_trace: backtrace };
        point.payload_schema = SignalUtils.PAYLOAD_SCHEMA.EXCEPTIONS;
    }

    dataPoint(kind, nameEnd, infos, date) {

        // TODO: schema
        this.makeReport();
        this.addPoint(`${kind}:${nameEnd}`, `sqreen:agent:${kind}`, infos, date);
    }

    /**
     *
     * @param {string} name
     * @param {Object} args
     * @param {?string} kind
     */
    addSDK(name, args, kind) {

        // For now, name always === SDK_TYPE.TRACK
        if (kind === undefined) {
            kind = 'sdk';
        }

        let time;
        if (args[1] && args[1].timestamp) {
            time = args[1].timestamp;
            args[1].timestamp = undefined;
        }
        else {
            time = new Date();
        }
        const point = this.addPoint(`sq.${kind}.${args[0]}`,`sqreen:sdk:${name}`,  args[1], time);
        point.payload_schema = SignalUtils.PAYLOAD_SCHEMA.SDK_TRACK;
        this._meta.mustReport = true;
    }

    observe(observationList, date) {

        Metric.addObservations(observationList, date);
    }

};

module.exports.RecordTrace = RecordTrace;

/**
 *
 * @param {http.IncomingMessage} req
 * @param {?string} client_ip
 * @return *
 */
module.exports.lazyGet = function (req, client_ip) {

    if (client_ip === undefined) {
        client_ip = Utils.getXFFOrRemoteAddress(req);
    }

    if (!req) {
        return null;
    }
    const current = STORE.get(req) || LegacyRecord.STORE.get(req);
    if (current === undefined) {
        if (Feature.featureHolder.use_signals === true) {
            return new RecordTrace(req, client_ip, Feature.perfmon());
        }
        return new LegacyRecord.Record(req, client_ip);
    }
    return current;
};

module.exports.switchInstru = function (state) {

    InstruState.enabled = state;
    LegacyRecord.switchInstru(state);
};
