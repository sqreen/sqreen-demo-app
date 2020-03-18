/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
/**
 * This script contains the unique instance of the Sqreen agent.
 * The agent is the entity that holds the connection status (STARTED and SESSION_ID) with Sqreen Back-end
 * It is responsible for enabling the Sqreen avent loop
 */
'use strict';
require('../signals/utils'); // starts the signals here

const Logger = require('../logger');
const BackEnd = require('../backend');
const Command = require('../command');
const Exception = require('../exception');
const Features = require('../command/features');

const MetricReport = require('../metric/report');
const INTERNAL_MESSAGES = require('../enums/agent').INTERNAL_MESSAGES;

const getMessage = function () {

    if (Features.featureHolder.use_signals === true) {
        return require('../agent_message/index');
    }
    return require('../../lib_old/agent_message/index');
};

process.on(INTERNAL_MESSAGES.SQREEN_LOADED_TWICE, (data) => {

    const Message = getMessage();
    const text =  'Sqreen agent has been loaded twice in the application. The second instance will be ignored and SDK calls will be reported to first loaded agent.\n'
    + 'Sqreen can behave in unexpected manner.\n'
    + `Active Sqreen agent version ${data.existing} - disabled agent is version ${data.current}.`;

    const message = new Message(Message.KIND.agent_required_twice, text, {});
    message.report();
});

let STARTED = false; // server status
let SESSION_ID;
let currentHeartBeatLoop; // heartbeat loop currently running
// let failedHeartBeatCount = 0;

/**
 * the heartbeat loop happens in two sections:
 * s1: heartbeats are send every 15 sec
 * s2: heartbeats are send every 5 min
 * this timeout is used to trigger the loop change
 */
let timeOut;

/**
 * Get Agent status
 * @returns {boolean} agent status
 */
module.exports.STARTED = function () {

    return STARTED;
};

/**
 * Get session id used for exchanges with Sqreen back-end
 * @returns {string} session id
 */
module.exports.SESSION_ID = function () {

    return SESSION_ID;
};

module.exports.setSESSION_ID = function (id) {

    SESSION_ID = id;
};

/**
 * Sends a heartbeat and execute the commands returned
 */
const heartBeatWorker = module.exports._heartBeatWorker = function () {

    return BackEnd.heartBeat(SESSION_ID)
        .then((response) => {

            if (response.commands.length > 0) {

                for (let i = 0; i < response.commands.length; ++i){
                    Command.execute(response.commands[i])
                        .catch(Exception.report)
                        .catch(() => {});
                }
            }
        })
        .catch((err) => {

            // failedHeartBeatCount++;
            return Exception.report(err).catch(() => {});
        });
};

/**
 * sets interval on the heartbeat worker
 */
const startHeartBeatLoop = module.exports._startHeartBeatLoop = function (interval) {

    // Heartbeat can be forced using environment value
    //$lab:coverage:off$
    const config = require('../config/index').getConfig() || {};
    //$lab:coverage:on$
    interval = config.heartbeat_delay * 1000 || interval;

    require('../command/features').featureHolder.heartbeat_delay = interval / 1000;
    return setInterval(() => {

        heartBeatWorker();
    }, interval);
};

/*let metricloop;
 const metricLoopStarter = module.exports.metricLoopStarter = function (delay) {

 clearInterval(metricloop);
 metricloop = setInterval(() => {

 MetricReport.report();
 }, delay);
 metricloop.unref();
 };*/

/**
 * starter for the heartbeat loop
 */
const heartBeatLoopStarter = module.exports.heartBeatLoopStarter = function (options) {

    // unref are used to avoid preventing keeping the event loop alive
    clearInterval(currentHeartBeatLoop);
    currentHeartBeatLoop = startHeartBeatLoop(options.firstInterval);
    currentHeartBeatLoop.unref();

    // metricLoopStarter(options.secondInterval);

    if (options.changeIntervalAfter) {
        timeOut = setTimeout(() => {

            clearInterval(currentHeartBeatLoop);
            currentHeartBeatLoop = startHeartBeatLoop(options.secondInterval); // 5min * 60sec * 1000msec
            currentHeartBeatLoop.unref();
        }, options.changeIntervalAfter); // 1h = 60 min * 60 sec * 1000 msec
        timeOut.unref();
    }
    // MetricReport.startReport({ interval: options.firstInterval, lifetime: options.changeIntervalAfter }, { interval: options.secondInterval });
};

let currentLogin = null;
/**
 * Starts the agent with the provided config
 * @param Config config object
 * @param requiredBefore array of items required before the agent
 */
module.exports.start = function (Config, requiredBefore) {

    if (currentLogin) {
        return currentLogin;
    }

    requiredBefore = requiredBefore || [];

    currentLogin = BackEnd.login(Config.token, Config.app_name)
        .then((session_id) => {

            currentLogin = null;
            SESSION_ID = session_id;
            STARTED = true;
            return heartBeatWorker();
        })
        .catch((err) => {

            currentLogin = null;
            STARTED = false;
            return Promise.reject(err); // do not report error if not logged in.
        })
        .then(() => {

            const features = Features.read();
            if (!features.call_counts_metrics_period) {
                Features.change({
                    call_counts_metrics_period: 60
                });
            }
            if (!features.heartbeat_delay) {
                heartBeatLoopStarter({ firstInterval: 15 * 1000, changeIntervalAfter: 60 * 60 * 1000, secondInterval: 5 * 60 * 1000 });
            }

            if (Array.isArray(requiredBefore) && requiredBefore.length > 0) {

                const Message = getMessage();
                const text =  `The following modules were required before Sqreen. Sqreen may not be able to protect the whole application.
- ${requiredBefore.join('\n- ')}
If you think this is an error, please report it to Sqreen team.`;

                const message = new Message(Message.KIND.first_require, text, { libs: requiredBefore });
                message.report().catch(() => {});
            }
        });

    return currentLogin;
};

/**
 * clear all intervals and timeouts of the agent to keep the event loop lean
 */
const clearAll = module.exports._clearAll = function () {

    clearInterval(currentHeartBeatLoop);
    clearTimeout(timeOut);
};

/**
 * Method to logout from Sqreen back-end
 * @returns {*}
 */
module.exports.stop = function () {

    const isDev = process.env.NODE_ENV && process.env.NODE_ENV.startsWith('dev');

    Logger.DEBUG('Stopping Sqreen');
    if (STARTED && !isDev){

        const Evt = require('../events');
        Evt.drain();

        clearAll(); // clear all intervals and timeouts of the agent to keep the event loop lean
        return MetricReport.report(true)
            .then(() => BackEnd.logout(SESSION_ID))
            .then(() => {

                // logout success: update agent status
                STARTED = false;
                SESSION_ID = null;
                Logger.INFO('Sqreen is stopped now... see you soon !');
            })
            .catch(Exception.report).catch(() => Promise.resolve()) // logout failed, let's report that
            .then(() => Promise.resolve());
    }
    return Promise.resolve()
        .then(() => {

            Logger.INFO('Sqreen was already stopped !');
        });
};
