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
}

impl From<r2d2::Error> for BuildNetError {
    fn from(err: r2d2::Error) -> Self {
        BuildNetError::Pool(err.to_string())
    }
}
