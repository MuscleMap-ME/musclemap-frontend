//! Cluster health monitoring

use std::collections::HashMap;
use std::sync::Arc;
use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};

use crate::BuildNetError;

/// Health status of a node
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NodeHealth {
    Healthy,
    Degraded,
    Unhealthy,
    Unknown,
}

/// Node status information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeStatus {
    /// Node identifier
    pub node_id: String,
    /// Node address (hostname:port)
    pub address: String,
    /// Current health status
    pub health: NodeHealth,
    /// CPU usage percentage
    pub cpu_percent: f32,
    /// Memory usage percentage
    pub memory_percent: f32,
    /// Disk usage percentage
    pub disk_percent: f32,
    /// Active builds count
    pub active_builds: u32,
    /// Maximum concurrent builds
    pub max_builds: u32,
    /// Last heartbeat timestamp
    pub last_heartbeat: DateTime<Utc>,
    /// Node version
    pub version: String,
    /// Tags for node selection
    pub tags: Vec<String>,
}

impl NodeStatus {
    /// Check if node is available for builds
    pub fn is_available(&self) -> bool {
        self.health == NodeHealth::Healthy && self.active_builds < self.max_builds
    }

    /// Calculate load factor (0.0 - 1.0)
    pub fn load_factor(&self) -> f32 {
        let cpu_load = self.cpu_percent / 100.0;
        let mem_load = self.memory_percent / 100.0;
        let build_load = self.active_builds as f32 / self.max_builds.max(1) as f32;

        // Weighted average
        (cpu_load * 0.3 + mem_load * 0.3 + build_load * 0.4).min(1.0)
    }
}

/// Cluster health summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterHealth {
    /// Overall cluster health
    pub status: NodeHealth,
    /// Total number of nodes
    pub total_nodes: usize,
    /// Number of healthy nodes
    pub healthy_nodes: usize,
    /// Number of degraded nodes
    pub degraded_nodes: usize,
    /// Number of unhealthy nodes
    pub unhealthy_nodes: usize,
    /// Total available build capacity
    pub available_capacity: u32,
    /// Total active builds
    pub active_builds: u32,
    /// Average CPU usage across cluster
    pub avg_cpu_percent: f32,
    /// Average memory usage across cluster
    pub avg_memory_percent: f32,
    /// Last update timestamp
    pub last_updated: DateTime<Utc>,
}

/// Cluster health monitor
pub struct ClusterMonitor {
    nodes: Arc<RwLock<HashMap<String, NodeStatus>>>,
    /// Heartbeat timeout in seconds
    heartbeat_timeout: u64,
}

impl ClusterMonitor {
    /// Create a new cluster monitor
    pub fn new(heartbeat_timeout: u64) -> Self {
        Self {
            nodes: Arc::new(RwLock::new(HashMap::new())),
            heartbeat_timeout,
        }
    }

    /// Register or update a node
    pub fn update_node(&self, status: NodeStatus) {
        let mut nodes = self.nodes.write();
        nodes.insert(status.node_id.clone(), status);
    }

    /// Remove a node from the cluster
    pub fn remove_node(&self, node_id: &str) -> Option<NodeStatus> {
        let mut nodes = self.nodes.write();
        nodes.remove(node_id)
    }

    /// Get status of a specific node
    pub fn get_node(&self, node_id: &str) -> Option<NodeStatus> {
        let nodes = self.nodes.read();
        nodes.get(node_id).cloned()
    }

    /// Get all nodes
    pub fn get_all_nodes(&self) -> Vec<NodeStatus> {
        let nodes = self.nodes.read();
        nodes.values().cloned().collect()
    }

    /// Get available nodes for builds
    pub fn get_available_nodes(&self) -> Vec<NodeStatus> {
        let now = Utc::now();
        let nodes = self.nodes.read();

        nodes.values()
            .filter(|n| {
                n.is_available() &&
                (now - n.last_heartbeat).num_seconds() < self.heartbeat_timeout as i64
            })
            .cloned()
            .collect()
    }

    /// Get nodes matching specific tags
    pub fn get_nodes_by_tags(&self, required_tags: &[String]) -> Vec<NodeStatus> {
        let nodes = self.nodes.read();

        nodes.values()
            .filter(|n| required_tags.iter().all(|tag| n.tags.contains(tag)))
            .cloned()
            .collect()
    }

    /// Select best node for a build
    pub fn select_best_node(&self, required_tags: &[String]) -> Option<NodeStatus> {
        let available = self.get_available_nodes();

        available.into_iter()
            .filter(|n| required_tags.iter().all(|tag| n.tags.contains(tag)))
            .min_by(|a, b| a.load_factor().partial_cmp(&b.load_factor()).unwrap())
    }

    /// Update node health based on heartbeat timeout
    pub fn check_heartbeats(&self) {
        let now = Utc::now();
        let mut nodes = self.nodes.write();

        for node in nodes.values_mut() {
            let seconds_since_heartbeat = (now - node.last_heartbeat).num_seconds();

            if seconds_since_heartbeat > self.heartbeat_timeout as i64 * 2 {
                node.health = NodeHealth::Unhealthy;
            } else if seconds_since_heartbeat > self.heartbeat_timeout as i64 {
                node.health = NodeHealth::Degraded;
            }
        }
    }

    /// Get cluster health summary
    pub fn get_cluster_health(&self) -> ClusterHealth {
        let nodes = self.nodes.read();
        let now = Utc::now();

        let total_nodes = nodes.len();
        let mut healthy_nodes = 0;
        let mut degraded_nodes = 0;
        let mut unhealthy_nodes = 0;
        let mut available_capacity = 0;
        let mut active_builds = 0;
        let mut total_cpu = 0.0;
        let mut total_memory = 0.0;

        for node in nodes.values() {
            match node.health {
                NodeHealth::Healthy => healthy_nodes += 1,
                NodeHealth::Degraded => degraded_nodes += 1,
                NodeHealth::Unhealthy => unhealthy_nodes += 1,
                NodeHealth::Unknown => {}
            }

            if node.health == NodeHealth::Healthy {
                available_capacity += node.max_builds - node.active_builds;
            }

            active_builds += node.active_builds;
            total_cpu += node.cpu_percent;
            total_memory += node.memory_percent;
        }

        let avg_cpu_percent = if total_nodes > 0 { total_cpu / total_nodes as f32 } else { 0.0 };
        let avg_memory_percent = if total_nodes > 0 { total_memory / total_nodes as f32 } else { 0.0 };

        let status = if unhealthy_nodes > total_nodes / 2 {
            NodeHealth::Unhealthy
        } else if degraded_nodes > 0 || unhealthy_nodes > 0 {
            NodeHealth::Degraded
        } else if total_nodes > 0 {
            NodeHealth::Healthy
        } else {
            NodeHealth::Unknown
        };

        ClusterHealth {
            status,
            total_nodes,
            healthy_nodes,
            degraded_nodes,
            unhealthy_nodes,
            available_capacity,
            active_builds,
            avg_cpu_percent,
            avg_memory_percent,
            last_updated: now,
        }
    }

    /// Generate alerts for cluster issues
    pub fn get_alerts(&self) -> Vec<ClusterAlert> {
        let health = self.get_cluster_health();
        let nodes = self.nodes.read();
        let mut alerts = Vec::new();

        // Cluster-level alerts
        if health.unhealthy_nodes > 0 {
            alerts.push(ClusterAlert {
                severity: AlertSeverity::Critical,
                message: format!("{} node(s) are unhealthy", health.unhealthy_nodes),
                timestamp: Utc::now(),
            });
        }

        if health.available_capacity == 0 && health.total_nodes > 0 {
            alerts.push(ClusterAlert {
                severity: AlertSeverity::Warning,
                message: "No build capacity available".to_string(),
                timestamp: Utc::now(),
            });
        }

        if health.avg_cpu_percent > 90.0 {
            alerts.push(ClusterAlert {
                severity: AlertSeverity::Warning,
                message: format!("High cluster CPU usage: {:.1}%", health.avg_cpu_percent),
                timestamp: Utc::now(),
            });
        }

        if health.avg_memory_percent > 90.0 {
            alerts.push(ClusterAlert {
                severity: AlertSeverity::Warning,
                message: format!("High cluster memory usage: {:.1}%", health.avg_memory_percent),
                timestamp: Utc::now(),
            });
        }

        // Node-level alerts
        for node in nodes.values() {
            if node.disk_percent > 90.0 {
                alerts.push(ClusterAlert {
                    severity: AlertSeverity::Warning,
                    message: format!("Low disk space on {}: {:.1}% used", node.node_id, node.disk_percent),
                    timestamp: Utc::now(),
                });
            }
        }

        alerts
    }
}

/// Alert severity level
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AlertSeverity {
    Info,
    Warning,
    Critical,
}

/// Cluster alert
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterAlert {
    pub severity: AlertSeverity,
    pub message: String,
    pub timestamp: DateTime<Utc>,
}
