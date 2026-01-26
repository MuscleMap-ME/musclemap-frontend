//! Session Management for BuildNet
//!
//! Multi-user authentication, session tracking, and access control.

pub mod manager;
pub mod token;

pub use manager::{SessionManager, UserSession, SessionInfo};
pub use token::{TokenGenerator, AuthToken};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// User authentication level
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuthLevel {
    /// No authentication - public access
    Anonymous,
    /// Read-only access
    Read,
    /// Can trigger builds
    Build,
    /// Full administrative access
    Admin,
}

impl AuthLevel {
    /// Check if this level can perform an action requiring the given level
    pub fn can_perform(&self, required: AuthLevel) -> bool {
        *self >= required
    }

    /// Get level from string
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "anonymous" | "anon" => Some(AuthLevel::Anonymous),
            "read" | "viewer" => Some(AuthLevel::Read),
            "build" | "builder" | "developer" => Some(AuthLevel::Build),
            "admin" | "administrator" => Some(AuthLevel::Admin),
            _ => None,
        }
    }
}

impl std::fmt::Display for AuthLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AuthLevel::Anonymous => write!(f, "anonymous"),
            AuthLevel::Read => write!(f, "read"),
            AuthLevel::Build => write!(f, "build"),
            AuthLevel::Admin => write!(f, "admin"),
        }
    }
}

/// User information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    /// User ID
    pub id: String,
    /// Username
    pub username: String,
    /// Email (optional)
    pub email: Option<String>,
    /// Authentication level
    pub auth_level: AuthLevel,
    /// API key (hashed)
    pub api_key_hash: Option<String>,
    /// Created timestamp
    pub created_at: DateTime<Utc>,
    /// Last login timestamp
    pub last_login: Option<DateTime<Utc>>,
    /// Account enabled
    pub enabled: bool,
    /// Tags/roles
    pub tags: Vec<String>,
}

impl User {
    /// Create a new user
    pub fn new(id: &str, username: &str, auth_level: AuthLevel) -> Self {
        Self {
            id: id.to_string(),
            username: username.to_string(),
            email: None,
            auth_level,
            api_key_hash: None,
            created_at: Utc::now(),
            last_login: None,
            enabled: true,
            tags: vec![],
        }
    }

    /// Create an anonymous user
    pub fn anonymous() -> Self {
        Self {
            id: "anonymous".to_string(),
            username: "anonymous".to_string(),
            email: None,
            auth_level: AuthLevel::Anonymous,
            api_key_hash: None,
            created_at: Utc::now(),
            last_login: None,
            enabled: true,
            tags: vec![],
        }
    }

    /// Check if user can perform an action
    pub fn can_perform(&self, required_level: AuthLevel) -> bool {
        self.enabled && self.auth_level.can_perform(required_level)
    }
}

/// Session configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionConfig {
    /// Session timeout in seconds
    #[serde(default = "default_session_timeout")]
    pub timeout_secs: u64,
    /// Maximum sessions per user
    #[serde(default = "default_max_sessions")]
    pub max_sessions_per_user: usize,
    /// Enable anonymous access
    #[serde(default)]
    pub allow_anonymous: bool,
    /// API key length
    #[serde(default = "default_api_key_length")]
    pub api_key_length: usize,
    /// Token secret for JWT signing
    pub token_secret: Option<String>,
}

fn default_session_timeout() -> u64 { 3600 * 24 } // 24 hours
fn default_max_sessions() -> usize { 10 }
fn default_api_key_length() -> usize { 32 }

impl Default for SessionConfig {
    fn default() -> Self {
        Self {
            timeout_secs: default_session_timeout(),
            max_sessions_per_user: default_max_sessions(),
            allow_anonymous: true,
            api_key_length: default_api_key_length(),
            token_secret: None,
        }
    }
}

/// Rate limiting configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    /// Requests per window
    #[serde(default = "default_requests_per_window")]
    pub requests: usize,
    /// Window duration in seconds
    #[serde(default = "default_window_secs")]
    pub window_secs: u64,
    /// Burst capacity
    #[serde(default = "default_burst")]
    pub burst: usize,
}

fn default_requests_per_window() -> usize { 1000 }
fn default_window_secs() -> u64 { 60 }
fn default_burst() -> usize { 50 }

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            requests: default_requests_per_window(),
            window_secs: default_window_secs(),
            burst: default_burst(),
        }
    }
}

/// Rate limiter state
#[derive(Debug, Clone)]
pub struct RateLimiter {
    config: RateLimitConfig,
    /// Token bucket per user
    tokens: std::collections::HashMap<String, TokenBucket>,
}

#[derive(Debug, Clone)]
struct TokenBucket {
    tokens: f64,
    last_update: DateTime<Utc>,
}

impl RateLimiter {
    /// Create a new rate limiter
    pub fn new(config: RateLimitConfig) -> Self {
        Self {
            config,
            tokens: std::collections::HashMap::new(),
        }
    }

    /// Check if request is allowed
    pub fn check(&mut self, user_id: &str) -> bool {
        let now = Utc::now();
        let rate = self.config.requests as f64 / self.config.window_secs as f64;
        let max_tokens = self.config.burst as f64;

        let bucket = self.tokens.entry(user_id.to_string()).or_insert(TokenBucket {
            tokens: max_tokens,
            last_update: now,
        });

        // Add tokens based on time elapsed
        let elapsed = (now - bucket.last_update).num_milliseconds() as f64 / 1000.0;
        bucket.tokens = (bucket.tokens + elapsed * rate).min(max_tokens);
        bucket.last_update = now;

        // Check if we have a token
        if bucket.tokens >= 1.0 {
            bucket.tokens -= 1.0;
            true
        } else {
            false
        }
    }

    /// Get remaining tokens for a user
    pub fn remaining(&self, user_id: &str) -> usize {
        self.tokens.get(user_id).map(|b| b.tokens as usize).unwrap_or(self.config.burst)
    }

    /// Reset rate limit for a user
    pub fn reset(&mut self, user_id: &str) {
        self.tokens.remove(user_id);
    }
}
