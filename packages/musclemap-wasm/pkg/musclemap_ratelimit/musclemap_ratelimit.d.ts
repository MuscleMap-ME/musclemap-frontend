/* tslint:disable */
/* eslint-disable */

/**
 * Fixed window rate limiter (simpler, less accurate)
 */
export class FixedWindowLimiter {
    free(): void;
    [Symbol.dispose](): void;
    check(user_id: string, count: number): boolean;
    clear(): void;
    constructor(limit: number, window_seconds: number);
}

/**
 * Rate limit check result
 */
export class RateLimitResult {
    free(): void;
    [Symbol.dispose](): void;
    constructor(allowed: boolean, remaining: number, reset_seconds: number, current: number, limit: number);
    /**
     * Whether the request is allowed
     */
    allowed: boolean;
    /**
     * Total requests in current window
     */
    current: number;
    /**
     * The configured limit
     */
    limit: number;
    /**
     * Number of requests remaining in the window
     */
    remaining: number;
    /**
     * Seconds until the window resets
     */
    reset_seconds: number;
}

/**
 * Sliding window rate limiter
 */
export class RateLimiter {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Check if a request is allowed (and count it if allowed)
     *
     * # Arguments
     * * `user_id` - User identifier string
     * * `count` - Number of requests to count (default 1)
     *
     * # Returns
     * RateLimitResult with allowed status and metadata
     */
    check(user_id: string, count: number): RateLimitResult;
    /**
     * Check without incrementing (peek)
     */
    check_only(user_id: string): RateLimitResult;
    /**
     * Clear all rate limit data
     */
    clear(): void;
    /**
     * Get the configured limit
     */
    get_limit(): number;
    /**
     * Get the window size in seconds
     */
    get_window_seconds(): number;
    /**
     * Create a new rate limiter
     *
     * # Arguments
     * * `limit` - Maximum requests allowed per window
     * * `window_seconds` - Window size in seconds (1-3600)
     */
    constructor(limit: number, window_seconds: number);
    /**
     * Get remaining requests for a user
     */
    remaining(user_id: string): number;
    /**
     * Reset rate limit for a specific user
     */
    reset_user(user_id: string): void;
    /**
     * Update the limit (affects future checks)
     */
    set_limit(limit: number): void;
    /**
     * Get the number of tracked users
     */
    user_count(): number;
    /**
     * Create a rate limiter with custom capacity
     */
    static with_capacity(limit: number, window_seconds: number, capacity: number): RateLimiter;
}

/**
 * Simple token bucket rate limiter (alternative algorithm)
 */
export class TokenBucket {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Try to consume tokens
     *
     * # Arguments
     * * `count` - Number of tokens to consume
     *
     * # Returns
     * true if tokens were consumed, false if not enough tokens
     */
    consume(count: number): boolean;
    /**
     * Get current token count
     */
    get_tokens(): number;
    /**
     * Create a new token bucket
     *
     * # Arguments
     * * `rate` - Tokens per second to add
     * * `capacity` - Maximum tokens in bucket
     */
    constructor(rate: number, capacity: number);
    /**
     * Reset to full capacity
     */
    reset(): void;
}

/**
 * Create a rate limiter (factory function for simpler API)
 */
export function create_rate_limiter(limit: number, window_seconds: number): RateLimiter;

/**
 * Create a token bucket (factory function)
 */
export function create_token_bucket(rate: number, capacity: number): TokenBucket;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_fixedwindowlimiter_free: (a: number, b: number) => void;
    readonly __wbg_get_ratelimitresult_allowed: (a: number) => number;
    readonly __wbg_get_ratelimitresult_current: (a: number) => number;
    readonly __wbg_get_ratelimitresult_limit: (a: number) => number;
    readonly __wbg_get_ratelimitresult_remaining: (a: number) => number;
    readonly __wbg_get_ratelimitresult_reset_seconds: (a: number) => number;
    readonly __wbg_ratelimiter_free: (a: number, b: number) => void;
    readonly __wbg_ratelimitresult_free: (a: number, b: number) => void;
    readonly __wbg_set_ratelimitresult_allowed: (a: number, b: number) => void;
    readonly __wbg_set_ratelimitresult_current: (a: number, b: number) => void;
    readonly __wbg_set_ratelimitresult_limit: (a: number, b: number) => void;
    readonly __wbg_set_ratelimitresult_remaining: (a: number, b: number) => void;
    readonly __wbg_set_ratelimitresult_reset_seconds: (a: number, b: number) => void;
    readonly __wbg_tokenbucket_free: (a: number, b: number) => void;
    readonly create_rate_limiter: (a: number, b: number) => number;
    readonly create_token_bucket: (a: number, b: number) => number;
    readonly fixedwindowlimiter_check: (a: number, b: number, c: number, d: number) => number;
    readonly fixedwindowlimiter_clear: (a: number) => void;
    readonly fixedwindowlimiter_new: (a: number, b: number) => number;
    readonly ratelimiter_check: (a: number, b: number, c: number, d: number) => number;
    readonly ratelimiter_check_only: (a: number, b: number, c: number) => number;
    readonly ratelimiter_clear: (a: number) => void;
    readonly ratelimiter_get_limit: (a: number) => number;
    readonly ratelimiter_get_window_seconds: (a: number) => number;
    readonly ratelimiter_new: (a: number, b: number) => number;
    readonly ratelimiter_remaining: (a: number, b: number, c: number) => number;
    readonly ratelimiter_reset_user: (a: number, b: number, c: number) => void;
    readonly ratelimiter_set_limit: (a: number, b: number) => void;
    readonly ratelimiter_user_count: (a: number) => number;
    readonly ratelimiter_with_capacity: (a: number, b: number, c: number) => number;
    readonly ratelimitresult_new: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly tokenbucket_consume: (a: number, b: number) => number;
    readonly tokenbucket_get_tokens: (a: number) => number;
    readonly tokenbucket_reset: (a: number) => void;
    readonly tokenbucket_new: (a: number, b: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
