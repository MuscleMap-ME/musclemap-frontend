//! System monitoring utilities

use serde::Serialize;

/// System information
#[derive(Debug, Clone, Serialize)]
pub struct SystemInfo {
    /// Hostname
    pub hostname: String,
    /// Operating system
    pub os: String,
    /// OS version
    pub os_version: String,
    /// Kernel version
    pub kernel_version: String,
    /// CPU count
    pub cpu_count: usize,
    /// Total memory (bytes)
    pub total_memory: u64,
    /// CPU brand
    pub cpu_brand: String,
}

impl SystemInfo {
    /// Get current system information
    pub fn current() -> Self {
        use sysinfo::{System, SystemExt, CpuExt};

        let mut sys = System::new_all();
        sys.refresh_all();

        Self {
            hostname: sys.host_name().unwrap_or_else(|| "unknown".into()),
            os: sys.name().unwrap_or_else(|| "unknown".into()),
            os_version: sys.os_version().unwrap_or_else(|| "unknown".into()),
            kernel_version: sys.kernel_version().unwrap_or_else(|| "unknown".into()),
            cpu_count: sys.cpus().len(),
            total_memory: sys.total_memory(),
            cpu_brand: sys.cpus().first().map(|c| c.brand().to_string()).unwrap_or_else(|| "unknown".into()),
        }
    }
}

/// Process information
#[derive(Debug, Clone, Serialize)]
pub struct ProcessInfo {
    /// Process ID
    pub pid: u32,
    /// Memory usage (bytes)
    pub memory: u64,
    /// CPU usage percentage
    pub cpu_percent: f32,
    /// Process uptime (seconds)
    pub uptime_secs: u64,
}

impl ProcessInfo {
    /// Get current process information
    pub fn current() -> Self {
        use sysinfo::{ProcessExt, System, SystemExt, Pid};

        let mut sys = System::new_all();
        sys.refresh_all();

        let pid = std::process::id();
        let process = sys.process(Pid::from(pid as usize));

        match process {
            Some(p) => Self {
                pid,
                memory: p.memory(),
                cpu_percent: p.cpu_usage(),
                uptime_secs: p.run_time(),
            },
            None => Self {
                pid,
                memory: 0,
                cpu_percent: 0.0,
                uptime_secs: 0,
            },
        }
    }
}
