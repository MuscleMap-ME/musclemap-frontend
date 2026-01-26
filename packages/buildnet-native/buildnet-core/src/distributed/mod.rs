//! Distributed Build Orchestration
//!
//! Multi-node build coordination, work stealing, and fault tolerance.

pub mod worker;
pub mod scheduler;
pub mod protocol;

pub use worker::{WorkerNode, WorkerStatus, WorkerCapabilities};
pub use scheduler::{DistributedOrchestrator, SchedulingStrategy};
pub use protocol::{BuildTask, TaskResult, NodeMessage};

use std::collections::HashMap;
use std::sync::Arc;
use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::notifications::Priority;

/// Distributed build configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistributedConfig {
    /// This node's ID
    pub node_id: String,
    /// This node's address
    pub node_address: String,
    /// Discovery method
    #[serde(default)]
    pub discovery: DiscoveryConfig,
    /// Work stealing enabled
    #[serde(default = "default_true")]
    pub enable_work_stealing: bool,
    /// Task timeout (seconds)
    #[serde(default = "default_task_timeout")]
    pub task_timeout_secs: u64,
    /// Heartbeat interval (seconds)
    #[serde(default = "default_heartbeat_interval")]
    pub heartbeat_interval_secs: u64,
    /// Maximum retries for failed tasks
    #[serde(default = "default_max_retries")]
    pub max_task_retries: u32,
}

fn default_true() -> bool { true }
fn default_task_timeout() -> u64 { 600 } // 10 minutes
fn default_heartbeat_interval() -> u64 { 10 }
fn default_max_retries() -> u32 { 3 }

impl Default for DistributedConfig {
    fn default() -> Self {
        Self {
            node_id: Uuid::new_v4().to_string(),
            node_address: "localhost:9876".into(),
            discovery: DiscoveryConfig::default(),
            enable_work_stealing: true,
            task_timeout_secs: default_task_timeout(),
            heartbeat_interval_secs: default_heartbeat_interval(),
            max_task_retries: default_max_retries(),
        }
    }
}

/// Node discovery configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveryConfig {
    /// Discovery method
    #[serde(default)]
    pub method: DiscoveryMethod,
    /// Static node list (for static discovery)
    #[serde(default)]
    pub static_nodes: Vec<String>,
    /// DNS name (for DNS discovery)
    pub dns_name: Option<String>,
    /// Consul address (for Consul discovery)
    pub consul_address: Option<String>,
    /// etcd endpoints (for etcd discovery)
    #[serde(default)]
    pub etcd_endpoints: Vec<String>,
}

impl Default for DiscoveryConfig {
    fn default() -> Self {
        Self {
            method: DiscoveryMethod::Static,
            static_nodes: vec![],
            dns_name: None,
            consul_address: None,
            etcd_endpoints: vec![],
        }
    }
}

/// Discovery method
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DiscoveryMethod {
    /// Static node list
    #[default]
    Static,
    /// DNS-based discovery
    Dns,
    /// Consul service discovery
    Consul,
    /// etcd service discovery
    Etcd,
    /// Kubernetes service discovery
    Kubernetes,
}

/// Build job for distributed execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistributedBuild {
    /// Build ID
    pub id: String,
    /// Root package being built
    pub root_package: String,
    /// All packages in dependency order
    pub packages: Vec<String>,
    /// Build tasks
    pub tasks: Vec<BuildTask>,
    /// Task dependencies (task_id -> [dependency_ids])
    pub dependencies: HashMap<String, Vec<String>>,
    /// Build status
    pub status: DistributedBuildStatus,
    /// Priority
    pub priority: Priority,
    /// Created at
    pub created_at: DateTime<Utc>,
    /// Started at
    pub started_at: Option<DateTime<Utc>>,
    /// Completed at
    pub completed_at: Option<DateTime<Utc>>,
    /// Error message if failed
    pub error: Option<String>,
}

impl DistributedBuild {
    /// Create a new distributed build
    pub fn new(root_package: &str, packages: Vec<String>, priority: Priority) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            root_package: root_package.to_string(),
            packages,
            tasks: vec![],
            dependencies: HashMap::new(),
            status: DistributedBuildStatus::Pending,
            priority,
            created_at: Utc::now(),
            started_at: None,
            completed_at: None,
            error: None,
        }
    }

    /// Get ready tasks (all dependencies completed)
    pub fn get_ready_tasks(&self, completed: &[String]) -> Vec<&BuildTask> {
        self.tasks.iter()
            .filter(|t| {
                t.status == TaskStatus::Pending &&
                self.dependencies.get(&t.id)
                    .map_or(true, |deps| deps.iter().all(|d| completed.contains(d)))
            })
            .collect()
    }
}

/// Distributed build status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DistributedBuildStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

/// Task status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Pending,
    Assigned,
    Running,
    Completed,
    Failed,
    Cancelled,
}

/// Cluster state
pub struct ClusterState {
    /// Active builds
    builds: Arc<RwLock<HashMap<String, DistributedBuild>>>,
    /// Worker nodes
    workers: Arc<RwLock<HashMap<String, WorkerNode>>>,
    /// Task assignments (task_id -> worker_id)
    assignments: Arc<RwLock<HashMap<String, String>>>,
    /// Completed tasks
    completed_tasks: Arc<RwLock<HashMap<String, TaskResult>>>,
}

impl ClusterState {
    /// Create new cluster state
    pub fn new() -> Self {
        Self {
            builds: Arc::new(RwLock::new(HashMap::new())),
            workers: Arc::new(RwLock::new(HashMap::new())),
            assignments: Arc::new(RwLock::new(HashMap::new())),
            completed_tasks: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Register a worker
    pub fn register_worker(&self, worker: WorkerNode) {
        let mut workers = self.workers.write();
        workers.insert(worker.id.clone(), worker);
    }

    /// Unregister a worker
    pub fn unregister_worker(&self, worker_id: &str) -> Option<WorkerNode> {
        let mut workers = self.workers.write();
        workers.remove(worker_id)
    }

    /// Update worker status
    pub fn update_worker(&self, worker_id: &str, status: WorkerStatus) {
        let mut workers = self.workers.write();
        if let Some(worker) = workers.get_mut(worker_id) {
            worker.status = status;
            worker.last_heartbeat = Utc::now();
        }
    }

    /// Get available workers
    pub fn get_available_workers(&self) -> Vec<WorkerNode> {
        let workers = self.workers.read();
        workers.values()
            .filter(|w| w.status == WorkerStatus::Idle || w.status == WorkerStatus::Running)
            .filter(|w| w.active_tasks < w.capabilities.max_concurrent_tasks)
            .cloned()
            .collect()
    }

    /// Submit a build
    pub fn submit_build(&self, build: DistributedBuild) -> String {
        let id = build.id.clone();
        let mut builds = self.builds.write();
        builds.insert(id.clone(), build);
        id
    }

    /// Get build status
    pub fn get_build(&self, build_id: &str) -> Option<DistributedBuild> {
        let builds = self.builds.read();
        builds.get(build_id).cloned()
    }

    /// Assign task to worker
    pub fn assign_task(&self, task_id: &str, worker_id: &str) {
        let mut assignments = self.assignments.write();
        assignments.insert(task_id.to_string(), worker_id.to_string());

        // Increment worker's active task count
        let mut workers = self.workers.write();
        if let Some(worker) = workers.get_mut(worker_id) {
            worker.active_tasks += 1;
            worker.status = WorkerStatus::Running;
        }
    }

    /// Complete a task
    pub fn complete_task(&self, result: TaskResult) {
        let task_id = result.task_id.clone();

        // Store result
        {
            let mut completed = self.completed_tasks.write();
            completed.insert(task_id.clone(), result);
        }

        // Update assignment
        let worker_id = {
            let mut assignments = self.assignments.write();
            assignments.remove(&task_id)
        };

        // Decrement worker's active task count
        if let Some(worker_id) = worker_id {
            let mut workers = self.workers.write();
            if let Some(worker) = workers.get_mut(&worker_id) {
                worker.active_tasks = worker.active_tasks.saturating_sub(1);
                if worker.active_tasks == 0 {
                    worker.status = WorkerStatus::Idle;
                }
            }
        }
    }

    /// Get cluster statistics
    pub fn get_stats(&self) -> ClusterStats {
        let workers = self.workers.read();
        let builds = self.builds.read();
        let completed = self.completed_tasks.read();

        let active_workers = workers.values()
            .filter(|w| w.status != WorkerStatus::Offline)
            .count();

        let total_capacity: usize = workers.values()
            .map(|w| w.capabilities.max_concurrent_tasks)
            .sum();

        let active_tasks: usize = workers.values()
            .map(|w| w.active_tasks)
            .sum();

        let pending_builds = builds.values()
            .filter(|b| b.status == DistributedBuildStatus::Pending)
            .count();

        let running_builds = builds.values()
            .filter(|b| b.status == DistributedBuildStatus::Running)
            .count();

        ClusterStats {
            total_workers: workers.len(),
            active_workers,
            total_capacity,
            active_tasks,
            pending_builds,
            running_builds,
            completed_tasks: completed.len(),
        }
    }
}

impl Default for ClusterState {
    fn default() -> Self {
        Self::new()
    }
}

/// Cluster statistics
#[derive(Debug, Clone, Serialize)]
pub struct ClusterStats {
    pub total_workers: usize,
    pub active_workers: usize,
    pub total_capacity: usize,
    pub active_tasks: usize,
    pub pending_builds: usize,
    pub running_builds: usize,
    pub completed_tasks: usize,
}

impl ClusterStats {
    /// Calculate utilization percentage
    pub fn utilization_percent(&self) -> f64 {
        if self.total_capacity > 0 {
            (self.active_tasks as f64 / self.total_capacity as f64) * 100.0
        } else {
            0.0
        }
    }
}
