//! Error types for BuildNet

use thiserror::Error;

/// Result type for BuildNet operations
pub type Result<T> = std::result::Result<T, BuildNetError>;

/// BuildNet error types
#[derive(Error, Debug)]
pub enum BuildNetError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Watch error: {0}")]
    Watch(#[from] notify::Error),

    #[error("Build failed: {0}")]
    BuildFailed(String),

    #[error("Cache miss: {0}")]
    CacheMiss(String),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),

    #[error("Lock acquisition failed: {0}")]
    LockFailed(String),

    #[error("Process error: {0}")]
    Process(String),

    #[error("Connection pool error: {0}")]
    Pool(String),

    #[error("Artifact not found: {0}")]
    ArtifactNotFound(String),

    #[error("Hash mismatch: expected {expected}, got {actual}")]
    HashMismatch { expected: String, actual: String },

    #[error("Timeout: {0}")]
    Timeout(String),

    #[error("Internal error: {0}")]
    Internal(#[from] anyhow::Error),

    #[error("Notification error: {0}")]
    Notification(String),

    #[error("Monitoring error: {0}")]
    Monitoring(String),

    #[error("Resource error: {0}")]
    Resource(String),

    #[error("Authentication error: {0}")]
    Auth(String),

    #[error("Rate limit exceeded: {0}")]
    RateLimited(String),

    #[error("Template error: {0}")]
    Template(String),

    #[error("GitHub API error: {0}")]
    GitHub(String),

    #[error("Distributed build error: {0}")]
    Distributed(String),

    #[error("Replication error: {0}")]
    Replication(String),

    #[error("Failover error: {0}")]
    Failover(String),

    #[error("Recovery error: {0}")]
    Recovery(String),

    #[error("REAPI error: {0}")]
    Reapi(String),

    #[error("Unauthorized: {0}")]
    Unauthorized(String),

    #[error("Invalid command: {0}")]
    InvalidCommand(String),
}

impl From<r2d2::Error> for BuildNetError {
    fn from(err: r2d2::Error) -> Self {
        BuildNetError::Pool(err.to_string())
    }
}
