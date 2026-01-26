//! Resource Discovery Module
//!
//! Automatic scanning and benchmarking of system resources including:
//! - CPU cores, architecture, features
//! - Memory capacity and speed
//! - Storage volumes with performance characteristics
//! - Installed tools (ImageMagick, FFmpeg, Docker, etc.)
//! - Runtime environments (Node.js, Bun, Rust, Python)

pub mod scanner;
pub mod benchmark;
pub mod tools;
pub mod runtimes;

pub use scanner::{ResourceScanner, NodeResources, ScanConfig};
pub use benchmark::{BenchmarkRunner, BenchmarkResults, BenchmarkType, StoragePerformance};
pub use tools::{ToolScanner, Tool, ToolCapability};
pub use runtimes::{RuntimeScanner, Runtime, RuntimeRequirement};

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// CPU architecture type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CpuArchitecture {
    X86_64,
    Aarch64,
    Arm,
    Unknown,
}

impl CpuArchitecture {
    pub fn current() -> Self {
        #[cfg(target_arch = "x86_64")]
        return Self::X86_64;
        #[cfg(target_arch = "aarch64")]
        return Self::Aarch64;
        #[cfg(target_arch = "arm")]
        return Self::Arm;
        #[cfg(not(any(target_arch = "x86_64", target_arch = "aarch64", target_arch = "arm")))]
        return Self::Unknown;
    }
}

/// Memory type classification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MemoryType {
    DDR3,
    DDR4,
    DDR5,
    LPDDR4,
    LPDDR5,
    Unknown,
}

/// Storage class based on performance characteristics
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum StorageClass {
    /// NVMe SSD (>3000 MB/s, >100k IOPS)
    NVMe,
    /// SATA SSD (500-600 MB/s, 10k-100k IOPS)
    SSD,
    /// Hard disk drive (100-200 MB/s, <1k IOPS)
    HDD,
    /// Network attached storage
    Network,
    /// Unknown or unclassified
    Unknown,
}

impl StorageClass {
    /// Classify storage based on performance metrics
    pub fn classify(read_speed_mbps: f64, iops: u32) -> Self {
        match (read_speed_mbps, iops) {
            (r, i) if r > 2500.0 && i > 80_000 => Self::NVMe,
            (r, i) if r > 400.0 && i > 8_000 => Self::SSD,
            (r, _) if r > 80.0 => Self::HDD,
            _ => Self::Network,
        }
    }

    /// Get human-readable name
    pub fn name(&self) -> &'static str {
        match self {
            Self::NVMe => "NVMe SSD",
            Self::SSD => "SATA SSD",
            Self::HDD => "Hard Drive",
            Self::Network => "Network Storage",
            Self::Unknown => "Unknown",
        }
    }
}

/// Discovered CPU information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuInfo {
    /// Number of physical cores
    pub physical_cores: usize,
    /// Number of logical cores (with hyperthreading)
    pub logical_cores: usize,
    /// CPU architecture
    pub architecture: CpuArchitecture,
    /// CPU model name
    pub model: String,
    /// Base frequency in MHz
    pub frequency_mhz: u32,
    /// CPU features (SSE, AVX, NEON, etc.)
    pub features: Vec<String>,
    /// Vendor (Intel, AMD, Apple, etc.)
    pub vendor: String,
}

/// Discovered memory information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryInfo {
    /// Total physical memory in bytes
    pub total_bytes: u64,
    /// Available memory in bytes
    pub available_bytes: u64,
    /// Memory type if detectable
    pub memory_type: MemoryType,
    /// Memory speed in MHz if detectable
    pub speed_mhz: Option<u32>,
}

/// Discovered storage volume
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageVolume {
    /// Mount path
    pub path: PathBuf,
    /// Total capacity in bytes
    pub total_bytes: u64,
    /// Available space in bytes
    pub available_bytes: u64,
    /// Storage class based on performance
    pub storage_class: StorageClass,
    /// Mount point name
    pub mount_point: String,
    /// Filesystem type
    pub filesystem: String,
    /// Is this the system drive?
    pub is_system: bool,
    /// Read speed in MB/s (benchmarked)
    pub read_speed_mbps: Option<f64>,
    /// Write speed in MB/s (benchmarked)
    pub write_speed_mbps: Option<f64>,
    /// Random IOPS (benchmarked)
    pub iops: Option<u32>,
}

/// Network interface information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInterface {
    /// Interface name
    pub name: String,
    /// IP address
    pub ip_address: Option<String>,
    /// MAC address
    pub mac_address: Option<String>,
    /// Is this interface up?
    pub is_up: bool,
    /// Estimated bandwidth in Mbps
    pub bandwidth_mbps: Option<f64>,
}

/// Complete resource snapshot for a node
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceSnapshot {
    /// When this snapshot was taken
    pub timestamp: chrono::DateTime<chrono::Utc>,
    /// CPU information
    pub cpu: CpuInfo,
    /// Memory information
    pub memory: MemoryInfo,
    /// Storage volumes
    pub storage: Vec<StorageVolume>,
    /// Installed tools
    pub tools: Vec<Tool>,
    /// Runtime environments
    pub runtimes: Vec<Runtime>,
    /// Network interfaces
    pub network: Vec<NetworkInterface>,
    /// Overall health score (0.0 - 1.0)
    pub health_score: f64,
}
