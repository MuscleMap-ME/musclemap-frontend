//! MuscleMap Load Calculator Module
//!
//! High-performance load prescription calculations using RPE (Rate of Perceived Exertion)
//! and percentage-based training methods.
//!
//! ## Features
//!
//! - RPE to percentage conversion with lookup tables
//! - 1RM estimation from various rep schemes
//! - Load recommendations based on training phase
//! - Tempo calculations for time under tension
//! - Auto-regulation adjustments

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

/// RPE to percentage lookup table
/// Rows: RPE 6.0-10.0 in 0.5 increments (index 0-8)
/// Columns: Reps 1-12 (index 0-11)
/// Values: Percentage of 1RM
const RPE_TABLE: [[f32; 12]; 9] = [
    // RPE 6.0
    [0.88, 0.85, 0.82, 0.80, 0.77, 0.75, 0.72, 0.69, 0.67, 0.64, 0.62, 0.60],
    // RPE 6.5
    [0.89, 0.86, 0.84, 0.81, 0.79, 0.76, 0.74, 0.71, 0.69, 0.66, 0.64, 0.62],
    // RPE 7.0
    [0.91, 0.88, 0.85, 0.83, 0.80, 0.78, 0.75, 0.73, 0.71, 0.68, 0.66, 0.64],
    // RPE 7.5
    [0.92, 0.89, 0.87, 0.84, 0.82, 0.79, 0.77, 0.75, 0.72, 0.70, 0.68, 0.65],
    // RPE 8.0
    [0.94, 0.91, 0.88, 0.86, 0.83, 0.81, 0.79, 0.76, 0.74, 0.72, 0.69, 0.67],
    // RPE 8.5
    [0.95, 0.92, 0.90, 0.87, 0.85, 0.83, 0.80, 0.78, 0.76, 0.74, 0.71, 0.69],
    // RPE 9.0
    [0.97, 0.94, 0.91, 0.89, 0.87, 0.84, 0.82, 0.80, 0.78, 0.75, 0.73, 0.71],
    // RPE 9.5
    [0.98, 0.96, 0.93, 0.91, 0.88, 0.86, 0.84, 0.82, 0.79, 0.77, 0.75, 0.73],
    // RPE 10.0
    [1.00, 0.97, 0.94, 0.92, 0.90, 0.88, 0.85, 0.83, 0.81, 0.79, 0.77, 0.75],
];

/// Training phases
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[wasm_bindgen]
pub enum TrainingPhase {
    Hypertrophy = 0,
    Strength = 1,
    Power = 2,
    Peaking = 3,
    Deload = 4,
}

/// Experience levels
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[wasm_bindgen]
pub enum ExperienceLevel {
    Beginner = 1,
    Novice = 2,
    Intermediate = 3,
    Advanced = 4,
    Elite = 5,
}

/// Load prescription result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct LoadPrescription {
    /// Recommended weight in kg
    pub weight_kg: f32,
    /// Target reps
    pub reps: u8,
    /// Target RPE
    pub rpe: f32,
    /// Percentage of 1RM
    pub percentage: f32,
    /// Tempo string (e.g., "3-1-2-0")
    pub tempo: String,
    /// Rest period in seconds
    pub rest_seconds: u16,
    /// Number of sets
    pub sets: u8,
}

#[wasm_bindgen]
impl LoadPrescription {
    #[wasm_bindgen(constructor)]
    pub fn new(
        weight_kg: f32,
        reps: u8,
        rpe: f32,
        percentage: f32,
        tempo: String,
        rest_seconds: u16,
        sets: u8,
    ) -> LoadPrescription {
        LoadPrescription {
            weight_kg,
            reps,
            rpe,
            percentage,
            tempo,
            rest_seconds,
            sets,
        }
    }
}

/// 1RM estimation result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct OneRMResult {
    /// Estimated 1RM in kg
    pub estimated_1rm: f32,
    /// Confidence level (0-100)
    pub confidence: f32,
    /// Formula used
    pub formula: String,
}

#[wasm_bindgen]
impl OneRMResult {
    #[wasm_bindgen(constructor)]
    pub fn new(estimated_1rm: f32, confidence: f32, formula: String) -> OneRMResult {
        OneRMResult {
            estimated_1rm,
            confidence,
            formula,
        }
    }
}

/// Get percentage of 1RM for given reps and RPE
///
/// # Arguments
/// * `reps` - Number of reps (1-12)
/// * `rpe` - Rate of perceived exertion (6.0-10.0)
///
/// # Returns
/// Percentage of 1RM (0.0-1.0)
#[wasm_bindgen]
pub fn rpe_to_percentage(reps: u8, rpe: f32) -> f32 {
    // Clamp inputs
    let reps = reps.clamp(1, 12) as usize - 1;
    let rpe = rpe.clamp(6.0, 10.0);

    // Calculate table index from RPE
    let rpe_index = ((rpe - 6.0) * 2.0) as usize;
    let rpe_index = rpe_index.min(8);

    // Get base value
    let base = RPE_TABLE[rpe_index][reps];

    // Interpolate if between RPE values
    let rpe_fraction = ((rpe - 6.0) * 2.0) - rpe_index as f32;

    if rpe_fraction > 0.0 && rpe_index < 8 {
        let next = RPE_TABLE[rpe_index + 1][reps];
        base + (next - base) * rpe_fraction
    } else {
        base
    }
}

/// Get RPE for given percentage and reps
///
/// # Arguments
/// * `percentage` - Percentage of 1RM (0.0-1.0)
/// * `reps` - Number of reps (1-12)
///
/// # Returns
/// Estimated RPE (6.0-10.0)
#[wasm_bindgen]
pub fn percentage_to_rpe(percentage: f32, reps: u8) -> f32 {
    let reps = reps.clamp(1, 12) as usize - 1;
    let percentage = percentage.clamp(0.5, 1.0);

    // Binary search through RPE values
    for i in 0..8 {
        if RPE_TABLE[i][reps] >= percentage && RPE_TABLE[i + 1][reps] <= percentage {
            let lower = RPE_TABLE[i][reps];
            let upper = RPE_TABLE[i + 1][reps];
            let fraction = (percentage - lower) / (upper - lower);
            return 6.0 + (i as f32 + fraction) * 0.5;
        }
    }

    if percentage >= RPE_TABLE[8][reps] {
        10.0
    } else {
        6.0
    }
}

/// Estimate 1RM from a lift
///
/// # Arguments
/// * `weight` - Weight lifted in kg
/// * `reps` - Number of reps performed
/// * `rpe` - Optional RPE (if known)
///
/// # Returns
/// Estimated 1RM result
#[wasm_bindgen]
pub fn estimate_1rm(weight: f32, reps: u8, rpe: Option<f32>) -> OneRMResult {
    let reps = reps.max(1);

    // If RPE is provided, use RPE table for more accuracy
    if let Some(rpe) = rpe {
        let percentage = rpe_to_percentage(reps, rpe);
        let e1rm = weight / percentage;

        return OneRMResult {
            estimated_1rm: (e1rm * 10.0).round() / 10.0,
            confidence: 95.0 - (reps as f32 - 1.0) * 3.0, // Higher reps = less confidence
            formula: "RPE Table".to_string(),
        };
    }

    // Without RPE, use multiple formulas and average

    // Epley formula: 1RM = weight × (1 + reps/30)
    let epley = weight * (1.0 + reps as f32 / 30.0);

    // Brzycki formula: 1RM = weight × 36 / (37 - reps)
    let brzycki = if reps < 37 {
        weight * 36.0 / (37.0 - reps as f32)
    } else {
        epley
    };

    // Lander formula: 1RM = weight × 100 / (101.3 - 2.67123 × reps)
    let lander = weight * 100.0 / (101.3 - 2.67123 * reps as f32);

    // Average of formulas
    let average = (epley + brzycki + lander) / 3.0;

    // Confidence decreases with higher reps
    let confidence = match reps {
        1 => 100.0,
        2..=3 => 95.0,
        4..=5 => 90.0,
        6..=8 => 85.0,
        9..=10 => 75.0,
        _ => 65.0,
    };

    OneRMResult {
        estimated_1rm: (average * 10.0).round() / 10.0,
        confidence,
        formula: "Average (Epley/Brzycki/Lander)".to_string(),
    }
}

/// Calculate recommended load for a training session
///
/// # Arguments
/// * `e1rm` - Estimated 1RM in kg
/// * `target_reps` - Target rep range (e.g., 8)
/// * `target_rpe` - Target RPE (e.g., 8.0)
/// * `phase` - Training phase
/// * `experience` - Experience level
///
/// # Returns
/// Load prescription
#[wasm_bindgen]
pub fn calculate_load(
    e1rm: f32,
    target_reps: u8,
    target_rpe: f32,
    phase: TrainingPhase,
    experience: ExperienceLevel,
) -> LoadPrescription {
    // Get base percentage from RPE table
    let base_percentage = rpe_to_percentage(target_reps, target_rpe);

    // Adjust for training phase
    let phase_multiplier = match phase {
        TrainingPhase::Hypertrophy => 0.98, // Slightly lighter for volume
        TrainingPhase::Strength => 1.0,      // Standard
        TrainingPhase::Power => 0.85,        // Lighter for speed
        TrainingPhase::Peaking => 1.02,      // Push limits
        TrainingPhase::Deload => 0.70,       // Recovery
    };

    // Adjust for experience (beginners use slightly lower loads)
    let experience_multiplier = match experience {
        ExperienceLevel::Beginner => 0.90,
        ExperienceLevel::Novice => 0.95,
        ExperienceLevel::Intermediate => 1.0,
        ExperienceLevel::Advanced => 1.0,
        ExperienceLevel::Elite => 1.0,
    };

    let final_percentage = base_percentage * phase_multiplier * experience_multiplier;
    let weight = e1rm * final_percentage;

    // Calculate tempo based on phase
    let tempo = match phase {
        TrainingPhase::Hypertrophy => "3-1-2-0".to_string(), // Slow eccentric
        TrainingPhase::Strength => "2-1-1-0".to_string(),     // Moderate
        TrainingPhase::Power => "1-0-X-0".to_string(),        // Explosive
        TrainingPhase::Peaking => "2-1-1-0".to_string(),      // Moderate
        TrainingPhase::Deload => "2-0-2-0".to_string(),       // Light
    };

    // Calculate rest based on phase
    let rest_seconds = match phase {
        TrainingPhase::Hypertrophy => 90,
        TrainingPhase::Strength => 180,
        TrainingPhase::Power => 180,
        TrainingPhase::Peaking => 240,
        TrainingPhase::Deload => 120,
    };

    // Calculate sets based on phase
    let sets = match phase {
        TrainingPhase::Hypertrophy => 4,
        TrainingPhase::Strength => 5,
        TrainingPhase::Power => 6,
        TrainingPhase::Peaking => 3,
        TrainingPhase::Deload => 2,
    };

    LoadPrescription {
        weight_kg: round_to_nearest(weight, 2.5), // Round to nearest 2.5kg
        reps: target_reps,
        rpe: target_rpe,
        percentage: final_percentage,
        tempo,
        rest_seconds,
        sets,
    }
}

/// Round weight to nearest increment
fn round_to_nearest(weight: f32, increment: f32) -> f32 {
    (weight / increment).round() * increment
}

/// Parse tempo string to total time under tension
///
/// # Arguments
/// * `tempo` - Tempo string (e.g., "3-1-2-0")
///
/// # Returns
/// Total seconds per rep, or None if invalid format
#[wasm_bindgen]
pub fn parse_tempo(tempo: &str) -> Option<u8> {
    let parts: Vec<&str> = tempo.split('-').collect();

    if parts.len() != 4 {
        return None;
    }

    let mut total = 0u8;

    for part in parts {
        if part == "X" {
            total += 1; // Explosive = ~1 second
        } else if let Ok(n) = part.parse::<u8>() {
            total += n;
        } else {
            return None;
        }
    }

    Some(total)
}

/// Calculate time under tension for a set
///
/// # Arguments
/// * `tempo` - Tempo string
/// * `reps` - Number of reps
///
/// # Returns
/// Total seconds of tension, or 0 if invalid
#[wasm_bindgen]
pub fn time_under_tension(tempo: &str, reps: u8) -> u32 {
    parse_tempo(tempo)
        .map(|t| t as u32 * reps as u32)
        .unwrap_or(0)
}

/// Get recommended rep ranges for a training phase
#[wasm_bindgen]
pub fn get_phase_rep_range(phase: TrainingPhase) -> Vec<u8> {
    match phase {
        TrainingPhase::Hypertrophy => vec![8, 12],
        TrainingPhase::Strength => vec![4, 6],
        TrainingPhase::Power => vec![1, 3],
        TrainingPhase::Peaking => vec![1, 3],
        TrainingPhase::Deload => vec![10, 15],
    }
}

/// Get recommended RPE range for a training phase
#[wasm_bindgen]
pub fn get_phase_rpe_range(phase: TrainingPhase) -> Vec<f32> {
    match phase {
        TrainingPhase::Hypertrophy => vec![7.0, 8.5],
        TrainingPhase::Strength => vec![8.0, 9.0],
        TrainingPhase::Power => vec![7.0, 8.0],
        TrainingPhase::Peaking => vec![9.0, 10.0],
        TrainingPhase::Deload => vec![5.0, 6.5],
    }
}

/// Calculate progressive overload recommendation
///
/// # Arguments
/// * `current_weight` - Current working weight in kg
/// * `last_rpe` - RPE from last session
/// * `target_rpe` - Target RPE for this session
/// * `min_increment` - Minimum weight increment (e.g., 2.5)
///
/// # Returns
/// Recommended weight for next session
#[wasm_bindgen]
pub fn progressive_overload(
    current_weight: f32,
    last_rpe: f32,
    target_rpe: f32,
    min_increment: f32,
) -> f32 {
    let rpe_difference = target_rpe - last_rpe;

    // If last session was too easy (lower RPE than target), increase weight
    // If it was too hard, decrease or maintain
    let adjustment = if rpe_difference > 1.0 {
        // Was significantly easier than target - increase by 5%
        current_weight * 0.05
    } else if rpe_difference > 0.5 {
        // Was somewhat easier - increase by 2.5%
        current_weight * 0.025
    } else if rpe_difference < -1.0 {
        // Was significantly harder - decrease by 5%
        current_weight * -0.05
    } else if rpe_difference < -0.5 {
        // Was somewhat harder - decrease by 2.5%
        current_weight * -0.025
    } else {
        // Close to target - maintain
        0.0
    };

    let new_weight = current_weight + adjustment;
    round_to_nearest(new_weight, min_increment)
}

/// Batch calculate loads for multiple exercises
#[wasm_bindgen]
pub fn calculate_loads_batch(
    e1rms: &[f32],
    target_reps: &[u8],
    target_rpes: &[f32],
    phase: TrainingPhase,
    experience: ExperienceLevel,
) -> Result<JsValue, JsValue> {
    let start = js_sys::Date::now();

    if e1rms.len() != target_reps.len() || e1rms.len() != target_rpes.len() {
        return Err(JsValue::from_str("Input arrays must have same length"));
    }

    let prescriptions: Vec<LoadPrescription> = e1rms
        .iter()
        .zip(target_reps.iter())
        .zip(target_rpes.iter())
        .map(|((&e1rm, &reps), &rpe)| calculate_load(e1rm, reps, rpe, phase, experience))
        .collect();

    let duration_ms = js_sys::Date::now() - start;

    #[derive(Serialize)]
    struct BatchResult {
        prescriptions: Vec<LoadPrescription>,
        count: usize,
        duration_ms: f64,
        native: bool,
    }

    let result = BatchResult {
        count: prescriptions.len(),
        prescriptions,
        duration_ms,
        native: true,
    };

    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rpe_to_percentage() {
        // 1 rep at RPE 10 should be 100%
        let p = rpe_to_percentage(1, 10.0);
        assert!((p - 1.0).abs() < 0.01);

        // 5 reps at RPE 8 should be around 83%
        let p = rpe_to_percentage(5, 8.0);
        assert!(p > 0.80 && p < 0.85);
    }

    #[test]
    fn test_estimate_1rm() {
        // Known lift: 100kg x 5 @ RPE 8
        let result = estimate_1rm(100.0, 5, Some(8.0));
        // Should estimate ~120kg 1RM
        assert!(result.estimated_1rm > 115.0 && result.estimated_1rm < 125.0);
    }

    #[test]
    fn test_calculate_load() {
        let prescription = calculate_load(
            100.0,
            5,
            8.0,
            TrainingPhase::Strength,
            ExperienceLevel::Intermediate,
        );

        // For 100kg 1RM, 5 reps at RPE 8 should be ~83kg
        assert!(prescription.weight_kg > 80.0 && prescription.weight_kg < 90.0);
        assert_eq!(prescription.reps, 5);
    }

    #[test]
    fn test_parse_tempo() {
        assert_eq!(parse_tempo("3-1-2-0"), Some(6));
        assert_eq!(parse_tempo("1-0-X-0"), Some(2));
        assert_eq!(parse_tempo("invalid"), None);
    }

    #[test]
    fn test_progressive_overload() {
        // Last session was easier than target (RPE 7 vs target 8)
        let new_weight = progressive_overload(100.0, 7.0, 8.0, 2.5);
        assert!(new_weight > 100.0);

        // Last session was harder than target
        let new_weight = progressive_overload(100.0, 9.5, 8.0, 2.5);
        assert!(new_weight < 100.0);
    }
}
