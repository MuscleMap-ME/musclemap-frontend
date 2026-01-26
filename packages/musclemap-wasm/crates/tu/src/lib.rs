//! MuscleMap Training Unit (TU) Calculator
//!
//! High-performance TU calculation for workout volume tracking.
//! TU = Training Units, a normalized measure of workout volume across muscle groups.
//!
//! Formula: TU = Σ(activation × sets × bias_weight) for each muscle
//!
//! Compiled to WebAssembly for universal runtime support.

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Maximum number of muscles supported
const MAX_MUSCLES: usize = 64;

/// Maximum number of exercises per workout
const MAX_EXERCISES: usize = 100;

/// Muscle activation data
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct MuscleActivation {
    pub muscle_id: String,
    /// Activation percentage (0-100)
    pub activation: f32,
}

#[wasm_bindgen]
impl MuscleActivation {
    #[wasm_bindgen(constructor)]
    pub fn new(muscle_id: String, activation: f32) -> MuscleActivation {
        MuscleActivation {
            muscle_id,
            activation: activation.clamp(0.0, 100.0),
        }
    }
}

/// Exercise input for TU calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct ExerciseInput {
    pub exercise_id: String,
    pub sets: u32,
    pub reps: u32,
    pub weight_kg: f32,
}

#[wasm_bindgen]
impl ExerciseInput {
    #[wasm_bindgen(constructor)]
    pub fn new(exercise_id: String, sets: u32, reps: u32, weight_kg: f32) -> ExerciseInput {
        ExerciseInput {
            exercise_id,
            sets: sets.max(1),
            reps: reps.max(1),
            weight_kg,
        }
    }
}

/// Result of TU calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct TUResult {
    /// Total Training Units
    pub total_tu: f32,
    /// Time taken in milliseconds
    pub duration_ms: f64,
    /// Whether native WASM was used
    pub native: bool,
}

#[wasm_bindgen]
impl TUResult {
    #[wasm_bindgen(constructor)]
    pub fn new(total_tu: f32, duration_ms: f64) -> TUResult {
        TUResult {
            total_tu,
            duration_ms,
            native: true,
        }
    }
}

/// Muscle breakdown in TU result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct MuscleTU {
    pub muscle_id: String,
    pub tu: f32,
    pub weighted_tu: f32,
}

/// Detailed TU calculation result with muscle breakdown
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct DetailedTUResult {
    pub total_tu: f32,
    pub duration_ms: f64,
    pub native: bool,
    pub muscle_count: u32,
    pub exercise_count: u32,
}

/// TU Calculator with caching
#[wasm_bindgen]
pub struct TUCalculator {
    /// Exercise ID -> muscle activations mapping
    exercise_cache: HashMap<String, Vec<(String, f32)>>,
    /// Muscle ID -> bias weight mapping
    muscle_bias: HashMap<String, f32>,
}

#[wasm_bindgen]
impl TUCalculator {
    /// Create a new TU calculator
    #[wasm_bindgen(constructor)]
    pub fn new() -> TUCalculator {
        TUCalculator {
            exercise_cache: HashMap::new(),
            muscle_bias: HashMap::new(),
        }
    }

    /// Clear all cached data
    pub fn clear(&mut self) {
        self.exercise_cache.clear();
        self.muscle_bias.clear();
    }

    /// Add an exercise to the cache
    ///
    /// # Arguments
    /// * `exercise_id` - Unique exercise identifier
    /// * `muscle_ids` - Array of muscle IDs
    /// * `activations` - Array of activation percentages (0-100)
    pub fn add_exercise(
        &mut self,
        exercise_id: String,
        muscle_ids: Vec<String>,
        activations: Vec<f32>,
    ) -> Result<(), JsValue> {
        if muscle_ids.len() != activations.len() {
            return Err(JsValue::from_str("muscle_ids and activations must have same length"));
        }

        let pairs: Vec<(String, f32)> = muscle_ids
            .into_iter()
            .zip(activations.into_iter())
            .map(|(id, act)| (id, act.clamp(0.0, 100.0)))
            .collect();

        self.exercise_cache.insert(exercise_id, pairs);
        Ok(())
    }

    /// Set bias weight for a muscle
    ///
    /// # Arguments
    /// * `muscle_id` - Muscle identifier
    /// * `bias_weight` - Weight multiplier (typically 1.0)
    pub fn set_muscle_bias(&mut self, muscle_id: String, bias_weight: f32) {
        self.muscle_bias.insert(muscle_id, bias_weight);
    }

    /// Get the number of cached exercises
    pub fn exercise_count(&self) -> usize {
        self.exercise_cache.len()
    }

    /// Get the number of registered muscles
    pub fn muscle_count(&self) -> usize {
        self.muscle_bias.len()
    }

    /// Calculate TU for a workout using cached exercise data
    ///
    /// # Arguments
    /// * `exercise_ids` - Array of exercise IDs
    /// * `sets` - Array of set counts (corresponding to exercise_ids)
    pub fn calculate_cached(
        &self,
        exercise_ids: Vec<String>,
        sets: Vec<u32>,
    ) -> Result<TUResult, JsValue> {
        let start = js_sys::Date::now();

        if exercise_ids.len() != sets.len() {
            return Err(JsValue::from_str("exercise_ids and sets must have same length"));
        }

        let mut muscle_totals: HashMap<&str, f32> = HashMap::new();

        for (exercise_id, set_count) in exercise_ids.iter().zip(sets.iter()) {
            let activations = self.exercise_cache.get(exercise_id);

            if let Some(activations) = activations {
                let s = (*set_count).max(1) as f32;

                for (muscle_id, activation) in activations {
                    if *activation > 0.0 {
                        let contribution = (*activation / 100.0) * s;
                        *muscle_totals.entry(muscle_id.as_str()).or_insert(0.0) += contribution;
                    }
                }
            }
        }

        // Apply bias weights
        let mut total = 0.0f32;
        for (muscle_id, tu) in muscle_totals.iter() {
            let bias = self.muscle_bias.get(*muscle_id).copied().unwrap_or(1.0);
            total += tu * bias;
        }

        let duration_ms = js_sys::Date::now() - start;

        Ok(TUResult {
            total_tu: (total * 100.0).round() / 100.0,
            duration_ms,
            native: true,
        })
    }
}

impl Default for TUCalculator {
    fn default() -> Self {
        Self::new()
    }
}

/// Calculate TU directly without caching (simple interface)
///
/// # Arguments
/// * `activations` - Flat array: [ex0_m0, ex0_m1, ..., ex1_m0, ...] (0-100 values)
/// * `sets` - Sets per exercise
/// * `bias_weights` - Bias weight per muscle
/// * `exercise_count` - Number of exercises
/// * `muscle_count` - Number of muscles
///
/// # Returns
/// Total TU value
#[wasm_bindgen]
pub fn tu_calculate_simple(
    activations: &[f32],
    sets: &[i32],
    bias_weights: &[f32],
    exercise_count: i32,
    muscle_count: i32,
) -> f32 {
    let ex_count = exercise_count as usize;
    let m_count = muscle_count as usize;

    if activations.len() != ex_count * m_count {
        return 0.0;
    }
    if sets.len() != ex_count {
        return 0.0;
    }
    if bias_weights.len() != m_count {
        return 0.0;
    }

    let mut muscle_totals = vec![0.0f32; m_count];

    // Accumulate activations
    for e in 0..ex_count {
        let s = (sets[e].max(1)) as f32;

        for m in 0..m_count {
            let activation = activations[e * m_count + m];
            if activation > 0.0 {
                muscle_totals[m] += (activation / 100.0) * s;
            }
        }
    }

    // Apply bias weights
    let mut total = 0.0f32;
    for (m, &tu) in muscle_totals.iter().enumerate() {
        if tu > 0.0 {
            total += tu * bias_weights[m];
        }
    }

    (total * 100.0).round() / 100.0
}

/// Batch calculate TU for multiple workouts
///
/// # Arguments
/// * `all_activations` - Concatenated activations for all workouts
/// * `all_sets` - Concatenated sets for all workouts
/// * `bias_weights` - Shared bias weights per muscle
/// * `workout_sizes` - Number of exercises in each workout
/// * `muscle_count` - Number of muscles
///
/// # Returns
/// Array of TU values for each workout
#[wasm_bindgen]
pub fn tu_calculate_batch(
    all_activations: &[f32],
    all_sets: &[i32],
    bias_weights: &[f32],
    workout_sizes: &[i32],
    muscle_count: i32,
) -> Vec<f32> {
    let m_count = muscle_count as usize;
    let mut results = Vec::with_capacity(workout_sizes.len());

    let mut act_offset = 0usize;
    let mut set_offset = 0usize;

    for &size in workout_sizes {
        let ex_count = size as usize;
        let act_len = ex_count * m_count;

        if act_offset + act_len > all_activations.len() || set_offset + ex_count > all_sets.len() {
            results.push(0.0);
            continue;
        }

        let activations = &all_activations[act_offset..act_offset + act_len];
        let sets = &all_sets[set_offset..set_offset + ex_count];

        let tu = tu_calculate_simple(activations, sets, bias_weights, size, muscle_count);
        results.push(tu);

        act_offset += act_len;
        set_offset += ex_count;
    }

    results
}

/// Calculate TU with full breakdown per muscle
///
/// # Arguments
/// * `activations` - Flat array of activations
/// * `sets` - Sets per exercise
/// * `bias_weights` - Bias weight per muscle
/// * `muscle_ids` - Array of muscle IDs
/// * `exercise_count` - Number of exercises
///
/// # Returns
/// JSON string with detailed breakdown
#[wasm_bindgen]
pub fn tu_calculate_detailed(
    activations: &[f32],
    sets: &[i32],
    bias_weights: &[f32],
    muscle_ids: Vec<String>,
    exercise_count: i32,
) -> Result<JsValue, JsValue> {
    let start = js_sys::Date::now();

    let ex_count = exercise_count as usize;
    let m_count = muscle_ids.len();

    if activations.len() != ex_count * m_count {
        return Err(JsValue::from_str("Invalid activations length"));
    }
    if sets.len() != ex_count {
        return Err(JsValue::from_str("Invalid sets length"));
    }
    if bias_weights.len() != m_count {
        return Err(JsValue::from_str("Invalid bias_weights length"));
    }

    let mut muscle_totals = vec![0.0f32; m_count];

    // Accumulate activations
    for e in 0..ex_count {
        let s = (sets[e].max(1)) as f32;

        for m in 0..m_count {
            let activation = activations[e * m_count + m];
            if activation > 0.0 {
                muscle_totals[m] += (activation / 100.0) * s;
            }
        }
    }

    // Build muscle breakdown
    let mut total = 0.0f32;
    let mut muscles: Vec<MuscleTU> = Vec::with_capacity(m_count);

    for (m, muscle_id) in muscle_ids.iter().enumerate() {
        let tu = muscle_totals[m];
        let weighted = tu * bias_weights[m];
        total += weighted;

        if tu > 0.0 {
            muscles.push(MuscleTU {
                muscle_id: muscle_id.clone(),
                tu,
                weighted_tu: (weighted * 100.0).round() / 100.0,
            });
        }
    }

    let duration_ms = js_sys::Date::now() - start;

    let result = DetailedTUResult {
        total_tu: (total * 100.0).round() / 100.0,
        duration_ms,
        native: true,
        muscle_count: muscles.len() as u32,
        exercise_count: exercise_count as u32,
    };

    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tu_calculate_simple() {
        // 2 exercises, 3 muscles
        let activations = [
            // Exercise 1: chest 80%, shoulders 40%, triceps 30%
            80.0, 40.0, 30.0,
            // Exercise 2: chest 0%, shoulders 60%, triceps 50%
            0.0, 60.0, 50.0,
        ];
        let sets = [3, 4];
        let bias_weights = [1.0, 1.0, 1.0];

        let tu = tu_calculate_simple(&activations, &sets, &bias_weights, 2, 3);

        // Expected:
        // Chest: 80/100 * 3 = 2.4
        // Shoulders: 40/100 * 3 + 60/100 * 4 = 1.2 + 2.4 = 3.6
        // Triceps: 30/100 * 3 + 50/100 * 4 = 0.9 + 2.0 = 2.9
        // Total: 2.4 + 3.6 + 2.9 = 8.9
        assert!((tu - 8.9).abs() < 0.01);
    }

    #[test]
    fn test_tu_calculator_cached() {
        let mut calc = TUCalculator::new();

        calc.add_exercise(
            "bench_press".to_string(),
            vec!["chest".to_string(), "shoulders".to_string(), "triceps".to_string()],
            vec![80.0, 40.0, 30.0],
        ).unwrap();

        calc.set_muscle_bias("chest".to_string(), 1.0);
        calc.set_muscle_bias("shoulders".to_string(), 1.0);
        calc.set_muscle_bias("triceps".to_string(), 1.0);

        // Can't test wasm_bindgen methods directly in unit tests
        assert_eq!(calc.exercise_count(), 1);
        assert_eq!(calc.muscle_count(), 3);
    }

    #[test]
    fn test_batch_calculation() {
        let activations = [
            // Workout 1: 1 exercise, 2 muscles
            50.0, 50.0,
            // Workout 2: 2 exercises, 2 muscles
            100.0, 0.0,
            0.0, 100.0,
        ];
        let sets = [2, 3, 3];
        let bias_weights = [1.0, 1.0];
        let workout_sizes = [1, 2];

        let results = tu_calculate_batch(&activations, &sets, &bias_weights, &workout_sizes, 2);

        assert_eq!(results.len(), 2);
        // Workout 1: (50/100 * 2) + (50/100 * 2) = 1 + 1 = 2
        assert!((results[0] - 2.0).abs() < 0.01);
        // Workout 2: (100/100 * 3) + (100/100 * 3) = 3 + 3 = 6
        assert!((results[1] - 6.0).abs() < 0.01);
    }
}
