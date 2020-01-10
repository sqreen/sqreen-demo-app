/**
 * Copyright (c) 2016 - 2020 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.io/terms.html
 */
'use strict';
module.exports = {
    HeadersInsertCB: require('./headersInsert').getCbs,
    UserAgentMatchesCB: require('./userAgentMatches').getCbs,
    NotFoundCB: require('./notFound').getCbs,
    ContinueTracingCB: require('./continueTracing').getCbs,
    AttachValueCB: require('./attachValue').getCbs,
    ReflectedXSSCB: require('./reflectedXSS').getCbs,
    InsertSqreenEscapeJadeCB: require('./insertSqreenEscapeJade').getCbs,
    PassportLocalMetricCB: require('./passportLocalMetric').getCbs,
    PassportSAMLMetricCB: require('./passportSAMLMetric').getCbs,
    PassportLocalContinuityCB: require('./passportLocalContinuity').getCbs,
    CountHTTPCodes: require('./countHttpCodes').getCbs,
    BindingAccessorCounter: require('./bindingAccessorCounter').getCbs,
    UserAgentRegexpCB: require('./userAgentRegexp').getCbs,
    CrawlerUserAgentMatchesMetricsCB: require('./crawlerUserAgentMatchesMetric').getCbs,
    BindContinueTracingArgumentsCB: require('./bindContinueArguments').getCbs,
    GenericXSSCB: require('./genericXss').getCbs,
    ShellEnvCB: require('./shellEnv').getCbs,
    BindingAccessorMatcherCB: require('./bindingAccessorMatcherCallback').getCbs,
    DropRequestCB: require('./dropRequestCB').getCbs,
    BindingAccessorCollector: require('./bindingAccessorCollector').getCbs,
    IPBlacklistCB: require('./iPBlacklistCB').getCBs,
    TakeTimeCB: require('./takeTime').getCbs,
    CaptureCB: require('./captureCB').getCbs,
    LibSqreenCB: require('./libSqreenCB').getCbs
};
