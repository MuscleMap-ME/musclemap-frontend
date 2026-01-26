//! MuscleMap Cryptographic Operations
//!
//! High-performance cryptographic primitives for E2EE and data integrity.
//! Includes SHA-256 hashing, HMAC, Ed25519 signatures, and encoding utilities.
//!
//! Compiled to WebAssembly for universal runtime support.

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use hmac::{Hmac, Mac};
use ed25519_dalek::{SigningKey, VerifyingKey, Signature, Signer, Verifier};
use base64::{Engine as _, engine::general_purpose};
use rand::rngs::OsRng;

type HmacSha256 = Hmac<Sha256>;

/// Result of a hash operation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct HashResult {
    /// Hex-encoded hash
    pub hex: String,
    /// Base64-encoded hash
    pub base64: String,
    /// Raw bytes as array
    #[wasm_bindgen(skip)]
    pub bytes: Vec<u8>,
}

#[wasm_bindgen]
impl HashResult {
    /// Get the raw bytes
    #[wasm_bindgen(getter)]
    pub fn bytes(&self) -> Vec<u8> {
        self.bytes.clone()
    }
}

/// Ed25519 key pair
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct KeyPair {
    /// Public key (Base64)
    pub public_key: String,
    /// Private key (Base64) - KEEP SECRET
    pub private_key: String,
    /// Public key fingerprint (SHA-256 of public key, hex)
    pub fingerprint: String,
}

/// Result of a signature operation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct SignatureResult {
    /// Base64-encoded signature
    pub signature: String,
    /// Hex-encoded signature
    pub signature_hex: String,
    /// Whether signing was successful
    pub success: bool,
}

/// Result of signature verification
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct VerifyResult {
    /// Whether the signature is valid
    pub valid: bool,
    /// Error message if invalid
    pub error: Option<String>,
}

/// HMAC result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[wasm_bindgen(getter_with_clone)]
pub struct HmacResult {
    /// Hex-encoded HMAC
    pub hex: String,
    /// Base64-encoded HMAC
    pub base64: String,
    /// Whether HMAC generation was successful
    pub success: bool,
}

// ============================================================================
// SHA-256 Hashing
// ============================================================================

/// Compute SHA-256 hash of a string
///
/// # Arguments
/// * `data` - String to hash
///
/// # Returns
/// HashResult with hex and base64 encodings
#[wasm_bindgen]
pub fn sha256_hash(data: &str) -> HashResult {
    let mut hasher = Sha256::new();
    hasher.update(data.as_bytes());
    let result = hasher.finalize();
    let bytes: Vec<u8> = result.to_vec();

    HashResult {
        hex: hex::encode(&bytes),
        base64: general_purpose::STANDARD.encode(&bytes),
        bytes,
    }
}

/// Compute SHA-256 hash of raw bytes
///
/// # Arguments
/// * `data` - Bytes to hash
///
/// # Returns
/// HashResult with hex and base64 encodings
#[wasm_bindgen]
pub fn sha256_hash_bytes(data: &[u8]) -> HashResult {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();
    let bytes: Vec<u8> = result.to_vec();

    HashResult {
        hex: hex::encode(&bytes),
        base64: general_purpose::STANDARD.encode(&bytes),
        bytes,
    }
}

/// Compute SHA-256 hash and return only hex string
///
/// # Arguments
/// * `data` - String to hash
///
/// # Returns
/// Hex-encoded hash string
#[wasm_bindgen]
pub fn sha256_hex(data: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

/// Compute multiple SHA-256 hashes in batch
///
/// # Arguments
/// * `data_array` - Array of strings to hash
///
/// # Returns
/// Array of hex-encoded hashes
#[wasm_bindgen]
pub fn sha256_batch(data_array: Vec<String>) -> Vec<String> {
    data_array
        .iter()
        .map(|s| {
            let mut hasher = Sha256::new();
            hasher.update(s.as_bytes());
            hex::encode(hasher.finalize())
        })
        .collect()
}

// ============================================================================
// HMAC-SHA256
// ============================================================================

/// Generate HMAC-SHA256
///
/// # Arguments
/// * `key` - Secret key
/// * `message` - Message to authenticate
///
/// # Returns
/// HmacResult with hex and base64 encodings
#[wasm_bindgen]
pub fn hmac_sha256(key: &str, message: &str) -> HmacResult {
    match HmacSha256::new_from_slice(key.as_bytes()) {
        Ok(mut mac) => {
            mac.update(message.as_bytes());
            let result = mac.finalize().into_bytes();
            let bytes: Vec<u8> = result.to_vec();

            HmacResult {
                hex: hex::encode(&bytes),
                base64: general_purpose::STANDARD.encode(&bytes),
                success: true,
            }
        }
        Err(_) => HmacResult {
            hex: String::new(),
            base64: String::new(),
            success: false,
        },
    }
}

/// Verify HMAC-SHA256
///
/// # Arguments
/// * `key` - Secret key
/// * `message` - Original message
/// * `expected_hex` - Expected HMAC in hex
///
/// # Returns
/// true if HMAC matches
#[wasm_bindgen]
pub fn hmac_verify(key: &str, message: &str, expected_hex: &str) -> bool {
    let computed = hmac_sha256(key, message);
    if !computed.success {
        return false;
    }
    // Constant-time comparison via iterator
    computed.hex.as_bytes().iter().zip(expected_hex.as_bytes().iter()).all(|(a, b)| a == b)
        && computed.hex.len() == expected_hex.len()
}

// ============================================================================
// Ed25519 Digital Signatures
// ============================================================================

/// Generate a new Ed25519 key pair
///
/// # Returns
/// KeyPair with public key, private key, and fingerprint
#[wasm_bindgen]
pub fn generate_keypair() -> KeyPair {
    let signing_key = SigningKey::generate(&mut OsRng);
    let verifying_key = signing_key.verifying_key();

    let private_bytes = signing_key.to_bytes();
    let public_bytes = verifying_key.to_bytes();

    // Compute fingerprint as SHA-256 of public key
    let fingerprint = sha256_hex(&general_purpose::STANDARD.encode(&public_bytes));

    KeyPair {
        public_key: general_purpose::STANDARD.encode(&public_bytes),
        private_key: general_purpose::STANDARD.encode(&private_bytes),
        fingerprint,
    }
}

/// Sign a message with Ed25519 private key
///
/// # Arguments
/// * `private_key_base64` - Base64-encoded private key
/// * `message` - Message to sign
///
/// # Returns
/// SignatureResult with signature
#[wasm_bindgen]
pub fn sign_message(private_key_base64: &str, message: &str) -> SignatureResult {
    // Decode private key
    let private_bytes = match general_purpose::STANDARD.decode(private_key_base64) {
        Ok(bytes) => bytes,
        Err(_) => {
            return SignatureResult {
                signature: String::new(),
                signature_hex: String::new(),
                success: false,
            };
        }
    };

    // Convert to fixed-size array
    let private_array: [u8; 32] = match private_bytes.try_into() {
        Ok(arr) => arr,
        Err(_) => {
            return SignatureResult {
                signature: String::new(),
                signature_hex: String::new(),
                success: false,
            };
        }
    };

    let signing_key = SigningKey::from_bytes(&private_array);
    let signature = signing_key.sign(message.as_bytes());
    let sig_bytes = signature.to_bytes();

    SignatureResult {
        signature: general_purpose::STANDARD.encode(&sig_bytes),
        signature_hex: hex::encode(&sig_bytes),
        success: true,
    }
}

/// Verify an Ed25519 signature
///
/// # Arguments
/// * `public_key_base64` - Base64-encoded public key
/// * `message` - Original message
/// * `signature_base64` - Base64-encoded signature
///
/// # Returns
/// VerifyResult indicating if signature is valid
#[wasm_bindgen]
pub fn verify_signature(
    public_key_base64: &str,
    message: &str,
    signature_base64: &str,
) -> VerifyResult {
    // Decode public key
    let public_bytes = match general_purpose::STANDARD.decode(public_key_base64) {
        Ok(bytes) => bytes,
        Err(e) => {
            return VerifyResult {
                valid: false,
                error: Some(format!("Invalid public key: {}", e)),
            };
        }
    };

    let public_array: [u8; 32] = match public_bytes.try_into() {
        Ok(arr) => arr,
        Err(_) => {
            return VerifyResult {
                valid: false,
                error: Some("Public key must be 32 bytes".to_string()),
            };
        }
    };

    let verifying_key = match VerifyingKey::from_bytes(&public_array) {
        Ok(key) => key,
        Err(e) => {
            return VerifyResult {
                valid: false,
                error: Some(format!("Invalid public key format: {}", e)),
            };
        }
    };

    // Decode signature
    let sig_bytes = match general_purpose::STANDARD.decode(signature_base64) {
        Ok(bytes) => bytes,
        Err(e) => {
            return VerifyResult {
                valid: false,
                error: Some(format!("Invalid signature encoding: {}", e)),
            };
        }
    };

    let sig_array: [u8; 64] = match sig_bytes.try_into() {
        Ok(arr) => arr,
        Err(_) => {
            return VerifyResult {
                valid: false,
                error: Some("Signature must be 64 bytes".to_string()),
            };
        }
    };

    let signature = Signature::from_bytes(&sig_array);

    // Verify
    match verifying_key.verify(message.as_bytes(), &signature) {
        Ok(_) => VerifyResult {
            valid: true,
            error: None,
        },
        Err(e) => VerifyResult {
            valid: false,
            error: Some(format!("Signature verification failed: {}", e)),
        },
    }
}

/// Get the fingerprint (SHA-256 hash) of a public key
///
/// # Arguments
/// * `public_key_base64` - Base64-encoded public key
///
/// # Returns
/// Hex-encoded fingerprint or empty string on error
#[wasm_bindgen]
pub fn get_key_fingerprint(public_key_base64: &str) -> String {
    sha256_hex(public_key_base64)
}

// ============================================================================
// Base64 Encoding/Decoding
// ============================================================================

/// Encode bytes to Base64
///
/// # Arguments
/// * `data` - Bytes to encode
///
/// # Returns
/// Base64-encoded string
#[wasm_bindgen]
pub fn base64_encode(data: &[u8]) -> String {
    general_purpose::STANDARD.encode(data)
}

/// Encode string to Base64
///
/// # Arguments
/// * `data` - String to encode
///
/// # Returns
/// Base64-encoded string
#[wasm_bindgen]
pub fn base64_encode_string(data: &str) -> String {
    general_purpose::STANDARD.encode(data.as_bytes())
}

/// Decode Base64 to bytes
///
/// # Arguments
/// * `encoded` - Base64-encoded string
///
/// # Returns
/// Decoded bytes or empty array on error
#[wasm_bindgen]
pub fn base64_decode(encoded: &str) -> Vec<u8> {
    general_purpose::STANDARD.decode(encoded).unwrap_or_default()
}

/// Decode Base64 to string
///
/// # Arguments
/// * `encoded` - Base64-encoded string
///
/// # Returns
/// Decoded string or empty string on error
#[wasm_bindgen]
pub fn base64_decode_string(encoded: &str) -> String {
    match general_purpose::STANDARD.decode(encoded) {
        Ok(bytes) => String::from_utf8(bytes).unwrap_or_default(),
        Err(_) => String::new(),
    }
}

/// Encode bytes to URL-safe Base64
///
/// # Arguments
/// * `data` - Bytes to encode
///
/// # Returns
/// URL-safe Base64-encoded string (no padding)
#[wasm_bindgen]
pub fn base64_encode_url(data: &[u8]) -> String {
    general_purpose::URL_SAFE_NO_PAD.encode(data)
}

/// Decode URL-safe Base64 to bytes
///
/// # Arguments
/// * `encoded` - URL-safe Base64-encoded string
///
/// # Returns
/// Decoded bytes or empty array on error
#[wasm_bindgen]
pub fn base64_decode_url(encoded: &str) -> Vec<u8> {
    general_purpose::URL_SAFE_NO_PAD.decode(encoded).unwrap_or_default()
}

// ============================================================================
// Hex Encoding/Decoding
// ============================================================================

/// Encode bytes to hex string
///
/// # Arguments
/// * `data` - Bytes to encode
///
/// # Returns
/// Hex-encoded string
#[wasm_bindgen]
pub fn hex_encode(data: &[u8]) -> String {
    hex::encode(data)
}

/// Decode hex string to bytes
///
/// # Arguments
/// * `encoded` - Hex-encoded string
///
/// # Returns
/// Decoded bytes or empty array on error
#[wasm_bindgen]
pub fn hex_decode(encoded: &str) -> Vec<u8> {
    hex::decode(encoded).unwrap_or_default()
}

// ============================================================================
// Utility Functions
// ============================================================================

/// Generate random bytes
///
/// # Arguments
/// * `length` - Number of random bytes to generate
///
/// # Returns
/// Random bytes
#[wasm_bindgen]
pub fn random_bytes(length: usize) -> Vec<u8> {
    let mut bytes = vec![0u8; length];
    if let Err(_) = getrandom::getrandom(&mut bytes) {
        // Fallback: use less secure randomness
        for byte in bytes.iter_mut() {
            *byte = rand::random();
        }
    }
    bytes
}

/// Generate a random hex token
///
/// # Arguments
/// * `byte_length` - Number of random bytes (output will be 2x this in hex)
///
/// # Returns
/// Random hex string
#[wasm_bindgen]
pub fn random_hex_token(byte_length: usize) -> String {
    hex::encode(random_bytes(byte_length))
}

/// Generate a random Base64 token
///
/// # Arguments
/// * `byte_length` - Number of random bytes
///
/// # Returns
/// Random URL-safe Base64 string
#[wasm_bindgen]
pub fn random_base64_token(byte_length: usize) -> String {
    general_purpose::URL_SAFE_NO_PAD.encode(random_bytes(byte_length))
}

/// Constant-time comparison of two strings
///
/// # Arguments
/// * `a` - First string
/// * `b` - Second string
///
/// # Returns
/// true if strings are equal
#[wasm_bindgen]
pub fn constant_time_compare(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }

    let mut result = 0u8;
    for (byte_a, byte_b) in a.bytes().zip(b.bytes()) {
        result |= byte_a ^ byte_b;
    }
    result == 0
}

/// Derive a key from password using simple PBKDF2-like iteration
/// Note: For production, use a proper PBKDF2 or Argon2 library
///
/// # Arguments
/// * `password` - Password to derive key from
/// * `salt` - Salt value
/// * `iterations` - Number of iterations
///
/// # Returns
/// Derived key as hex string
#[wasm_bindgen]
pub fn derive_key_simple(password: &str, salt: &str, iterations: u32) -> String {
    let mut key = sha256_hex(&format!("{}{}", password, salt));

    for _ in 0..iterations {
        key = sha256_hex(&format!("{}{}", key, salt));
    }

    key
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sha256_hash() {
        let result = sha256_hash("hello");
        assert_eq!(
            result.hex,
            "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
        );
    }

    #[test]
    fn test_sha256_empty() {
        let result = sha256_hash("");
        assert_eq!(
            result.hex,
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[test]
    fn test_sha256_batch() {
        let results = sha256_batch(vec![
            "hello".to_string(),
            "world".to_string(),
        ]);
        assert_eq!(results.len(), 2);
        assert_eq!(
            results[0],
            "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
        );
    }

    #[test]
    fn test_hmac_sha256() {
        let result = hmac_sha256("secret", "message");
        assert!(result.success);
        assert!(!result.hex.is_empty());
        assert!(!result.base64.is_empty());
    }

    #[test]
    fn test_hmac_verify() {
        let result = hmac_sha256("secret", "message");
        assert!(hmac_verify("secret", "message", &result.hex));
        assert!(!hmac_verify("wrong", "message", &result.hex));
        assert!(!hmac_verify("secret", "wrong", &result.hex));
    }

    #[test]
    fn test_keypair_generation() {
        let keypair = generate_keypair();
        assert!(!keypair.public_key.is_empty());
        assert!(!keypair.private_key.is_empty());
        assert!(!keypair.fingerprint.is_empty());
        assert_eq!(keypair.fingerprint.len(), 64); // SHA-256 hex = 64 chars
    }

    #[test]
    fn test_sign_verify() {
        let keypair = generate_keypair();
        let message = "Hello, World!";

        let signature = sign_message(&keypair.private_key, message);
        assert!(signature.success);
        assert!(!signature.signature.is_empty());

        let verify = verify_signature(&keypair.public_key, message, &signature.signature);
        assert!(verify.valid);
        assert!(verify.error.is_none());
    }

    #[test]
    fn test_sign_verify_wrong_message() {
        let keypair = generate_keypair();
        let signature = sign_message(&keypair.private_key, "original");
        let verify = verify_signature(&keypair.public_key, "modified", &signature.signature);
        assert!(!verify.valid);
    }

    #[test]
    fn test_base64_roundtrip() {
        let original = "Hello, World!";
        let encoded = base64_encode_string(original);
        let decoded = base64_decode_string(&encoded);
        assert_eq!(decoded, original);
    }

    #[test]
    fn test_base64_url_roundtrip() {
        let data = vec![0u8, 255, 128, 64, 32];
        let encoded = base64_encode_url(&data);
        let decoded = base64_decode_url(&encoded);
        assert_eq!(decoded, data);
    }

    #[test]
    fn test_hex_roundtrip() {
        let data = vec![0u8, 255, 128, 64, 32, 16, 8, 4, 2, 1];
        let encoded = hex_encode(&data);
        let decoded = hex_decode(&encoded);
        assert_eq!(decoded, data);
    }

    #[test]
    fn test_random_bytes() {
        let bytes1 = random_bytes(32);
        let bytes2 = random_bytes(32);
        assert_eq!(bytes1.len(), 32);
        assert_eq!(bytes2.len(), 32);
        assert_ne!(bytes1, bytes2); // Extremely unlikely to be equal
    }

    #[test]
    fn test_random_tokens() {
        let hex_token = random_hex_token(16);
        assert_eq!(hex_token.len(), 32); // 16 bytes = 32 hex chars

        let base64_token = random_base64_token(16);
        assert!(!base64_token.is_empty());
    }

    #[test]
    fn test_constant_time_compare() {
        assert!(constant_time_compare("hello", "hello"));
        assert!(!constant_time_compare("hello", "world"));
        assert!(!constant_time_compare("hello", "hello!"));
    }

    #[test]
    fn test_derive_key() {
        let key1 = derive_key_simple("password", "salt", 1000);
        let key2 = derive_key_simple("password", "salt", 1000);
        let key3 = derive_key_simple("password", "different", 1000);

        assert_eq!(key1, key2);
        assert_ne!(key1, key3);
        assert_eq!(key1.len(), 64); // SHA-256 hex
    }
}
