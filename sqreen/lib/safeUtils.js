/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
const Fs = require('fs');
const Path = require('path');

module.exports.guessRoot = function (from) {

    //$lab:coverage:off$
    if (require.main) {
        //$lab:coverage:on$
        // see https://nodejs.org/dist/latest-v12.x/docs/api/modules.html#modules_require_main
        const paths = require.main.paths;
        const candidate = paths.find((x) => {

            try {
                return Fs.existsSync(x) && Fs.readdirSync(x).length > 0; // exclude empty directories
            }
            catch (_) {
                //$lab:coverage:off$
                return false;
                //$lab:coverage:on$
            }
        });
        if (candidate) {
            return Path.dirname(candidate);
        }
    }
    const split = (from || __dirname).split('node_modules');
    return split[0];
};
