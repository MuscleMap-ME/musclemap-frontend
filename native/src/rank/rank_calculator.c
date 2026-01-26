/**
 * High-performance Leaderboard Ranking Calculator
 *
 * Compile: gcc -O3 -march=native -fPIC -shared -o librank.so rank_calculator.c -lm
 *
 * Features:
 * - Fast in-place sorting using introsort (hybrid quicksort/heapsort)
 * - Efficient percentile calculations
 * - Rank calculation with tie handling
 * - Thread-safe batch operations
 */

#include <stdint.h>
#include <string.h>
#include <math.h>
#include <stdbool.h>
#include <stdlib.h>
#include <pthread.h>

#ifdef _WIN32
#define EXPORT __declspec(dllexport)
#else
#define EXPORT __attribute__((visibility("default")))
#endif

/* Maximum entries for batch processing */
#define MAX_ENTRIES 100000
#define USER_ID_LEN 64

/* ============================================
 * DATA STRUCTURES
 * ============================================ */

/**
 * User with score for ranking
 */
typedef struct {
    char user_id[USER_ID_LEN];
    double score;
    int32_t rank;
    double percentile;
} RankedUser;

/**
 * Comparison result for sorting
 */
typedef struct {
    double score;
    size_t original_index;
} ScoreIndex;

/* ============================================
 * SORTING ALGORITHMS
 * ============================================ */

/**
 * Swap two ScoreIndex elements
 */
static inline void swap_score(ScoreIndex* a, ScoreIndex* b) {
    ScoreIndex temp = *a;
    *a = *b;
    *b = temp;
}

/**
 * Insertion sort for small arrays
 */
static void insertion_sort(ScoreIndex* arr, size_t len) {
    for (size_t i = 1; i < len; i++) {
        ScoreIndex key = arr[i];
        size_t j = i;
        /* Sort in descending order (highest score first) */
        while (j > 0 && arr[j - 1].score < key.score) {
            arr[j] = arr[j - 1];
            j--;
        }
        arr[j] = key;
    }
}

/**
 * Heapify for heapsort (max heap for descending order)
 */
static void heapify_max(ScoreIndex* arr, size_t n, size_t i) {
    size_t largest = i;
    size_t left = 2 * i + 1;
    size_t right = 2 * i + 2;

    /* For descending order, we want a min-heap structure */
    if (left < n && arr[left].score < arr[largest].score)
        largest = left;
    if (right < n && arr[right].score < arr[largest].score)
        largest = right;

    if (largest != i) {
        swap_score(&arr[i], &arr[largest]);
        heapify_max(arr, n, largest);
    }
}

/**
 * Heapsort for descending order
 */
static void heapsort_desc(ScoreIndex* arr, size_t len) {
    /* Build heap */
    for (size_t i = len / 2; i > 0; i--) {
        heapify_max(arr, len, i - 1);
    }

    /* Extract elements */
    for (size_t i = len - 1; i > 0; i--) {
        swap_score(&arr[0], &arr[i]);
        heapify_max(arr, i, 0);
    }
}

/**
 * Partition for quicksort (Hoare scheme)
 */
static size_t partition(ScoreIndex* arr, size_t lo, size_t hi) {
    double pivot = arr[(lo + hi) / 2].score;
    size_t i = lo;
    size_t j = hi;

    while (1) {
        /* For descending order, we want larger elements first */
        while (arr[i].score > pivot) i++;
        while (arr[j].score < pivot) j--;

        if (i >= j) return j;

        swap_score(&arr[i], &arr[j]);
        i++;
        j--;
    }
}

/**
 * Introsort - hybrid quicksort/heapsort with insertion sort for small arrays
 */
static void introsort_impl(ScoreIndex* arr, size_t lo, size_t hi, int depth_limit) {
    size_t size = hi - lo + 1;

    /* Use insertion sort for small arrays */
    if (size <= 16) {
        insertion_sort(arr + lo, size);
        return;
    }

    /* Switch to heapsort if depth limit exceeded (prevent O(n²) worst case) */
    if (depth_limit == 0) {
        heapsort_desc(arr + lo, size);
        return;
    }

    /* Quicksort partition */
    size_t p = partition(arr, lo, hi);
    introsort_impl(arr, lo, p, depth_limit - 1);
    introsort_impl(arr, p + 1, hi, depth_limit - 1);
}

/**
 * Calculate maximum depth for introsort (2 * floor(log2(n)))
 */
static int calc_depth_limit(size_t n) {
    int depth = 0;
    while (n > 1) {
        n >>= 1;
        depth++;
    }
    return depth * 2;
}

/**
 * Main introsort entry point
 */
static void introsort(ScoreIndex* arr, size_t len) {
    if (len <= 1) return;
    introsort_impl(arr, 0, len - 1, calc_depth_limit(len));
}

/* ============================================
 * RANKING FUNCTIONS (HOT PATH)
 * ============================================ */

/**
 * Sort users by score in descending order (highest first)
 *
 * @param users Array of RankedUser structures
 * @param count Number of users
 * @return 0 on success, -1 on error
 */
EXPORT int __attribute__((hot)) rank_sort_users(RankedUser* users, size_t count) {
    if (!users || count == 0 || count > MAX_ENTRIES) {
        return -1;
    }

    /* Create index array for sorting */
    ScoreIndex* indices = malloc(count * sizeof(ScoreIndex));
    if (!indices) {
        return -1;
    }

    for (size_t i = 0; i < count; i++) {
        indices[i].score = users[i].score;
        indices[i].original_index = i;
    }

    /* Sort by score descending */
    introsort(indices, count);

    /* Create sorted copy */
    RankedUser* sorted = malloc(count * sizeof(RankedUser));
    if (!sorted) {
        free(indices);
        return -1;
    }

    for (size_t i = 0; i < count; i++) {
        sorted[i] = users[indices[i].original_index];
    }

    /* Copy back to original array */
    memcpy(users, sorted, count * sizeof(RankedUser));

    free(sorted);
    free(indices);
    return 0;
}

/**
 * Calculate ranks with tie handling (standard competition ranking)
 *
 * Users with same score get same rank; next rank skips tied entries.
 * Example: scores [100, 90, 90, 80] → ranks [1, 2, 2, 4]
 *
 * @param users Pre-sorted array of RankedUser structures (sorted by score desc)
 * @param count Number of users
 * @return 0 on success, -1 on error
 */
EXPORT int __attribute__((hot)) rank_assign_ranks(RankedUser* users, size_t count) {
    if (!users || count == 0) {
        return -1;
    }

    int32_t current_rank = 1;

    for (size_t i = 0; i < count; i++) {
        /* Check for tie with previous entry */
        if (i > 0 && users[i].score == users[i - 1].score) {
            users[i].rank = users[i - 1].rank;
        } else {
            users[i].rank = current_rank;
        }
        current_rank++;
    }

    return 0;
}

/**
 * Calculate percentiles for each user
 *
 * Percentile = (count - rank + 1) / count * 100
 * Top user gets 100th percentile, bottom gets close to 0
 *
 * @param users Array with ranks already assigned
 * @param count Number of users
 * @return 0 on success, -1 on error
 */
EXPORT int __attribute__((hot)) rank_calculate_percentiles(RankedUser* users, size_t count) {
    if (!users || count == 0) {
        return -1;
    }

    for (size_t i = 0; i < count; i++) {
        /* Higher percentile = better rank */
        users[i].percentile = ((double)(count - users[i].rank + 1) / (double)count) * 100.0;
        /* Round to 2 decimal places */
        users[i].percentile = round(users[i].percentile * 100.0) / 100.0;
    }

    return 0;
}

/**
 * Sort, rank, and calculate percentiles in one pass
 *
 * @param users Array of RankedUser structures
 * @param count Number of users
 * @return 0 on success, -1 on error
 */
EXPORT int __attribute__((hot)) rank_full_ranking(RankedUser* users, size_t count) {
    if (rank_sort_users(users, count) != 0) {
        return -1;
    }
    if (rank_assign_ranks(users, count) != 0) {
        return -1;
    }
    if (rank_calculate_percentiles(users, count) != 0) {
        return -1;
    }
    return 0;
}

/**
 * Calculate percentiles for a simple array of scores (no user IDs)
 *
 * @param scores Input scores (will be modified - sorted in place)
 * @param count Number of scores
 * @param percentiles Output percentiles (must be pre-allocated)
 * @return 0 on success, -1 on error
 */
EXPORT int rank_simple_percentiles(
    double* scores,
    size_t count,
    double* percentiles
) {
    if (!scores || !percentiles || count == 0 || count > MAX_ENTRIES) {
        return -1;
    }

    /* Create index array */
    ScoreIndex* indices = malloc(count * sizeof(ScoreIndex));
    if (!indices) {
        return -1;
    }

    for (size_t i = 0; i < count; i++) {
        indices[i].score = scores[i];
        indices[i].original_index = i;
    }

    /* Sort descending */
    introsort(indices, count);

    /* Calculate percentiles and map back to original positions */
    int32_t current_rank = 1;
    double prev_score = indices[0].score;
    int32_t prev_rank = 1;

    for (size_t i = 0; i < count; i++) {
        int32_t rank;
        if (i > 0 && indices[i].score == prev_score) {
            rank = prev_rank;
        } else {
            rank = current_rank;
            prev_rank = rank;
            prev_score = indices[i].score;
        }

        double pct = ((double)(count - rank + 1) / (double)count) * 100.0;
        percentiles[indices[i].original_index] = round(pct * 100.0) / 100.0;
        current_rank++;
    }

    free(indices);
    return 0;
}

/**
 * Find the rank of a specific score in a pre-sorted array
 *
 * @param sorted_scores Scores sorted in descending order
 * @param count Number of scores
 * @param target_score Score to find rank for
 * @return Rank (1-based), or -1 on error
 */
EXPORT int __attribute__((hot)) rank_find_rank(
    const double* sorted_scores,
    size_t count,
    double target_score
) {
    if (!sorted_scores || count == 0) {
        return -1;
    }

    /* Binary search for the position */
    size_t lo = 0;
    size_t hi = count;

    while (lo < hi) {
        size_t mid = lo + (hi - lo) / 2;
        if (sorted_scores[mid] > target_score) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }

    /* Handle ties - find first occurrence */
    while (lo > 0 && sorted_scores[lo - 1] == target_score) {
        lo--;
    }

    return (int)(lo + 1); /* 1-based rank */
}

/**
 * Get top N entries from a sorted array
 *
 * @param users Pre-sorted array of RankedUser
 * @param total_count Total number of users
 * @param top_n Number of top entries to return
 * @param output Output array (must be at least top_n entries)
 * @return Actual count copied, or -1 on error
 */
EXPORT int rank_get_top_n(
    const RankedUser* users,
    size_t total_count,
    size_t top_n,
    RankedUser* output
) {
    if (!users || !output || total_count == 0) {
        return -1;
    }

    size_t copy_count = top_n < total_count ? top_n : total_count;
    memcpy(output, users, copy_count * sizeof(RankedUser));

    return (int)copy_count;
}

/**
 * Get rank statistics
 */
typedef struct {
    double min_score;
    double max_score;
    double mean_score;
    double median_score;
    double std_dev;
} RankStats;

/**
 * Calculate statistics for ranked users
 *
 * @param users Array of RankedUser (already sorted)
 * @param count Number of users
 * @param stats Output statistics structure
 * @return 0 on success, -1 on error
 */
EXPORT int rank_calculate_stats(
    const RankedUser* users,
    size_t count,
    RankStats* stats
) {
    if (!users || !stats || count == 0) {
        return -1;
    }

    /* Min and max (array is sorted descending) */
    stats->max_score = users[0].score;
    stats->min_score = users[count - 1].score;

    /* Mean */
    double sum = 0;
    for (size_t i = 0; i < count; i++) {
        sum += users[i].score;
    }
    stats->mean_score = sum / count;

    /* Median */
    if (count % 2 == 0) {
        stats->median_score = (users[count/2 - 1].score + users[count/2].score) / 2.0;
    } else {
        stats->median_score = users[count/2].score;
    }

    /* Standard deviation */
    double variance_sum = 0;
    for (size_t i = 0; i < count; i++) {
        double diff = users[i].score - stats->mean_score;
        variance_sum += diff * diff;
    }
    stats->std_dev = sqrt(variance_sum / count);

    return 0;
}
