/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Shimmer = require('shimmer');
const FunctionPatcher = require('../functionPatcher');
const ns = require('./util').getNS();

// TODO: someday, if the perf impact is too high, change for a lazy implementations
module.exports = function (identity, module) {

    const Server = module.Server;

    const holder = {
        onRequest: function (request) {},
        onPostAuth: function (request) {}
    };
    FunctionPatcher.patchFunction(holder, 'onRequest', identity, 'Server.ext');
    FunctionPatcher.patchFunction(holder, 'onPostAuth', identity, 'Server.ext');

    Shimmer.wrap(Server.prototype, 'connection', (original) => {

        return function () {

            const connection = original.apply(this, arguments);

            connection.ext({
                type: 'onRequest',
                method: function (request, reply) {

                    if (!ns.get('req')) {
                        return ns.run(() => {

                            ns.set('req', request.raw.req);
                            ns.set('res', request.raw.res);

                            holder.onRequest(request);
                            return reply.continue();
                        });
                    }
                    holder.onRequest(request);
                    return reply.continue();
                }
            });

            connection.ext({
                type: 'onPostAuth',
                method: function (request, reply) {

                    if (!ns.get('req')) {
                        return ns.run(() => {

                            ns.set('req', request.raw.req);
                            ns.set('res', request.raw.res);

                            holder.onPostAuth(request);
                            return reply.continue();
                        });
                    }
                    holder.onPostAuth(request);
                    return reply.continue();
                }
            });

            return connection;
        };
    });
};
