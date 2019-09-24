/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Logger = require('../logger');
const EVENT = require('../enums/events');
const BackEnd = require('../backend');
const Agent = require('../agent');

let BATCH_MODE = false;
let batchSize = 100;
let maxStaleness = 500 * 1000;
let timer;

// params: { batch_size: int, max_staleness: int }
module.exports.enableBatch = function (params) {

    batchSize = params.batch_size || batchSize;
    maxStaleness = params.max_staleness || maxStaleness;
    BATCH_MODE = true;
};

module.exports.disableBatch = function () {

    BATCH_MODE = false;
    timer = null;
};

const report = module.exports.reportBatch = function (eventQueue) {

    const size = eventQueue.length;

    if (size === 0) {
        return;
    }

    const list = [];
    for (let i = 0; i < size; ++i) {

        list.push(eventQueue.shift());
    }



    return BackEnd.batch(Agent.SESSION_ID(), list.map((evt) => Object.assign(evt.event || {}, { event_type: evt.type && evt.type.toLowerCase() })))
        .catch(() => {

            // something went wrong, let's keep the events
            for (let i = 0; i < list.length; ++i) {
                if (eventQueue.length > 5 * batchSize) {
                    break;
                }
                eventQueue.push(list[i]);
            }
        });
};

const placeTimer = function (eventQueue, force) {

    if (!timer || force) {
        clearTimeout(timer);
        timer = setTimeout(() => {

            report(eventQueue);
            timer = null;
            placeTimer(eventQueue);
        }, maxStaleness);
        timer.unref();
    }
};

const batch = module.exports._batch = function (eventQueue, force) {

    if (((eventQueue.length >= batchSize) || force) && Agent.SESSION_ID() && Agent.STARTED()) {

        report(eventQueue);
        placeTimer(eventQueue, true);
        return true;
    }

    placeTimer(eventQueue);

    return false;
};

const reporters = {
    [EVENT.TYPE.REQUEST_RECORD]: BackEnd.request_record,
    [EVENT.TYPE.ATTACK]: BackEnd.attack,
    [EVENT.TYPE.ERROR]: BackEnd.exception,
    [EVENT.TYPE.AGENT_MESSAGE]: BackEnd.agent_message,
    [EVENT.TYPE.DATA_POINT]: BackEnd.data_point
};

/**
 * Report an event to sqreen back-end
 */
const reportEvent = module.exports._reportEvent = function (evtHolder) {

    if (!evtHolder) {
        return Promise.resolve();
    }

    const reporter = reporters[evtHolder.type];

    if (reporter === undefined) {
        return Promise.resolve();
    }

    return reporter(Agent.SESSION_ID(), evtHolder.event);
};

/**
 * Called at each event addition in the queue
 * @param eventQueue
 * @returns {*}
 */
module.exports.trigger = function (eventQueue, force) {

    if (!eventQueue || eventQueue.length === 0) {
        Logger.DEBUG('trigger without queue');
        return Promise.resolve();
    }

    Logger.DEBUG(`trigger with an eventQueue of ${eventQueue.length} items`);

    if (!Agent.STARTED() || !Agent.SESSION_ID()) {
        Logger.WARN(`Sqreen can't send anything: { STARTED: ${Agent.STARTED()}, HAS_SESSION_ID: ${!!Agent.SESSION_ID()} }`);
        return Promise.resolve();
    }

    if (BATCH_MODE) {
        batch(eventQueue, force);
        return Promise.resolve();
    }
    const promiseQueue = [];
    for (let i = 0; i < eventQueue.length; ++i) {

        const event = eventQueue.shift();
        promiseQueue.push(reportEvent(event)
            .catch(() => {

                //if that fails again, we put it back at the end of the queue
                eventQueue.push(event);
                return Promise.resolve();
            }));

    }
    return Promise.all(promiseQueue);

};
