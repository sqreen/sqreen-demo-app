'use strict';
const Semver = require('semver');

module.exports = {
    lint: true,
    assert: 'code',
    rejections: true
};

if (Semver.satisfies(process.version, '>= 6.0.0')) {
    module.exports.coverage = true;
    module.exports.threshold = 100;
}
