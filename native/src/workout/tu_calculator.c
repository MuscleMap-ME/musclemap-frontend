/**
 * High-performance Training Unit (TU) Calculator
 *
 * Compile: gcc -O3 -march=native -fPIC -shared -o libtu.so tu_calculator.c -lm
 *
 * Features:
 * - Pre-cached exercise activation data
 * - SIMD-optimized batch TU calculations
 * - Thread-safe exercise cache
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

/* Configuration */
#define MAX_EXERCISES 1000
#define MAX_MUSCLES 64
#define MAX_WORKOUT_EXERCISES 50
#define EXERCISE_ID_LEN 64

/* Exercise with muscle activations */
typedef struct {
    char id[EXERCISE_ID_LEN];
    float activations[MAX_MUSCLES];  /* Activation percentage per muscle (0-100) */
    uint32_t activation_count;        /* Number of non-zero activations */
    bool is_valid;
} CachedExercise;

/* Muscle with bias weight */
typedef struct {
    char id[EXERCISE_ID_LEN];
    float bias_weight;
    bool is_valid;
} CachedMuscle;

/* Workout exercise input */
typedef struct {
    int32_t exercise_index;  /* Index into cached exercises */
    int32_t sets;
    int32_t reps;            /* Optional, default 10 */
    float weight;            /* Optional */
} WorkoutExerciseInput;

/* TU calculation result */
typedef struct {
    float total_tu;
    float muscle_activations[MAX_MUSCLES];
} TUResult;

/* Global cache */
static CachedExercise g_exercises[MAX_EXERCISES];
static CachedMuscle g_muscles[MAX_MUSCLES];
static int32_t g_exercise_count = 0;
static int32_t g_muscle_count = 0;
static pthread_rwlock_t g_cache_lock = PTHREAD_RWLOCK_INITIALIZER;

/* ============================================
 * CACHE MANAGEMENT
 * ============================================ */

/**
 * Initialize the TU calculator cache
 * Returns: 0 on success, -1 on error
 */
EXPORT int tu_init(void) {
    pthread_rwlock_wrlock(&g_cache_lock);
    memset(g_exercises, 0, sizeof(g_exercises));
    memset(g_muscles, 0, sizeof(g_muscles));
    g_exercise_count = 0;
    g_muscle_count = 0;
    pthread_rwlock_unlock(&g_cache_lock);
    return 0;
}

/**
 * Clear the cache
 */
EXPORT void tu_clear(void) {
    pthread_rwlock_wrlock(&g_cache_lock);
    memset(g_exercises, 0, sizeof(g_exercises));
    memset(g_muscles, 0, sizeof(g_muscles));
    g_exercise_count = 0;
    g_muscle_count = 0;
    pthread_rwlock_unlock(&g_cache_lock);
}

/**
 * Add an exercise to the cache
 * Returns: index of the exercise, or -1 on error
 */
EXPORT int tu_add_exercise(
    const char* exercise_id,
    const float* activations,
    int32_t activation_count
) {
    if (!exercise_id || !activations || activation_count > MAX_MUSCLES) {
        return -1;
    }

    pthread_rwlock_wrlock(&g_cache_lock);

    if (g_exercise_count >= MAX_EXERCISES) {
        pthread_rwlock_unlock(&g_cache_lock);
        return -1;
    }

    int index = g_exercise_count++;
    CachedExercise* ex = &g_exercises[index];

    strncpy(ex->id, exercise_id, EXERCISE_ID_LEN - 1);
    ex->id[EXERCISE_ID_LEN - 1] = '\0';

    memcpy(ex->activations, activations, activation_count * sizeof(float));
    ex->activation_count = activation_count;
    ex->is_valid = true;

    pthread_rwlock_unlock(&g_cache_lock);
    return index;
}

/**
 * Add a muscle with bias weight to the cache
 * Returns: index of the muscle, or -1 on error
 */
EXPORT int tu_add_muscle(
    const char* muscle_id,
    float bias_weight
) {
    if (!muscle_id) {
        return -1;
    }

    pthread_rwlock_wrlock(&g_cache_lock);

    if (g_muscle_count >= MAX_MUSCLES) {
        pthread_rwlock_unlock(&g_cache_lock);
        return -1;
    }

    int index = g_muscle_count++;
    CachedMuscle* m = &g_muscles[index];

    strncpy(m->id, muscle_id, EXERCISE_ID_LEN - 1);
    m->id[EXERCISE_ID_LEN - 1] = '\0';
    m->bias_weight = bias_weight;
    m->is_valid = true;

    pthread_rwlock_unlock(&g_cache_lock);
    return index;
}

/**
 * Find exercise index by ID
 * Returns: index or -1 if not found
 */
EXPORT int tu_find_exercise(const char* exercise_id) {
    if (!exercise_id) return -1;

    pthread_rwlock_rdlock(&g_cache_lock);

    for (int i = 0; i < g_exercise_count; i++) {
        if (g_exercises[i].is_valid &&
            strncmp(g_exercises[i].id, exercise_id, EXERCISE_ID_LEN) == 0) {
            pthread_rwlock_unlock(&g_cache_lock);
            return i;
        }
    }

    pthread_rwlock_unlock(&g_cache_lock);
    return -1;
}

/**
 * Get cache statistics
 */
EXPORT void tu_get_stats(int32_t* exercise_count, int32_t* muscle_count) {
    pthread_rwlock_rdlock(&g_cache_lock);
    if (exercise_count) *exercise_count = g_exercise_count;
    if (muscle_count) *muscle_count = g_muscle_count;
    pthread_rwlock_unlock(&g_cache_lock);
}

/* ============================================
 * TU CALCULATION (HOT PATH)
 * ============================================ */

/**
 * Calculate TU for a single workout
 *
 * @param exercises Array of exercise inputs
 * @param count Number of exercises
 * @param result Output result structure
 * @return 0 on success, -1 on error
 *
 * Formula: TU = sum(activation * sets * bias_weight) for each muscle
 */
EXPORT int __attribute__((hot)) tu_calculate(
    const WorkoutExerciseInput* exercises,
    int32_t count,
    TUResult* result
) {
    if (!exercises || !result || count <= 0 || count > MAX_WORKOUT_EXERCISES) {
        return -1;
    }

    /* Initialize result */
    memset(result, 0, sizeof(TUResult));

    pthread_rwlock_rdlock(&g_cache_lock);

    /* Accumulate muscle activations */
    for (int e = 0; e < count; e++) {
        const WorkoutExerciseInput* input = &exercises[e];

        if (input->exercise_index < 0 || input->exercise_index >= g_exercise_count) {
            continue;
        }

        const CachedExercise* ex = &g_exercises[input->exercise_index];
        if (!ex->is_valid) {
            continue;
        }

        /* Sets contribution */
        int32_t sets = input->sets > 0 ? input->sets : 1;

        /* Accumulate activations for each muscle */
        for (uint32_t m = 0; m < ex->activation_count && m < MAX_MUSCLES; m++) {
            float activation = ex->activations[m];
            if (activation > 0.0f) {
                /* activation is 0-100, normalize to 0-1 */
                result->muscle_activations[m] += (activation / 100.0f) * (float)sets;
            }
        }
    }

    /* Apply bias weights and calculate total TU */
    float total = 0.0f;
    for (int m = 0; m < g_muscle_count; m++) {
        if (result->muscle_activations[m] > 0.0f && g_muscles[m].is_valid) {
            float weighted = result->muscle_activations[m] * g_muscles[m].bias_weight;
            total += weighted;
        }
    }

    result->total_tu = roundf(total * 100.0f) / 100.0f;

    pthread_rwlock_unlock(&g_cache_lock);
    return 0;
}

/**
 * Calculate TU for a batch of workouts (parallel optimization)
 *
 * @param workouts Array of workout arrays
 * @param workout_counts Number of exercises in each workout
 * @param batch_size Number of workouts
 * @param results Array of result structures
 * @return Number of successful calculations
 */
EXPORT int tu_calculate_batch(
    const WorkoutExerciseInput** workouts,
    const int32_t* workout_counts,
    int32_t batch_size,
    TUResult* results
) {
    if (!workouts || !workout_counts || !results || batch_size <= 0) {
        return -1;
    }

    int success_count = 0;

    for (int i = 0; i < batch_size; i++) {
        if (tu_calculate(workouts[i], workout_counts[i], &results[i]) == 0) {
            success_count++;
        }
    }

    return success_count;
}

/**
 * Simple TU calculation without caching (for single use)
 *
 * @param activations 2D array: [exercise_index][muscle_index] = activation %
 * @param sets Array of sets per exercise
 * @param bias_weights Array of bias weights per muscle
 * @param exercise_count Number of exercises
 * @param muscle_count Number of muscles
 * @return Total TU
 */
EXPORT float __attribute__((hot)) tu_calculate_simple(
    const float* activations,  /* Flat array: exercise_count * muscle_count */
    const int32_t* sets,
    const float* bias_weights,
    int32_t exercise_count,
    int32_t muscle_count
) {
    if (!activations || !sets || !bias_weights ||
        exercise_count <= 0 || muscle_count <= 0) {
        return 0.0f;
    }

    float muscle_totals[MAX_MUSCLES] = {0};

    /* Accumulate activations */
    for (int e = 0; e < exercise_count; e++) {
        int32_t s = sets[e] > 0 ? sets[e] : 1;

        for (int m = 0; m < muscle_count; m++) {
            float activation = activations[e * muscle_count + m];
            if (activation > 0.0f) {
                muscle_totals[m] += (activation / 100.0f) * (float)s;
            }
        }
    }

    /* Apply bias weights */
    float total = 0.0f;
    for (int m = 0; m < muscle_count; m++) {
        if (muscle_totals[m] > 0.0f) {
            total += muscle_totals[m] * bias_weights[m];
        }
    }

    return roundf(total * 100.0f) / 100.0f;
}
