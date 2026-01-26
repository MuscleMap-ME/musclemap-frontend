//! Session manager implementation

use std::collections::HashMap;
use std::sync::Arc;
use chrono::{DateTime, Utc, Duration};
use parking_lot::RwLock;
use uuid::Uuid;

use super::{User, AuthLevel, SessionConfig, RateLimiter, RateLimitConfig};
use crate::{BuildNetError, Result};

/// User session
#[derive(Debug, Clone)]
pub struct UserSession {
    /// Session ID
    pub id: String,
    /// User associated with this session
    pub user: User,
    /// Session creation time
    pub created_at: DateTime<Utc>,
    /// Session last activity time
    pub last_activity: DateTime<Utc>,
    /// Session expiry time
    pub expires_at: DateTime<Utc>,
    /// IP address
    pub ip_address: Option<String>,
    /// User agent
    pub user_agent: Option<String>,
    /// Active build IDs
    pub active_builds: Vec<String>,
}

impl UserSession {
    /// Create a new session for a user
    pub fn new(user: User, timeout_secs: u64) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            user,
            created_at: now,
            last_activity: now,
            expires_at: now + Duration::seconds(timeout_secs as i64),
            ip_address: None,
            user_agent: None,
            active_builds: vec![],
        }
    }

    /// Check if session is expired
    pub fn is_expired(&self) -> bool {
        Utc::now() > self.expires_at
    }

    /// Refresh session activity
    pub fn refresh(&mut self, timeout_secs: u64) {
        let now = Utc::now();
        self.last_activity = now;
        self.expires_at = now + Duration::seconds(timeout_secs as i64);
    }

    /// Add active build
    pub fn add_build(&mut self, build_id: &str) {
        if !self.active_builds.contains(&build_id.to_string()) {
            self.active_builds.push(build_id.to_string());
        }
    }

    /// Remove active build
    pub fn remove_build(&mut self, build_id: &str) {
        self.active_builds.retain(|b| b != build_id);
    }
}

/// Session info (safe for serialization)
#[derive(Debug, Clone, serde::Serialize)]
pub struct SessionInfo {
    pub id: String,
    pub user_id: String,
    pub username: String,
    pub auth_level: AuthLevel,
    pub created_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub active_builds: usize,
}

impl From<&UserSession> for SessionInfo {
    fn from(session: &UserSession) -> Self {
        Self {
            id: session.id.clone(),
            user_id: session.user.id.clone(),
            username: session.user.username.clone(),
            auth_level: session.user.auth_level,
            created_at: session.created_at,
            last_activity: session.last_activity,
            expires_at: session.expires_at,
            active_builds: session.active_builds.len(),
        }
    }
}

/// Session manager
pub struct SessionManager {
    /// Configuration
    config: SessionConfig,
    /// Sessions by ID
    sessions: Arc<RwLock<HashMap<String, UserSession>>>,
    /// Sessions by user ID
    user_sessions: Arc<RwLock<HashMap<String, Vec<String>>>>,
    /// Users by ID
    users: Arc<RwLock<HashMap<String, User>>>,
    /// API keys to user IDs
    api_keys: Arc<RwLock<HashMap<String, String>>>,
    /// Rate limiter
    rate_limiter: Arc<RwLock<RateLimiter>>,
}

impl SessionManager {
    /// Create a new session manager
    pub fn new(config: SessionConfig) -> Self {
        let rate_config = RateLimitConfig::default();

        Self {
            config,
            sessions: Arc::new(RwLock::new(HashMap::new())),
            user_sessions: Arc::new(RwLock::new(HashMap::new())),
            users: Arc::new(RwLock::new(HashMap::new())),
            api_keys: Arc::new(RwLock::new(HashMap::new())),
            rate_limiter: Arc::new(RwLock::new(RateLimiter::new(rate_config))),
        }
    }

    /// Register a user
    pub fn register_user(&self, user: User) -> Result<()> {
        let mut users = self.users.write();

        if users.contains_key(&user.id) {
            return Err(BuildNetError::Auth(format!("User {} already exists", user.id)));
        }

        users.insert(user.id.clone(), user);
        Ok(())
    }

    /// Get user by ID
    pub fn get_user(&self, user_id: &str) -> Option<User> {
        let users = self.users.read();
        users.get(user_id).cloned()
    }

    /// Update user
    pub fn update_user(&self, user: User) -> Result<()> {
        let mut users = self.users.write();

        if !users.contains_key(&user.id) {
            return Err(BuildNetError::Auth(format!("User {} not found", user.id)));
        }

        users.insert(user.id.clone(), user);
        Ok(())
    }

    /// Delete user
    pub fn delete_user(&self, user_id: &str) -> Result<()> {
        // Remove all sessions for this user
        self.revoke_all_sessions(user_id)?;

        // Remove user
        let mut users = self.users.write();
        users.remove(user_id);

        // Remove API keys
        let mut api_keys = self.api_keys.write();
        api_keys.retain(|_, uid| uid != user_id);

        Ok(())
    }

    /// Set API key for user
    pub fn set_api_key(&self, user_id: &str, api_key: &str) -> Result<()> {
        // Verify user exists
        {
            let users = self.users.read();
            if !users.contains_key(user_id) {
                return Err(BuildNetError::Auth(format!("User {} not found", user_id)));
            }
        }

        // Hash the API key
        let key_hash = hash_api_key(api_key);

        // Store mapping
        let mut api_keys = self.api_keys.write();
        api_keys.insert(key_hash, user_id.to_string());

        // Update user
        let mut users = self.users.write();
        if let Some(user) = users.get_mut(user_id) {
            user.api_key_hash = Some(hash_api_key(api_key));
        }

        Ok(())
    }

    /// Create session for user
    pub fn create_session(&self, user_id: &str) -> Result<UserSession> {
        // Get user
        let user = {
            let users = self.users.read();
            users.get(user_id).cloned()
        };

        let user = user.ok_or_else(|| BuildNetError::Auth(format!("User {} not found", user_id)))?;

        if !user.enabled {
            return Err(BuildNetError::Auth("User account is disabled".into()));
        }

        // Check session limit
        {
            let user_sessions = self.user_sessions.read();
            if let Some(sessions) = user_sessions.get(user_id) {
                if sessions.len() >= self.config.max_sessions_per_user {
                    return Err(BuildNetError::Auth("Maximum sessions reached".into()));
                }
            }
        }

        // Create session
        let session = UserSession::new(user, self.config.timeout_secs);
        let session_id = session.id.clone();

        // Store session
        {
            let mut sessions = self.sessions.write();
            sessions.insert(session_id.clone(), session.clone());
        }

        // Track user session
        {
            let mut user_sessions = self.user_sessions.write();
            user_sessions
                .entry(user_id.to_string())
                .or_default()
                .push(session_id);
        }

        // Update last login
        {
            let mut users = self.users.write();
            if let Some(user) = users.get_mut(user_id) {
                user.last_login = Some(Utc::now());
            }
        }

        Ok(session)
    }

    /// Create anonymous session
    pub fn create_anonymous_session(&self) -> Result<UserSession> {
        if !self.config.allow_anonymous {
            return Err(BuildNetError::Auth("Anonymous access is disabled".into()));
        }

        let user = User::anonymous();
        let session = UserSession::new(user, self.config.timeout_secs / 4); // Shorter timeout

        {
            let mut sessions = self.sessions.write();
            sessions.insert(session.id.clone(), session.clone());
        }

        Ok(session)
    }

    /// Get session by ID
    pub fn get_session(&self, session_id: &str) -> Option<UserSession> {
        let sessions = self.sessions.read();
        sessions.get(session_id).cloned()
    }

    /// Validate session and refresh
    pub fn validate_session(&self, session_id: &str) -> Result<UserSession> {
        let mut sessions = self.sessions.write();

        let session = sessions.get_mut(session_id)
            .ok_or_else(|| BuildNetError::Auth("Session not found".into()))?;

        if session.is_expired() {
            sessions.remove(session_id);
            return Err(BuildNetError::Auth("Session expired".into()));
        }

        session.refresh(self.config.timeout_secs);
        Ok(session.clone())
    }

    /// Authenticate with API key
    pub fn authenticate_api_key(&self, api_key: &str) -> Result<UserSession> {
        let key_hash = hash_api_key(api_key);

        // Find user by API key
        let user_id = {
            let api_keys = self.api_keys.read();
            api_keys.get(&key_hash).cloned()
        };

        let user_id = user_id.ok_or_else(|| BuildNetError::Auth("Invalid API key".into()))?;

        // Create session for this user
        self.create_session(&user_id)
    }

    /// Revoke session
    pub fn revoke_session(&self, session_id: &str) -> Result<()> {
        let session = {
            let mut sessions = self.sessions.write();
            sessions.remove(session_id)
        };

        if let Some(session) = session {
            let mut user_sessions = self.user_sessions.write();
            if let Some(sessions) = user_sessions.get_mut(&session.user.id) {
                sessions.retain(|s| s != session_id);
            }
        }

        Ok(())
    }

    /// Revoke all sessions for a user
    pub fn revoke_all_sessions(&self, user_id: &str) -> Result<()> {
        let session_ids: Vec<String> = {
            let mut user_sessions = self.user_sessions.write();
            user_sessions.remove(user_id).unwrap_or_default()
        };

        {
            let mut sessions = self.sessions.write();
            for session_id in session_ids {
                sessions.remove(&session_id);
            }
        }

        Ok(())
    }

    /// Check rate limit
    pub fn check_rate_limit(&self, user_id: &str) -> Result<()> {
        let mut limiter = self.rate_limiter.write();

        if limiter.check(user_id) {
            Ok(())
        } else {
            Err(BuildNetError::RateLimited(format!(
                "Rate limit exceeded. Try again later. Remaining: {}",
                limiter.remaining(user_id)
            )))
        }
    }

    /// Get all active sessions
    pub fn list_sessions(&self) -> Vec<SessionInfo> {
        let sessions = self.sessions.read();
        sessions.values()
            .filter(|s| !s.is_expired())
            .map(SessionInfo::from)
            .collect()
    }

    /// Get sessions for a user
    pub fn user_sessions(&self, user_id: &str) -> Vec<SessionInfo> {
        let sessions = self.sessions.read();
        let user_session_ids = self.user_sessions.read();

        user_session_ids.get(user_id)
            .map(|ids| {
                ids.iter()
                    .filter_map(|id| sessions.get(id))
                    .filter(|s| !s.is_expired())
                    .map(SessionInfo::from)
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Cleanup expired sessions
    pub fn cleanup_expired(&self) -> usize {
        let mut count = 0;

        let expired: Vec<String> = {
            let sessions = self.sessions.read();
            sessions.iter()
                .filter(|(_, s)| s.is_expired())
                .map(|(id, _)| id.clone())
                .collect()
        };

        for session_id in expired {
            if self.revoke_session(&session_id).is_ok() {
                count += 1;
            }
        }

        count
    }

    /// Get session count
    pub fn session_count(&self) -> usize {
        let sessions = self.sessions.read();
        sessions.values().filter(|s| !s.is_expired()).count()
    }

    /// List all users
    pub fn list_users(&self) -> Vec<User> {
        let users = self.users.read();
        users.values().cloned().collect()
    }
}

/// Hash an API key for storage
fn hash_api_key(key: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    key.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

impl Default for SessionManager {
    fn default() -> Self {
        Self::new(SessionConfig::default())
    }
}
