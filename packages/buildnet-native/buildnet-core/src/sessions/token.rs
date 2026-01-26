//! Token generation and validation

use chrono::{DateTime, Utc, Duration};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::AuthLevel;
use crate::{BuildNetError, Result};

/// Authentication token
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthToken {
    /// Token ID
    pub id: String,
    /// User ID
    pub user_id: String,
    /// Authentication level
    pub auth_level: AuthLevel,
    /// Issued at
    pub issued_at: DateTime<Utc>,
    /// Expires at
    pub expires_at: DateTime<Utc>,
    /// Token type
    pub token_type: TokenType,
    /// Scopes
    pub scopes: Vec<String>,
}

/// Token type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TokenType {
    /// Session token (short-lived)
    Session,
    /// API key (long-lived)
    ApiKey,
    /// Refresh token
    Refresh,
    /// Temporary token for specific operation
    Temporary,
}

impl AuthToken {
    /// Create a new session token
    pub fn session(user_id: &str, auth_level: AuthLevel, ttl_secs: u64) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            user_id: user_id.to_string(),
            auth_level,
            issued_at: now,
            expires_at: now + Duration::seconds(ttl_secs as i64),
            token_type: TokenType::Session,
            scopes: vec!["*".to_string()],
        }
    }

    /// Create a new API key token
    pub fn api_key(user_id: &str, auth_level: AuthLevel) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            user_id: user_id.to_string(),
            auth_level,
            issued_at: now,
            expires_at: now + Duration::days(365), // 1 year
            token_type: TokenType::ApiKey,
            scopes: vec!["*".to_string()],
        }
    }

    /// Create a temporary token
    pub fn temporary(user_id: &str, auth_level: AuthLevel, scopes: Vec<String>, ttl_secs: u64) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            user_id: user_id.to_string(),
            auth_level,
            issued_at: now,
            expires_at: now + Duration::seconds(ttl_secs as i64),
            token_type: TokenType::Temporary,
            scopes,
        }
    }

    /// Check if token is expired
    pub fn is_expired(&self) -> bool {
        Utc::now() > self.expires_at
    }

    /// Check if token has a scope
    pub fn has_scope(&self, scope: &str) -> bool {
        self.scopes.contains(&"*".to_string()) || self.scopes.contains(&scope.to_string())
    }

    /// Get remaining TTL in seconds
    pub fn ttl_secs(&self) -> i64 {
        let remaining = self.expires_at - Utc::now();
        remaining.num_seconds().max(0)
    }
}

/// Token generator
pub struct TokenGenerator {
    /// Secret for signing tokens
    secret: Vec<u8>,
}

impl TokenGenerator {
    /// Create a new token generator
    pub fn new(secret: &str) -> Self {
        Self {
            secret: secret.as_bytes().to_vec(),
        }
    }

    /// Generate a random secret
    pub fn generate_secret() -> String {
        let bytes: [u8; 32] = rand_bytes();
        hex_encode(&bytes)
    }

    /// Generate a session token string
    pub fn generate_session_token(&self, user_id: &str, auth_level: AuthLevel, ttl_secs: u64) -> String {
        let token = AuthToken::session(user_id, auth_level, ttl_secs);
        self.encode_token(&token)
    }

    /// Generate an API key
    pub fn generate_api_key(&self) -> String {
        let bytes: [u8; 32] = rand_bytes();
        format!("bn_{}", hex_encode(&bytes))
    }

    /// Encode a token to string
    pub fn encode_token(&self, token: &AuthToken) -> String {
        // Simple encoding: base64(json) + signature
        let json = serde_json::to_string(token).unwrap_or_default();
        let payload = base64_encode(json.as_bytes());
        let signature = self.sign(&payload);

        format!("{}.{}", payload, signature)
    }

    /// Decode and validate a token string
    pub fn decode_token(&self, token_str: &str) -> Result<AuthToken> {
        let parts: Vec<&str> = token_str.split('.').collect();

        if parts.len() != 2 {
            return Err(BuildNetError::Auth("Invalid token format".into()));
        }

        let payload = parts[0];
        let signature = parts[1];

        // Verify signature
        let expected_sig = self.sign(payload);
        if !constant_time_eq(signature.as_bytes(), expected_sig.as_bytes()) {
            return Err(BuildNetError::Auth("Invalid token signature".into()));
        }

        // Decode payload
        let json = base64_decode(payload)
            .map_err(|_| BuildNetError::Auth("Invalid token encoding".into()))?;

        let json_str = String::from_utf8(json)
            .map_err(|_| BuildNetError::Auth("Invalid token encoding".into()))?;

        let token: AuthToken = serde_json::from_str(&json_str)
            .map_err(|e| BuildNetError::Auth(format!("Invalid token payload: {}", e)))?;

        // Check expiry
        if token.is_expired() {
            return Err(BuildNetError::Auth("Token expired".into()));
        }

        Ok(token)
    }

    /// Sign data with secret
    fn sign(&self, data: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        data.hash(&mut hasher);
        self.secret.hash(&mut hasher);
        format!("{:016x}", hasher.finish())
    }

    /// Refresh a token
    pub fn refresh_token(&self, token: &AuthToken, ttl_secs: u64) -> AuthToken {
        let now = Utc::now();
        AuthToken {
            id: Uuid::new_v4().to_string(),
            user_id: token.user_id.clone(),
            auth_level: token.auth_level,
            issued_at: now,
            expires_at: now + Duration::seconds(ttl_secs as i64),
            token_type: token.token_type,
            scopes: token.scopes.clone(),
        }
    }
}

impl Default for TokenGenerator {
    fn default() -> Self {
        Self::new(&Self::generate_secret())
    }
}

/// Generate random bytes (simplified)
fn rand_bytes<const N: usize>() -> [u8; N] {
    let mut bytes = [0u8; N];
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();

    for (i, byte) in bytes.iter_mut().enumerate() {
        *byte = ((now >> (i * 8)) & 0xFF) as u8 ^ (i as u8);
    }

    bytes
}

/// Hex encode bytes
fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

/// Base64 encode
fn base64_encode(bytes: &[u8]) -> String {
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

    let mut result = String::new();

    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = chunk.get(1).copied().unwrap_or(0) as usize;
        let b2 = chunk.get(2).copied().unwrap_or(0) as usize;

        result.push(ALPHABET[(b0 >> 2) & 0x3F] as char);
        result.push(ALPHABET[((b0 << 4) | (b1 >> 4)) & 0x3F] as char);

        if chunk.len() > 1 {
            result.push(ALPHABET[((b1 << 2) | (b2 >> 6)) & 0x3F] as char);
        }
        if chunk.len() > 2 {
            result.push(ALPHABET[b2 & 0x3F] as char);
        }
    }

    result
}

/// Base64 decode
fn base64_decode(input: &str) -> std::result::Result<Vec<u8>, ()> {
    const DECODE_TABLE: [i8; 128] = {
        let mut table = [-1i8; 128];
        let alphabet = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
        let mut i = 0;
        while i < alphabet.len() {
            table[alphabet[i] as usize] = i as i8;
            i += 1;
        }
        table
    };

    let mut result = Vec::new();
    let bytes: Vec<u8> = input.bytes()
        .filter(|&b| b != b'=' && b < 128)
        .collect();

    for chunk in bytes.chunks(4) {
        let mut buf = [0u8; 4];
        for (i, &b) in chunk.iter().enumerate() {
            let val = DECODE_TABLE[b as usize];
            if val < 0 {
                return Err(());
            }
            buf[i] = val as u8;
        }

        result.push((buf[0] << 2) | (buf[1] >> 4));
        if chunk.len() > 2 {
            result.push((buf[1] << 4) | (buf[2] >> 2));
        }
        if chunk.len() > 3 {
            result.push((buf[2] << 6) | buf[3]);
        }
    }

    Ok(result)
}

/// Constant-time comparison
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }

    let mut result = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        result |= x ^ y;
    }

    result == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_generation() {
        let gen = TokenGenerator::new("test-secret");
        let token_str = gen.generate_session_token("user123", AuthLevel::Build, 3600);

        let token = gen.decode_token(&token_str).unwrap();
        assert_eq!(token.user_id, "user123");
        assert_eq!(token.auth_level, AuthLevel::Build);
        assert!(!token.is_expired());
    }

    #[test]
    fn test_api_key_format() {
        let gen = TokenGenerator::new("test-secret");
        let api_key = gen.generate_api_key();
        assert!(api_key.starts_with("bn_"));
        assert_eq!(api_key.len(), 67); // "bn_" + 64 hex chars
    }

    #[test]
    fn test_base64_roundtrip() {
        let original = b"Hello, World!";
        let encoded = base64_encode(original);
        let decoded = base64_decode(&encoded).unwrap();
        assert_eq!(decoded, original);
    }
}
