/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';

/** @typedef  {{target_per_minute?: number, max_calls?: number, random?: number, max_duration_minutes?: number, max_calls?: number, calls?: number}} SamplerInstructionLine**/
const VALID_PRIMITIVES = new Set(['target_per_minute', 'max_calls', 'random', 'max_duration_minutes', 'calls']);
const SamplingLine = module.exports.SamplingLine = class {

    /**
     * @param {number} time
     * @return {number}
     */
    static timeToFlatMinute(time) {

        return Math.floor(time / 60000) * 60000;
    }

    /**
     * @param {SamplerInstructionLine} props
     */
    constructor(props) {

        /** @type {SamplerInstructionLine} */
        this.instructions = props;
        /** @type {boolean} */
        this.isFinished = false;
        /** @type {number} */
        this.max_duration_minutes = props.max_duration_minutes;
        if (this.max_duration_minutes !== undefined) {
            /** @type {number} */
            this.time_start = Date.now();
        }
        /** @type {number} */
        this.max_calls = props.max_calls;
        /** @type {number} */
        this.collected = 0;

        /** @type {number} */
        this.random = props.random;
        /** @type {number} */
        this.calls = props.calls;
        if (this.calls !== undefined) {
            /** @type {number} */
            this.call_offset = 0;
        }

        if (props.target_per_minute !== undefined) {
            /** @type {number} */
            this.target_per_minute = props.target_per_minute;
            /** @type {number} */
            this.minuteStart = SamplingLine.timeToFlatMinute(Date.now());
        }
        /** @type {number} */
        this.minuteCollected = 0;
    }

    /**
     * @return {boolean}
     */
    shouldCollectAndTick() {

        if (this.calls !== undefined) {
            ++this.call_offset;
            if (this.call_offset !== this.calls) {
                return false;
            }
            this.call_offset = 0;
        }
        if (this.random !== undefined && Math.random() < this.random) {
            return false;
        }

        const now = Date.now();
        if (this.max_duration_minutes !== undefined && now - this.time_start >= 60 * 1000 * this.max_duration_minutes) {
            this.isFinished = true;
            return false;
        }

        if (this.minuteStart !== undefined) {
            const currentMinuteStart = SamplingLine.timeToFlatMinute(now);
            if (currentMinuteStart === this.minuteStart && this.minuteCollected >= this.target_per_minute) {
                return false;
            }
            if (currentMinuteStart > this.minuteStart) {
                this.minuteStart = currentMinuteStart;
                this.minuteCollected = 0;
            }
            ++this.minuteCollected;
        }

        if (this.max_calls !== undefined && this.collected >= this.max_calls) {
            this.isFinished = true;
            return false;
        }
        ++this.collected;
        return true;
    }
};

const isValid = function (instructions) {

    const keyList = Object.keys(instructions);
    for (let i = 0; i < keyList.length; ++i) {
        const key = keyList[i];
        if (VALID_PRIMITIVES.has(key) === false) {
            return false;
        }
    }
    return true;
};

const EMPTY_TRIGGER = {};
module.exports.Sampler = class {

    /**
     * @param {SamplerInstructionLine[]} properties
     */
    constructor(properties) {

        if (Array.isArray(properties) === false) {
            throw new TypeError('Sampler properties must be an array');
        }

        // if there is no line, it must always return true
        this.alwaysTrue = properties.length === 0;

        /** @type {SamplingLine[]} */
        this.lines = properties
            .filter(isValid)
            .map((x) => new SamplingLine(x));
    }

    /**
     * @return {SamplerInstructionLine|null}
     */
    shouldCollectAndTick() {

        if (this.alwaysTrue === true) {
            return EMPTY_TRIGGER;
        }

        if (this.ended() === true) {
            return null;
        }

        let result = null;
        const toRemove = [];
        for (let i = 0; i < this.lines.length; ++i) {
            const line = this.lines[i];
            if (line.shouldCollectAndTick() === true) {
                result = line.instructions;
            }
            if (line.isFinished === true) {
                toRemove.push(line);
            }
        }

        // TODO: optimize
        if (toRemove.length > 0) {
            this.lines = this.lines.filter((x) => toRemove.indexOf(x) < 0);
        }

        return result;
    }

    /**
     * @return {boolean}
     */
    ended() {

        return this.lines.length === 0;
    }
};



