/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Logger = require('../logger');
const Action = require('./action');
const TYPES = require('../enums/events').TYPE;
const Util = require('util');

/**
 * Sqreen event queue
 */
const eventQueue = module.exports._eventQueue = [];
/**
 * Max length of the event queue
 */
const EVENT_QUEUE_MAX_LENGTH = 500;
const knownEvts = {};
knownEvts[TYPES.ATTACK] = new Set();
knownEvts[TYPES.ERROR] = new Set();
knownEvts[TYPES.DATA_POINT] = new Set();

/**
 * add a new event to the queue, this will trigger a reporting
 * @param type
 * @param evt
 * @returns {Promise}
 */
module.exports.writeEvent = function (type, evt) {

    Logger.INFO(`Writing event ${type}`);

    let force = false;
    // an attack for this rule has already been seen ?
    if (type === TYPES.REQUEST_RECORD) {

        for (let i = 0; i < evt.observed.attacks.length; ++i) {
            if (!knownEvts[TYPES.ATTACK].has(evt.observed.attacks[i].rule_name)) {
                knownEvts[TYPES.ATTACK].add(evt.observed.attacks[i].rule_name);
                force = true;
                break;
            }
        }

        if (!force) {
            for (let i = 0; i < evt.observed.sqreen_exceptions.length; ++i) {
                if (!knownEvts[TYPES.ERROR].has(evt.observed.sqreen_exceptions[i].rule_name)) {
                    knownEvts[TYPES.ERROR].add(evt.observed.sqreen_exceptions[i].rule_name);
                    force = true;
                    break;
                }
            }
        }
    }
    else if (evt.rule_name) {
        force = !knownEvts[type].has(evt.rule_name); // This will work for data point and attacks
        knownEvts[type].add(evt.rule_name);
    }
    // an exception exists f
    else if (evt.klass) {
        force = !knownEvts[type].has(evt.klass);
        knownEvts[type].add(evt.klass);
    }

    return new Promise((resolve) => {

        // It could be a setTimeout(f,0) if we do want to put this at the real end of the event loop
        setImmediate(() => {

            if (eventQueue.length >= EVENT_QUEUE_MAX_LENGTH){
                const shiftedEvt = eventQueue.shift();
                Logger.INFO(`Sqreen drops event ${Util.inspect(shiftedEvt)}`);
            }

            eventQueue.push({
                type,
                event: evt
            });


            Action.trigger(eventQueue, force);
            return resolve();
        });
    });
};

module.exports.drain = function () {

    Action.reportBatch(eventQueue);
};
