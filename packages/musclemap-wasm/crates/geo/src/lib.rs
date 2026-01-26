//! MuscleMap Geo Module
//!
//! High-performance geohash encoding/decoding and distance calculations.
//! Compiled to WebAssembly for universal runtime support (Node, Bun, Browser).

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};

// Constants
const EARTH_RADIUS_METERS: f64 = 6_371_000.0;
const DEG_TO_RAD: f64 = std::f64::consts::PI / 180.0;
const RAD_TO_DEG: f64 = 180.0 / std::f64::consts::PI;

/// Base32 alphabet for geohash encoding
const BASE32: &[u8; 32] = b"0123456789bcdefghjkmnpqrstuvwxyz";

/// Decode table for base32 characters (128 entries for ASCII)
const DECODE_TABLE: [i8; 128] = {
    let mut table = [-1i8; 128];
    table[b'0' as usize] = 0;
    table[b'1' as usize] = 1;
    table[b'2' as usize] = 2;
    table[b'3' as usize] = 3;
    table[b'4' as usize] = 4;
    table[b'5' as usize] = 5;
    table[b'6' as usize] = 6;
    table[b'7' as usize] = 7;
    table[b'8' as usize] = 8;
    table[b'9' as usize] = 9;
    table[b'b' as usize] = 10;
    table[b'B' as usize] = 10;
    table[b'c' as usize] = 11;
    table[b'C' as usize] = 11;
    table[b'd' as usize] = 12;
    table[b'D' as usize] = 12;
    table[b'e' as usize] = 13;
    table[b'E' as usize] = 13;
    table[b'f' as usize] = 14;
    table[b'F' as usize] = 14;
    table[b'g' as usize] = 15;
    table[b'G' as usize] = 15;
    table[b'h' as usize] = 16;
    table[b'H' as usize] = 16;
    table[b'j' as usize] = 17;
    table[b'J' as usize] = 17;
    table[b'k' as usize] = 18;
    table[b'K' as usize] = 18;
    table[b'm' as usize] = 19;
    table[b'M' as usize] = 19;
    table[b'n' as usize] = 20;
    table[b'N' as usize] = 20;
    table[b'p' as usize] = 21;
    table[b'P' as usize] = 21;
    table[b'q' as usize] = 22;
    table[b'Q' as usize] = 22;
    table[b'r' as usize] = 23;
    table[b'R' as usize] = 23;
    table[b's' as usize] = 24;
    table[b'S' as usize] = 24;
    table[b't' as usize] = 25;
    table[b'T' as usize] = 25;
    table[b'u' as usize] = 26;
    table[b'U' as usize] = 26;
    table[b'v' as usize] = 27;
    table[b'V' as usize] = 27;
    table[b'w' as usize] = 28;
    table[b'W' as usize] = 28;
    table[b'x' as usize] = 29;
    table[b'X' as usize] = 29;
    table[b'y' as usize] = 30;
    table[b'Y' as usize] = 30;
    table[b'z' as usize] = 31;
    table[b'Z' as usize] = 31;
    table
};

/// Latitude error margins for each precision level (1-12)
const LAT_ERROR: [f64; 12] = [
    23.0, 23.0, 2.8, 2.8, 0.35, 0.35,
    0.044, 0.044, 0.0055, 0.0055, 0.00068, 0.00068
];

/// Longitude error margins for each precision level (1-12)
const LNG_ERROR: [f64; 12] = [
    23.0, 5.6, 5.6, 0.7, 0.7, 0.087,
    0.087, 0.011, 0.011, 0.0014, 0.0014, 0.00017
];

/// Approximate cell widths in meters for each precision level
const CELL_WIDTHS: [f64; 12] = [
    5_009_400.0,  // 1: ~5009 km
    1_252_350.0,  // 2: ~1252 km
    156_543.0,    // 3: ~156 km
    39_135.8,     // 4: ~39 km
    4_891.97,     // 5: ~4.9 km
    1_222.99,     // 6: ~1.2 km
    152.87,       // 7: ~153 m
    38.22,        // 8: ~38 m
    4.78,         // 9: ~4.8 m
    1.19,         // 10: ~1.2 m
    0.149,        // 11: ~15 cm
    0.037,        // 12: ~3.7 cm
];

/// Decoded coordinates result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct DecodedCoords {
    pub lat: f64,
    pub lng: f64,
}

#[wasm_bindgen]
impl DecodedCoords {
    #[wasm_bindgen(constructor)]
    pub fn new(lat: f64, lng: f64) -> DecodedCoords {
        DecodedCoords { lat, lng }
    }
}

/// Bounding box result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct BoundingBox {
    pub min_lat: f64,
    pub max_lat: f64,
    pub min_lng: f64,
    pub max_lng: f64,
}

#[wasm_bindgen]
impl BoundingBox {
    #[wasm_bindgen(constructor)]
    pub fn new(min_lat: f64, max_lat: f64, min_lng: f64, max_lng: f64) -> BoundingBox {
        BoundingBox { min_lat, max_lat, min_lng, max_lng }
    }

    /// Check if a point is within this bounding box
    pub fn contains(&self, lat: f64, lng: f64) -> bool {
        lat >= self.min_lat && lat <= self.max_lat &&
        lng >= self.min_lng && lng <= self.max_lng
    }
}

/// Encode latitude/longitude to geohash string
///
/// # Arguments
/// * `lat` - Latitude (-90 to 90)
/// * `lng` - Longitude (-180 to 180)
/// * `precision` - Number of characters (1-12, default 9)
///
/// # Returns
/// Geohash string or error
#[wasm_bindgen]
pub fn geohash_encode(lat: f64, lng: f64, precision: u8) -> Result<String, JsValue> {
    let precision = precision.clamp(1, 12) as usize;

    if !(-90.0..=90.0).contains(&lat) || !(-180.0..=180.0).contains(&lng) {
        return Err(JsValue::from_str("Invalid coordinates"));
    }

    let mut lat_range = (-90.0, 90.0);
    let mut lng_range = (-180.0, 180.0);
    let mut is_lng = true;
    let mut bit = 0u8;
    let mut ch = 0u8;
    let mut result = String::with_capacity(precision);

    while result.len() < precision {
        let (range, val) = if is_lng {
            (&mut lng_range, lng)
        } else {
            (&mut lat_range, lat)
        };

        let mid = (range.0 + range.1) / 2.0;

        if val >= mid {
            ch |= 1 << (4 - bit);
            range.0 = mid;
        } else {
            range.1 = mid;
        }

        is_lng = !is_lng;
        bit += 1;

        if bit == 5 {
            result.push(BASE32[ch as usize] as char);
            bit = 0;
            ch = 0;
        }
    }

    Ok(result)
}

/// Decode geohash string to latitude/longitude
///
/// # Arguments
/// * `hash` - Geohash string (1-12 characters)
///
/// # Returns
/// DecodedCoords with lat/lng or error
#[wasm_bindgen]
pub fn geohash_decode(hash: &str) -> Result<DecodedCoords, JsValue> {
    if hash.is_empty() || hash.len() > 12 {
        return Err(JsValue::from_str("Invalid geohash length"));
    }

    let mut lat_range = (-90.0, 90.0);
    let mut lng_range = (-180.0, 180.0);
    let mut is_lng = true;

    for c in hash.bytes() {
        if c >= 128 {
            return Err(JsValue::from_str("Invalid geohash character"));
        }

        let val = DECODE_TABLE[c as usize];
        if val < 0 {
            return Err(JsValue::from_str(&format!("Invalid geohash character: {}", c as char)));
        }

        for bit in (0..5).rev() {
            let mid = if is_lng {
                (lng_range.0 + lng_range.1) / 2.0
            } else {
                (lat_range.0 + lat_range.1) / 2.0
            };

            if is_lng {
                if val & (1 << bit) != 0 {
                    lng_range.0 = mid;
                } else {
                    lng_range.1 = mid;
                }
            } else {
                if val & (1 << bit) != 0 {
                    lat_range.0 = mid;
                } else {
                    lat_range.1 = mid;
                }
            }

            is_lng = !is_lng;
        }
    }

    Ok(DecodedCoords {
        lat: (lat_range.0 + lat_range.1) / 2.0,
        lng: (lng_range.0 + lng_range.1) / 2.0,
    })
}

/// Calculate distance between two points using Haversine formula
///
/// # Arguments
/// * `lat1`, `lng1` - First point coordinates
/// * `lat2`, `lng2` - Second point coordinates
///
/// # Returns
/// Distance in meters
#[wasm_bindgen]
pub fn haversine_meters(lat1: f64, lng1: f64, lat2: f64, lng2: f64) -> f64 {
    let phi1 = lat1 * DEG_TO_RAD;
    let phi2 = lat2 * DEG_TO_RAD;
    let d_phi = (lat2 - lat1) * DEG_TO_RAD;
    let d_lambda = (lng2 - lng1) * DEG_TO_RAD;

    let sin_d_phi = (d_phi / 2.0).sin();
    let sin_d_lambda = (d_lambda / 2.0).sin();

    let a = sin_d_phi * sin_d_phi + phi1.cos() * phi2.cos() * sin_d_lambda * sin_d_lambda;

    EARTH_RADIUS_METERS * 2.0 * a.sqrt().atan2((1.0 - a).sqrt())
}

/// Check if a point is within a given radius of another point
///
/// # Arguments
/// * `lat1`, `lng1` - Center point
/// * `lat2`, `lng2` - Point to check
/// * `radius_meters` - Maximum distance
///
/// # Returns
/// true if within radius
#[wasm_bindgen]
pub fn is_within_radius(lat1: f64, lng1: f64, lat2: f64, lng2: f64, radius_meters: f64) -> bool {
    haversine_meters(lat1, lng1, lat2, lng2) <= radius_meters
}

/// Calculate bounding box for a point and radius
///
/// # Arguments
/// * `lat`, `lng` - Center point
/// * `radius_meters` - Radius in meters
///
/// # Returns
/// BoundingBox with min/max lat/lng
#[wasm_bindgen]
pub fn bounding_box(lat: f64, lng: f64, radius_meters: f64) -> BoundingBox {
    let lat_delta = (radius_meters / EARTH_RADIUS_METERS) * RAD_TO_DEG;
    let lng_delta = (radius_meters / (EARTH_RADIUS_METERS * (lat * DEG_TO_RAD).cos())) * RAD_TO_DEG;

    BoundingBox {
        min_lat: (lat - lat_delta).max(-90.0),
        max_lat: (lat + lat_delta).min(90.0),
        min_lng: lng - lng_delta,
        max_lng: lng + lng_delta,
    }
}

/// Get optimal geohash precision for a given radius
///
/// # Arguments
/// * `radius_meters` - Search radius in meters
///
/// # Returns
/// Recommended precision (1-12)
#[wasm_bindgen]
pub fn optimal_precision(radius_meters: f64) -> u8 {
    for (i, &width) in CELL_WIDTHS.iter().enumerate() {
        if radius_meters >= width {
            return (i + 1) as u8;
        }
    }
    12
}

/// Get neighboring geohashes (8 directions)
///
/// # Arguments
/// * `hash` - Center geohash
///
/// # Returns
/// Array of 8 neighbor hashes [N, NE, E, SE, S, SW, W, NW]
#[wasm_bindgen]
pub fn geohash_neighbors(hash: &str) -> Result<Vec<String>, JsValue> {
    let precision = hash.len();
    if precision < 1 || precision > 12 {
        return Err(JsValue::from_str("Invalid geohash length"));
    }

    let decoded = geohash_decode(hash)?;
    let lat_err = LAT_ERROR[precision - 1];
    let lng_err = LNG_ERROR[precision - 1];

    // Direction offsets: N, NE, E, SE, S, SW, W, NW
    let offsets: [(i8, i8); 8] = [
        (1, 0),   // N
        (1, 1),   // NE
        (0, 1),   // E
        (-1, 1),  // SE
        (-1, 0),  // S
        (-1, -1), // SW
        (0, -1),  // W
        (1, -1),  // NW
    ];

    let mut neighbors = Vec::with_capacity(8);

    for (d_lat, d_lng) in offsets {
        let mut n_lat = decoded.lat + (d_lat as f64) * lat_err * 2.0;
        let mut n_lng = decoded.lng + (d_lng as f64) * lng_err * 2.0;

        // Wrap longitude
        while n_lng > 180.0 { n_lng -= 360.0; }
        while n_lng < -180.0 { n_lng += 360.0; }

        // Clamp latitude
        n_lat = n_lat.clamp(-90.0, 90.0);

        neighbors.push(geohash_encode(n_lat, n_lng, precision as u8)?);
    }

    Ok(neighbors)
}

/// Batch encode multiple coordinates to geohashes
///
/// # Arguments
/// * `coords` - Flat array of [lat1, lng1, lat2, lng2, ...]
/// * `precision` - Geohash precision
///
/// # Returns
/// Array of geohash strings
#[wasm_bindgen]
pub fn geohash_encode_batch(coords: &[f64], precision: u8) -> Result<Vec<String>, JsValue> {
    if coords.len() % 2 != 0 {
        return Err(JsValue::from_str("Coords array must have even length"));
    }

    let mut results = Vec::with_capacity(coords.len() / 2);

    for chunk in coords.chunks(2) {
        results.push(geohash_encode(chunk[0], chunk[1], precision)?);
    }

    Ok(results)
}

/// Batch calculate distances from one point to many points
///
/// # Arguments
/// * `origin_lat`, `origin_lng` - Origin point
/// * `targets` - Flat array of [lat1, lng1, lat2, lng2, ...]
///
/// # Returns
/// Array of distances in meters
#[wasm_bindgen]
pub fn haversine_batch(origin_lat: f64, origin_lng: f64, targets: &[f64]) -> Result<Vec<f64>, JsValue> {
    if targets.len() % 2 != 0 {
        return Err(JsValue::from_str("Targets array must have even length"));
    }

    let mut results = Vec::with_capacity(targets.len() / 2);

    for chunk in targets.chunks(2) {
        results.push(haversine_meters(origin_lat, origin_lng, chunk[0], chunk[1]));
    }

    Ok(results)
}

/// Filter points within radius (returns indices)
///
/// # Arguments
/// * `origin_lat`, `origin_lng` - Origin point
/// * `targets` - Flat array of [lat1, lng1, lat2, lng2, ...]
/// * `radius_meters` - Maximum distance
///
/// # Returns
/// Array of indices of points within radius
#[wasm_bindgen]
pub fn filter_within_radius(
    origin_lat: f64,
    origin_lng: f64,
    targets: &[f64],
    radius_meters: f64,
) -> Result<Vec<u32>, JsValue> {
    if targets.len() % 2 != 0 {
        return Err(JsValue::from_str("Targets array must have even length"));
    }

    let mut results = Vec::new();

    for (i, chunk) in targets.chunks(2).enumerate() {
        if is_within_radius(origin_lat, origin_lng, chunk[0], chunk[1], radius_meters) {
            results.push(i as u32);
        }
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_geohash_encode() {
        let hash = geohash_encode(37.7749, -122.4194, 9).unwrap();
        assert_eq!(hash.len(), 9);
        assert!(hash.starts_with("9q8y"));
    }

    #[test]
    fn test_geohash_decode() {
        let coords = geohash_decode("9q8yy").unwrap();
        assert!((coords.lat - 37.77).abs() < 0.1);
        assert!((coords.lng - (-122.42)).abs() < 0.1);
    }

    #[test]
    fn test_haversine() {
        // NYC to LA
        let distance = haversine_meters(40.7128, -74.0060, 34.0522, -118.2437);
        // Should be ~3935 km
        assert!((distance - 3_935_000.0).abs() < 50_000.0);
    }

    #[test]
    fn test_bounding_box() {
        let bbox = bounding_box(40.7128, -74.0060, 1000.0);
        assert!(bbox.min_lat < 40.7128);
        assert!(bbox.max_lat > 40.7128);
        assert!(bbox.contains(40.7128, -74.0060));
    }

    #[test]
    fn test_optimal_precision() {
        // 5,009,400m = precision 1, so 5,100,000m should be 1
        assert_eq!(optimal_precision(5_100_000.0), 1);
        // 5,000,000m < 5,009,400m, so should be precision 2
        assert_eq!(optimal_precision(5_000_000.0), 2);
        // 1000m < 1222.99m (precision 6), so should be 7
        assert_eq!(optimal_precision(1000.0), 7);
        // 1300m >= 1222.99m, so should be 6
        assert_eq!(optimal_precision(1300.0), 6);
        // 10m > 4.78m (precision 9), so should be 9
        assert_eq!(optimal_precision(10.0), 9);
        // 3m < 4.78m (precision 9), so should be 10
        assert_eq!(optimal_precision(3.0), 10);
    }
}
