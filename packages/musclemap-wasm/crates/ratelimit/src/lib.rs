//! MuscleMap Rate Limiter Module
//!
//! High-performance sliding window rate limiter with per-user tracking.
//! Supports multiple time windows and configurable limits.
//!
//! Compiled to WebAssembly for universal runtime support.

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Maximum number of tracked users per limiter
const DEFAULT_CAPACITY: usize = 10_000;

/// Maximum bucket count (seconds in window)
const MAX_BUCKETS: usize = 3600; // 1 hour max window

/// Hash function for string keys (djb2 algorithm)
fn hash_string(s: &str) -> u64 {
    let mut hash: u64 = 5381;
    for c in s.bytes() {
        hash = hash.wrapping_shl(5).wrapping_add(hash) ^ (c as u64);
    }
    hash
}

/// Rate limit check result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct RateLimitResult {
    /// Whether the request is allowed
    pub allowed: bool,
    /// Number of requests remaining in the window
    pub remaining: u32,
    /// Seconds until the window resets
    pub reset_seconds: u32,
    /// Total requests in current window
    pub current: u32,
    /// The configured limit
    pub limit: u32,
}

#[wasm_bindgen]
impl RateLimitResult {
    #[wasm_bindgen(constructor)]
    pub fn new(allowed: bool, remaining: u32, reset_seconds: u32, current: u32, limit: u32) -> RateLimitResult {
        RateLimitResult {
            allowed,
            remaining,
            reset_seconds,
            current,
            limit,
        }
    }
}

/// Per-user rate limit bucket
#[derive(Debug, Clone)]
struct UserBucket {
    /// Ring buffer of counts per second
    counts: Vec<u32>,
    /// Last update timestamp (seconds since epoch)
    last_timestamp: u64,
    /// Sum of all counts in the window
    total: u32,
}

impl UserBucket {
    fn new(bucket_count: usize) -> Self {
        UserBucket {
            counts: vec![0; bucket_count],
            last_timestamp: 0,
            total: 0,
        }
    }

    /// Update bucket for current timestamp, clearing old entries
    fn update(&mut self, current_timestamp: u64, bucket_count: usize) {
        if self.last_timestamp == 0 {
            self.last_timestamp = current_timestamp;
            return;
        }

        let elapsed = current_timestamp.saturating_sub(self.last_timestamp);

        if elapsed >= bucket_count as u64 {
            // Window completely expired, reset all
            self.counts.fill(0);
            self.total = 0;
        } else if elapsed > 0 {
            // Clear buckets that have expired
            for i in 0..elapsed as usize {
                let bucket_idx = ((self.last_timestamp + 1 + i as u64) % bucket_count as u64) as usize;
                self.total = self.total.saturating_sub(self.counts[bucket_idx]);
                self.counts[bucket_idx] = 0;
            }
        }

        self.last_timestamp = current_timestamp;
    }

    /// Increment the current bucket
    fn increment(&mut self, current_timestamp: u64, bucket_count: usize, count: u32) -> u32 {
        let bucket_idx = (current_timestamp % bucket_count as u64) as usize;
        self.counts[bucket_idx] = self.counts[bucket_idx].saturating_add(count);
        self.total = self.total.saturating_add(count);
        self.total
    }
}

/// Sliding window rate limiter
#[wasm_bindgen]
pub struct RateLimiter {
    /// User ID -> bucket mapping
    buckets: HashMap<u64, UserBucket>,
    /// Maximum requests per window
    limit: u32,
    /// Window size in seconds
    window_seconds: u32,
    /// Number of buckets (same as window_seconds for 1-second granularity)
    bucket_count: usize,
    /// Maximum users to track
    capacity: usize,
}

#[wasm_bindgen]
impl RateLimiter {
    /// Create a new rate limiter
    ///
    /// # Arguments
    /// * `limit` - Maximum requests allowed per window
    /// * `window_seconds` - Window size in seconds (1-3600)
    #[wasm_bindgen(constructor)]
    pub fn new(limit: u32, window_seconds: u32) -> RateLimiter {
        let window = window_seconds.clamp(1, MAX_BUCKETS as u32);
        RateLimiter {
            buckets: HashMap::with_capacity(DEFAULT_CAPACITY),
            limit,
            window_seconds: window,
            bucket_count: window as usize,
            capacity: DEFAULT_CAPACITY,
        }
    }

    /// Create a rate limiter with custom capacity
    pub fn with_capacity(limit: u32, window_seconds: u32, capacity: usize) -> RateLimiter {
        let window = window_seconds.clamp(1, MAX_BUCKETS as u32);
        RateLimiter {
            buckets: HashMap::with_capacity(capacity),
            limit,
            window_seconds: window,
            bucket_count: window as usize,
            capacity,
        }
    }

    /// Check if a request is allowed (and count it if allowed)
    ///
    /// # Arguments
    /// * `user_id` - User identifier string
    /// * `count` - Number of requests to count (default 1)
    ///
    /// # Returns
    /// RateLimitResult with allowed status and metadata
    pub fn check(&mut self, user_id: &str, count: u32) -> RateLimitResult {
        let now = (js_sys::Date::now() / 1000.0) as u64;
        let user_hash = hash_string(user_id);
        let count = count.max(1);

        // Evict oldest user if at capacity
        if self.buckets.len() >= self.capacity && !self.buckets.contains_key(&user_hash) {
            // Simple eviction: remove a random entry
            if let Some(&key) = self.buckets.keys().next() {
                self.buckets.remove(&key);
            }
        }

        let bucket = self.buckets
            .entry(user_hash)
            .or_insert_with(|| UserBucket::new(self.bucket_count));

        // Update bucket to current time
        bucket.update(now, self.bucket_count);

        let current = bucket.total;
        let allowed = current + count <= self.limit;

        if allowed {
            bucket.increment(now, self.bucket_count, count);
        }

        let new_total = bucket.total;
        let remaining = self.limit.saturating_sub(new_total);

        // Calculate reset time (next second when window rolls over)
        let reset_seconds = self.window_seconds - ((now % self.window_seconds as u64) as u32);

        RateLimitResult {
            allowed,
            remaining,
            reset_seconds,
            current: new_total,
            limit: self.limit,
        }
    }

    /// Check without incrementing (peek)
    pub fn check_only(&mut self, user_id: &str) -> RateLimitResult {
        let now = (js_sys::Date::now() / 1000.0) as u64;
        let user_hash = hash_string(user_id);

        let current = if let Some(bucket) = self.buckets.get_mut(&user_hash) {
            bucket.update(now, self.bucket_count);
            bucket.total
        } else {
            0
        };

        let allowed = current < self.limit;
        let remaining = self.limit.saturating_sub(current);
        let reset_seconds = self.window_seconds - ((now % self.window_seconds as u64) as u32);

        RateLimitResult {
            allowed,
            remaining,
            reset_seconds,
            current,
            limit: self.limit,
        }
    }

    /// Get remaining requests for a user
    pub fn remaining(&mut self, user_id: &str) -> u32 {
        self.check_only(user_id).remaining
    }

    /// Reset rate limit for a specific user
    pub fn reset_user(&mut self, user_id: &str) {
        let user_hash = hash_string(user_id);
        self.buckets.remove(&user_hash);
    }

    /// Clear all rate limit data
    pub fn clear(&mut self) {
        self.buckets.clear();
    }

    /// Get the number of tracked users
    pub fn user_count(&self) -> usize {
        self.buckets.len()
    }

    /// Get the configured limit
    pub fn get_limit(&self) -> u32 {
        self.limit
    }

    /// Get the window size in seconds
    pub fn get_window_seconds(&self) -> u32 {
        self.window_seconds
    }

    /// Update the limit (affects future checks)
    pub fn set_limit(&mut self, limit: u32) {
        self.limit = limit;
    }
}

/// Simple token bucket rate limiter (alternative algorithm)
#[wasm_bindgen]
pub struct TokenBucket {
    /// Tokens per second to add
    rate: f64,
    /// Maximum tokens in bucket
    capacity: f64,
    /// Current tokens
    tokens: f64,
    /// Last refill timestamp
    last_refill: f64,
}

#[wasm_bindgen]
impl TokenBucket {
    /// Create a new token bucket
    ///
    /// # Arguments
    /// * `rate` - Tokens per second to add
    /// * `capacity` - Maximum tokens in bucket
    #[wasm_bindgen(constructor)]
    pub fn new(rate: f64, capacity: f64) -> TokenBucket {
        TokenBucket {
            rate,
            capacity,
            tokens: capacity, // Start full
            last_refill: js_sys::Date::now(),
        }
    }

    /// Try to consume tokens
    ///
    /// # Arguments
    /// * `count` - Number of tokens to consume
    ///
    /// # Returns
    /// true if tokens were consumed, false if not enough tokens
    pub fn consume(&mut self, count: f64) -> bool {
        self.refill();

        if self.tokens >= count {
            self.tokens -= count;
            true
        } else {
            false
        }
    }

    /// Get current token count
    pub fn get_tokens(&mut self) -> f64 {
        self.refill();
        self.tokens
    }

    /// Refill tokens based on elapsed time
    fn refill(&mut self) {
        let now = js_sys::Date::now();
        let elapsed_seconds = (now - self.last_refill) / 1000.0;

        if elapsed_seconds > 0.0 {
            self.tokens = (self.tokens + elapsed_seconds * self.rate).min(self.capacity);
            self.last_refill = now;
        }
    }

    /// Reset to full capacity
    pub fn reset(&mut self) {
        self.tokens = self.capacity;
        self.last_refill = js_sys::Date::now();
    }
}

/// Fixed window rate limiter (simpler, less accurate)
#[wasm_bindgen]
pub struct FixedWindowLimiter {
    counts: HashMap<u64, (u64, u32)>, // user_hash -> (window_start, count)
    limit: u32,
    window_seconds: u64,
}

#[wasm_bindgen]
impl FixedWindowLimiter {
    #[wasm_bindgen(constructor)]
    pub fn new(limit: u32, window_seconds: u32) -> FixedWindowLimiter {
        FixedWindowLimiter {
            counts: HashMap::new(),
            limit,
            window_seconds: window_seconds as u64,
        }
    }

    pub fn check(&mut self, user_id: &str, count: u32) -> bool {
        let now = (js_sys::Date::now() / 1000.0) as u64;
        let window_start = now - (now % self.window_seconds);
        let user_hash = hash_string(user_id);

        let entry = self.counts.entry(user_hash).or_insert((window_start, 0));

        // Reset if new window
        if entry.0 != window_start {
            *entry = (window_start, 0);
        }

        if entry.1 + count <= self.limit {
            entry.1 += count;
            true
        } else {
            false
        }
    }

    pub fn clear(&mut self) {
        self.counts.clear();
    }
}

/// Create a rate limiter (factory function for simpler API)
#[wasm_bindgen]
pub fn create_rate_limiter(limit: u32, window_seconds: u32) -> RateLimiter {
    RateLimiter::new(limit, window_seconds)
}

/// Create a token bucket (factory function)
#[wasm_bindgen]
pub fn create_token_bucket(rate: f64, capacity: f64) -> TokenBucket {
    TokenBucket::new(rate, capacity)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_string() {
        let hash1 = hash_string("user_123");
        let hash2 = hash_string("user_123");
        let hash3 = hash_string("user_456");

        assert_eq!(hash1, hash2);
        assert_ne!(hash1, hash3);
    }

    #[test]
    fn test_user_bucket() {
        let mut bucket = UserBucket::new(60);
        assert_eq!(bucket.total, 0);

        bucket.update(1000, 60);
        bucket.increment(1000, 60, 5);
        assert_eq!(bucket.total, 5);

        bucket.increment(1000, 60, 3);
        assert_eq!(bucket.total, 8);
    }

    #[test]
    fn test_rate_limiter_basic() {
        // Note: Can't fully test due to js_sys::Date dependency in WASM
        // This tests the basic structure
        let limiter = RateLimiter::new(100, 60);
        assert_eq!(limiter.get_limit(), 100);
        assert_eq!(limiter.get_window_seconds(), 60);
        assert_eq!(limiter.user_count(), 0);
    }

    // Note: TokenBucket tests require WASM target (js_sys::Date)
    // Use wasm-bindgen-test for TokenBucket testing
}
