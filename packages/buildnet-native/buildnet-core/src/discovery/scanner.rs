//! Resource Scanner
//!
//! Scans the local system for available resources.

use super::*;
use crate::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use sysinfo::{CpuExt, DiskExt, NetworkExt, System, SystemExt};

/// Configuration for resource scanning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanConfig {
    /// Paths to scan for storage
    #[serde(default)]
    pub storage_paths: Vec<PathBuf>,
    /// Whether to run benchmarks during scan
    #[serde(default)]
    pub run_benchmarks: bool,
    /// Benchmark test size in MB
    #[serde(default = "default_benchmark_size")]
    pub benchmark_size_mb: u64,
    /// Skip certain resource types
    #[serde(default)]
    pub skip: Vec<String>,
}

fn default_benchmark_size() -> u64 {
    64
}

impl Default for ScanConfig {
    fn default() -> Self {
        Self {
            storage_paths: vec![],
            run_benchmarks: false,
            benchmark_size_mb: default_benchmark_size(),
            skip: vec![],
        }
    }
}

/// Complete node resources after scanning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeResources {
    /// Unique node identifier
    pub node_id: String,
    /// Human-readable node name
    pub node_name: String,
    /// CPU information
    pub cpu: CpuInfo,
    /// Memory information
    pub memory: MemoryInfo,
    /// Available storage volumes
    pub storage: Vec<StorageVolume>,
    /// Installed tools
    pub tools: Vec<Tool>,
    /// Runtime environments
    pub runtimes: Vec<Runtime>,
    /// Network interfaces
    pub network: Vec<NetworkInterface>,
    /// Benchmark results if run
    pub benchmarks: Option<BenchmarkResults>,
    /// When this scan was performed
    pub scanned_at: chrono::DateTime<chrono::Utc>,
}

impl NodeResources {
    /// Create a new empty NodeResources
    pub fn new(node_id: String) -> Self {
        Self {
            node_id,
            node_name: hostname::get()
                .map(|h| h.to_string_lossy().to_string())
                .unwrap_or_else(|_| "unknown".to_string()),
            cpu: CpuInfo {
                physical_cores: 0,
                logical_cores: 0,
                architecture: CpuArchitecture::Unknown,
                model: String::new(),
                frequency_mhz: 0,
                features: vec![],
                vendor: String::new(),
            },
            memory: MemoryInfo {
                total_bytes: 0,
                available_bytes: 0,
                memory_type: MemoryType::Unknown,
                speed_mhz: None,
            },
            storage: vec![],
            tools: vec![],
            runtimes: vec![],
            network: vec![],
            benchmarks: None,
            scanned_at: chrono::Utc::now(),
        }
    }

    /// Get total available CPU cores
    pub fn available_cores(&self) -> usize {
        self.cpu.logical_cores
    }

    /// Get total available memory in bytes
    pub fn available_memory(&self) -> u64 {
        self.memory.available_bytes
    }

    /// Get total available storage in bytes
    pub fn available_storage(&self) -> u64 {
        self.storage.iter().map(|s| s.available_bytes).sum()
    }

    /// Check if a specific tool is available
    pub fn has_tool(&self, name: &str) -> bool {
        self.tools.iter().any(|t| t.name.eq_ignore_ascii_case(name))
    }

    /// Check if a specific runtime is available
    pub fn has_runtime(&self, name: &str) -> bool {
        self.runtimes
            .iter()
            .any(|r| r.name.eq_ignore_ascii_case(name))
    }

    /// Get the fastest storage volume
    pub fn fastest_storage(&self) -> Option<&StorageVolume> {
        self.storage
            .iter()
            .filter(|s| s.available_bytes > 1024 * 1024 * 1024) // At least 1GB free
            .max_by_key(|s| s.storage_class)
    }
}

/// Resource scanner for discovering system capabilities
pub struct ResourceScanner {
    node_id: String,
    config: ScanConfig,
    system: System,
}

impl ResourceScanner {
    /// Create a new resource scanner
    pub fn new(node_id: String, config: ScanConfig) -> Self {
        Self {
            node_id,
            config,
            system: System::new_all(),
        }
    }

    /// Perform a full system scan
    pub async fn scan_all(&mut self) -> Result<NodeResources> {
        // Refresh system information
        self.system.refresh_all();

        let mut resources = NodeResources::new(self.node_id.clone());

        // Scan CPU
        if !self.config.skip.contains(&"cpu".to_string()) {
            resources.cpu = self.scan_cpu();
        }

        // Scan memory
        if !self.config.skip.contains(&"memory".to_string()) {
            resources.memory = self.scan_memory();
        }

        // Scan storage
        if !self.config.skip.contains(&"storage".to_string()) {
            resources.storage = self.scan_storage().await;
        }

        // Scan tools
        if !self.config.skip.contains(&"tools".to_string()) {
            let tool_scanner = ToolScanner::new();
            resources.tools = tool_scanner.scan_all().await;
        }

        // Scan runtimes
        if !self.config.skip.contains(&"runtimes".to_string()) {
            let runtime_scanner = RuntimeScanner::new();
            resources.runtimes = runtime_scanner.scan_all().await;
        }

        // Scan network
        if !self.config.skip.contains(&"network".to_string()) {
            resources.network = self.scan_network();
        }

        // Run benchmarks if configured
        if self.config.run_benchmarks {
            let benchmark_runner = BenchmarkRunner::new(
                self.node_id.clone(),
                self.config.benchmark_size_mb,
            );
            if let Ok(results) = benchmark_runner.run_full(&resources).await {
                resources.benchmarks = Some(results);
            }
        }

        resources.scanned_at = chrono::Utc::now();
        Ok(resources)
    }

    /// Scan CPU information
    fn scan_cpu(&self) -> CpuInfo {
        let cpus = self.system.cpus();
        let global_cpu = self.system.global_cpu_info();

        let physical_cores = self.system.physical_core_count().unwrap_or(cpus.len());
        let logical_cores = cpus.len();

        // Get CPU model from first CPU
        let model = cpus.first().map(|c| c.brand().to_string()).unwrap_or_default();

        // Get frequency
        let frequency_mhz = global_cpu.frequency() as u32;

        // Get vendor
        let vendor = cpus
            .first()
            .map(|c| c.vendor_id().to_string())
            .unwrap_or_default();

        // Detect CPU features
        let features = self.detect_cpu_features();

        CpuInfo {
            physical_cores,
            logical_cores,
            architecture: CpuArchitecture::current(),
            model,
            frequency_mhz,
            features,
            vendor,
        }
    }

    /// Detect CPU features
    fn detect_cpu_features(&self) -> Vec<String> {
        let mut features = Vec::new();

        #[cfg(target_arch = "x86_64")]
        {
            if std::is_x86_feature_detected!("sse") {
                features.push("sse".to_string());
            }
            if std::is_x86_feature_detected!("sse2") {
                features.push("sse2".to_string());
            }
            if std::is_x86_feature_detected!("sse3") {
                features.push("sse3".to_string());
            }
            if std::is_x86_feature_detected!("sse4.1") {
                features.push("sse4.1".to_string());
            }
            if std::is_x86_feature_detected!("sse4.2") {
                features.push("sse4.2".to_string());
            }
            if std::is_x86_feature_detected!("avx") {
                features.push("avx".to_string());
            }
            if std::is_x86_feature_detected!("avx2") {
                features.push("avx2".to_string());
            }
            if std::is_x86_feature_detected!("aes") {
                features.push("aes".to_string());
            }
        }

        #[cfg(target_arch = "aarch64")]
        {
            // ARM features are harder to detect at runtime
            // but we can assume some common ones
            features.push("neon".to_string());
            features.push("fp".to_string());
            features.push("asimd".to_string());
        }

        features
    }

    /// Scan memory information
    fn scan_memory(&self) -> MemoryInfo {
        let total_bytes = self.system.total_memory();
        let available_bytes = self.system.available_memory();

        MemoryInfo {
            total_bytes,
            available_bytes,
            memory_type: MemoryType::Unknown, // Hard to detect without platform-specific APIs
            speed_mhz: None,
        }
    }

    /// Scan storage volumes
    async fn scan_storage(&self) -> Vec<StorageVolume> {
        let mut volumes = Vec::new();

        for disk in self.system.disks() {
            let path = disk.mount_point().to_path_buf();

            // Skip if we can't access this path
            if !path.exists() {
                continue;
            }

            // Skip virtual filesystems
            let fs_type = disk.file_system();
            let fs_str = String::from_utf8_lossy(fs_type);
            if ["proc", "sysfs", "devfs", "tmpfs", "devtmpfs"]
                .iter()
                .any(|&vfs| fs_str.contains(vfs))
            {
                continue;
            }

            let total_bytes = disk.total_space();
            let available_bytes = disk.available_space();

            // Detect if this is the system drive
            let is_system = path == PathBuf::from("/")
                || path.starts_with("/System")
                || path.to_string_lossy().starts_with("C:");

            // Initial storage class based on disk type
            let storage_class = if disk.is_removable() {
                StorageClass::Network
            } else {
                // Will be updated by benchmarks if run
                StorageClass::Unknown
            };

            volumes.push(StorageVolume {
                path,
                total_bytes,
                available_bytes,
                storage_class,
                mount_point: disk.mount_point().to_string_lossy().to_string(),
                filesystem: fs_str.to_string(),
                is_system,
                read_speed_mbps: None,
                write_speed_mbps: None,
                iops: None,
            });
        }

        // Also add configured paths if not already present
        for path in &self.config.storage_paths {
            if !volumes.iter().any(|v| v.path == *path) {
                if let Ok(metadata) = tokio::fs::metadata(path).await {
                    if metadata.is_dir() {
                        // Get disk info for this path
                        if let Some(disk) = self.system.disks().iter().find(|d| {
                            path.starts_with(d.mount_point())
                        }) {
                            volumes.push(StorageVolume {
                                path: path.clone(),
                                total_bytes: disk.total_space(),
                                available_bytes: disk.available_space(),
                                storage_class: StorageClass::Unknown,
                                mount_point: disk.mount_point().to_string_lossy().to_string(),
                                filesystem: String::from_utf8_lossy(disk.file_system()).to_string(),
                                is_system: false,
                                read_speed_mbps: None,
                                write_speed_mbps: None,
                                iops: None,
                            });
                        }
                    }
                }
            }
        }

        volumes
    }

    /// Scan network interfaces
    fn scan_network(&self) -> Vec<NetworkInterface> {
        let networks = self.system.networks();
        let mut interfaces = Vec::new();

        for (name, data) in networks {
            // Skip loopback
            if name == "lo" || name.starts_with("lo") {
                continue;
            }

            let received = data.total_received();
            let transmitted = data.total_transmitted();

            // Rough estimate of activity
            let is_up = received > 0 || transmitted > 0;

            interfaces.push(NetworkInterface {
                name: name.clone(),
                ip_address: None, // Would need additional crate for IP detection
                mac_address: Some(data.mac_address().to_string()),
                is_up,
                bandwidth_mbps: None, // Would need benchmarking
            });
        }

        interfaces
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_resource_scanner() {
        let mut scanner = ResourceScanner::new(
            "test-node".to_string(),
            ScanConfig::default(),
        );
        let resources = scanner.scan_all().await.unwrap();

        assert!(!resources.node_id.is_empty());
        assert!(resources.cpu.logical_cores > 0);
        assert!(resources.memory.total_bytes > 0);
    }
}
