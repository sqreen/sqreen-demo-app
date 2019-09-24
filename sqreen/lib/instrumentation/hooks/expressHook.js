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
                    req.__route = (req.__route || '') + (layer.__mountpath || '');
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


    const hasCookieParser = Util.hasCookieParser();

    // for lazyrouter see https://github.com/expressjs/express/blob/c087a45b9cc3eb69c777e260ee880758b6e03a40/lib/application.js#L137
    const lazyrouter = module.application.lazyrouter;
    const use = module.application.use;
    if (!hasCookieParser) {
        module.application.lazyrouter = function () {

            const res = lazyrouter.apply(this, arguments);
            if (!this.hasSqreenMiddleware) {
                this._router.use(Util.sqreenMiddleWare);
                this.hasSqreenMiddleware = true;
            }
            return res;
        };
    }
    else {
        module.application.use = function () {

            if (!this.hasSqreenMiddleware) {
                if (arguments[0].name === 'cookieParser') {
                    const result = use.apply(this, arguments);
                    use.apply(this, [Util.sqreenMiddleWare]);
                    this.hasSqreenMiddleware = true;
                    return result;
                }
            }
            return use.apply(this, arguments);
        };
    }


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
