//! MuscleMap Exercise Scoring Engine
//!
//! High-performance 16-factor scoring algorithm for exercise prescription.
//! This is the core algorithm that determines exercise recommendations.
//!
//! ## Scoring Factors
//!
//! 1. **Archetype Alignment** - How well the exercise matches user's training archetype
//! 2. **Equipment Availability** - User has access to required equipment
//! 3. **Experience Level Match** - Exercise difficulty vs user experience
//! 4. **Injury Prevention** - Consideration of user's injury history
//! 5. **Muscle Targeting** - Primary muscle activation percentage
//! 6. **Secondary Muscle Balance** - Supporting muscle activation
//! 7. **Movement Pattern Variety** - Avoiding repetitive patterns
//! 8. **Biomechanical Suitability** - Based on limb ratios
//! 9. **Recovery Status** - Muscle fatigue from recent workouts
//! 10. **Progressive Overload** - Room for progression
//! 11. **Time Efficiency** - Setup time and exercise duration
//! 12. **Preference Score** - Historical user preference
//! 13. **Novelty Factor** - Introducing variety over time
//! 14. **Joint Stress** - Cumulative stress on joints
//! 15. **Compound vs Isolation** - Balance in workout structure
//! 16. **Muscle Imbalance Correction** - Addressing weaknesses

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Number of scoring factors
pub const FACTOR_COUNT: usize = 16;

/// Default weights for each scoring factor
pub const DEFAULT_WEIGHTS: [f32; FACTOR_COUNT] = [
    0.15, // Archetype Alignment
    0.10, // Equipment Availability
    0.08, // Experience Level Match
    0.10, // Injury Prevention
    0.12, // Muscle Targeting
    0.05, // Secondary Muscle Balance
    0.04, // Movement Pattern Variety
    0.06, // Biomechanical Suitability
    0.08, // Recovery Status
    0.05, // Progressive Overload
    0.03, // Time Efficiency
    0.04, // Preference Score
    0.02, // Novelty Factor
    0.04, // Joint Stress
    0.02, // Compound vs Isolation
    0.02, // Muscle Imbalance Correction
];

/// Factor names for reference
pub const FACTOR_NAMES: [&str; FACTOR_COUNT] = [
    "archetype_alignment",
    "equipment_availability",
    "experience_match",
    "injury_prevention",
    "muscle_targeting",
    "secondary_balance",
    "movement_variety",
    "biomechanical_fit",
    "recovery_status",
    "progressive_overload",
    "time_efficiency",
    "preference_score",
    "novelty_factor",
    "joint_stress",
    "compound_isolation",
    "imbalance_correction",
];

/// Exercise data for scoring
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct ExerciseData {
    pub id: String,
    pub name: String,
    /// Primary muscle activation (0-100)
    pub primary_activation: f32,
    /// Equipment required (encoded as bitflags)
    pub equipment_flags: u32,
    /// Difficulty level (1-5)
    pub difficulty: u8,
    /// Movement pattern ID
    pub movement_pattern: u8,
    /// Is compound exercise
    pub is_compound: bool,
    /// Joint stress score (0-100)
    pub joint_stress: f32,
    /// Setup time in seconds
    pub setup_time: u16,
    /// Target archetype ID
    pub archetype_id: u8,
}

#[wasm_bindgen]
impl ExerciseData {
    #[wasm_bindgen(constructor)]
    pub fn new(
        id: String,
        name: String,
        primary_activation: f32,
        equipment_flags: u32,
        difficulty: u8,
        movement_pattern: u8,
        is_compound: bool,
        joint_stress: f32,
        setup_time: u16,
        archetype_id: u8,
    ) -> ExerciseData {
        ExerciseData {
            id,
            name,
            primary_activation,
            equipment_flags,
            difficulty,
            movement_pattern,
            is_compound,
            joint_stress,
            setup_time,
            archetype_id,
        }
    }
}

/// User context for scoring
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct UserContext {
    /// User's archetype ID
    pub archetype_id: u8,
    /// Experience level (1-5)
    pub experience_level: u8,
    /// Available equipment (bitflags)
    pub equipment_flags: u32,
    /// Injured body parts (bitflags)
    pub injury_flags: u32,
    /// Femur to height ratio (for biomechanics)
    pub femur_ratio: f32,
    /// Arm span to height ratio
    pub arm_ratio: f32,
    /// Torso to leg ratio
    pub torso_ratio: f32,
}

#[wasm_bindgen]
impl UserContext {
    #[wasm_bindgen(constructor)]
    pub fn new(
        archetype_id: u8,
        experience_level: u8,
        equipment_flags: u32,
        injury_flags: u32,
        femur_ratio: f32,
        arm_ratio: f32,
        torso_ratio: f32,
    ) -> UserContext {
        UserContext {
            archetype_id,
            experience_level,
            equipment_flags,
            injury_flags,
            femur_ratio,
            arm_ratio,
            torso_ratio,
        }
    }
}

/// Workout context for scoring
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct WorkoutContext {
    /// Target muscle ID
    pub target_muscle: u8,
    /// Movement patterns already in workout (bitflags)
    pub used_patterns: u32,
    /// Compound exercises already included
    pub compound_count: u8,
    /// Isolation exercises already included
    pub isolation_count: u8,
    /// Total joint stress accumulated
    pub accumulated_stress: f32,
    /// Time already spent in workout (seconds)
    pub time_spent: u32,
    /// Time budget for workout (seconds)
    pub time_budget: u32,
}

#[wasm_bindgen]
impl WorkoutContext {
    #[wasm_bindgen(constructor)]
    pub fn new(
        target_muscle: u8,
        used_patterns: u32,
        compound_count: u8,
        isolation_count: u8,
        accumulated_stress: f32,
        time_spent: u32,
        time_budget: u32,
    ) -> WorkoutContext {
        WorkoutContext {
            target_muscle,
            used_patterns,
            compound_count,
            isolation_count,
            accumulated_stress,
            time_spent,
            time_budget,
        }
    }
}

/// Recovery state for muscles
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryState {
    /// Muscle ID -> recovery percentage (0 = fully fatigued, 100 = fully recovered)
    pub muscle_recovery: HashMap<u8, f32>,
}

/// Individual factor score result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct FactorScore {
    pub name: String,
    pub raw_score: f32,
    pub weight: f32,
    pub weighted_score: f32,
}

/// Complete scoring result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct ScoringResult {
    pub exercise_id: String,
    pub total_score: f32,
    pub duration_ms: f64,
    pub native: bool,
}

#[wasm_bindgen]
impl ScoringResult {
    #[wasm_bindgen(constructor)]
    pub fn new(exercise_id: String, total_score: f32, duration_ms: f64) -> ScoringResult {
        ScoringResult {
            exercise_id,
            total_score,
            duration_ms,
            native: true,
        }
    }
}

/// Detailed scoring result with factor breakdown
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetailedScoringResult {
    pub exercise_id: String,
    pub total_score: f32,
    pub factors: Vec<FactorScore>,
    pub duration_ms: f64,
    pub native: bool,
}

/// Exercise Scoring Engine
#[wasm_bindgen]
pub struct ScoringEngine {
    /// Custom weights for factors (if not using defaults)
    weights: [f32; FACTOR_COUNT],
    /// User preference history (exercise_id -> preference score)
    preferences: HashMap<String, f32>,
    /// Recently used exercises (for novelty)
    recent_exercises: Vec<String>,
    /// Muscle imbalance scores (muscle_id -> imbalance %)
    imbalances: HashMap<u8, f32>,
}

#[wasm_bindgen]
impl ScoringEngine {
    /// Create a new scoring engine with default weights
    #[wasm_bindgen(constructor)]
    pub fn new() -> ScoringEngine {
        ScoringEngine {
            weights: DEFAULT_WEIGHTS,
            preferences: HashMap::new(),
            recent_exercises: Vec::new(),
            imbalances: HashMap::new(),
        }
    }

    /// Set custom weights for factors
    pub fn set_weights(&mut self, weights: Vec<f32>) -> Result<(), JsValue> {
        if weights.len() != FACTOR_COUNT {
            return Err(JsValue::from_str(&format!(
                "Expected {} weights, got {}",
                FACTOR_COUNT,
                weights.len()
            )));
        }

        // Normalize weights to sum to 1.0
        let sum: f32 = weights.iter().sum();
        for (i, w) in weights.iter().enumerate() {
            self.weights[i] = w / sum;
        }

        Ok(())
    }

    /// Set user preference for an exercise
    pub fn set_preference(&mut self, exercise_id: String, preference: f32) {
        self.preferences.insert(exercise_id, preference.clamp(0.0, 100.0));
    }

    /// Add an exercise to recent history (for novelty calculation)
    pub fn add_recent_exercise(&mut self, exercise_id: String) {
        self.recent_exercises.push(exercise_id);
        // Keep last 50 exercises
        if self.recent_exercises.len() > 50 {
            self.recent_exercises.remove(0);
        }
    }

    /// Set muscle imbalance score
    pub fn set_imbalance(&mut self, muscle_id: u8, imbalance: f32) {
        self.imbalances.insert(muscle_id, imbalance.clamp(-100.0, 100.0));
    }

    /// Clear all state
    pub fn clear(&mut self) {
        self.preferences.clear();
        self.recent_exercises.clear();
        self.imbalances.clear();
        self.weights = DEFAULT_WEIGHTS;
    }

    /// Get current weights
    pub fn get_weights(&self) -> Vec<f32> {
        self.weights.to_vec()
    }

    /// Get factor names
    pub fn get_factor_names() -> Vec<String> {
        FACTOR_NAMES.iter().map(|s| s.to_string()).collect()
    }
}

impl Default for ScoringEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Calculate individual factor scores
fn calculate_factors(
    exercise: &ExerciseData,
    user: &UserContext,
    workout: &WorkoutContext,
    recovery: Option<&HashMap<u8, f32>>,
    preferences: &HashMap<String, f32>,
    recent: &[String],
    imbalances: &HashMap<u8, f32>,
) -> [f32; FACTOR_COUNT] {
    let mut factors = [0.0f32; FACTOR_COUNT];

    // 1. Archetype Alignment (0-100)
    factors[0] = if exercise.archetype_id == user.archetype_id {
        100.0
    } else {
        50.0 // Partial match for general exercises
    };

    // 2. Equipment Availability (0 or 100)
    factors[1] = if (exercise.equipment_flags & user.equipment_flags) == exercise.equipment_flags {
        100.0
    } else {
        0.0 // Can't do exercise without equipment
    };

    // 3. Experience Level Match (0-100)
    let exp_diff = (exercise.difficulty as i32 - user.experience_level as i32).abs();
    factors[2] = match exp_diff {
        0 => 100.0,
        1 => 80.0,
        2 => 50.0,
        _ => 20.0,
    };

    // 4. Injury Prevention (0-100)
    // If exercise affects injured area, score is 0
    factors[3] = if exercise.joint_stress > 0.0 && (exercise.equipment_flags & user.injury_flags) != 0 {
        0.0
    } else {
        100.0
    };

    // 5. Muscle Targeting (0-100)
    factors[4] = exercise.primary_activation;

    // 6. Secondary Muscle Balance (0-100)
    // Higher score for exercises that also work supporting muscles
    factors[5] = if exercise.is_compound {
        80.0
    } else {
        50.0
    };

    // 7. Movement Pattern Variety (0-100)
    let pattern_bit = 1u32 << exercise.movement_pattern;
    factors[6] = if (workout.used_patterns & pattern_bit) == 0 {
        100.0 // New pattern
    } else {
        30.0 // Already used this pattern
    };

    // 8. Biomechanical Suitability (0-100)
    // Based on limb ratios and exercise mechanics
    factors[7] = calculate_biomechanical_score(exercise, user);

    // 9. Recovery Status (0-100)
    factors[8] = if let Some(recovery_map) = recovery {
        recovery_map.get(&workout.target_muscle).copied().unwrap_or(100.0)
    } else {
        100.0
    };

    // 10. Progressive Overload (0-100)
    // Higher for exercises with clear progression path
    factors[9] = if exercise.is_compound {
        90.0
    } else {
        70.0
    };

    // 11. Time Efficiency (0-100)
    let remaining_time = workout.time_budget.saturating_sub(workout.time_spent);
    factors[10] = if exercise.setup_time as u32 <= remaining_time {
        100.0 - (exercise.setup_time as f32 / 60.0).min(30.0) // Penalize long setup
    } else {
        10.0 // Not enough time
    };

    // 12. Preference Score (0-100)
    factors[11] = preferences.get(&exercise.id).copied().unwrap_or(50.0);

    // 13. Novelty Factor (0-100)
    let recent_count = recent.iter().filter(|e| *e == &exercise.id).count();
    factors[12] = match recent_count {
        0 => 100.0,
        1 => 70.0,
        2 => 40.0,
        _ => 20.0,
    };

    // 14. Joint Stress (0-100, inverted - lower stress = higher score)
    let total_stress = workout.accumulated_stress + exercise.joint_stress;
    factors[13] = (100.0 - total_stress.min(100.0)).max(0.0);

    // 15. Compound vs Isolation Balance (0-100)
    factors[14] = if exercise.is_compound {
        if workout.compound_count < 3 { 100.0 } else { 50.0 }
    } else {
        if workout.isolation_count < 2 { 80.0 } else { 60.0 }
    };

    // 16. Muscle Imbalance Correction (0-100)
    factors[15] = if let Some(&imbalance) = imbalances.get(&workout.target_muscle) {
        if imbalance < 0.0 {
            // Muscle is weak, prioritize exercises that target it
            100.0
        } else {
            50.0
        }
    } else {
        50.0
    };

    factors
}

/// Calculate biomechanical suitability score based on limb ratios
fn calculate_biomechanical_score(exercise: &ExerciseData, user: &UserContext) -> f32 {
    // Simplified biomechanical scoring
    // In production, this would use detailed movement analysis

    let base_score = 75.0;

    // Adjust based on limb ratios for specific movement patterns
    let adjustment = match exercise.movement_pattern {
        // Squat patterns - favor shorter femurs
        0 => (1.0 - user.femur_ratio) * 20.0,
        // Deadlift patterns - favor longer arms
        1 => (user.arm_ratio - 1.0) * 20.0,
        // Bench patterns - favor shorter arms, longer torso
        2 => ((1.0 - user.arm_ratio) + user.torso_ratio) * 10.0,
        // Pull patterns - favor longer arms
        3 => (user.arm_ratio - 1.0) * 15.0,
        // Press patterns - neutral
        4 => 0.0,
        _ => 0.0,
    };

    (base_score + adjustment).clamp(0.0, 100.0)
}

/// Score a single exercise (simple interface)
///
/// # Arguments
/// * `exercise` - Exercise to score
/// * `user` - User context
/// * `workout` - Current workout context
/// * `weights` - Optional custom weights (uses defaults if empty)
///
/// # Returns
/// Total score (0-100)
#[wasm_bindgen]
pub fn score_exercise_simple(
    exercise: &ExerciseData,
    user: &UserContext,
    workout: &WorkoutContext,
    weights: Option<Vec<f32>>,
) -> f32 {
    let weights = if let Some(w) = weights {
        if w.len() == FACTOR_COUNT {
            let sum: f32 = w.iter().sum();
            let mut normalized = [0.0f32; FACTOR_COUNT];
            for (i, &v) in w.iter().enumerate() {
                normalized[i] = v / sum;
            }
            normalized
        } else {
            DEFAULT_WEIGHTS
        }
    } else {
        DEFAULT_WEIGHTS
    };

    let factors = calculate_factors(
        exercise,
        user,
        workout,
        None,
        &HashMap::new(),
        &[],
        &HashMap::new(),
    );

    // Calculate weighted sum
    factors.iter()
        .zip(weights.iter())
        .map(|(f, w)| f * w)
        .sum()
}

/// Score multiple exercises and return sorted results
///
/// # Arguments
/// * `exercises` - Array of exercises to score
/// * `user` - User context
/// * `workout` - Current workout context
///
/// # Returns
/// Array of (exercise_id, score) tuples, sorted by score descending
#[wasm_bindgen]
pub fn score_exercises_batch(
    exercises: Vec<ExerciseData>,
    user: &UserContext,
    workout: &WorkoutContext,
) -> Result<JsValue, JsValue> {
    let start = js_sys::Date::now();

    let mut results: Vec<(String, f32)> = exercises
        .iter()
        .map(|ex| {
            let score = score_exercise_simple(ex, user, workout, None);
            (ex.id.clone(), score)
        })
        .collect();

    // Sort by score descending
    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    let duration_ms = js_sys::Date::now() - start;

    #[derive(Serialize)]
    struct BatchResult {
        results: Vec<(String, f32)>,
        count: usize,
        duration_ms: f64,
        native: bool,
    }

    let result = BatchResult {
        count: results.len(),
        results,
        duration_ms,
        native: true,
    };

    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Score exercise with full factor breakdown
#[wasm_bindgen]
pub fn score_exercise_detailed(
    exercise: &ExerciseData,
    user: &UserContext,
    workout: &WorkoutContext,
    weights: Option<Vec<f32>>,
) -> Result<JsValue, JsValue> {
    let start = js_sys::Date::now();

    let weights = if let Some(w) = weights {
        if w.len() == FACTOR_COUNT {
            let sum: f32 = w.iter().sum();
            let mut normalized = [0.0f32; FACTOR_COUNT];
            for (i, &v) in w.iter().enumerate() {
                normalized[i] = v / sum;
            }
            normalized
        } else {
            DEFAULT_WEIGHTS
        }
    } else {
        DEFAULT_WEIGHTS
    };

    let factors = calculate_factors(
        exercise,
        user,
        workout,
        None,
        &HashMap::new(),
        &[],
        &HashMap::new(),
    );

    let mut factor_scores: Vec<FactorScore> = Vec::with_capacity(FACTOR_COUNT);
    let mut total = 0.0f32;

    for (i, (&raw, &weight)) in factors.iter().zip(weights.iter()).enumerate() {
        let weighted = raw * weight;
        total += weighted;

        factor_scores.push(FactorScore {
            name: FACTOR_NAMES[i].to_string(),
            raw_score: raw,
            weight,
            weighted_score: weighted,
        });
    }

    let duration_ms = js_sys::Date::now() - start;

    let result = DetailedScoringResult {
        exercise_id: exercise.id.clone(),
        total_score: total,
        factors: factor_scores,
        duration_ms,
        native: true,
    };

    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Get recommended exercises for a target muscle
///
/// # Arguments
/// * `exercises` - All available exercises
/// * `user` - User context
/// * `workout` - Current workout context
/// * `limit` - Maximum number to return
///
/// # Returns
/// Top N exercises by score
#[wasm_bindgen]
pub fn get_recommendations(
    exercises: Vec<ExerciseData>,
    user: &UserContext,
    workout: &WorkoutContext,
    limit: u32,
) -> Result<JsValue, JsValue> {
    let start = js_sys::Date::now();

    let mut scored: Vec<(ExerciseData, f32)> = exercises
        .into_iter()
        .map(|ex| {
            let score = score_exercise_simple(&ex, user, workout, None);
            (ex, score)
        })
        .filter(|(_, score)| *score > 0.0) // Filter out impossible exercises
        .collect();

    // Sort by score descending
    scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    // Take top N
    let limit = limit as usize;
    let recommendations: Vec<ScoringResult> = scored
        .into_iter()
        .take(limit)
        .map(|(ex, score)| ScoringResult {
            exercise_id: ex.id,
            total_score: score,
            duration_ms: 0.0,
            native: true,
        })
        .collect();

    let duration_ms = js_sys::Date::now() - start;

    #[derive(Serialize)]
    struct RecommendationResult {
        recommendations: Vec<ScoringResult>,
        count: usize,
        duration_ms: f64,
        native: bool,
    }

    let result = RecommendationResult {
        count: recommendations.len(),
        recommendations,
        duration_ms,
        native: true,
    };

    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_exercise() -> ExerciseData {
        ExerciseData {
            id: "bench_press".to_string(),
            name: "Bench Press".to_string(),
            primary_activation: 85.0,
            equipment_flags: 0b11, // Bench + Barbell
            difficulty: 3,
            movement_pattern: 2, // Press
            is_compound: true,
            joint_stress: 40.0,
            setup_time: 60,
            archetype_id: 1,
        }
    }

    fn create_test_user() -> UserContext {
        UserContext {
            archetype_id: 1,
            experience_level: 3,
            equipment_flags: 0b111, // Has bench, barbell, dumbbells
            injury_flags: 0,
            femur_ratio: 1.0,
            arm_ratio: 1.0,
            torso_ratio: 1.0,
        }
    }

    fn create_test_workout() -> WorkoutContext {
        WorkoutContext {
            target_muscle: 1, // Chest
            used_patterns: 0,
            compound_count: 0,
            isolation_count: 0,
            accumulated_stress: 0.0,
            time_spent: 0,
            time_budget: 3600,
        }
    }

    #[test]
    fn test_score_exercise() {
        let exercise = create_test_exercise();
        let user = create_test_user();
        let workout = create_test_workout();

        let score = score_exercise_simple(&exercise, &user, &workout, None);

        // Score should be positive and reasonable
        assert!(score > 0.0);
        assert!(score <= 100.0);
    }

    #[test]
    fn test_no_equipment() {
        let exercise = create_test_exercise();
        let mut user = create_test_user();
        user.equipment_flags = 0; // No equipment

        // Test with equipment
        let workout = create_test_workout();
        user.equipment_flags = 0b111; // Has all equipment
        let score_with = score_exercise_simple(&exercise, &user, &workout, None);

        // Test without equipment
        user.equipment_flags = 0; // No equipment
        let score_without = score_exercise_simple(&exercise, &user, &workout, None);

        // Score should be lower without equipment (equipment factor = 10% weight)
        assert!(score_without < score_with);
        // Equipment contributes 10% to score, so without it score drops by ~10 points
        assert!((score_with - score_without).abs() > 5.0);
    }

    #[test]
    fn test_weights_normalization() {
        let mut engine = ScoringEngine::new();

        // Set non-normalized weights
        let weights = vec![1.0; FACTOR_COUNT];
        engine.set_weights(weights).unwrap();

        // Should be normalized
        let sum: f32 = engine.weights.iter().sum();
        assert!((sum - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_default_weights() {
        let sum: f32 = DEFAULT_WEIGHTS.iter().sum();
        assert!((sum - 1.0).abs() < 0.001);
    }
}
