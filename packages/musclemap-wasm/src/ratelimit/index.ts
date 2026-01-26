/**
 * Rate Limiter - Sliding Window Algorithm
 * High-performance rate limiting for API protection
 */

let wasmModule: any = null;

export async function initRatelimit(): Promise<void> {
  if (wasmModule !== null) return;

  try {
    const mod = await import('../../pkg/musclemap_ratelimit/musclemap_ratelimit.js');
    await mod.default?.();
    wasmModule = mod;
  } catch (e) {
    console.warn('[ratelimit] WASM module not available, using JS fallback');
    wasmModule = false;
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  currentCount: number;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

/**
 * Sliding Window Rate Limiter
 * Provides smooth rate limiting without sudden resets
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private requests: Map<string, number[]> = new Map();
  private wasmLimiter: any = null;

  constructor(config: RateLimitConfig) {
    this.config = config;

    if (wasmModule?.RateLimiter) {
      this.wasmLimiter = new wasmModule.RateLimiter(
        config.maxRequests,
        config.windowSeconds
      );
    }
  }

  /**
   * Check if a request is allowed and consume from quota
   */
  check(identifier: string): RateLimitResult {
    if (this.wasmLimiter) {
      try {
        const result = this.wasmLimiter.check(identifier);
        return {
          allowed: result.allowed,
          remaining: result.remaining,
          resetSeconds: result.reset_seconds,
          currentCount: result.current_count,
        };
      } catch {
        // Fall through to JS
      }
    }

    return this.checkJS(identifier);
  }

  /**
   * Check without consuming from quota (peek)
   */
  peek(identifier: string): RateLimitResult {
    if (this.wasmLimiter) {
      try {
        const result = this.wasmLimiter.peek(identifier);
        return {
          allowed: result.allowed,
          remaining: result.remaining,
          resetSeconds: result.reset_seconds,
          currentCount: result.current_count,
        };
      } catch {
        // Fall through to JS
      }
    }

    return this.peekJS(identifier);
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
    if (this.wasmLimiter) {
      this.wasmLimiter.reset(identifier);
    }
  }

  /**
   * Get current count for an identifier
   */
  getCount(identifier: string): number {
    if (this.wasmLimiter) {
      return this.wasmLimiter.get_count(identifier);
    }

    const now = Date.now();
    const windowMs = this.config.windowSeconds * 1000;
    const timestamps = this.requests.get(identifier) || [];
    return timestamps.filter((t) => now - t < windowMs).length;
  }

  /**
   * Clear all rate limit data
   */
  clear(): void {
    this.requests.clear();
    if (this.wasmLimiter) {
      this.wasmLimiter.clear();
    }
  }

  private checkJS(identifier: string): RateLimitResult {
    const now = Date.now();
    const windowMs = this.config.windowSeconds * 1000;

    // Get or create timestamps array
    let timestamps = this.requests.get(identifier) || [];

    // Filter to only include timestamps within the window
    timestamps = timestamps.filter((t) => now - t < windowMs);

    const currentCount = timestamps.length;
    const allowed = currentCount < this.config.maxRequests;

    if (allowed) {
      timestamps.push(now);
    }

    this.requests.set(identifier, timestamps);

    // Calculate reset time (when oldest request expires)
    const resetSeconds =
      timestamps.length > 0
        ? Math.ceil((timestamps[0] + windowMs - now) / 1000)
        : 0;

    return {
      allowed,
      remaining: Math.max(0, this.config.maxRequests - currentCount - (allowed ? 1 : 0)),
      resetSeconds,
      currentCount: currentCount + (allowed ? 1 : 0),
    };
  }

  private peekJS(identifier: string): RateLimitResult {
    const now = Date.now();
    const windowMs = this.config.windowSeconds * 1000;

    const timestamps = this.requests.get(identifier) || [];
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);

    const currentCount = validTimestamps.length;
    const allowed = currentCount < this.config.maxRequests;

    const resetSeconds =
      validTimestamps.length > 0
        ? Math.ceil((validTimestamps[0] + windowMs - now) / 1000)
        : 0;

    return {
      allowed,
      remaining: Math.max(0, this.config.maxRequests - currentCount),
      resetSeconds,
      currentCount,
    };
  }
}

/**
 * Token Bucket Rate Limiter
 * Allows bursts up to bucket capacity, then limits to refill rate
 */
export class TokenBucket {
  private capacity: number;
  private refillRate: number; // tokens per second
  private buckets: Map<string, { tokens: number; lastRefill: number }> = new Map();
  private wasmBucket: any = null;

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;

    if (wasmModule?.TokenBucket) {
      this.wasmBucket = new wasmModule.TokenBucket(capacity, refillRate);
    }
  }

  /**
   * Try to consume tokens
   */
  consume(identifier: string, tokens: number = 1): boolean {
    if (this.wasmBucket) {
      try {
        return this.wasmBucket.consume(identifier, tokens);
      } catch {
        // Fall through to JS
      }
    }

    return this.consumeJS(identifier, tokens);
  }

  /**
   * Get remaining tokens
   */
  getTokens(identifier: string): number {
    if (this.wasmBucket) {
      return this.wasmBucket.get_tokens(identifier);
    }

    const bucket = this.buckets.get(identifier);
    if (!bucket) return this.capacity;

    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    const refilled = Math.min(
      this.capacity,
      bucket.tokens + elapsed * this.refillRate
    );

    return Math.floor(refilled);
  }

  /**
   * Reset bucket for an identifier
   */
  reset(identifier: string): void {
    this.buckets.delete(identifier);
    if (this.wasmBucket) {
      this.wasmBucket.reset(identifier);
    }
  }

  private consumeJS(identifier: string, tokens: number): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(identifier);

    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
    } else {
      // Refill tokens based on time elapsed
      const elapsed = (now - bucket.lastRefill) / 1000;
      bucket.tokens = Math.min(
        this.capacity,
        bucket.tokens + elapsed * this.refillRate
      );
      bucket.lastRefill = now;
    }

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      this.buckets.set(identifier, bucket);
      return true;
    }

    this.buckets.set(identifier, bucket);
    return false;
  }
}

/**
 * Fixed Window Rate Limiter
 * Simple implementation with fixed time windows
 */
export class FixedWindowLimiter {
  private config: RateLimitConfig;
  private windows: Map<string, { count: number; windowStart: number }> = new Map();
  private wasmLimiter: any = null;

  constructor(config: RateLimitConfig) {
    this.config = config;

    if (wasmModule?.FixedWindowLimiter) {
      this.wasmLimiter = new wasmModule.FixedWindowLimiter(
        config.maxRequests,
        config.windowSeconds
      );
    }
  }

  /**
   * Check if a request is allowed
   */
  check(identifier: string): RateLimitResult {
    if (this.wasmLimiter) {
      try {
        const result = this.wasmLimiter.check(identifier);
        return {
          allowed: result.allowed,
          remaining: result.remaining,
          resetSeconds: result.reset_seconds,
          currentCount: result.current_count,
        };
      } catch {
        // Fall through to JS
      }
    }

    return this.checkJS(identifier);
  }

  private checkJS(identifier: string): RateLimitResult {
    const now = Date.now();
    const windowMs = this.config.windowSeconds * 1000;

    let window = this.windows.get(identifier);

    // Check if we need to start a new window
    if (!window || now - window.windowStart >= windowMs) {
      window = { count: 0, windowStart: now };
    }

    const allowed = window.count < this.config.maxRequests;

    if (allowed) {
      window.count++;
    }

    this.windows.set(identifier, window);

    const resetSeconds = Math.ceil((window.windowStart + windowMs - now) / 1000);

    return {
      allowed,
      remaining: Math.max(0, this.config.maxRequests - window.count),
      resetSeconds,
      currentCount: window.count,
    };
  }
}

/**
 * Simple rate limit check (stateless, for use with external storage)
 */
export function rateLimitCheck(
  timestamps: number[],
  maxRequests: number,
  windowSeconds: number,
  currentTime?: number
): RateLimitResult {
  if (wasmModule?.rate_limit_check) {
    const result = wasmModule.rate_limit_check(
      timestamps,
      maxRequests,
      windowSeconds,
      currentTime || Date.now()
    );
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      resetSeconds: result.reset_seconds,
      currentCount: result.current_count,
    };
  }

  // JS fallback
  const now = currentTime || Date.now();
  const windowMs = windowSeconds * 1000;

  const validTimestamps = timestamps.filter((t) => now - t < windowMs);
  const currentCount = validTimestamps.length;
  const allowed = currentCount < maxRequests;

  const resetSeconds =
    validTimestamps.length > 0
      ? Math.ceil((validTimestamps[0] + windowMs - now) / 1000)
      : 0;

  return {
    allowed,
    remaining: Math.max(0, maxRequests - currentCount),
    resetSeconds,
    currentCount,
  };
}
