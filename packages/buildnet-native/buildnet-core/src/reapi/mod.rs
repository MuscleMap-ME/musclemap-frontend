//! Remote Execution API (REAPI) Compatibility
//!
//! Implements the Remote Execution API specification for enterprise build compatibility.
//! This allows BuildNet to integrate with Bazel Remote Execution, BuildBarn, Buildfarm,
//! and other REAPI-compatible systems.
//!
//! Reference: https://github.com/bazelbuild/remote-apis

pub mod execution;
pub mod cas;
pub mod action_cache;
pub mod capabilities;
pub mod digest;

pub use execution::{ExecutionService, ExecutionRequest, ExecutionResponse};
pub use cas::{ContentAddressableStorage, BlobStore};
pub use action_cache::{ActionCache, ActionResult, CachedAction};
pub use capabilities::{ServerCapabilities, CacheCapabilities, ExecutionCapabilities};
pub use digest::{Digest, DigestFunction};

use serde::{Deserialize, Serialize};

/// REAPI configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReapiConfig {
    /// Enable REAPI compatibility
    pub enabled: bool,
    /// Instance name
    pub instance_name: String,
    /// Maximum batch size for uploads/downloads
    pub max_batch_size: usize,
    /// Maximum blob size for inline content
    pub max_inline_size: usize,
    /// Supported digest functions
    pub digest_functions: Vec<DigestFunction>,
    /// Enable action caching
    pub action_cache_enabled: bool,
    /// Action cache TTL in seconds
    pub action_cache_ttl_secs: u64,
    /// Enable CAS
    pub cas_enabled: bool,
    /// CAS storage backend
    pub cas_backend: CasBackend,
    /// Enable execution
    pub execution_enabled: bool,
    /// Maximum concurrent executions
    pub max_concurrent_executions: usize,
}

impl Default for ReapiConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            instance_name: "buildnet".to_string(),
            max_batch_size: 1000,
            max_inline_size: 1024 * 64, // 64KB
            digest_functions: vec![DigestFunction::Sha256, DigestFunction::Blake3],
            action_cache_enabled: true,
            action_cache_ttl_secs: 3600 * 24 * 7, // 7 days
            cas_enabled: true,
            cas_backend: CasBackend::Local,
            execution_enabled: true,
            max_concurrent_executions: 10,
        }
    }
}

/// CAS storage backend
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CasBackend {
    /// Local filesystem
    Local,
    /// S3-compatible storage
    S3,
    /// Google Cloud Storage
    Gcs,
    /// Azure Blob Storage
    Azure,
    /// In-memory (for testing)
    Memory,
}

/// Platform properties for execution
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Platform {
    /// Platform properties
    pub properties: Vec<PlatformProperty>,
}

/// Single platform property
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformProperty {
    /// Property name
    pub name: String,
    /// Property value
    pub value: String,
}

impl Platform {
    /// Create a new platform
    pub fn new() -> Self {
        Self {
            properties: Vec::new(),
        }
    }

    /// Add a property
    pub fn with_property(mut self, name: &str, value: &str) -> Self {
        self.properties.push(PlatformProperty {
            name: name.to_string(),
            value: value.to_string(),
        });
        self
    }

    /// Get a property value
    pub fn get(&self, name: &str) -> Option<&str> {
        self.properties.iter()
            .find(|p| p.name == name)
            .map(|p| p.value.as_str())
    }

    /// Check if platform has a property
    pub fn has(&self, name: &str, value: &str) -> bool {
        self.properties.iter()
            .any(|p| p.name == name && p.value == value)
    }
}

/// Command for execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Command {
    /// Command arguments
    pub arguments: Vec<String>,
    /// Environment variables
    pub environment_variables: Vec<EnvironmentVariable>,
    /// Output files to capture
    pub output_files: Vec<String>,
    /// Output directories to capture
    pub output_directories: Vec<String>,
    /// Platform requirements
    pub platform: Platform,
    /// Working directory
    pub working_directory: String,
}

/// Environment variable
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentVariable {
    /// Variable name
    pub name: String,
    /// Variable value
    pub value: String,
}

/// Action to execute
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Action {
    /// Command digest
    pub command_digest: Digest,
    /// Input root digest
    pub input_root_digest: Digest,
    /// Timeout in seconds
    pub timeout_secs: Option<u64>,
    /// Do not cache this action
    pub do_not_cache: bool,
    /// Salt for cache key
    pub salt: Option<Vec<u8>>,
    /// Platform
    pub platform: Option<Platform>,
}

/// Directory node in a tree
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryNode {
    /// Name of this directory
    pub name: String,
    /// Digest of the Directory message
    pub digest: Digest,
}

/// File node in a tree
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    /// Name of this file
    pub name: String,
    /// Digest of the file content
    pub digest: Digest,
    /// Is executable
    pub is_executable: bool,
}

/// Symlink node
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymlinkNode {
    /// Name of this symlink
    pub name: String,
    /// Target path
    pub target: String,
}

/// Directory message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Directory {
    /// Files in this directory
    pub files: Vec<FileNode>,
    /// Subdirectories
    pub directories: Vec<DirectoryNode>,
    /// Symlinks
    pub symlinks: Vec<SymlinkNode>,
}

/// Output file from execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutputFile {
    /// Path relative to working directory
    pub path: String,
    /// Digest of the file content
    pub digest: Digest,
    /// Is executable
    pub is_executable: bool,
    /// Inline content (if small enough)
    pub contents: Option<Vec<u8>>,
}

/// Output directory from execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutputDirectory {
    /// Path relative to working directory
    pub path: String,
    /// Digest of the Tree message
    pub tree_digest: Digest,
}

/// Tree message (Merkle tree of directories)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tree {
    /// Root directory
    pub root: Directory,
    /// All child directories (flattened)
    pub children: Vec<Directory>,
}

/// Execution stage
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ExecutionStage {
    /// Unknown stage
    Unknown,
    /// Action is waiting to be assigned to a worker
    CacheCheck,
    /// Action is waiting in queue
    Queued,
    /// Action is executing
    Executing,
    /// Action completed
    Completed,
}

/// Log file from execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogFile {
    /// Log file name
    pub name: String,
    /// Digest of log content
    pub digest: Digest,
    /// Human-readable log URI
    pub human_readable_uri: Option<String>,
}
