//! CPU tier management

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;

use super::CpuConfig;

/// CPU priority tier
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CpuTier {
    /// High priority - time-sensitive builds
    High,
    /// Normal priority - regular builds
    Normal,
    /// Low priority - background builds
    Low,
    /// Idle - only run when system is idle
    Idle,
}

impl CpuTier {
    /// Get nice value for this tier (Unix)
    pub fn nice_value(&self) -> i32 {
        match self {
            CpuTier::High => -10,
            CpuTier::Normal => 0,
            CpuTier::Low => 10,
            CpuTier::Idle => 19,
        }
    }

    /// Get IO scheduling class (Unix)
    pub fn io_class(&self) -> &'static str {
        match self {
            CpuTier::High => "realtime",
            CpuTier::Normal => "best-effort",
            CpuTier::Low => "best-effort",
            CpuTier::Idle => "idle",
        }
    }
}

/// CPU allocation for a build
#[derive(Debug, Clone, Serialize)]
pub struct CpuAllocation {
    /// Allocation ID
    pub id: String,
    /// Assigned tier
    pub tier: CpuTier,
    /// Assigned CPU cores (if affinity enabled)
    pub cores: Vec<usize>,
    /// Process ID (once started)
    pub pid: Option<u32>,
}

/// CPU manager
pub struct CpuManager {
    config: CpuConfig,
    allocations: Arc<RwLock<HashMap<String, CpuAllocation>>>,
    /// Available high-priority cores
    high_cores: Arc<RwLock<Vec<usize>>>,
    /// Available normal-priority cores
    normal_cores: Arc<RwLock<Vec<usize>>>,
}

impl CpuManager {
    /// Create a new CPU manager
    pub fn new(config: CpuConfig) -> Self {
        // Initialize core pools
        let total_cores = num_cpus::get();
        let high_cores: Vec<usize> = (0..config.high_priority_cores.min(total_cores)).collect();
        let normal_start = config.high_priority_cores.min(total_cores);
        let normal_cores: Vec<usize> = (normal_start..total_cores.min(normal_start + config.normal_priority_cores)).collect();

        Self {
            config,
            allocations: Arc::new(RwLock::new(HashMap::new())),
            high_cores: Arc::new(RwLock::new(high_cores)),
            normal_cores: Arc::new(RwLock::new(normal_cores)),
        }
    }

    /// Allocate CPU resources for a build
    pub fn allocate(&self, id: &str, tier: CpuTier) -> Option<CpuAllocation> {
        let cores = if self.config.enable_affinity {
            self.get_cores_for_tier(tier)
        } else {
            vec![]
        };

        let allocation = CpuAllocation {
            id: id.to_string(),
            tier,
            cores,
            pid: None,
        };

        let mut allocations = self.allocations.write();
        allocations.insert(id.to_string(), allocation.clone());

        Some(allocation)
    }

    /// Release CPU allocation
    pub fn release(&self, id: &str) {
        let mut allocations = self.allocations.write();
        if let Some(allocation) = allocations.remove(id) {
            // Return cores to pool
            if self.config.enable_affinity {
                match allocation.tier {
                    CpuTier::High => {
                        let mut cores = self.high_cores.write();
                        cores.extend(allocation.cores);
                    }
                    CpuTier::Normal | CpuTier::Low | CpuTier::Idle => {
                        let mut cores = self.normal_cores.write();
                        cores.extend(allocation.cores);
                    }
                }
            }
        }
    }

    /// Get cores for a specific tier
    fn get_cores_for_tier(&self, tier: CpuTier) -> Vec<usize> {
        match tier {
            CpuTier::High => {
                let mut cores = self.high_cores.write();
                if let Some(core) = cores.pop() {
                    vec![core]
                } else {
                    vec![]
                }
            }
            CpuTier::Normal | CpuTier::Low | CpuTier::Idle => {
                let mut cores = self.normal_cores.write();
                if let Some(core) = cores.pop() {
                    vec![core]
                } else {
                    vec![]
                }
            }
        }
    }

    /// Set process priority based on tier
    #[cfg(unix)]
    pub fn set_process_priority(&self, pid: u32, tier: CpuTier) -> std::io::Result<()> {
        use nix::sys::resource::{setpriority, Priority, Which};
        use nix::unistd::Pid;

        let nice_value = tier.nice_value();
        setpriority(Which::Process, Pid::from_raw(pid as i32), nice_value)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

        Ok(())
    }

    #[cfg(not(unix))]
    pub fn set_process_priority(&self, _pid: u32, _tier: CpuTier) -> std::io::Result<()> {
        // Windows priority setting would go here
        Ok(())
    }

    /// Set CPU affinity for a process
    #[cfg(target_os = "linux")]
    pub fn set_cpu_affinity(&self, pid: u32, cores: &[usize]) -> std::io::Result<()> {
        use std::fs;

        let mask: u64 = cores.iter().fold(0, |acc, &core| acc | (1 << core));
        let path = format!("/proc/{}/cpuset", pid);

        // This is a simplified version - real implementation would use sched_setaffinity
        fs::write(&path, format!("{}", mask))
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
    }

    #[cfg(not(target_os = "linux"))]
    pub fn set_cpu_affinity(&self, _pid: u32, _cores: &[usize]) -> std::io::Result<()> {
        // macOS and Windows affinity setting would go here
        Ok(())
    }

    /// Get current allocations
    pub fn get_allocations(&self) -> Vec<CpuAllocation> {
        let allocations = self.allocations.read();
        allocations.values().cloned().collect()
    }

    /// Get allocation by ID
    pub fn get_allocation(&self, id: &str) -> Option<CpuAllocation> {
        let allocations = self.allocations.read();
        allocations.get(id).cloned()
    }

    /// Update allocation with PID
    pub fn set_pid(&self, id: &str, pid: u32) {
        let mut allocations = self.allocations.write();
        if let Some(allocation) = allocations.get_mut(id) {
            allocation.pid = Some(pid);
        }
    }

    /// Get available core counts
    pub fn available_cores(&self) -> (usize, usize) {
        let high = self.high_cores.read().len();
        let normal = self.normal_cores.read().len();
        (high, normal)
    }
}

/// Get the number of CPUs on the system
mod num_cpus {
    pub fn get() -> usize {
        std::thread::available_parallelism()
            .map(|p| p.get())
            .unwrap_or(4)
    }
}
