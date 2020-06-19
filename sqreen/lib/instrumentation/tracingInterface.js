/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const NS = require('./hooks/ns').getNS();
const NSProvider = require('./hooks/ns');
const Sampling = require('../signals/sampling');
const EcosystemInterface = require('../ecosystem/ecosystemInterface');

const NAME = 'tracing';
const tracingInterface = module.exports = new EcosystemInterface(NAME);

const SCOPE_SAMPLING = new Map();

let tracingIdentifierPrefix = '';
tracingInterface.setTracingIdentifierPrefix = function (prefix) {

    tracingIdentifierPrefix = prefix;
};

tracingInterface.updateScopeSampling = function (scope, payload) {

    if (payload.enabled === false) {
        SCOPE_SAMPLING.delete(scope);
        return;
    }
    const sampling = new Sampling.Sampler(payload.sampling || [{}]);
    SCOPE_SAMPLING.set(scope, sampling);
};

tracingInterface.shouldTrace = function (scope) {

    const sampler = SCOPE_SAMPLING.get(scope);
    if (sampler !== undefined) {
        const res = sampler.shouldCollectAndTick();
        if (res !== null) {
            return res;
        }
    }
    const starSampler = SCOPE_SAMPLING.get('*');
    if (starSampler !== undefined) {
        return starSampler.shouldCollectAndTick();
    }
    return null; // by default we don't collect anything
};

tracingInterface.getTracingIdentifier = tracingInterface.getTracing_identifier = function (uuid) {

    const req = NS.get('req'); // Only works for HTTP for now
    if (req) {
        return tracingIdentifierPrefix + '.' + (uuid || req.__sqreen_uuid); // TODO: make agnostic someday
        // Also we will want to add this header to outgoing things but let's wait for this to be cleared out
    }
    return '';
};

tracingInterface.getAsyncStorage = NSProvider.getNSByName;
