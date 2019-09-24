/**
 * Copyright (c) 2016 - 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Shimmer = require('shimmer');
const NS = require('./ns').getNS();

const KNEX_RAISE_KEY = 'knex.onraise';

module.exports = function (identity, mod) {

    const Client = mod.Client;

    Shimmer.wrap(Client.prototype, 'queryBuilder', (original) => {

        return function () {

            const res = original.apply(this, arguments);
            res.then = NS.bind(res.then);
            return res;
        };
    });

    Shimmer.wrap(Client.prototype, 'releaseConnection', (original) => {

        return function () {

            if (NS.active) {
                const onRaise = NS.get('raise');
                if (onRaise !== undefined && onRaise !== null) {
                    onRaise.delete(KNEX_RAISE_KEY);
                }
            }
            return original.apply(this, arguments);
        };
    });

    Shimmer.wrap(Client.prototype, 'runner', (original) => {

        return function () {

            const runner = original.apply(this, arguments);

            if (NS.active) {
                let onRaise = NS.get('raise');
                if (onRaise === undefined) {
                    onRaise = new Map();
                    NS.set('raise', onRaise);
                }
                onRaise.set(KNEX_RAISE_KEY, () => {

                    // knex does not prevent mutliple calls here.
                    runner.client.releaseConnection(runner.connection);
                });
            }

            return runner;
        };
    });
};
