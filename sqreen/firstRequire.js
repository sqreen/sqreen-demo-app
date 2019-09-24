'use strict';
const main = Object.keys(require.cache).map((x) => require.cache[x])
    .find((x) => x.parent === null);

module.exports.check = function () {

    if (main) {
        let required = main.children.map((x) => x.filename)
            .filter((x) => !x.includes('node_modules/sqreen'))
            .filter((x) => !x.includes('node_modules/dotenv'))
            .filter((x) => !x.includes('node_modules\\sqreen')) // Windows
            .filter((x) => !x.includes('/pm2/'))
            .filter((x) => !x.includes('node_modules/pmx'))
            // ts-node
            .filter((x) => !x.includes('node_modules/arg'))
            .filter((x) => !x.includes('node_modules/diff'))
            .filter((x) => !x.includes('node_modules/ts-node'));

        if (process.env.SQREEN_CUSTOM_PKG_SUBSTRING_IGNORE) {
            required = required.filter((x) => !x.includes(process.env.SQREEN_CUSTOM_PKG_SUBSTRING_IGNORE));
        }

        if (required.length > 0 && process.env.SQREEN_DISABLE_STARTUP_WARNING !== '1') {
            console.error('It seems that the following modules have been required before Sqreen:');
            console.error('- ' + required.join('\n- '));
            console.error('Sqreen may not be able to protect the whole application.');
            console.error('If you think this is an error, please report it to Sqreen team.');
            console.error('Read more on https://doc.sqreen.io/docs/nodejs-agent-installation');
        }

        return required;
    }
    return [];
};

