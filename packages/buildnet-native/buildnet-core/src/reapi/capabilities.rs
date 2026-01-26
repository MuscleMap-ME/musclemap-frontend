//! Server Capabilities
//!
//! Reports server capabilities for REAPI compatibility.

use serde::{Deserialize, Serialize};

use super::digest::DigestFunction;

/// Server capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerCapabilities {
    /// Cache capabilities
    pub cache_capabilities: Option<CacheCapabilities>,
    /// Execution capabilities
    pub execution_capabilities: Option<ExecutionCapabilities>,
    /// Low API version supported
    pub low_api_version: SemVer,
    /// High API version supported
    pub high_api_version: SemVer,
}

impl Default for ServerCapabilities {
    fn default() -> Self {
        Self {
            cache_capabilities: Some(CacheCapabilities::default()),
            execution_capabilities: Some(ExecutionCapabilities::default()),
            low_api_version: SemVer {
                major: 2,
                minor: 0,
                patch: 0,
                prerelease: String::new(),
            },
            high_api_version: SemVer {
                major: 2,
                minor: 3,
                patch: 0,
                prerelease: String::new(),
            },
        }
    }
}

/// Cache capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheCapabilities {
    /// Supported digest functions
    pub digest_functions: Vec<DigestFunction>,
    /// Action cache update capabilities
    pub action_cache_update_capabilities: ActionCacheUpdateCapabilities,
    /// Cache priority capabilities
    pub cache_priority_capabilities: CachePriorityCapabilities,
    /// Maximum batch total size
    pub max_batch_total_size_bytes: i64,
    /// Symlink absolute path strategy
    pub symlink_absolute_path_strategy: SymlinkAbsolutePathStrategy,
    /// Supported compressors
    pub supported_compressors: Vec<Compressor>,
    /// Supported batch update compressors
    pub supported_batch_update_compressors: Vec<Compressor>,
}

impl Default for CacheCapabilities {
    fn default() -> Self {
        Self {
            digest_functions: vec![DigestFunction::Sha256, DigestFunction::Blake3],
            action_cache_update_capabilities: ActionCacheUpdateCapabilities::default(),
            cache_priority_capabilities: CachePriorityCapabilities::default(),
            max_batch_total_size_bytes: 1024 * 1024 * 100, // 100MB
            symlink_absolute_path_strategy: SymlinkAbsolutePathStrategy::Disallowed,
            supported_compressors: vec![Compressor::Identity, Compressor::Zstd],
            supported_batch_update_compressors: vec![Compressor::Identity],
        }
    }
}

/// Action cache update capabilities
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ActionCacheUpdateCapabilities {
    /// Whether the client can update the action cache
    pub update_enabled: bool,
}

/// Cache priority capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachePriorityCapabilities {
    /// Minimum supported priority
    pub min_priority: i32,
    /// Maximum supported priority
    pub max_priority: i32,
}

impl Default for CachePriorityCapabilities {
    fn default() -> Self {
        Self {
            min_priority: 0,
            max_priority: 100,
        }
    }
}

/// Symlink handling strategy
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SymlinkAbsolutePathStrategy {
    /// Unknown/unspecified
    Unknown,
    /// Disallow absolute paths in symlinks
    #[default]
    Disallowed,
    /// Allow absolute paths
    Allowed,
}

/// Compressor type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Compressor {
    /// No compression
    Identity,
    /// Zstandard
    Zstd,
    /// Deflate
    Deflate,
}

/// Execution capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionCapabilities {
    /// Supported digest function
    pub digest_function: DigestFunction,
    /// Whether exec is enabled
    pub exec_enabled: bool,
    /// Execution priority capabilities
    pub execution_priority_capabilities: ExecutionPriorityCapabilities,
    /// Supported node properties
    pub supported_node_properties: Vec<String>,
    /// Digest function override value
    pub digest_functions: Vec<DigestFunction>,
}

impl Default for ExecutionCapabilities {
    fn default() -> Self {
        Self {
            digest_function: DigestFunction::Sha256,
            exec_enabled: true,
            execution_priority_capabilities: ExecutionPriorityCapabilities::default(),
            supported_node_properties: vec![
                "OSFamily".to_string(),
                "container-image".to_string(),
                "dockerPrivileged".to_string(),
                "dockerRunAsRoot".to_string(),
            ],
            digest_functions: vec![DigestFunction::Sha256, DigestFunction::Blake3],
        }
    }
}

/// Execution priority capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionPriorityCapabilities {
    /// Minimum supported priority
    pub min_priority: i32,
    /// Maximum supported priority
    pub max_priority: i32,
}

impl Default for ExecutionPriorityCapabilities {
    fn default() -> Self {
        Self {
            min_priority: 0,
            max_priority: 100,
        }
    }
}

/// Semantic version
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SemVer {
    /// Major version
    pub major: i32,
    /// Minor version
    pub minor: i32,
    /// Patch version
    pub patch: i32,
    /// Prerelease string
    pub prerelease: String,
}

impl SemVer {
    /// Create a new semver
    pub fn new(major: i32, minor: i32, patch: i32) -> Self {
        Self {
            major,
            minor,
            patch,
            prerelease: String::new(),
        }
    }
}

impl std::fmt::Display for SemVer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.prerelease.is_empty() {
            write!(f, "{}.{}.{}", self.major, self.minor, self.patch)
        } else {
            write!(f, "{}.{}.{}-{}", self.major, self.minor, self.patch, self.prerelease)
        }
    }
}

/// Capabilities request
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GetCapabilitiesRequest {
    /// Instance name (optional)
    pub instance_name: String,
}

/// Capabilities provider
pub struct CapabilitiesProvider {
    /// Server capabilities
    capabilities: ServerCapabilities,
}

impl CapabilitiesProvider {
    /// Create a new capabilities provider
    pub fn new(capabilities: ServerCapabilities) -> Self {
        Self { capabilities }
    }

    /// Create with default capabilities
    pub fn default_capabilities() -> Self {
        Self::new(ServerCapabilities::default())
    }

    /// Get capabilities
    pub fn get_capabilities(&self, _request: &GetCapabilitiesRequest) -> ServerCapabilities {
        self.capabilities.clone()
    }

    /// Check if execution is supported
    pub fn supports_execution(&self) -> bool {
        self.capabilities.execution_capabilities
            .as_ref()
            .map(|c| c.exec_enabled)
            .unwrap_or(false)
    }

    /// Check if caching is supported
    pub fn supports_caching(&self) -> bool {
        self.capabilities.cache_capabilities.is_some()
    }

    /// Get supported digest functions
    pub fn supported_digest_functions(&self) -> Vec<DigestFunction> {
        self.capabilities.cache_capabilities
            .as_ref()
            .map(|c| c.digest_functions.clone())
            .unwrap_or_default()
    }

    /// Check if a specific digest function is supported
    pub fn supports_digest_function(&self, function: DigestFunction) -> bool {
        self.supported_digest_functions().contains(&function)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_capabilities() {
        let provider = CapabilitiesProvider::default_capabilities();

        assert!(provider.supports_execution());
        assert!(provider.supports_caching());
        assert!(provider.supports_digest_function(DigestFunction::Sha256));
    }

    #[test]
    fn test_semver_display() {
        let version = SemVer::new(2, 3, 0);
        assert_eq!(format!("{}", version), "2.3.0");

        let version_pre = SemVer {
            major: 1,
            minor: 0,
            patch: 0,
            prerelease: "beta".to_string(),
        };
        assert_eq!(format!("{}", version_pre), "1.0.0-beta");
    }
}
