//! Resource Management for BuildNet
//!
//! CPU tier management, storage tiering, and resource allocation.

pub mod cpu;
pub mod storage;
pub mod allocator;

pub use cpu::{CpuTier, CpuManager};
pub use storage::{StorageTier, StorageManager};
pub use allocator::{ResourceAllocator, ResourceRequest, ResourceAllocation};

use serde::{Deserialize, Serialize};

/// Resource configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceConfig {
    /// CPU tier configuration
    #[serde(default)]
    pub cpu: CpuConfig,
    /// Storage tier configuration
    #[serde(default)]
    pub storage: StorageConfig,
    /// Maximum concurrent builds per tier
    #[serde(default)]
    pub max_concurrent: MaxConcurrent,
}

impl Default for ResourceConfig {
    fn default() -> Self {
        Self {
            cpu: CpuConfig::default(),
            storage: StorageConfig::default(),
            max_concurrent: MaxConcurrent::default(),
        }
    }
}

/// CPU configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuConfig {
    /// Number of high-priority cores
    #[serde(default = "default_high_cores")]
    pub high_priority_cores: usize,
    /// Number of normal-priority cores
    #[serde(default = "default_normal_cores")]
    pub normal_priority_cores: usize,
    /// Enable CPU affinity
    #[serde(default)]
    pub enable_affinity: bool,
}

fn default_high_cores() -> usize { 2 }
fn default_normal_cores() -> usize { 4 }

impl Default for CpuConfig {
    fn default() -> Self {
        Self {
            high_priority_cores: default_high_cores(),
            normal_priority_cores: default_normal_cores(),
            enable_affinity: false,
        }
    }
}

/// Storage configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageConfig {
    /// Hot storage path (SSD, fast)
    #[serde(default = "default_hot_path")]
    pub hot_path: String,
    /// Warm storage path (regular disk)
    #[serde(default = "default_warm_path")]
    pub warm_path: String,
    /// Cold storage path (archive)
    #[serde(default = "default_cold_path")]
    pub cold_path: String,
    /// Hot storage max size (bytes)
    #[serde(default = "default_hot_size")]
    pub hot_max_bytes: u64,
    /// Warm storage max size (bytes)
    #[serde(default = "default_warm_size")]
    pub warm_max_bytes: u64,
    /// Days before moving from hot to warm
    #[serde(default = "default_hot_days")]
    pub hot_threshold_days: u32,
    /// Days before moving from warm to cold
    #[serde(default = "default_warm_days")]
    pub warm_threshold_days: u32,
}

fn default_hot_path() -> String { ".buildnet/cache/hot".into() }
fn default_warm_path() -> String { ".buildnet/cache/warm".into() }
fn default_cold_path() -> String { ".buildnet/cache/cold".into() }
fn default_hot_size() -> u64 { 10 * 1024 * 1024 * 1024 } // 10 GB
fn default_warm_size() -> u64 { 50 * 1024 * 1024 * 1024 } // 50 GB
fn default_hot_days() -> u32 { 7 }
fn default_warm_days() -> u32 { 30 }

impl Default for StorageConfig {
    fn default() -> Self {
        Self {
            hot_path: default_hot_path(),
            warm_path: default_warm_path(),
            cold_path: default_cold_path(),
            hot_max_bytes: default_hot_size(),
            warm_max_bytes: default_warm_size(),
            hot_threshold_days: default_hot_days(),
            warm_threshold_days: default_warm_days(),
        }
    }
}

/// Maximum concurrent builds configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaxConcurrent {
    /// Maximum high-priority builds
    #[serde(default = "default_max_high")]
    pub high: usize,
    /// Maximum normal-priority builds
    #[serde(default = "default_max_normal")]
    pub normal: usize,
    /// Maximum low-priority builds
    #[serde(default = "default_max_low")]
    pub low: usize,
}

fn default_max_high() -> usize { 2 }
fn default_max_normal() -> usize { 4 }
fn default_max_low() -> usize { 8 }

impl Default for MaxConcurrent {
    fn default() -> Self {
        Self {
            high: default_max_high(),
            normal: default_max_normal(),
            low: default_max_low(),
        }
    }
}

/// Resource manager combining CPU and storage management
pub struct ResourceManager {
    cpu: CpuManager,
    storage: StorageManager,
    allocator: ResourceAllocator,
}

impl ResourceManager {
    /// Create a new resource manager
    pub fn new(config: ResourceConfig) -> Self {
        Self {
            cpu: CpuManager::new(config.cpu.clone()),
            storage: StorageManager::new(config.storage.clone()),
            allocator: ResourceAllocator::new(config.max_concurrent),
        }
    }

    /// Get CPU manager
    pub fn cpu(&self) -> &CpuManager {
        &self.cpu
    }

    /// Get storage manager
    pub fn storage(&self) -> &StorageManager {
        &self.storage
    }

    /// Get resource allocator
    pub fn allocator(&self) -> &ResourceAllocator {
        &self.allocator
    }

    /// Run storage tiering maintenance
    pub async fn run_tiering(&self) -> crate::Result<TieringResult> {
        self.storage.run_tiering().await
    }
}

/// Result of storage tiering operation
#[derive(Debug, Clone, Serialize)]
pub struct TieringResult {
    /// Files moved from hot to warm
    pub hot_to_warm: usize,
    /// Files moved from warm to cold
    pub warm_to_cold: usize,
    /// Files deleted from cold
    pub deleted: usize,
    /// Bytes freed
    pub bytes_freed: u64,
}
