/**
 * Lock-free Sliding Window Rate Limiter
 *
 * Compile: gcc -O3 -march=native -fPIC -shared -o libratelimit.so limiter.c -lpthread
 *
 * Features:
 * - Lock-free design using atomic operations
 * - Sliding window algorithm for smooth rate limiting
 * - Linear probing hash table for user tracking
 * - Thread-safe with minimal contention
 */

#include <stdint.h>
#include <stdatomic.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <pthread.h>
#include <stdbool.h>

#ifdef _WIN32
#define EXPORT __declspec(dllexport)
#else
#define EXPORT __attribute__((visibility("default")))
#endif

/* Configuration constants */
#define WINDOW_SECONDS 60
#define BUCKETS 60
#define MAX_PROBES 8

/**
 * Per-user rate limiting slot
 */
typedef struct {
    _Atomic uint64_t user_id;
    _Atomic uint32_t counts[BUCKETS];
    _Atomic uint64_t last_ms;
} Slot;

/**
 * Rate limiter instance
 */
typedef struct {
    Slot* slots;
    size_t capacity;
    uint32_t limit;
    pthread_rwlock_t lock;
} RateLimiter;

/**
 * Hash function for user IDs (SplitMix64)
 */
static inline uint64_t hash_user(uint64_t id) {
    uint64_t h = id;
    h ^= h >> 33;
    h *= 0xff51afd7ed558ccdULL;
    h ^= h >> 33;
    h *= 0xc4ceb9fe1a85ec53ULL;
    return h ^ (h >> 33);
}

/**
 * Get current time in milliseconds
 */
static inline uint64_t now_ms(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)ts.tv_sec * 1000 + ts.tv_nsec / 1000000;
}

/**
 * Create a new rate limiter
 *
 * @param capacity Number of user slots (should be >> expected concurrent users)
 * @param limit Maximum requests per window
 * @return Rate limiter instance or NULL on failure
 */
EXPORT
RateLimiter* ratelimit_create(size_t capacity, uint32_t limit) {
    RateLimiter* rl = calloc(1, sizeof(RateLimiter));
    if (!rl) return NULL;

    rl->slots = calloc(capacity, sizeof(Slot));
    if (!rl->slots) {
        free(rl);
        return NULL;
    }

    rl->capacity = capacity;
    rl->limit = limit;

    if (pthread_rwlock_init(&rl->lock, NULL) != 0) {
        free(rl->slots);
        free(rl);
        return NULL;
    }

    return rl;
}

/**
 * Destroy a rate limiter
 *
 * @param rl Rate limiter to destroy
 */
EXPORT
void ratelimit_destroy(RateLimiter* rl) {
    if (!rl) return;
    pthread_rwlock_destroy(&rl->lock);
    free(rl->slots);
    free(rl);
}

/**
 * Check and consume rate limit allowance
 *
 * @param rl Rate limiter instance
 * @param user_id User identifier
 * @param count Number of operations to consume
 * @return 1 if allowed, 0 if rate limited, -1 on error
 */
EXPORT
int ratelimit_check(RateLimiter* rl, uint64_t user_id, uint32_t count) {
    if (!rl || count == 0) return -1;

    pthread_rwlock_rdlock(&rl->lock);

    uint64_t ms = now_ms();
    int bucket = (ms / 1000) % BUCKETS;
    uint64_t base = hash_user(user_id) % rl->capacity;
    Slot* target = NULL;

    /* Find or create slot for user using linear probing */
    for (int p = 0; p < MAX_PROBES; p++) {
        Slot* slot = &rl->slots[(base + p) % rl->capacity];
        uint64_t stored = atomic_load_explicit(&slot->user_id, memory_order_acquire);

        /* Empty slot - try to claim it */
        if (stored == 0) {
            uint64_t expected = 0;
            if (atomic_compare_exchange_strong(&slot->user_id, &expected, user_id)) {
                target = slot;
                break;
            }
            /* Another thread claimed it, check if it's ours */
            stored = atomic_load_explicit(&slot->user_id, memory_order_acquire);
        }

        /* Found our slot */
        if (stored == user_id) {
            target = slot;
            break;
        }
    }

    /* No slot available - table is too full */
    if (!target) {
        pthread_rwlock_unlock(&rl->lock);
        return -1;
    }

    /* Clear old buckets if window has wrapped */
    uint64_t last = atomic_load_explicit(&target->last_ms, memory_order_acquire);
    if (ms - last > WINDOW_SECONDS * 1000) {
        for (int i = 0; i < BUCKETS; i++) {
            atomic_store_explicit(&target->counts[i], 0, memory_order_release);
        }
    }
    atomic_store_explicit(&target->last_ms, ms, memory_order_release);

    /* Calculate total requests in window */
    uint32_t total = 0;
    for (int i = 0; i < BUCKETS; i++) {
        total += atomic_load_explicit(&target->counts[i], memory_order_acquire);
    }

    /* Check if request would exceed limit */
    int result = (total + count <= rl->limit) ? 1 : 0;

    /* If allowed, record the request */
    if (result) {
        atomic_fetch_add_explicit(&target->counts[bucket], count, memory_order_acq_rel);
    }

    pthread_rwlock_unlock(&rl->lock);
    return result;
}

/**
 * Get remaining allowance for a user
 *
 * @param rl Rate limiter instance
 * @param user_id User identifier
 * @return Remaining requests allowed, or -1 on error
 */
EXPORT
int ratelimit_remaining(RateLimiter* rl, uint64_t user_id) {
    if (!rl) return -1;

    pthread_rwlock_rdlock(&rl->lock);

    uint64_t base = hash_user(user_id) % rl->capacity;
    Slot* target = NULL;

    for (int p = 0; p < MAX_PROBES; p++) {
        Slot* slot = &rl->slots[(base + p) % rl->capacity];
        uint64_t stored = atomic_load_explicit(&slot->user_id, memory_order_acquire);

        if (stored == user_id) {
            target = slot;
            break;
        }
        if (stored == 0) break;
    }

    if (!target) {
        pthread_rwlock_unlock(&rl->lock);
        return (int)rl->limit;  /* User not seen yet, full allowance */
    }

    uint32_t total = 0;
    for (int i = 0; i < BUCKETS; i++) {
        total += atomic_load_explicit(&target->counts[i], memory_order_acquire);
    }

    pthread_rwlock_unlock(&rl->lock);

    int remaining = (int)rl->limit - (int)total;
    return remaining > 0 ? remaining : 0;
}

/**
 * Get time until rate limit resets (next bucket expires)
 *
 * @param rl Rate limiter instance
 * @param user_id User identifier
 * @return Milliseconds until reset, or 0 if not limited
 */
EXPORT
uint64_t ratelimit_reset_ms(RateLimiter* rl, uint64_t user_id) {
    if (!rl) return 0;

    pthread_rwlock_rdlock(&rl->lock);

    uint64_t ms = now_ms();
    int current_bucket = (ms / 1000) % BUCKETS;

    /* Find when the oldest non-zero bucket will expire */
    uint64_t base = hash_user(user_id) % rl->capacity;
    Slot* target = NULL;

    for (int p = 0; p < MAX_PROBES; p++) {
        Slot* slot = &rl->slots[(base + p) % rl->capacity];
        uint64_t stored = atomic_load_explicit(&slot->user_id, memory_order_acquire);

        if (stored == user_id) {
            target = slot;
            break;
        }
        if (stored == 0) break;
    }

    if (!target) {
        pthread_rwlock_unlock(&rl->lock);
        return 0;
    }

    /* Find oldest bucket with counts */
    for (int i = 1; i <= BUCKETS; i++) {
        int bucket_idx = (current_bucket + i) % BUCKETS;
        uint32_t count = atomic_load_explicit(&target->counts[bucket_idx], memory_order_acquire);
        if (count > 0) {
            pthread_rwlock_unlock(&rl->lock);
            return (uint64_t)i * 1000;
        }
    }

    pthread_rwlock_unlock(&rl->lock);
    return 0;
}

/**
 * Reset rate limit for a specific user
 *
 * @param rl Rate limiter instance
 * @param user_id User identifier
 * @return 0 on success, -1 on error
 */
EXPORT
int ratelimit_reset_user(RateLimiter* rl, uint64_t user_id) {
    if (!rl) return -1;

    pthread_rwlock_wrlock(&rl->lock);

    uint64_t base = hash_user(user_id) % rl->capacity;

    for (int p = 0; p < MAX_PROBES; p++) {
        Slot* slot = &rl->slots[(base + p) % rl->capacity];
        uint64_t stored = atomic_load_explicit(&slot->user_id, memory_order_acquire);

        if (stored == user_id) {
            for (int i = 0; i < BUCKETS; i++) {
                atomic_store_explicit(&slot->counts[i], 0, memory_order_release);
            }
            pthread_rwlock_unlock(&rl->lock);
            return 0;
        }
        if (stored == 0) break;
    }

    pthread_rwlock_unlock(&rl->lock);
    return 0;  /* User not found is not an error */
}

/**
 * Get statistics about the rate limiter
 *
 * @param rl Rate limiter instance
 * @param active_users Output: number of active user slots
 * @param total_requests Output: total requests across all users
 * @return 0 on success, -1 on error
 */
EXPORT
int ratelimit_stats(RateLimiter* rl, size_t* active_users, uint64_t* total_requests) {
    if (!rl || !active_users || !total_requests) return -1;

    pthread_rwlock_rdlock(&rl->lock);

    size_t active = 0;
    uint64_t total = 0;

    for (size_t i = 0; i < rl->capacity; i++) {
        uint64_t uid = atomic_load_explicit(&rl->slots[i].user_id, memory_order_acquire);
        if (uid != 0) {
            active++;
            for (int b = 0; b < BUCKETS; b++) {
                total += atomic_load_explicit(&rl->slots[i].counts[b], memory_order_acquire);
            }
        }
    }

    *active_users = active;
    *total_requests = total;

    pthread_rwlock_unlock(&rl->lock);
    return 0;
}

/**
 * Clear all rate limit data
 *
 * @param rl Rate limiter instance
 * @return 0 on success, -1 on error
 */
EXPORT
int ratelimit_clear_all(RateLimiter* rl) {
    if (!rl) return -1;

    pthread_rwlock_wrlock(&rl->lock);
    memset(rl->slots, 0, rl->capacity * sizeof(Slot));
    pthread_rwlock_unlock(&rl->lock);

    return 0;
}
