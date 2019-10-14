/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';

const EventEmitter = require('events');

const listenerMixin = {
    _initListener() {

        this._listener = new EventEmitter();
    },
    _listener_guard() {

        // $lab:coverage:off$
        if (!this._listener) {
            throw new Error('_initListener not called!');
        }
        // $lab:coverage:on$
    },
    on(eventName, listener) {

        this._listener_guard();
        this._listener.on(eventName, listener);
    },
    once(eventName, listener) {

        this._listener_guard();
        this._listener.once(eventName, listener);
    },
    emit(eventName) {

        this._listener_guard();
        this._listener.emit.apply(this._listener, arguments);
    },
    removeAllListeners(eventName) {

        this._listener_guard();
        this._listener.removeAllListeners(eventName);
    }
};

module.exports.makeEventEmitter = function (cls) {

    Object.assign(cls.prototype, listenerMixin);
};
