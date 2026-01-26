//! MuscleMap Leaderboard Ranking Module
//!
//! High-performance ranking calculations with tie handling and percentile computation.
//! Optimized for sorting and ranking large leaderboards (10,000+ users).
//!
//! Compiled to WebAssembly for universal runtime support.

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

/// Individual rank result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct RankEntry {
    /// Original index in the input array
    pub index: u32,
    /// Original score
    pub score: f64,
    /// Rank (1 = highest score)
    pub rank: u32,
    /// Percentile (100 = top, 0 = bottom)
    pub percentile: f64,
}

#[wasm_bindgen]
impl RankEntry {
    #[wasm_bindgen(constructor)]
    pub fn new(index: u32, score: f64, rank: u32, percentile: f64) -> RankEntry {
        RankEntry {
            index,
            score,
            rank,
            percentile,
        }
    }
}

/// Result of ranking calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct RankResult {
    /// Total number of entries
    pub count: u32,
    /// Time taken in milliseconds
    pub duration_ms: f64,
    /// Whether native WASM was used
    pub native: bool,
}

#[wasm_bindgen]
impl RankResult {
    #[wasm_bindgen(constructor)]
    pub fn new(count: u32, duration_ms: f64) -> RankResult {
        RankResult {
            count,
            duration_ms,
            native: true,
        }
    }
}

/// Calculate ranks and percentiles for a list of scores
///
/// # Arguments
/// * `scores` - Array of scores (higher = better)
///
/// # Returns
/// Array of ranks (1-based, same order as input)
#[wasm_bindgen]
pub fn rank_calculate(scores: &[f64]) -> Vec<u32> {
    if scores.is_empty() {
        return vec![];
    }

    let n = scores.len();

    // Create indexed array for sorting
    let mut indexed: Vec<(usize, f64)> = scores
        .iter()
        .enumerate()
        .map(|(i, &s)| (i, s))
        .collect();

    // Sort by score descending
    indexed.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    // Calculate ranks with tie handling
    let mut ranks = vec![0u32; n];
    let mut current_rank = 1u32;

    for i in 0..n {
        let (original_index, score) = indexed[i];

        // Handle ties - same score gets same rank
        let rank = if i > 0 && score == indexed[i - 1].1 {
            ranks[indexed[i - 1].0]
        } else {
            current_rank
        };

        ranks[original_index] = rank;
        current_rank += 1;
    }

    ranks
}

/// Calculate percentiles for a list of scores
///
/// # Arguments
/// * `scores` - Array of scores (higher = better)
///
/// # Returns
/// Array of percentiles (0-100, same order as input)
#[wasm_bindgen]
pub fn rank_percentiles(scores: &[f64]) -> Vec<f64> {
    if scores.is_empty() {
        return vec![];
    }

    let ranks = rank_calculate(scores);
    let n = scores.len() as f64;

    ranks
        .iter()
        .map(|&rank| ((n - rank as f64 + 1.0) / n * 100.0 * 100.0).round() / 100.0)
        .collect()
}

/// Calculate both ranks and percentiles
///
/// # Arguments
/// * `scores` - Array of scores
///
/// # Returns
/// Tuple of (ranks, percentiles) as JsValue
#[wasm_bindgen]
pub fn rank_calculate_full(scores: &[f64]) -> Result<JsValue, JsValue> {
    let start = js_sys::Date::now();

    if scores.is_empty() {
        return serde_wasm_bindgen::to_value(&(Vec::<u32>::new(), Vec::<f64>::new()))
            .map_err(|e| JsValue::from_str(&e.to_string()));
    }

    let n = scores.len();

    // Create indexed array for sorting
    let mut indexed: Vec<(usize, f64)> = scores
        .iter()
        .enumerate()
        .map(|(i, &s)| (i, s))
        .collect();

    // Sort by score descending
    indexed.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    // Calculate ranks and percentiles with tie handling
    let mut ranks = vec![0u32; n];
    let mut percentiles = vec![0.0f64; n];
    let n_f64 = n as f64;
    let mut current_rank = 1u32;

    for i in 0..n {
        let (original_index, score) = indexed[i];

        // Handle ties
        let rank = if i > 0 && score == indexed[i - 1].1 {
            ranks[indexed[i - 1].0]
        } else {
            current_rank
        };

        ranks[original_index] = rank;
        percentiles[original_index] = ((n_f64 - rank as f64 + 1.0) / n_f64 * 100.0 * 100.0).round() / 100.0;
        current_rank += 1;
    }

    let duration_ms = js_sys::Date::now() - start;

    #[derive(Serialize)]
    struct FullResult {
        ranks: Vec<u32>,
        percentiles: Vec<f64>,
        count: usize,
        duration_ms: f64,
        native: bool,
    }

    let result = FullResult {
        ranks,
        percentiles,
        count: n,
        duration_ms,
        native: true,
    };

    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Find the rank of a specific score using binary search
///
/// # Arguments
/// * `sorted_scores` - Scores sorted in descending order
/// * `target_score` - Score to find rank for
///
/// # Returns
/// Rank (1-based), or 0 if not applicable
#[wasm_bindgen]
pub fn rank_find(sorted_scores: &[f64], target_score: f64) -> u32 {
    if sorted_scores.is_empty() {
        return 0;
    }

    // Binary search for the position
    let mut lo = 0usize;
    let mut hi = sorted_scores.len();

    while lo < hi {
        let mid = lo + (hi - lo) / 2;
        if sorted_scores[mid] > target_score {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }

    // Handle ties - find first occurrence
    while lo > 0 && sorted_scores[lo - 1] == target_score {
        lo -= 1;
    }

    (lo + 1) as u32
}

/// Sort scores in descending order and return indices
///
/// # Arguments
/// * `scores` - Array of scores
///
/// # Returns
/// Array of original indices in sorted order
#[wasm_bindgen]
pub fn rank_sort_indices(scores: &[f64]) -> Vec<u32> {
    let mut indexed: Vec<(usize, f64)> = scores
        .iter()
        .enumerate()
        .map(|(i, &s)| (i, s))
        .collect();

    indexed.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    indexed.iter().map(|(i, _)| *i as u32).collect()
}

/// Get top N entries with their ranks
///
/// # Arguments
/// * `scores` - Array of scores
/// * `n` - Number of top entries to return
///
/// # Returns
/// Array of (original_index, score, rank) tuples as JsValue
#[wasm_bindgen]
pub fn rank_top_n(scores: &[f64], n: u32) -> Result<JsValue, JsValue> {
    if scores.is_empty() {
        return serde_wasm_bindgen::to_value(&Vec::<(u32, f64, u32)>::new())
            .map_err(|e| JsValue::from_str(&e.to_string()));
    }

    let n = (n as usize).min(scores.len());

    // Create indexed array for sorting
    let mut indexed: Vec<(usize, f64)> = scores
        .iter()
        .enumerate()
        .map(|(i, &s)| (i, s))
        .collect();

    // Partial sort - only need top N
    indexed.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    // Calculate ranks for top N with tie handling
    let mut result: Vec<(u32, f64, u32)> = Vec::with_capacity(n);
    let mut current_rank = 1u32;

    for i in 0..n {
        let (original_index, score) = indexed[i];

        let rank = if i > 0 && score == indexed[i - 1].1 {
            result[i - 1].2
        } else {
            current_rank
        };

        result.push((original_index as u32, score, rank));
        current_rank += 1;
    }

    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Calculate dense rank (no gaps in ranking)
///
/// # Arguments
/// * `scores` - Array of scores
///
/// # Returns
/// Array of dense ranks (1, 2, 3, ... with no gaps for ties)
#[wasm_bindgen]
pub fn rank_dense(scores: &[f64]) -> Vec<u32> {
    if scores.is_empty() {
        return vec![];
    }

    let n = scores.len();

    // Create indexed array for sorting
    let mut indexed: Vec<(usize, f64)> = scores
        .iter()
        .enumerate()
        .map(|(i, &s)| (i, s))
        .collect();

    // Sort by score descending
    indexed.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    // Calculate dense ranks (no gaps)
    let mut ranks = vec![0u32; n];
    let mut current_rank = 1u32;

    for i in 0..n {
        let (original_index, score) = indexed[i];

        if i > 0 && score == indexed[i - 1].1 {
            ranks[original_index] = ranks[indexed[i - 1].0];
        } else {
            ranks[original_index] = current_rank;
            current_rank += 1;
        }
    }

    ranks
}

/// Calculate competition rank (standard 1, 2, 2, 4 for ties)
///
/// This is the same as rank_calculate but explicitly named for clarity.
#[wasm_bindgen]
pub fn rank_competition(scores: &[f64]) -> Vec<u32> {
    rank_calculate(scores)
}

/// Get statistics about the score distribution
///
/// # Arguments
/// * `scores` - Array of scores
///
/// # Returns
/// Statistics object with min, max, mean, median
#[wasm_bindgen]
pub fn rank_stats(scores: &[f64]) -> Result<JsValue, JsValue> {
    if scores.is_empty() {
        return Err(JsValue::from_str("Empty scores array"));
    }

    let mut sorted = scores.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    let n = sorted.len();
    let min = sorted[0];
    let max = sorted[n - 1];
    let sum: f64 = sorted.iter().sum();
    let mean = sum / n as f64;

    let median = if n % 2 == 0 {
        (sorted[n / 2 - 1] + sorted[n / 2]) / 2.0
    } else {
        sorted[n / 2]
    };

    // Standard deviation
    let variance: f64 = sorted.iter().map(|&x| (x - mean).powi(2)).sum::<f64>() / n as f64;
    let std_dev = variance.sqrt();

    #[derive(Serialize)]
    struct Stats {
        min: f64,
        max: f64,
        mean: f64,
        median: f64,
        std_dev: f64,
        count: usize,
    }

    let stats = Stats {
        min,
        max,
        mean: (mean * 100.0).round() / 100.0,
        median: (median * 100.0).round() / 100.0,
        std_dev: (std_dev * 100.0).round() / 100.0,
        count: n,
    };

    serde_wasm_bindgen::to_value(&stats).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rank_calculate() {
        let scores = [100.0, 80.0, 90.0, 80.0, 70.0];
        let ranks = rank_calculate(&scores);

        // 100 -> rank 1, 90 -> rank 2, 80 (x2) -> rank 3, 70 -> rank 5
        assert_eq!(ranks, vec![1, 3, 2, 3, 5]);
    }

    #[test]
    fn test_rank_percentiles() {
        let scores = [100.0, 80.0, 60.0, 40.0, 20.0];
        let percentiles = rank_percentiles(&scores);

        // Rank 1 (100) -> 100%, Rank 2 (80) -> 80%, etc.
        assert!((percentiles[0] - 100.0).abs() < 0.01);
        assert!((percentiles[1] - 80.0).abs() < 0.01);
        assert!((percentiles[2] - 60.0).abs() < 0.01);
    }

    #[test]
    fn test_rank_find() {
        let sorted = [100.0, 90.0, 80.0, 70.0, 60.0];

        assert_eq!(rank_find(&sorted, 100.0), 1);
        assert_eq!(rank_find(&sorted, 85.0), 3); // Would be rank 3 (between 90 and 80)
        assert_eq!(rank_find(&sorted, 60.0), 5);
    }

    #[test]
    fn test_rank_dense() {
        let scores = [100.0, 80.0, 90.0, 80.0, 70.0];
        let ranks = rank_dense(&scores);

        // 100 -> 1, 90 -> 2, 80 (x2) -> 3, 70 -> 4 (no gap)
        assert_eq!(ranks, vec![1, 3, 2, 3, 4]);
    }

    #[test]
    fn test_rank_sort_indices() {
        let scores = [50.0, 100.0, 75.0];
        let indices = rank_sort_indices(&scores);

        // Sorted: 100 (idx 1), 75 (idx 2), 50 (idx 0)
        assert_eq!(indices, vec![1, 2, 0]);
    }

    #[test]
    fn test_empty_scores() {
        let scores: [f64; 0] = [];
        assert!(rank_calculate(&scores).is_empty());
        assert!(rank_percentiles(&scores).is_empty());
        assert_eq!(rank_find(&scores, 50.0), 0);
    }
}
