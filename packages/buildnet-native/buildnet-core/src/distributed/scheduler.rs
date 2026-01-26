//! Distributed build scheduler

use std::collections::HashMap;
use std::sync::Arc;
use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};

use super::{
    ClusterState, DistributedBuild, DistributedBuildStatus, TaskStatus,
    WorkerNode, WorkerStatus,
    protocol::{BuildTask, TaskResult},
};
use crate::notifications::Priority;

/// Scheduling strategy
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SchedulingStrategy {
    /// Round-robin across workers
    RoundRobin,
    /// Least loaded worker first
    #[default]
    LeastLoaded,
    /// Prefer workers with cached artifacts
    CacheAffinity,
    /// Random selection
    Random,
    /// Best fit based on requirements
    BestFit,
}

/// Distributed build orchestrator
pub struct DistributedOrchestrator {
    /// Cluster state
    state: Arc<ClusterState>,
    /// Scheduling strategy
    strategy: RwLock<SchedulingStrategy>,
    /// Round-robin counter
    rr_counter: RwLock<usize>,
    /// Build queue by priority
    queues: RwLock<HashMap<Priority, Vec<String>>>,
    /// Task retries (task_id -> retry_count)
    retries: RwLock<HashMap<String, u32>>,
    /// Maximum retries
    max_retries: u32,
}

impl DistributedOrchestrator {
    /// Create a new distributed orchestrator
    pub fn new(state: Arc<ClusterState>, max_retries: u32) -> Self {
        let mut queues = HashMap::new();
        for priority in [Priority::Critical, Priority::High, Priority::Medium, Priority::Low] {
            queues.insert(priority, Vec::new());
        }

        Self {
            state,
            strategy: RwLock::new(SchedulingStrategy::LeastLoaded),
            rr_counter: RwLock::new(0),
            queues: RwLock::new(queues),
            retries: RwLock::new(HashMap::new()),
            max_retries,
        }
    }

    /// Set scheduling strategy
    pub fn set_strategy(&self, strategy: SchedulingStrategy) {
        *self.strategy.write() = strategy;
    }

    /// Submit a build
    pub fn submit_build(&self, build: DistributedBuild) -> String {
        let id = build.id.clone();
        let priority = build.priority;

        // Register with cluster state
        self.state.submit_build(build);

        // Add to queue
        {
            let mut queues = self.queues.write();
            if let Some(queue) = queues.get_mut(&priority) {
                queue.push(id.clone());
            }
        }

        id
    }

    /// Schedule pending tasks
    pub async fn schedule(&self) -> Vec<ScheduledTask> {
        let mut scheduled = Vec::new();
        let available_workers = self.state.get_available_workers();

        if available_workers.is_empty() {
            return scheduled;
        }

        // Process queues by priority
        for priority in [Priority::Critical, Priority::High, Priority::Medium, Priority::Low] {
            let build_ids: Vec<String> = {
                let queues = self.queues.read();
                queues.get(&priority).cloned().unwrap_or_default()
            };

            for build_id in build_ids {
                if let Some(build) = self.state.get_build(&build_id) {
                    if build.status != DistributedBuildStatus::Running {
                        continue;
                    }

                    // Get completed task IDs
                    let completed: Vec<String> = build.tasks.iter()
                        .filter(|t| t.status == TaskStatus::Completed)
                        .map(|t| t.id.clone())
                        .collect();

                    // Get ready tasks
                    let ready_tasks = build.get_ready_tasks(&completed);

                    for task in ready_tasks {
                        if let Some(worker) = self.select_worker(&available_workers, task) {
                            // Assign task
                            self.state.assign_task(&task.id, &worker.id);

                            scheduled.push(ScheduledTask {
                                task: task.clone(),
                                worker_id: worker.id.clone(),
                                worker_address: worker.address.clone(),
                            });
                        }
                    }
                }
            }
        }

        scheduled
    }

    /// Select best worker for a task
    fn select_worker(&self, workers: &[WorkerNode], task: &BuildTask) -> Option<WorkerNode> {
        let strategy = *self.strategy.read();

        // Filter workers that can handle the task
        let capable_workers: Vec<&WorkerNode> = workers.iter()
            .filter(|w| w.can_accept_task())
            .filter(|w| task.required_capabilities.iter().all(|c| w.has_capability(c)))
            .collect();

        if capable_workers.is_empty() {
            return None;
        }

        match strategy {
            SchedulingStrategy::RoundRobin => {
                let mut counter = self.rr_counter.write();
                let worker = capable_workers[*counter % capable_workers.len()];
                *counter = (*counter + 1) % capable_workers.len();
                Some(worker.clone())
            }
            SchedulingStrategy::LeastLoaded => {
                capable_workers.iter()
                    .min_by(|a, b| a.load_factor().partial_cmp(&b.load_factor()).unwrap())
                    .map(|w| (*w).clone())
            }
            SchedulingStrategy::CacheAffinity => {
                // Prefer worker that has built this package before
                // For now, fall back to least loaded
                capable_workers.iter()
                    .min_by(|a, b| a.load_factor().partial_cmp(&b.load_factor()).unwrap())
                    .map(|w| (*w).clone())
            }
            SchedulingStrategy::Random => {
                use std::collections::hash_map::DefaultHasher;
                use std::hash::{Hash, Hasher};

                let mut hasher = DefaultHasher::new();
                Utc::now().timestamp_nanos_opt().unwrap_or(0).hash(&mut hasher);
                let index = hasher.finish() as usize % capable_workers.len();
                Some(capable_workers[index].clone())
            }
            SchedulingStrategy::BestFit => {
                // Score workers based on resource match
                capable_workers.iter()
                    .max_by(|a, b| {
                        let score_a = self.score_worker(a, task);
                        let score_b = self.score_worker(b, task);
                        score_a.partial_cmp(&score_b).unwrap()
                    })
                    .map(|w| (*w).clone())
            }
        }
    }

    /// Score a worker for a task (higher is better)
    fn score_worker(&self, worker: &WorkerNode, task: &BuildTask) -> f64 {
        let mut score = 100.0;

        // Penalize high load
        score -= worker.load_factor() as f64 * 50.0;

        // Bonus for matching capabilities
        let capability_match = task.required_capabilities.iter()
            .filter(|c| worker.has_capability(c))
            .count();
        score += capability_match as f64 * 10.0;

        // Bonus for having resources available
        let cpu_headroom = 1.0 - (worker.cpu_usage / 100.0) as f64;
        let mem_headroom = 1.0 - (worker.memory_usage / 100.0) as f64;
        score += (cpu_headroom + mem_headroom) * 20.0;

        score.max(0.0)
    }

    /// Handle task completion
    pub fn handle_task_result(&self, result: TaskResult) {
        let task_id = result.task_id.clone();

        if result.success {
            self.state.complete_task(result);
            self.retries.write().remove(&task_id);
        } else {
            // Check retry count
            let should_retry = {
                let mut retries = self.retries.write();
                let count = retries.entry(task_id.clone()).or_insert(0);
                *count += 1;
                *count <= self.max_retries
            };

            if should_retry {
                // Reset task status to pending for reschedule
                tracing::info!("Retrying task {}", task_id);
            } else {
                // Mark as failed
                self.state.complete_task(result);
                self.retries.write().remove(&task_id);
            }
        }
    }

    /// Handle worker failure
    pub fn handle_worker_failure(&self, worker_id: &str) {
        // Get tasks assigned to this worker
        // For now, just log - would need to reassign tasks
        tracing::warn!("Worker {} failed", worker_id);
    }

    /// Implement work stealing
    pub fn steal_work(&self, from_worker_id: &str, to_worker_id: &str) -> Option<BuildTask> {
        // This would steal a pending task from one worker to another
        // Implementation would depend on task queue structure
        tracing::debug!("Work stealing from {} to {}", from_worker_id, to_worker_id);
        None
    }

    /// Get queue statistics
    pub fn get_queue_stats(&self) -> QueueStats {
        let queues = self.queues.read();

        QueueStats {
            critical_pending: queues.get(&Priority::Critical).map_or(0, |q| q.len()),
            high_pending: queues.get(&Priority::High).map_or(0, |q| q.len()),
            medium_pending: queues.get(&Priority::Medium).map_or(0, |q| q.len()),
            low_pending: queues.get(&Priority::Low).map_or(0, |q| q.len()),
        }
    }

    /// Get cluster state reference
    pub fn cluster_state(&self) -> &Arc<ClusterState> {
        &self.state
    }
}

/// A task that has been scheduled to a worker
#[derive(Debug, Clone, Serialize)]
pub struct ScheduledTask {
    /// The task
    pub task: BuildTask,
    /// Assigned worker ID
    pub worker_id: String,
    /// Worker address
    pub worker_address: String,
}

/// Queue statistics
#[derive(Debug, Clone, Serialize)]
pub struct QueueStats {
    pub critical_pending: usize,
    pub high_pending: usize,
    pub medium_pending: usize,
    pub low_pending: usize,
}

impl QueueStats {
    /// Get total pending builds
    pub fn total_pending(&self) -> usize {
        self.critical_pending + self.high_pending + self.medium_pending + self.low_pending
    }
}
