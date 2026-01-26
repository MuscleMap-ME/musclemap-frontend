//! Resource monitoring for BuildNet
//!
//! Monitor CPU, memory, disk, and cluster health.

pub mod system;
pub mod cluster;

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::notifications::{BuildNetEvent, NotificationRouter, Priority};

/// Resource thresholds configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceThresholds {
    /// CPU usage thresholds
    #[serde(default)]
    pub cpu: CpuThresholds,
    /// Memory usage thresholds
    #[serde(default)]
    pub memory: MemoryThresholds,
    /// Disk usage thresholds
    #[serde(default)]
    pub disk: Vec<DiskThreshold>,
}

impl Default for ResourceThresholds {
    fn default() -> Self {
        Self {
            cpu: CpuThresholds::default(),
            memory: MemoryThresholds::default(),
            disk: vec![DiskThreshold::default()],
        }
    }
}

/// CPU usage thresholds
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuThresholds {
    /// Warning threshold (percentage)
    #[serde(default = "default_cpu_warning")]
    pub warning: f64,
    /// Critical threshold (percentage)
    #[serde(default = "default_cpu_critical")]
    pub critical: f64,
}

fn default_cpu_warning() -> f64 { 70.0 }
fn default_cpu_critical() -> f64 { 90.0 }

impl Default for CpuThresholds {
    fn default() -> Self {
        Self {
            warning: default_cpu_warning(),
            critical: default_cpu_critical(),
        }
    }
}

/// Memory usage thresholds
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryThresholds {
    /// Warning threshold (percentage)
    #[serde(default = "default_memory_warning")]
    pub warning_percent: f64,
    /// Critical threshold (percentage)
    #[serde(default = "default_memory_critical")]
    pub critical_percent: f64,
}

fn default_memory_warning() -> f64 { 70.0 }
fn default_memory_critical() -> f64 { 90.0 }

impl Default for MemoryThresholds {
    fn default() -> Self {
        Self {
            warning_percent: default_memory_warning(),
            critical_percent: default_memory_critical(),
        }
    }
}

/// Disk usage threshold
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskThreshold {
    /// Path to monitor
    #[serde(default = "default_disk_path")]
    pub path: String,
    /// Warning threshold (percentage used)
    #[serde(default = "default_disk_warning")]
    pub warning: f64,
    /// Critical threshold (percentage used)
    #[serde(default = "default_disk_critical")]
    pub critical: f64,
}

fn default_disk_path() -> String { "/".into() }
fn default_disk_warning() -> f64 { 80.0 }
fn default_disk_critical() -> f64 { 95.0 }

impl Default for DiskThreshold {
    fn default() -> Self {
        Self {
            path: default_disk_path(),
            warning: default_disk_warning(),
            critical: default_disk_critical(),
        }
    }
}

/// Current resource usage
#[derive(Debug, Clone, Serialize)]
pub struct ResourceUsage {
    /// CPU usage percentage
    pub cpu_percent: f64,
    /// Memory usage percentage
    pub memory_percent: f64,
    /// Memory used (bytes)
    pub memory_used: u64,
    /// Memory total (bytes)
    pub memory_total: u64,
    /// Disk usage per path
    pub disk: Vec<DiskUsage>,
    /// Timestamp
    pub timestamp: DateTime<Utc>,
}

/// Disk usage for a path
#[derive(Debug, Clone, Serialize)]
pub struct DiskUsage {
    /// Path
    pub path: String,
    /// Usage percentage
    pub used_percent: f64,
    /// Used space (bytes)
    pub used: u64,
    /// Total space (bytes)
    pub total: u64,
    /// Available space (bytes)
    pub available: u64,
}

/// Resource monitor
pub struct ResourceMonitor {
    thresholds: ResourceThresholds,
    notification_router: Option<Arc<NotificationRouter>>,
    last_alerts: Arc<RwLock<std::collections::HashMap<String, DateTime<Utc>>>>,
    /// Minimum time between alerts for the same resource (seconds)
    alert_cooldown_secs: u64,
}

impl ResourceMonitor {
    /// Create a new resource monitor
    pub fn new(thresholds: ResourceThresholds) -> Self {
        Self {
            thresholds,
            notification_router: None,
            last_alerts: Arc::new(RwLock::new(std::collections::HashMap::new())),
            alert_cooldown_secs: 300, // 5 minutes
        }
    }

    /// Set the notification router
    pub fn set_notification_router(&mut self, router: Arc<NotificationRouter>) {
        self.notification_router = Some(router);
    }

    /// Get current resource usage
    pub fn get_usage(&self) -> ResourceUsage {
        use sysinfo::{System, Disks};

        let mut sys = System::new_all();
        sys.refresh_all();

        // CPU usage - average across all CPUs
        let cpu_percent = sys.cpus().iter()
            .map(|c| c.cpu_usage() as f64)
            .sum::<f64>() / sys.cpus().len().max(1) as f64;

        // Memory usage
        let memory_used = sys.used_memory();
        let memory_total = sys.total_memory();
        let memory_percent = if memory_total > 0 {
            (memory_used as f64 / memory_total as f64) * 100.0
        } else {
            0.0
        };

        // Disk usage
        let disks = Disks::new_with_refreshed_list();
        let disk: Vec<DiskUsage> = disks
            .iter()
            .filter(|d| {
                let mount = d.mount_point().to_string_lossy();
                self.thresholds.disk.iter().any(|t| t.path == mount.as_ref())
            })
            .map(|d| {
                let total = d.total_space();
                let available = d.available_space();
                let used = total.saturating_sub(available);
                let used_percent = if total > 0 {
                    (used as f64 / total as f64) * 100.0
                } else {
                    0.0
                };

                DiskUsage {
                    path: d.mount_point().to_string_lossy().to_string(),
                    used_percent,
                    used,
                    total,
                    available,
                }
            })
            .collect();

        ResourceUsage {
            cpu_percent,
            memory_percent,
            memory_used,
            memory_total,
            disk,
            timestamp: Utc::now(),
        }
    }

    /// Check thresholds and send alerts if needed
    pub async fn check_and_alert(&self) {
        let usage = self.get_usage();

        // Check CPU
        if usage.cpu_percent >= self.thresholds.cpu.critical {
            self.send_alert(
                "cpu_critical",
                BuildNetEvent::ResourceCpuHigh {
                    usage_percent: usage.cpu_percent,
                    threshold: self.thresholds.cpu.critical,
                    timestamp: Utc::now(),
                },
                Priority::Critical,
            ).await;
        } else if usage.cpu_percent >= self.thresholds.cpu.warning {
            self.send_alert(
                "cpu_warning",
                BuildNetEvent::ResourceCpuHigh {
                    usage_percent: usage.cpu_percent,
                    threshold: self.thresholds.cpu.warning,
                    timestamp: Utc::now(),
                },
                Priority::High,
            ).await;
        }

        // Check memory
        if usage.memory_percent >= self.thresholds.memory.critical_percent {
            self.send_alert(
                "memory_critical",
                BuildNetEvent::ResourceMemoryHigh {
                    usage_percent: usage.memory_percent,
                    threshold: self.thresholds.memory.critical_percent,
                    timestamp: Utc::now(),
                },
                Priority::Critical,
            ).await;
        } else if usage.memory_percent >= self.thresholds.memory.warning_percent {
            self.send_alert(
                "memory_warning",
                BuildNetEvent::ResourceMemoryHigh {
                    usage_percent: usage.memory_percent,
                    threshold: self.thresholds.memory.warning_percent,
                    timestamp: Utc::now(),
                },
                Priority::High,
            ).await;
        }

        // Check disk
        for disk in &usage.disk {
            let threshold = self.thresholds.disk
                .iter()
                .find(|t| t.path == disk.path);

            if let Some(threshold) = threshold {
                let available_percent = 100.0 - disk.used_percent;

                if disk.used_percent >= threshold.critical {
                    self.send_alert(
                        &format!("disk_critical_{}", disk.path),
                        BuildNetEvent::ResourceDiskLow {
                            path: disk.path.clone(),
                            available_percent,
                            threshold: 100.0 - threshold.critical,
                            timestamp: Utc::now(),
                        },
                        Priority::Critical,
                    ).await;
                } else if disk.used_percent >= threshold.warning {
                    self.send_alert(
                        &format!("disk_warning_{}", disk.path),
                        BuildNetEvent::ResourceDiskLow {
                            path: disk.path.clone(),
                            available_percent,
                            threshold: 100.0 - threshold.warning,
                            timestamp: Utc::now(),
                        },
                        Priority::High,
                    ).await;
                }
            }
        }
    }

    async fn send_alert(&self, key: &str, event: BuildNetEvent, priority: Priority) {
        // Check cooldown
        let mut last_alerts = self.last_alerts.write().await;
        let now = Utc::now();

        if let Some(last_alert) = last_alerts.get(key) {
            let elapsed = (now - *last_alert).num_seconds();
            if elapsed < self.alert_cooldown_secs as i64 {
                tracing::debug!("Alert {} on cooldown ({}/{}s)", key, elapsed, self.alert_cooldown_secs);
                return;
            }
        }

        // Send notification
        if let Some(router) = &self.notification_router {
            if let Err(e) = router.route(&event).await {
                tracing::error!("Failed to send resource alert: {}", e);
            }
        }

        // Update last alert time
        last_alerts.insert(key.to_string(), now);
    }

    /// Start monitoring loop
    pub async fn start_monitoring(self: Arc<Self>, interval_secs: u64) {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(interval_secs));

        loop {
            interval.tick().await;
            self.check_and_alert().await;
        }
    }
}

/// Prometheus metrics exporter
pub struct MetricsExporter {
    /// Collected metrics
    metrics: Arc<RwLock<Vec<Metric>>>,
}

/// A single metric
#[derive(Debug, Clone, Serialize)]
pub struct Metric {
    /// Metric name
    pub name: String,
    /// Metric type (counter, gauge, histogram)
    pub metric_type: String,
    /// Help text
    pub help: String,
    /// Labels
    pub labels: std::collections::HashMap<String, String>,
    /// Value
    pub value: f64,
}

impl MetricsExporter {
    /// Create a new metrics exporter
    pub fn new() -> Self {
        Self {
            metrics: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Record a metric
    pub async fn record(&self, metric: Metric) {
        let mut metrics = self.metrics.write().await;
        // Replace existing metric with same name and labels
        metrics.retain(|m| m.name != metric.name || m.labels != metric.labels);
        metrics.push(metric);
    }

    /// Export metrics in Prometheus format
    pub async fn export_prometheus(&self) -> String {
        let metrics = self.metrics.read().await;
        let mut output = String::new();

        for metric in metrics.iter() {
            output.push_str(&format!("# HELP {} {}\n", metric.name, metric.help));
            output.push_str(&format!("# TYPE {} {}\n", metric.name, metric.metric_type));

            let labels_str = if metric.labels.is_empty() {
                String::new()
            } else {
                let labels: Vec<String> = metric.labels
                    .iter()
                    .map(|(k, v)| format!("{}=\"{}\"", k, v))
                    .collect();
                format!("{{{}}}", labels.join(","))
            };

            output.push_str(&format!("{}{} {}\n", metric.name, labels_str, metric.value));
        }

        output
    }

    /// Record BuildNet-specific metrics
    pub async fn record_build_metrics(
        &self,
        total_builds: u64,
        successful_builds: u64,
        failed_builds: u64,
        cache_size_bytes: u64,
        avg_build_time_ms: u64,
    ) {
        self.record(Metric {
            name: "buildnet_builds_total".into(),
            metric_type: "counter".into(),
            help: "Total number of builds".into(),
            labels: std::collections::HashMap::new(),
            value: total_builds as f64,
        }).await;

        self.record(Metric {
            name: "buildnet_builds_successful".into(),
            metric_type: "counter".into(),
            help: "Number of successful builds".into(),
            labels: std::collections::HashMap::new(),
            value: successful_builds as f64,
        }).await;

        self.record(Metric {
            name: "buildnet_builds_failed".into(),
            metric_type: "counter".into(),
            help: "Number of failed builds".into(),
            labels: std::collections::HashMap::new(),
            value: failed_builds as f64,
        }).await;

        self.record(Metric {
            name: "buildnet_cache_size_bytes".into(),
            metric_type: "gauge".into(),
            help: "Cache size in bytes".into(),
            labels: std::collections::HashMap::new(),
            value: cache_size_bytes as f64,
        }).await;

        self.record(Metric {
            name: "buildnet_build_duration_avg_ms".into(),
            metric_type: "gauge".into(),
            help: "Average build duration in milliseconds".into(),
            labels: std::collections::HashMap::new(),
            value: avg_build_time_ms as f64,
        }).await;
    }
}

impl Default for MetricsExporter {
    fn default() -> Self {
        Self::new()
    }
}
