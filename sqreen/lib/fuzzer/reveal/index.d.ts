/*
 * Copyright (c) 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.com/terms.html
 */

/**
 * Various data related to the runtime version.
 */
export interface Version {
    commit: string;         // latest commit hash during runtime compilation
    version: {
        major: number;
        minor: number;
        patch: number;
        string: string;     // runtime version as a string (ex: '0.3.3')
    };
}

/**
 * Signature types supported.
 */
export const enum RuntimeSignType {
    RSA = 1,
    ECC = 2
}

/**
 * Signature data (and associated metadata).
 */
interface RuntimeSignInterface {
    type: RuntimeSignType;      // runtime signature type
    value: string;              // runtime signature (in hexadecimal)
}

export interface RuntimeSignRSA extends RuntimeSignInterface {
    type: RuntimeSignType.RSA;
}

export interface RuntimeSignECC extends RuntimeSignInterface {
    type: RuntimeSignType.ECC;
}

/**
 * Runtime signature data type.
 */
export type RuntimeSign = RuntimeSignRSA | RuntimeSignECC;

/**
 * Runtime code (and associated metadata).
 */
export interface Runtime {
    code: string;
    version: number;
    timestamp?: Date;
    flags?: string[];
    signatures: RuntimeSign[];
}

/**
 * A fuzzer instance reference.
 */
export type FuzzID = number;

/**
 * A request reference.
 */
export type ReqID = number;

/**
 * Fuzzer options (the public ones).
 */
export interface Options {
    engine: {
        timeout: number;    // fuzzing session global timeout (~maximum time)
        throughput: {
            batch: number;  // number of requests to send in a row
            delay: number;  // delay (in ms) between each batch
        };
    };
}

/**
 * Supported URI schemes.
 */
export type Protocol = 'http:' | 'https:';

/**
 * Supported HTTP methods.
 */
export type Method = 'GET' | 'POST' | 'PUT';

/**
 * Base request object.
 */
interface RequestInterface {
    method: Method;                   // Request method (only supported ones)
    endpoint: string;                 // Request endpoint (~the pathname of a path, including route templates)
    protocol: Protocol;               // Request protocol (scheme, including ':')
    host: string;                     // Request hostname (excluding port)
    port: number;                     // Request port
    headers: Record<string, string>;  // Request headers (as raw key/value)
}

/**
 * An input request (including parameters and their associated metadata).
 * Every field is optional, as default values will be used when generating mutated requests.
 */
export interface InputRequest extends Partial<RequestInterface> {
    params?: {                            // Request parameters (as metadata)
        query?: Record<string, any>;
        form?: Record<string, any>;
        route?: Record<string, any>;
    };
}

/**
 * A mutated request, including the URL path to be used while building the native request.
 */
export interface Request extends RequestInterface {
    path: string;                         // A full URL path (pathname, query string, ...)
    params: {                             // Request parameters (as raw key/value)
        query?: Record<string, string>;
        form?: Record<string, string>;
        route?: Record<string, string>;
    };
}

/**
 * Input requests, associated with a template used to fill missing fields.
 */
export interface Corpus {
    defaults: InputRequest;     // An input request used as a template
    requests: InputRequest[];   // Input requests used as references to generate mutated ones
}

/**
 * A Run (input data for a fuzzing session).
 */
export interface Run {
    options: Partial<Options>;  // Fuzzer options
    corpus: Corpus;             // Input requests
}

/**
 * A run (unique) identifier.
 */
export type RunID = string;

/**
 * Fuzzer statistics for the current session.
 */
export type Stats = Record<string, any>;

/**
 * Fuzzer statistics (and associated metadata) for the current session.
 */
export interface RunStats {
    runid: RunID;       // Current run (unique) identifier
    date: Date;         // Date associated with current statistics
    stats: Stats;       // Fuzzer statistics for the current session
}

/**
 * Metric key in form of a path (ex: 'fuzzer.start').
 */
export type MetricKey = string;

/**
 * A metric type is changing the way raw metric values are used.
 */
export const enum MetricType {
    Last = 1,           // Only the latest value is kept
    Sum = 2,            // Input values are add up and the sum is returned
    Average = 3,        // Input values are add up and the average is returned
    Collect = 4         // Input values are concatenated and the list is returned
}

/**
 * A metric (key, value) with associated (optional) metadata (endpoint, type).
 */
export interface MetricRecord {
    endpoint?: string;  // Some metrics are associated to an endpoint
    key: MetricKey;     // Metric key in form of a path (ex: 'fuzzer.start')
    value: any;         // Metric value (may depend of the type)
    type?: MetricType;  // Metric type (ex: Sum, Average, ...)
}

/**
 * A trace (anything related to an event that matter in term of coverage).
 */
export type Trace = string;

/**
 * A symbol (identifying an object in source code).
 */
export interface Sym {
    name: string;            // Symbol name
    scriptpath?: string;     // Script directory path
    scriptfile?: string;     // Script file name
    line?: number;           // Symbol line
}

/**
 * A stack trace (and associated metadata).
 */
export interface StackTrace {
    syms: Sym[];  // List of symbols
}

/**
 * The results of a request being replayed.
 */
export interface FuzzRequestResult {
    success: boolean;   // True if request has been successfully replayed
    unique: boolean;    // True if request is unique (new code coverage)
    hash: number;       // Code coverage identifier
}

export interface RevealInterfaceV1 {
    /**
     * Validate an input run.
     *
     * @param {object} rawrun - A raw (potentially invalid) input run.
     *
     * @returns {Run | null} A (valid) Run object.
     */
    validateRun(rawrun: object): Run | null;

    /**
     * Create a new fuzzer instance for a given Run.
     *
     * @param {Run} run - An input run.
     *
     * @returns {FuzzID | null} A fuzzer reference (or null in case of failure).
     */
    initFuzzer(run: Run): FuzzID | null;

    /**
     * Retrieve the current run identifier.
     *
     * @param {FuzzID} id - A fuzzer reference.
     *
     * @returns {RunID} Current run identifier.
     */
    getRunID(id: FuzzID): RunID;

    /**
     * Retrieve the current run statistics.
     *
     * @param {FuzzID} id - A fuzzer reference.
     *
     * @returns {RunStats} Current run statistics.
     */
    getRunStats(id: FuzzID): RunStats;

    /**
     * @param {FuzzID} id - A fuzzer reference.
     *
     * @returns {Version} Metadata related to the current runtime version.
     */
    getVersion(id: FuzzID): Version;

    /**
     * Retrieve fuzzer options (can differ for every run).
     *
     * @param {FuzzID} id - A fuzzer reference.
     *
     * @returns {Options} Current Fuzzer options.
     */
    getOptions(id: FuzzID): Options;

    /**
     * Compute a (balanced) number of mutations for each requests.
     *
     * @param {FuzzID} id - A fuzzer reference.
     *
     * @returns {number[]} A list of mutations count (associated to each input requests).
     */
    mutationsPerRequest(id: FuzzID): number[];

    /**
     * Prepare a request before replaying it.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {Request} request - The mutated input request.
     *
     * @returns {ReqID | null} A request reference (or null in case of failure)
     */
    initRequest(id: FuzzID, request: Request): ReqID | null;

    /**
     * Record traces (that will be used as markers to compute the code coverage).
     *
     * A trace can be any string related to an event that matter in term of coverage
     * (ex: the semantic of an SQL request).
     *
     * Note: This function use a list of inputs as it's *strongly* advised to batch them.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {ReqID} rid - A request reference.
     * @param {Trace[]} traces - A list of trace.
     *
     * @returns {boolean} True if successfully recorded.
     */
    recordTraces(id: FuzzID, rid: ReqID, traces: Trace[]): boolean;

    /**
     * Record a stack trace (used to compute the code coverage).
     *
     * Note: This function use a list of inputs as it's *strongly* advised to batch them.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {ReqID} rid - A request reference.
     * @param {StackTrace[]} stacktraces - A list of stack trace.
     *
     * @returns {boolean} True if successfully recorded.
     */
    recordStackTraces(id: FuzzID, rid: ReqID, stacktraces: StackTrace[]): boolean;

    /**
     * Finalize a request.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {ReqID} rid - A request reference.
     * @param {Request} request - The mutated input request.
     *
     * @returns {FuzzRequestResult | null} The results of the request being replayed, null in case of failure.
     */
    finalizeRequest(id: FuzzID, rid: ReqID, request: Request): FuzzRequestResult | null;

    /**
     * Terminate a request.
     *
     * Warning: the associated request resources will be released, and request reference will be consumed.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {ReqID} rid - A request reference.
     *
     * @returns {boolean} True if successful.
     */
    terminateRequest(id: FuzzID, rid: ReqID): boolean;

    /**
     * Generate mutated requests from an input request.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {InputRequest} request - An input request (supposedly from the run's corpus).
     * @param {number} mutations - A number of mutations to perform
     *                             (supposedly coming from the result of `mutationsPerRequest`).
     *
     * @returns {Request[]} A list of mutated requests.
     */
    mutateInputRequest(id: FuzzID, request: InputRequest, mutations: number): Request[];

    /**
     * Update an input request by merging it with a (supposedly interesting) mutated version.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {InputRequest} original - An input request (supposedly from the run's corpus).
     * @param {Request} mutated - An associated mutated version of the input request.
     * @param {FuzzRequestResult} result - Fuzzing result (coming from the related `finalizeRequest` call).
     *
     * @returns {InputRequest} The updated input request.
     */
    updateInputRequest(id: FuzzID, original: InputRequest, mutated: Partial<Request>,
                       result: FuzzRequestResult): InputRequest;

    /**
     * Update the statistics with new metrics.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {MetricRecord[]} records - A list of metric records.
     *
     * @returns {boolean} True if successful.
     *
     * Note: This function use a list of inputs as it's *strongly* advised to batch them.
     */
    updateMetrics(id: FuzzID, records: MetricRecord[]): boolean;

    /**
     * Update the request statistics with new metrics.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {ReqID} rid - A request reference.
     * @param {MetricRecord[]} records - A list of metric records.
     *
     * @returns {boolean} True if successful.
     *
     * Note: This function use a list of inputs as it's *strongly* advised to batch them.
     */
    updateRequestMetrics(id: FuzzID, rid: ReqID, records: MetricRecord[]): boolean;

    /**
     * Terminate the fuzzer instance.
     *
     * @param {FuzzID} id - A fuzzer reference.
     *
     * Warning: the associated fuzzer resources will be released, and fuzzer reference will be consumed.
     *
     * @returns {boolean} True if successful.
     */
    terminateFuzzer(id: FuzzID): boolean;
}

export const V1: RevealInterfaceV1;
