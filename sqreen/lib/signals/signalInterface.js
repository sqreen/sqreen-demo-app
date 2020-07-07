/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const SqreenSDK = require('sqreen-sdk');
const EcosystemInterface = require('../ecosystem/ecosystemInterface');

let NS;

const getNS = function () {

    if (NS === undefined) {
        NS = require('../instrumentation/hooks/ns').getNS();
    }
    return NS;
};

const getRecord = function () {

    return require('../instrumentation/record');
};

const NAME = 'signal';
const signalInterface = module.exports = new EcosystemInterface(NAME);

const PointBuilder = class {

    constructor(name) {

        const req = getNS().get('req');
        const record = getRecord().STORE.get(req);
        if (record) {
            this.point = record.addPoint(name, 'sqreen:agent');
            this.record = record;
        }
        else {
            this.point = new SqreenSDK.Point(name, 'sqreen:agent', new Date());
            this.record = null;
        }
    }

    actor(act) {

        this.point.actor = act;
        return this;
    }

    locationInfra(item) { // TODO: default from agent

        this.point.location_infra = item;
        return this;
    }

    location(item) {

        this.point.location = item;
        return this;
    }

    trigger(item) {

        this.point.trigger = item;
        return this;
    }

    payload(schema, payload) {

        this.point.payload_schema = schema;
        this.point.payload = payload;
        return this;
    }

    context(schema, context) {

        this.point.context_schema = schema;
        this.point.context = context;
        return this;
    }

    report() {

        if (this.record !== null) {
            this.record.makeReport();
        }
        else {
            this.point.batch();
        }
    }
};

signalInterface.createPoint = function (name) {

    return new PointBuilder(name);
};

