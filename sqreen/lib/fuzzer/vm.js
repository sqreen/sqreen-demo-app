/**
 * Copyright (c) 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
// @ts-check
'use strict';

const Vm = require('vm');

const PROLOGUE = `
    exports = module.exports;
`;

// Whitelist of modules exposed in sandbox
const _modules_whitelist = {
};


const SAFE_REQUIRE = function (name) {

    const mod = _modules_whitelist[name];
    if (mod === undefined) {
        throw new Error('Unavailable module ' + name);
    }
    return mod;
};


const VM = module.exports.VM = class {
    /**
     * @param {string | undefined} code - A JavaScript code.
     */
    constructor(code) {

        this._init(code);
    }

    /**
     * @param {string | undefined} code - A JavaScript code.
     */
    _init(code) {

        code = code || '';
        const initialContext = {
            exports: null,
            module: { exports: {} },
            SHARED: {},
            require: SAFE_REQUIRE,
            SAFE_REQUIRE
        };
        this._context = Vm.createContext(initialContext);
        const prolog = VM.createScript(PROLOGUE);
        prolog.runInNewContext(this._context);
        const script = VM.createScript(code);
        script.runInContext(this._context);
    }

    /**
     * @param {string} code - A JavaScript code.
     * @returns {Vm.Script}
     */
    static createScript(code) {
        // @ts-ignore
        return Vm.createScript(code);
    }

    /**
     * @param {Vm.Script} script - A precompiled script.
     * @returns {function}
     */
    static runInVMContext(vm, script) {

        return function () {

            vm._context.SHARED.API_ARGS = arguments;
            vm._context.SHARED.API_RESULT = undefined;
            script.runInContext(vm._context);
            const result = vm._context.SHARED.API_RESULT;
            vm._context.SHARED.API_ARGS = null;
            vm._context.SHARED.API_RESULT = null;
            return result;
        };
    }

    /**
     * @param {Vm.Script} script - A precompiled script.
     * @returns {function}
     */
    runInContext(script) {

        const self = this;
        return function () {

            return VM.runInVMContext(self, script).apply(VM, arguments);
        };
    }

    /**
     * @param {string} classname
     * @param {string} name
     * @returns {Vm.Script}
     */
    static exportStaticAPI(classname, name) {

        return VM.createScript(`SHARED.API_RESULT = module.exports.${classname}.${name}.apply(module.exports.${classname}, SHARED.API_ARGS);`);
    }
};

module.exports.VMBinding = class VMBinding {
    /**
     * @param {VM} vm - A VM instance.
     * @param {string} classname - Name of the class to be binded.
     */
    constructor(vm, classname) {

        if (typeof vm !== 'object' || !vm._context) {
            throw new Error('Invalid VM object!');
        }

        if (typeof classname !== 'string' || !vm._context.module.exports.hasOwnProperty(classname)) {
            throw new Error('Invalid class name');
        }
        this._vm = vm;
        this._classname = classname;
        const ref = `REF_${this._classname}`;
        this._vm._context.SHARED[ref] = null;
        this._vm._context.SHARED.API_ARGS = [null].concat([].slice.call(arguments, 2));
        const prolog = VM.createScript(`SHARED.${ref} = new (Function.prototype.bind.apply(module.exports.${this._classname}, SHARED.API_ARGS));`);
        prolog.runInContext(this._vm._context);
        this._shadow = this._vm._context.SHARED[ref];
        this._vm._context.SHARED.API_ARGS = null;
        delete this._vm._context.SHARED[ref];
    }

    /**
     * Returns the reference to the underlaying shadow instance.
     *
     * @returns {object}
     */
    get shadow() {

        return this._shadow;
    }

    /**
    * @param {Vm.Script} script - A precompiled script.
    * @returns {function}
    */
    _runInContext(script) {

        const self = this;
        return function () {

            self._vm._context.SHARED.API_SELF = self._shadow;
            const result = self._vm.runInContext(script).apply(self._vm, arguments);
            self._vm._context.SHARED.API_SELF = null;
            return result;
        };
    }

    /**
     * @param {string} name
     * @returns {Vm.Script}
     */
    _exportAPI(name) {

        return VM.createScript(`SHARED.API_RESULT = SHARED.API_SELF.${name}.apply(SHARED.API_SELF, SHARED.API_ARGS);`);
    }

    /**
     * @param {string} name
     * @returns {Vm.Script}
     */
    _exportGetter(name) {

        return VM.createScript(`SHARED.API_RESULT = SHARED.API_SELF.${name};`);
    }
};
