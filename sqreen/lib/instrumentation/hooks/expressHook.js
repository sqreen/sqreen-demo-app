/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Patcher = require('../patcher');
const Modules = Patcher.savedModules;
const ns = require('./util').getNS();
const Shimmer = require('shimmer');
const Util = require('./util');

const SEEN = new WeakSet();

module.exports = function (identity, module) {

    try {
        if (SEEN.has(module)) {
            return;
        }
        SEEN.add(module);
    }
    catch (_) {}


    if (!Modules['express:lib/router/layer.js']) {
        return;
    }

    // These 2 next functions will add a __route item on req to track which endpoint has been used by express

    const wrap = function (origUse) {

        return function (pt) {

            let str = pt;
            if (str instanceof RegExp) {
                str = pt.toString();
            }

            if (typeof str !== 'string') {
                return origUse.apply(this, arguments);
            }

            this.__mountKey = this.__mountKey || { };

            //$lab:coverage:off$
            if (Array.isArray(this.stack)) {
                //$lab:coverage:on$
                const previousOffset = this.stack.length;
                const result = origUse.apply(this, arguments); // this.stack.length changes here
                try {
                    for (let i = previousOffset; i < this.stack.length; ++i) {
                        const layer = this.stack[i];
                        //$lab:coverage:off$
                        if (layer && layer.regexp && !layer.regexp.fast_slash) {
                            //$lab:coverage:on$
                            layer.__mountpath = str;
                            layer.__parentMountKey = this.__mountKey;
                        }
                    }
                }
                catch (_) {}
                return result;
            }
            //$lab:coverage:off$
            return origUse.apply(this, arguments);
            //$lab:coverage:on$
        };
    };
    try {
        Shimmer.wrap(module.Router, 'use', wrap);
        Shimmer.wrap(module.Router, 'route', wrap);
    }
    catch (e) {
        //$lab:coverage:off$
        require('../../exception').report(e).catch(() => {});
        //$lab:coverage:on$
    }

    try {
        Shimmer.wrap(module.Router, 'process_params', (origPP) => {

            return function (layer, called, req) {

                // TODO: test with exception handler!
                try {

                    if (req.__lastPath !== undefined && req.__lastPath.parent !== undefined && req.__lastPath.parent === layer.__parentMountKey) { // the two layers are siblings, they have the same parent, let's remove the previous one
                        //$lab:coverage:off$
                        const r0 = req.__route === undefined ? '' : req.__route;
                        //$lab:coverage:on$
                        req.__route = r0.slice(0, -1 * req.__lastPath.addedPath.length);
                    }

                    req.__route = (req.__route || '') + (layer.__mountpath || '');
                    req.__lastPath = { parent: layer.__parentMountKey, addedPath: layer.__mountpath || '' };
                }
                catch (_) {}

                return origPP.apply(this, arguments);
            };
        });
    }
    catch (e) {
        //$lab:coverage:off$
        require('../../exception').report(e).catch(() => {});
        //$lab:coverage:on$
    }


    const cookieAndBodyNames = ['cookieParser', 'jsonParser', 'rawParser', 'textParser', 'urlencodedParser']; // TODO: check by comparing methods... how?
    let rank = 0;
    const getMiddleWare = function () {

        const myRank = ++rank;
        return function (req, res, next) {

            if (myRank === rank) { // I am the last injected middleware
                return Util.sqreenMiddleWare.apply(this, arguments);
            }

            return next();
        };
    };

    // for lazyrouter see https://github.com/expressjs/express/blob/c087a45b9cc3eb69c777e260ee880758b6e03a40/lib/application.js#L137
    const lazyrouter = module.application.lazyrouter;
    const use = module.application.use;
    module.application.lazyrouter = function () {

        if (this._sq_lazy_done === true) {
            return lazyrouter.apply(this, arguments);
        }
        const res = lazyrouter.apply(this, arguments);
        this._router.use(getMiddleWare());
        this._sq_lazy_done = true;
        return res;
    };
    module.application.use = function () {

        if (cookieAndBodyNames.indexOf(arguments[0].name) > -1) {
            const result = use.apply(this, arguments);
            use.apply(this, [getMiddleWare()]);
            return result;
        }
        return use.apply(this, arguments);
    };


    for (let i = 0; i < Modules['express:lib/router/layer.js'].length; ++i) {

        if (!Modules['express:lib/router/layer.js'][i].module || !Modules['express:lib/router/layer.js'][i].module.prototype || !Modules['express:lib/router/layer.js'][i].module.prototype.handle_request) {
            continue;
        }

        Shimmer.wrap(Modules['express:lib/router/layer.js'][i].module.prototype, 'handle_request', (handle_request) => {

            return function (req, res, next) {

                const boundNext = ns.bind(next);

                if (!ns.get('req')) {
                    return ns.run(() => {

                        ns.set('req', req);
                        ns.set('res', res);
                        return handle_request.apply(this, [req, res, boundNext]);
                    });
                }
                return handle_request.apply(this, [req, res, boundNext]);
            };
        });
    }
};
