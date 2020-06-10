/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const InstrumentationInterface = require('../instrumentation/instrumentationInterface');
const TransportInterface = require('../instrumentation/transportInterface');
const TracingInterface = require('../instrumentation/tracingInterface');
const CommandInterface = require('../command/commandInterface');
const AgentInterface = require('../agent/agentInterface');
const SignalInterface = require('../signals/signalInterface');

const INTERFACES = new Map();
INTERFACES.set(InstrumentationInterface.name, InstrumentationInterface);
INTERFACES.set(TransportInterface.name, TransportInterface);
INTERFACES.set(CommandInterface.name, CommandInterface);
INTERFACES.set(AgentInterface.name, AgentInterface);
INTERFACES.set(TracingInterface.name, TracingInterface);
INTERFACES.set(SignalInterface.name, SignalInterface);

module.exports.getInterface = function (name) {

    return INTERFACES.get(name);
};
