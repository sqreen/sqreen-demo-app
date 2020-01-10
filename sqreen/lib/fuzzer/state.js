/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';

const Events = require('events');

class State extends Events.EventEmitter {
    constructor() {

        super();

        this.UNINITIALIZED = 0;
        this.RUNNING = 1;
        this.TERMINATING = 2;
        this.STOPPED = 3;

        this._state = this.UNINITIALIZED;
    }

    isUninitialized() {

        return this._state === this.UNINITIALIZED;
    }

    isRunning() {

        return this._state === this.RUNNING;
    }

    isTerminating() {

        return this._state === this.TERMINATING;
    }

    isStopped() {

        return this._state === this.STOPPED;
    }

    running() {

        this._state = this.RUNNING;
        this.emit('running');
    }

    terminating() {

        this._state = this.TERMINATING;
        this.emit('terminating');
    }

    stopped() {

        this._state = this.STOPPED;
        this.emit('stopped');
    }
};

module.exports = State;
