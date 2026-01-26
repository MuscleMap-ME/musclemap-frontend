//! Worker node implementation

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Worker node
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkerNode {
    /// Node ID
    pub id: String,
    /// Node address (hostname:port)
    pub address: String,
    /// Current status
    pub status: WorkerStatus,
    /// Capabilities
    pub capabilities: WorkerCapabilities,
    /// Active task count
    pub active_tasks: usize,
    /// Tags for task routing
    pub tags: Vec<String>,
    /// Last heartbeat timestamp
    pub last_heartbeat: DateTime<Utc>,
    /// Node version
    pub version: String,
    /// Current CPU usage
    pub cpu_usage: f32,
    /// Current memory usage
    pub memory_usage: f32,
}

impl WorkerNode {
    /// Create a new worker node
    pub fn new(id: &str, address: &str, capabilities: WorkerCapabilities) -> Self {
        Self {
            id: id.to_string(),
            address: address.to_string(),
            status: WorkerStatus::Idle,
            capabilities,
            active_tasks: 0,
            tags: vec![],
            last_heartbeat: Utc::now(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            cpu_usage: 0.0,
            memory_usage: 0.0,
        }
    }

    /// Check if worker can accept more tasks
    pub fn can_accept_task(&self) -> bool {
        self.status != WorkerStatus::Offline &&
        self.status != WorkerStatus::Draining &&
        self.active_tasks < self.capabilities.max_concurrent_tasks
    }

    /// Calculate current load factor (0.0 - 1.0)
    pub fn load_factor(&self) -> f32 {
        let task_load = self.active_tasks as f32 / self.capabilities.max_concurrent_tasks.max(1) as f32;
        let cpu_load = self.cpu_usage / 100.0;
        let mem_load = self.memory_usage / 100.0;

        // Weighted average
        (task_load * 0.5 + cpu_load * 0.3 + mem_load * 0.2).min(1.0)
    }

    /// Check if worker has a specific capability
    pub fn has_capability(&self, capability: &str) -> bool {
        match capability {
            "rust" => self.capabilities.rust,
            "node" => self.capabilities.node,
            "python" => self.capabilities.python,
            "docker" => self.capabilities.docker,
            "gpu" => self.capabilities.gpu,
            _ => self.tags.contains(&capability.to_string()),
        }
    }
}

/// Worker status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkerStatus {
    /// Ready to accept tasks
    Idle,
    /// Running tasks
    Running,
    /// Not accepting new tasks, finishing current
    Draining,
    /// Offline
    Offline,
}

/// Worker capabilities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkerCapabilities {
    /// Maximum concurrent tasks
    #[serde(default = "default_max_tasks")]
    pub max_concurrent_tasks: usize,
    /// Total CPU cores
    #[serde(default = "default_cpu_cores")]
    pub cpu_cores: usize,
    /// Total memory (bytes)
    #[serde(default = "default_memory")]
    pub memory_bytes: u64,
    /// Available disk space (bytes)
    #[serde(default = "default_disk")]
    pub disk_bytes: u64,
    /// Supports Rust builds
    #[serde(default = "default_true")]
    pub rust: bool,
    /// Supports Node.js builds
    #[serde(default = "default_true")]
    pub node: bool,
    /// Supports Python builds
    #[serde(default)]
    pub python: bool,
    /// Has Docker available
    #[serde(default)]
    pub docker: bool,
    /// Has GPU available
    #[serde(default)]
    pub gpu: bool,
    /// Network bandwidth (bytes/sec)
    #[serde(default = "default_bandwidth")]
    pub network_bandwidth: u64,
}

fn default_max_tasks() -> usize { 4 }
fn default_cpu_cores() -> usize { 4 }
fn default_memory() -> u64 { 8 * 1024 * 1024 * 1024 } // 8 GB
fn default_disk() -> u64 { 100 * 1024 * 1024 * 1024 } // 100 GB
fn default_true() -> bool { true }
fn default_bandwidth() -> u64 { 100 * 1024 * 1024 } // 100 MB/s

impl Default for WorkerCapabilities {
    fn default() -> Self {
        Self {
            max_concurrent_tasks: default_max_tasks(),
            cpu_cores: default_cpu_cores(),
            memory_bytes: default_memory(),
            disk_bytes: default_disk(),
            rust: true,
            node: true,
            python: false,
            docker: false,
            gpu: false,
            network_bandwidth: default_bandwidth(),
        }
    }
}

impl WorkerCapabilities {
    /// Create capabilities from system info
    pub fn from_system() -> Self {
        use sysinfo::{System, SystemExt, DiskExt};

        let mut sys = System::new_all();
        sys.refresh_all();

        let cpu_cores = sys.cpus().len();
        let memory_bytes = sys.total_memory();
        let disk_bytes = sys.disks()
            .iter()
            .map(|d| d.available_space())
            .max()
            .unwrap_or(0);

        // Detect capabilities
        let rust = which::which("rustc").is_ok();
        let node = which::which("node").is_ok();
        let python = which::which("python3").is_ok() || which::which("python").is_ok();
        let docker = which::which("docker").is_ok();

        // Calculate max tasks based on resources
        let max_concurrent_tasks = (cpu_cores / 2).max(1).min(8);

        Self {
            max_concurrent_tasks,
            cpu_cores,
            memory_bytes,
            disk_bytes,
            rust,
            node,
            python,
            docker,
            gpu: false, // Would need specific GPU detection
            network_bandwidth: default_bandwidth(),
        }
    }
}

/// Module for finding executables
mod which {
    use std::env;
    use std::path::PathBuf;

    pub fn which(cmd: &str) -> Result<PathBuf, ()> {
        let path_var = env::var_os("PATH").ok_or(())?;

        for dir in env::split_paths(&path_var) {
            let candidate = dir.join(cmd);
            if candidate.exists() {
                return Ok(candidate);
            }

            #[cfg(windows)]
            {
                let candidate = dir.join(format!("{}.exe", cmd));
                if candidate.exists() {
                    return Ok(candidate);
                }
            }
        }

        Err(())
    }
}
