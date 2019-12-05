/*
 * Copyright (c) 2019 Sqreen. All Rights Reserved.
 * Please refer to our terms for more information: https://www.sqreen.com/terms.html
 */

/**
 * Various data related to the runtime version.
 */
export interface RuntimeVersion {
    commit: string;         // Latest commit hash during runtime compilation
    version: {
        major: number;
        minor: number;
        patch: number;
        string: string;     // Runtime version as a string (ex: '0.3.3')
        number: number;     // Runtime version as a number (ex: 0x30003)
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
    type: RuntimeSignType;      // Runtime signature type
    value: string;              // Runtime signature (in hexadecimal)
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
    code: string;               // Runtime JS code (as a raw string).
    version: number;            // Version (encoded like in `RuntimeVersion.version.number`).
    interface?: {               // Interface versions included in the runtime (eq: (1, 1) => only V1 provided).
        min: number;
        max: number;
    };
    timestamp?: Date;           // Date keeping track of runtime release time.
    flags?: string[];           // Optional flags (reserved).
    signatures: RuntimeSign[];  // Runtime signatures.
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
        timeout: number;    // Fuzzing session global timeout (~maximum time)
        throughput: {
            batch: number;  // Number of requests to send in a row
            delay: number;  // Delay (in ms) between each batch
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
    ref: number;                          // InputRequest reference
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
 * A pseudo-iterator result (done is true if the current value is the last one).
 */
export interface PseudoIteratorResult<T> {
    done: boolean;
    value: T;
}

/**
 * The results of a request being replayed.
 */
export interface FuzzRequestResult {
    success: boolean;           // True if request has been successfully replayed
    unique: boolean;            // True if request is unique (new code coverage)
    updated?: InputRequest;     // An updated input request based on mutated one
    hash: number;               // Code coverage identifier
}

export interface RevealInterfaceV1 {
    /**
     * Get current interface version.
     *
     * @returns {number} Current interface version (eq: 1).
     */
    getInterfaceVersion(): number;

    /**
     * Get current runtime version.
     *
     * @returns {RuntimeVersion} Metadata related to the current runtime version.
     */
    getRuntimeVersion(): RuntimeVersion;

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
     * Retrieve fuzzer options (can differ for every run).
     *
     * @param {FuzzID} id - A fuzzer reference.
     *
     * @returns {Options} Current Fuzzer options.
     */
    getOptions(id: FuzzID): Options;

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
     * Generate mutated requests from the corpus.
     *
     * @param {FuzzID} id - A fuzzer reference.
     * @param {number} mutations - Maximum number of mutated requests to generate.
     *                             A negative value will ask the function to return
     *                             the number of mutations for the current input request.
     *
     * @returns {PseudoIteratorResult<Request[]>} A list of mutated requests.
     */
    mutateInputRequests(id: FuzzID, mutations: number): PseudoIteratorResult<Request[]>;

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
