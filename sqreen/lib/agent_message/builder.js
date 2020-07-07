'use strict';
const Message = require('./index');

const getText = function (url) {

    return `Sqreen agent could not reach URL ${url}. Sqreen might not be able to protect the application.
If you think this is an error, please report it to Sqreen team.`;
};

const report = function (kind, url) {

    (new Message(kind, getText(url), { url })).report();
};

module.exports.ingestionPingFailed = report.bind(null,  Message.KIND.ingestion_sqreen_com_unavailable);
module.exports.backPingFailed = report.bind(null,  Message.KIND.back_sqreen_com_unavailable);
