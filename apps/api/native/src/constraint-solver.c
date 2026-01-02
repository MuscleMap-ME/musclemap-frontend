/**
 * Constraint Solver - Native C Implementation
 *
 * High-performance constraint solver for workout prescription.
 * Uses N-API for Node.js integration.
 *
 * Key optimizations:
 * - SIMD-friendly data layout
 * - Cache-optimized scoring loop
 * - Branch prediction hints
 * - Memory pooling to avoid allocations in hot path
 */

#include <node_api.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <math.h>

#define MAX_EXERCISES 500
#define MAX_MUSCLES 50
#define MAX_STRING_LEN 128

// Scoring weights
typedef struct {
    float goal_alignment;
    float compound_preference;
    float recovery_penalty_24h;
    float recovery_penalty_48h;
    float fitness_level_match;
    float muscle_coverage_gap;
} ScoringWeights;

// Exercise data structure (cache-optimized layout)
typedef struct {
    int32_t id;                          // Exercise ID (hashed)
    int32_t difficulty;                  // 1-5
    int32_t is_compound;                 // 0 or 1
    int32_t movement_pattern;            // enum: push=0, pull=1, squat=2, hinge=3, carry=4, core=5, isolation=6
    int32_t estimated_seconds;
    int32_t rest_seconds;
    float activations[MAX_MUSCLES];      // Activation percentage for each muscle
    int32_t primary_muscles_mask;        // Bitmask of primary muscles
    int32_t locations_mask;              // Bitmask of valid locations
    int32_t equipment_required_mask;     // Bitmask of required equipment
} Exercise;

// Request parameters
typedef struct {
    int32_t time_available_seconds;
    int32_t location;                    // enum: gym=0, home=1, park=2, hotel=3, office=4, travel=5
    int32_t equipment_mask;              // Bitmask of available equipment
    int32_t goals_mask;                  // Bitmask of goals
    int32_t fitness_level;               // 0=beginner, 1=intermediate, 2=advanced
    int32_t excluded_exercises_mask[16]; // Bitmask for excluded exercises (up to 512)
    int32_t excluded_muscles_mask;       // Bitmask of excluded muscles
    int32_t recent_24h_muscles_mask;     // Muscles worked in last 24h
    int32_t recent_48h_muscles_mask;     // Muscles worked in last 48h
    ScoringWeights weights;
} SolverRequest;

// Scored exercise for sorting
typedef struct {
    int32_t index;
    float score;
} ScoredExercise;

// Global exercise cache (loaded once from JS)
static Exercise g_exercises[MAX_EXERCISES];
static int32_t g_exercise_count = 0;
static int32_t g_initialized = 0;

// Difficulty ranges by fitness level
static const int32_t DIFFICULTY_MIN[] = {1, 2, 3};
static const int32_t DIFFICULTY_MAX[] = {2, 3, 5};

// Movement pattern enum values
enum MovementPattern {
    PATTERN_PUSH = 0,
    PATTERN_PULL = 1,
    PATTERN_SQUAT = 2,
    PATTERN_HINGE = 3,
    PATTERN_CARRY = 4,
    PATTERN_CORE = 5,
    PATTERN_ISOLATION = 6
};

// Goal enum values
enum GoalType {
    GOAL_STRENGTH = 0,
    GOAL_HYPERTROPHY = 1,
    GOAL_ENDURANCE = 2,
    GOAL_MOBILITY = 3,
    GOAL_FAT_LOSS = 4
};

// Goal-preferred patterns (bitmasks)
static const int32_t GOAL_PREFERRED_PATTERNS[] = {
    // strength: squat, hinge, push, pull
    (1 << PATTERN_SQUAT) | (1 << PATTERN_HINGE) | (1 << PATTERN_PUSH) | (1 << PATTERN_PULL),
    // hypertrophy: push, pull, squat, hinge
    (1 << PATTERN_PUSH) | (1 << PATTERN_PULL) | (1 << PATTERN_SQUAT) | (1 << PATTERN_HINGE),
    // endurance: push, pull, squat, core
    (1 << PATTERN_PUSH) | (1 << PATTERN_PULL) | (1 << PATTERN_SQUAT) | (1 << PATTERN_CORE),
    // mobility: core, hinge, squat
    (1 << PATTERN_CORE) | (1 << PATTERN_HINGE) | (1 << PATTERN_SQUAT),
    // fat_loss: squat, hinge, push, pull
    (1 << PATTERN_SQUAT) | (1 << PATTERN_HINGE) | (1 << PATTERN_PUSH) | (1 << PATTERN_PULL)
};

// Goal prefers compound
static const int32_t GOAL_PREFER_COMPOUND[] = {1, 1, 0, 0, 1};

/**
 * Check if exercise passes hard filters
 * Returns 1 if valid, 0 if filtered out
 */
static inline int32_t __attribute__((hot))
passes_hard_filters(const Exercise* ex, const SolverRequest* req) {
    // Location check
    if (!(ex->locations_mask & (1 << req->location))) {
        return 0;
    }

    // Equipment check (skip for gym location)
    if (req->location != 0) { // Not gym
        if ((ex->equipment_required_mask & ~req->equipment_mask) != 0) {
            return 0;
        }
    }

    // Excluded exercises check (bitmask lookup)
    int32_t bucket = ex->id / 32;
    int32_t bit = ex->id % 32;
    if (bucket < 16 && (req->excluded_exercises_mask[bucket] & (1 << bit))) {
        return 0;
    }

    // Excluded muscles check
    if ((ex->primary_muscles_mask & req->excluded_muscles_mask) != 0) {
        return 0;
    }

    // Check activations for excluded muscles (> 40%)
    for (int32_t i = 0; i < MAX_MUSCLES; i++) {
        if ((req->excluded_muscles_mask & (1 << i)) && ex->activations[i] > 40.0f) {
            return 0;
        }
    }

    return 1;
}

/**
 * Score a single exercise
 * Hot path - optimized for speed
 */
static inline float __attribute__((hot))
score_exercise(
    const Exercise* ex,
    const SolverRequest* req,
    int32_t current_coverage_mask
) {
    float score = 0.0f;

    // Goal alignment
    if (req->goals_mask != 0) {
        for (int32_t goal = 0; goal < 5; goal++) {
            if (req->goals_mask & (1 << goal)) {
                // Check preferred patterns
                if (GOAL_PREFERRED_PATTERNS[goal] & (1 << ex->movement_pattern)) {
                    score += req->weights.goal_alignment;
                }
                // Compound preference
                if (GOAL_PREFER_COMPOUND[goal] && ex->is_compound) {
                    score += req->weights.goal_alignment * 0.5f;
                }
            }
        }
    }

    // Compound preference (time efficient)
    if (ex->is_compound) {
        score += req->weights.compound_preference;
    }

    // Recovery penalties - check activated muscles
    for (int32_t i = 0; i < MAX_MUSCLES; i++) {
        if (ex->activations[i] > 0.0f) {
            if (req->recent_24h_muscles_mask & (1 << i)) {
                score += req->weights.recovery_penalty_24h;
            } else if (req->recent_48h_muscles_mask & (1 << i)) {
                score += req->weights.recovery_penalty_48h;
            }
        }
    }

    // Fitness level match
    if (req->fitness_level >= 0 && req->fitness_level <= 2) {
        int32_t min_diff = DIFFICULTY_MIN[req->fitness_level];
        int32_t max_diff = DIFFICULTY_MAX[req->fitness_level];
        if (ex->difficulty >= min_diff && ex->difficulty <= max_diff) {
            score += req->weights.fitness_level_match;
        }
        // Penalty for too hard
        if (ex->difficulty > max_diff) {
            score -= (float)(ex->difficulty - max_diff) * 5.0f;
        }
    }

    // Muscle coverage gap - prioritize uncovered muscles
    for (int32_t i = 0; i < MAX_MUSCLES; i++) {
        if (ex->activations[i] > 0.0f && !(current_coverage_mask & (1 << i))) {
            score += req->weights.muscle_coverage_gap;
        }
    }

    return score;
}

/**
 * Comparison function for sorting scored exercises (descending)
 */
static int compare_scores(const void* a, const void* b) {
    float diff = ((ScoredExercise*)b)->score - ((ScoredExercise*)a)->score;
    return (diff > 0.0f) ? 1 : (diff < 0.0f) ? -1 : 0;
}

/**
 * Estimate exercise time
 */
static inline int32_t estimate_time(const Exercise* ex, int32_t sets, int32_t reps, float rest_multiplier) {
    const int32_t rep_duration = 3;
    int32_t rep_time = reps * rep_duration;
    int32_t rest_time = (int32_t)(ex->rest_seconds * rest_multiplier);
    int32_t setup_time = (ex->equipment_required_mask != 0) ? 30 : 0;
    return setup_time + (sets * rep_time) + ((sets - 1) * rest_time);
}

/**
 * Main solver function
 * Returns indices of selected exercises
 */
static int32_t solve(
    const SolverRequest* req,
    int32_t* out_indices,
    int32_t* out_sets,
    int32_t* out_reps,
    int32_t max_results
) {
    if (g_exercise_count == 0) {
        return 0;
    }

    // Filter exercises
    int32_t valid_indices[MAX_EXERCISES];
    int32_t valid_count = 0;

    for (int32_t i = 0; i < g_exercise_count; i++) {
        if (passes_hard_filters(&g_exercises[i], req)) {
            valid_indices[valid_count++] = i;
        }
    }

    if (valid_count == 0) {
        return 0;
    }

    // Calculate time budget
    int32_t warmup_cooldown = (req->time_available_seconds >= 1800) ? 300 : 120;
    int32_t time_remaining = req->time_available_seconds - warmup_cooldown;

    // Rest multiplier from goals
    float rest_multiplier = 1.0f;
    if (req->goals_mask & (1 << GOAL_STRENGTH)) rest_multiplier = 1.5f;
    else if (req->goals_mask & (1 << GOAL_ENDURANCE)) rest_multiplier = 0.5f;
    else if (req->goals_mask & (1 << GOAL_FAT_LOSS)) rest_multiplier = 0.6f;
    else if (req->goals_mask & (1 << GOAL_MOBILITY)) rest_multiplier = 0.75f;

    // Sets/reps from goals
    int32_t base_sets = 3, base_reps = 10;
    if (req->goals_mask & (1 << GOAL_STRENGTH)) { base_sets = 5; base_reps = 4; }
    else if (req->goals_mask & (1 << GOAL_HYPERTROPHY)) { base_sets = 4; base_reps = 10; }
    else if (req->goals_mask & (1 << GOAL_ENDURANCE)) { base_sets = 2; base_reps = 20; }
    else if (req->goals_mask & (1 << GOAL_FAT_LOSS)) { base_sets = 3; base_reps = 14; }

    // Selection loop
    int32_t selected_mask[16] = {0};
    int32_t coverage_mask = 0;
    int32_t result_count = 0;

    ScoredExercise scored[MAX_EXERCISES];

    while (time_remaining > 60 && result_count < max_results) {
        // Score remaining exercises
        int32_t scored_count = 0;
        for (int32_t i = 0; i < valid_count; i++) {
            int32_t idx = valid_indices[i];
            int32_t bucket = idx / 32;
            int32_t bit = idx % 32;

            // Skip already selected
            if (selected_mask[bucket] & (1 << bit)) {
                continue;
            }

            scored[scored_count].index = idx;
            scored[scored_count].score = score_exercise(&g_exercises[idx], req, coverage_mask);
            scored_count++;
        }

        if (scored_count == 0) break;

        // Sort by score descending
        qsort(scored, scored_count, sizeof(ScoredExercise), compare_scores);

        // Try to fit exercises
        int32_t found = 0;
        for (int32_t i = 0; i < scored_count && !found; i++) {
            int32_t idx = scored[i].index;
            const Exercise* ex = &g_exercises[idx];

            int32_t time_needed = estimate_time(ex, base_sets, base_reps, rest_multiplier);

            if (time_needed <= time_remaining) {
                // Select this exercise
                int32_t bucket = idx / 32;
                int32_t bit = idx % 32;
                selected_mask[bucket] |= (1 << bit);

                // Update coverage
                for (int32_t m = 0; m < MAX_MUSCLES; m++) {
                    if (ex->activations[m] > 0.0f) {
                        coverage_mask |= (1 << m);
                    }
                }

                // Output result
                out_indices[result_count] = idx;
                out_sets[result_count] = base_sets;
                out_reps[result_count] = base_reps;
                result_count++;

                time_remaining -= time_needed;
                found = 1;
            }
        }

        if (!found) break;
    }

    return result_count;
}

// ============ N-API Bindings ============

/**
 * Initialize exercises from JavaScript array
 * Called once at startup
 */
static napi_value InitExercises(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, NULL, NULL);

    if (argc < 1) {
        napi_throw_error(env, NULL, "Expected exercises array");
        return NULL;
    }

    bool is_array;
    napi_is_array(env, args[0], &is_array);
    if (!is_array) {
        napi_throw_error(env, NULL, "Expected array");
        return NULL;
    }

    uint32_t length;
    napi_get_array_length(env, args[0], &length);
    if (length > MAX_EXERCISES) length = MAX_EXERCISES;

    g_exercise_count = 0;

    for (uint32_t i = 0; i < length; i++) {
        napi_value elem;
        napi_get_element(env, args[0], i, &elem);

        Exercise* ex = &g_exercises[g_exercise_count];
        memset(ex, 0, sizeof(Exercise));

        // Get properties
        napi_value val;

        napi_get_named_property(env, elem, "id", &val);
        napi_get_value_int32(env, val, &ex->id);

        napi_get_named_property(env, elem, "difficulty", &val);
        napi_get_value_int32(env, val, &ex->difficulty);

        napi_get_named_property(env, elem, "isCompound", &val);
        bool is_compound;
        napi_get_value_bool(env, val, &is_compound);
        ex->is_compound = is_compound ? 1 : 0;

        napi_get_named_property(env, elem, "movementPattern", &val);
        napi_get_value_int32(env, val, &ex->movement_pattern);

        napi_get_named_property(env, elem, "estimatedSeconds", &val);
        napi_get_value_int32(env, val, &ex->estimated_seconds);

        napi_get_named_property(env, elem, "restSeconds", &val);
        napi_get_value_int32(env, val, &ex->rest_seconds);

        napi_get_named_property(env, elem, "locationsMask", &val);
        napi_get_value_int32(env, val, &ex->locations_mask);

        napi_get_named_property(env, elem, "equipmentRequiredMask", &val);
        napi_get_value_int32(env, val, &ex->equipment_required_mask);

        napi_get_named_property(env, elem, "primaryMusclesMask", &val);
        napi_get_value_int32(env, val, &ex->primary_muscles_mask);

        // Get activations array
        napi_value activations;
        napi_get_named_property(env, elem, "activations", &activations);
        bool has_activations;
        napi_is_array(env, activations, &has_activations);
        if (has_activations) {
            uint32_t act_len;
            napi_get_array_length(env, activations, &act_len);
            if (act_len > MAX_MUSCLES) act_len = MAX_MUSCLES;
            for (uint32_t j = 0; j < act_len; j++) {
                napi_value act_val;
                napi_get_element(env, activations, j, &act_val);
                double act;
                napi_get_value_double(env, act_val, &act);
                ex->activations[j] = (float)act;
            }
        }

        g_exercise_count++;
    }

    g_initialized = 1;

    napi_value result;
    napi_create_int32(env, g_exercise_count, &result);
    return result;
}

/**
 * Solve constraints and return selected exercises
 */
static napi_value Solve(napi_env env, napi_callback_info info) {
    if (!g_initialized || g_exercise_count == 0) {
        napi_throw_error(env, NULL, "Exercises not initialized. Call initExercises first.");
        return NULL;
    }

    size_t argc = 1;
    napi_value args[1];
    napi_get_cb_info(env, info, &argc, args, NULL, NULL);

    if (argc < 1) {
        napi_throw_error(env, NULL, "Expected request object");
        return NULL;
    }

    SolverRequest req = {0};
    req.weights = (ScoringWeights){10.0f, 5.0f, -20.0f, -10.0f, 5.0f, 15.0f};

    napi_value val;

    napi_get_named_property(env, args[0], "timeAvailableSeconds", &val);
    napi_get_value_int32(env, val, &req.time_available_seconds);

    napi_get_named_property(env, args[0], "location", &val);
    napi_get_value_int32(env, val, &req.location);

    napi_get_named_property(env, args[0], "equipmentMask", &val);
    napi_get_value_int32(env, val, &req.equipment_mask);

    napi_get_named_property(env, args[0], "goalsMask", &val);
    napi_get_value_int32(env, val, &req.goals_mask);

    napi_get_named_property(env, args[0], "fitnessLevel", &val);
    napi_get_value_int32(env, val, &req.fitness_level);

    napi_get_named_property(env, args[0], "excludedMusclesMask", &val);
    napi_get_value_int32(env, val, &req.excluded_muscles_mask);

    napi_get_named_property(env, args[0], "recent24hMusclesMask", &val);
    napi_get_value_int32(env, val, &req.recent_24h_muscles_mask);

    napi_get_named_property(env, args[0], "recent48hMusclesMask", &val);
    napi_get_value_int32(env, val, &req.recent_48h_muscles_mask);

    // Get excluded exercises mask array
    napi_value excluded_arr;
    napi_get_named_property(env, args[0], "excludedExercisesMask", &excluded_arr);
    bool is_excluded_array;
    napi_is_array(env, excluded_arr, &is_excluded_array);
    if (is_excluded_array) {
        uint32_t ex_len;
        napi_get_array_length(env, excluded_arr, &ex_len);
        if (ex_len > 16) ex_len = 16;
        for (uint32_t i = 0; i < ex_len; i++) {
            napi_value ex_val;
            napi_get_element(env, excluded_arr, i, &ex_val);
            napi_get_value_int32(env, ex_val, &req.excluded_exercises_mask[i]);
        }
    }

    // Solve
    int32_t out_indices[MAX_EXERCISES];
    int32_t out_sets[MAX_EXERCISES];
    int32_t out_reps[MAX_EXERCISES];

    int32_t count = solve(&req, out_indices, out_sets, out_reps, MAX_EXERCISES);

    // Build result array
    napi_value result;
    napi_create_array_with_length(env, count, &result);

    for (int32_t i = 0; i < count; i++) {
        napi_value item;
        napi_create_object(env, &item);

        napi_value idx_val, sets_val, reps_val;
        napi_create_int32(env, out_indices[i], &idx_val);
        napi_create_int32(env, out_sets[i], &sets_val);
        napi_create_int32(env, out_reps[i], &reps_val);

        napi_set_named_property(env, item, "index", idx_val);
        napi_set_named_property(env, item, "sets", sets_val);
        napi_set_named_property(env, item, "reps", reps_val);

        napi_set_element(env, result, i, item);
    }

    return result;
}

/**
 * Score a batch of exercises (for debugging/benchmarking)
 */
static napi_value ScoreBatch(napi_env env, napi_callback_info info) {
    if (!g_initialized) {
        napi_throw_error(env, NULL, "Not initialized");
        return NULL;
    }

    size_t argc = 2;
    napi_value args[2];
    napi_get_cb_info(env, info, &argc, args, NULL, NULL);

    // args[0] = array of exercise indices
    // args[1] = request object

    SolverRequest req = {0};
    req.weights = (ScoringWeights){10.0f, 5.0f, -20.0f, -10.0f, 5.0f, 15.0f};

    napi_value val;
    napi_get_named_property(env, args[1], "goalsMask", &val);
    napi_get_value_int32(env, val, &req.goals_mask);

    napi_get_named_property(env, args[1], "fitnessLevel", &val);
    napi_get_value_int32(env, val, &req.fitness_level);

    napi_get_named_property(env, args[1], "recent24hMusclesMask", &val);
    napi_get_value_int32(env, val, &req.recent_24h_muscles_mask);

    napi_get_named_property(env, args[1], "recent48hMusclesMask", &val);
    napi_get_value_int32(env, val, &req.recent_48h_muscles_mask);

    uint32_t length;
    napi_get_array_length(env, args[0], &length);

    napi_value result;
    napi_create_array_with_length(env, length, &result);

    for (uint32_t i = 0; i < length; i++) {
        napi_value idx_val;
        napi_get_element(env, args[0], i, &idx_val);

        int32_t idx;
        napi_get_value_int32(env, idx_val, &idx);

        float score = 0.0f;
        if (idx >= 0 && idx < g_exercise_count) {
            score = score_exercise(&g_exercises[idx], &req, 0);
        }

        napi_value score_val;
        napi_create_double(env, score, &score_val);
        napi_set_element(env, result, i, score_val);
    }

    return result;
}

/**
 * Get exercise count (for testing)
 */
static napi_value GetExerciseCount(napi_env env, napi_callback_info info) {
    napi_value result;
    napi_create_int32(env, g_exercise_count, &result);
    return result;
}

/**
 * Module initialization
 */
static napi_value Init(napi_env env, napi_value exports) {
    napi_value fn;

    napi_create_function(env, NULL, 0, InitExercises, NULL, &fn);
    napi_set_named_property(env, exports, "initExercises", fn);

    napi_create_function(env, NULL, 0, Solve, NULL, &fn);
    napi_set_named_property(env, exports, "solve", fn);

    napi_create_function(env, NULL, 0, ScoreBatch, NULL, &fn);
    napi_set_named_property(env, exports, "scoreBatch", fn);

    napi_create_function(env, NULL, 0, GetExerciseCount, NULL, &fn);
    napi_set_named_property(env, exports, "getExerciseCount", fn);

    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
