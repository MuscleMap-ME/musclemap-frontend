//! MuscleMap Core Types
//!
//! Shared types and utilities used across all WASM crates.

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// Result type for WASM operations
pub type WasmResult<T> = Result<T, JsValue>;

/// Convert a Rust error to JsValue
pub fn to_js_error<E: std::fmt::Display>(e: E) -> JsValue {
    JsValue::from_str(&e.to_string())
}

/// Muscle activation data for a single muscle
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MuscleActivation {
    pub muscle_id: String,
    pub activation: f32, // 0-100
}

/// Exercise data with muscle activations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Exercise {
    pub id: String,
    pub name: String,
    pub activations: Vec<MuscleActivation>,
}

/// User profile for personalized calculations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: String,
    pub bodyweight_kg: f32,
    pub height_cm: f32,
    pub experience_level: u8, // 1-5
    pub archetype: String,
    pub limb_ratios: Option<LimbRatios>,
}

/// Limb ratio measurements for biomechanical adjustments
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimbRatios {
    pub femur_length: f32,
    pub tibia_length: f32,
    pub arm_length: f32,
    pub torso_length: f32,
}

/// Coordinates for geo operations
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct Coordinates {
    pub lat: f64,
    pub lng: f64,
}

/// Bounding box for geo queries
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct BoundingBox {
    pub min_lat: f64,
    pub max_lat: f64,
    pub min_lng: f64,
    pub max_lng: f64,
}

/// Performance timing helper
#[wasm_bindgen]
pub struct Timer {
    start: f64,
}

#[wasm_bindgen]
impl Timer {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Timer {
        Timer {
            start: js_sys::Date::now(),
        }
    }

    /// Get elapsed time in milliseconds
    pub fn elapsed_ms(&self) -> f64 {
        js_sys::Date::now() - self.start
    }

    /// Reset the timer
    pub fn reset(&mut self) {
        self.start = js_sys::Date::now();
    }
}

impl Default for Timer {
    fn default() -> Self {
        Self::new()
    }
}

/// Initialize panic hook for better error messages in WASM
pub fn set_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_muscle_activation() {
        let activation = MuscleActivation {
            muscle_id: "chest".to_string(),
            activation: 85.0,
        };
        assert_eq!(activation.activation, 85.0);
    }
}
