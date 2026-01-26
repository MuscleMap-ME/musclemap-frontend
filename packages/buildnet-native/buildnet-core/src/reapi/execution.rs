//! Remote Execution Service
//!
//! Executes build actions remotely and returns results.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

use crate::{BuildNetError, Result};
use super::digest::Digest;
use super::action_cache::{ActionResult, ExecutionMetadata};
use super::{Action, ExecutionStage, Platform};

/// Execution service
pub struct ExecutionService {
    /// Configuration
    config: ExecutionConfig,
    /// Pending executions
    pending: Arc<RwLock<HashMap<String, ExecutionState>>>,
    /// Execution queue
    queue: Arc<RwLock<Vec<QueuedExecution>>>,
    /// Active executions count
    active_count: Arc<RwLock<usize>>,
}

/// Execution configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionConfig {
    /// Maximum concurrent executions
    pub max_concurrent: usize,
    /// Default timeout in seconds
    pub default_timeout_secs: u64,
    /// Maximum timeout in seconds
    pub max_timeout_secs: u64,
    /// Allow custom platforms
    pub allow_custom_platforms: bool,
}

impl Default for ExecutionConfig {
    fn default() -> Self {
        Self {
            max_concurrent: 10,
            default_timeout_secs: 600,
            max_timeout_secs: 3600,
            allow_custom_platforms: true,
        }
    }
}

/// Execution request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionRequest {
    /// Instance name
    pub instance_name: String,
    /// Action digest
    pub action_digest: Digest,
    /// Action (optional, for inline actions)
    pub action: Option<Action>,
    /// Skip cache lookup
    pub skip_cache_lookup: bool,
    /// Execution policy
    pub execution_policy: Option<ExecutionPolicy>,
    /// Results caching policy
    pub results_cache_policy: Option<ResultsCachePolicy>,
}

/// Execution policy
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExecutionPolicy {
    /// Priority (lower = higher priority)
    pub priority: i32,
}

/// Results cache policy
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ResultsCachePolicy {
    /// Priority for cache writes (0 = highest)
    pub priority: i32,
}

/// Execution response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResponse {
    /// Execution ID
    pub id: String,
    /// Action digest
    pub action_digest: Digest,
    /// Current stage
    pub stage: ExecutionStage,
    /// Result (if completed)
    pub result: Option<ActionResult>,
    /// Error message (if failed)
    pub error: Option<String>,
    /// Queued timestamp
    pub queued_at: DateTime<Utc>,
    /// Started timestamp
    pub started_at: Option<DateTime<Utc>>,
    /// Completed timestamp
    pub completed_at: Option<DateTime<Utc>>,
}

/// Internal execution state
struct ExecutionState {
    /// Request
    request: ExecutionRequest,
    /// Current stage
    stage: ExecutionStage,
    /// Result
    result: Option<ActionResult>,
    /// Error
    error: Option<String>,
    /// Timestamps
    queued_at: DateTime<Utc>,
    started_at: Option<DateTime<Utc>>,
    completed_at: Option<DateTime<Utc>>,
}

/// Queued execution
struct QueuedExecution {
    /// Execution ID
    id: String,
    /// Request
    request: ExecutionRequest,
    /// Priority
    priority: i32,
    /// Queued time
    queued_at: DateTime<Utc>,
}

impl ExecutionService {
    /// Create a new execution service
    pub fn new(config: ExecutionConfig) -> Self {
        Self {
            config,
            pending: Arc::new(RwLock::new(HashMap::new())),
            queue: Arc::new(RwLock::new(Vec::new())),
            active_count: Arc::new(RwLock::new(0)),
        }
    }

    /// Execute an action
    pub async fn execute(&self, request: ExecutionRequest) -> Result<ExecutionResponse> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = Utc::now();

        // Create initial state
        let state = ExecutionState {
            request: request.clone(),
            stage: ExecutionStage::Queued,
            result: None,
            error: None,
            queued_at: now,
            started_at: None,
            completed_at: None,
        };

        // Store in pending
        {
            let mut pending = self.pending.write();
            pending.insert(id.clone(), state);
        }

        // Check if we can execute immediately
        let can_execute = {
            let active = self.active_count.read();
            *active < self.config.max_concurrent
        };

        if can_execute {
            // Execute directly
            self.execute_action(&id).await;
        } else {
            // Queue for later
            let priority = request.execution_policy
                .as_ref()
                .map(|p| p.priority)
                .unwrap_or(0);

            let mut queue = self.queue.write();
            queue.push(QueuedExecution {
                id: id.clone(),
                request,
                priority,
                queued_at: now,
            });

            // Sort by priority (lower = higher priority)
            queue.sort_by_key(|q| q.priority);
        }

        // Return current state
        self.get_execution(&id).await
    }

    /// Get execution status
    pub async fn get_execution(&self, id: &str) -> Result<ExecutionResponse> {
        let pending = self.pending.read();
        let state = pending.get(id)
            .ok_or_else(|| BuildNetError::Internal(anyhow::anyhow!("Execution not found")))?;

        Ok(ExecutionResponse {
            id: id.to_string(),
            action_digest: state.request.action_digest.clone(),
            stage: state.stage,
            result: state.result.clone(),
            error: state.error.clone(),
            queued_at: state.queued_at,
            started_at: state.started_at,
            completed_at: state.completed_at,
        })
    }

    /// Cancel an execution
    pub async fn cancel(&self, id: &str) -> Result<bool> {
        // Remove from queue if present
        {
            let mut queue = self.queue.write();
            if let Some(pos) = queue.iter().position(|q| q.id == id) {
                queue.remove(pos);
            }
        }

        // Update state if pending
        {
            let mut pending = self.pending.write();
            if let Some(state) = pending.get_mut(id) {
                if state.completed_at.is_none() {
                    state.stage = ExecutionStage::Completed;
                    state.error = Some("Cancelled".to_string());
                    state.completed_at = Some(Utc::now());
                    return Ok(true);
                }
            }
        }

        Ok(false)
    }

    /// Execute a queued action (internal implementation for spawning)
    async fn execute_action_internal(&self, id: &str) {
        // Increment active count
        {
            let mut count = self.active_count.write();
            *count += 1;
        }

        let start = Instant::now();

        // Update state to executing
        {
            let mut pending = self.pending.write();
            if let Some(state) = pending.get_mut(id) {
                state.stage = ExecutionStage::Executing;
                state.started_at = Some(Utc::now());
            }
        }

        // Simulate execution (in real implementation, this would run the command)
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;

        let execution_time = start.elapsed().as_millis() as u64;

        // Create result
        let result = ActionResult {
            output_files: vec![],
            output_directories: vec![],
            exit_code: 0,
            stdout_digest: None,
            stderr_digest: None,
            stdout_raw: Some(b"Build successful".to_vec()),
            stderr_raw: None,
            execution_metadata: ExecutionMetadata {
                worker: Some("buildnet-worker".to_string()),
                queued_ms: 0,
                worker_ms: execution_time,
                input_fetch_ms: 0,
                execution_ms: execution_time,
                output_upload_ms: 0,
                virtual_execution_timestamp: Some(Utc::now()),
            },
        };

        // Update state to completed
        {
            let mut pending = self.pending.write();
            if let Some(state) = pending.get_mut(id) {
                state.stage = ExecutionStage::Completed;
                state.result = Some(result);
                state.completed_at = Some(Utc::now());
            }
        }

        // Decrement active count
        {
            let mut count = self.active_count.write();
            *count -= 1;
        }

        // Process queue (synchronous call)
        self.process_queue();
    }

    /// Execute a queued action (public wrapper)
    pub async fn execute_action(&self, id: &str) {
        self.execute_action_internal(id).await;
    }

    /// Process queued executions
    fn process_queue(&self) {
        loop {
            let can_execute = {
                let active = self.active_count.read();
                *active < self.config.max_concurrent
            };

            if !can_execute {
                break;
            }

            let next = {
                let mut queue = self.queue.write();
                if queue.is_empty() {
                    None
                } else {
                    Some(queue.remove(0))
                }
            };

            if let Some(queued) = next {
                let id = queued.id.clone();
                let this = self.clone_for_spawn();
                // Spawn the task and let it run independently
                let _ = tokio::task::spawn(async move {
                    this.execute_action_internal(&id).await;
                });
            } else {
                break;
            }
        }
    }

    /// Clone for spawning tasks
    fn clone_for_spawn(&self) -> Self {
        Self {
            config: self.config.clone(),
            pending: Arc::clone(&self.pending),
            queue: Arc::clone(&self.queue),
            active_count: Arc::clone(&self.active_count),
        }
    }

    /// Get service statistics
    pub fn stats(&self) -> ExecutionStats {
        let pending = self.pending.read();
        let queue = self.queue.read();
        let active = self.active_count.read();

        let completed = pending.values()
            .filter(|s| s.completed_at.is_some())
            .count();

        let successful = pending.values()
            .filter(|s| s.completed_at.is_some() && s.error.is_none())
            .count();

        ExecutionStats {
            active: *active,
            queued: queue.len(),
            completed,
            successful,
            max_concurrent: self.config.max_concurrent,
        }
    }

    /// Wait for execution to complete
    pub async fn wait_execution(&self, id: &str, timeout_secs: u64) -> Result<ExecutionResponse> {
        let deadline = Instant::now() + std::time::Duration::from_secs(timeout_secs);

        loop {
            let response = self.get_execution(id).await?;

            if response.stage == ExecutionStage::Completed {
                return Ok(response);
            }

            if Instant::now() > deadline {
                return Err(BuildNetError::Internal(anyhow::anyhow!("Execution timeout")));
            }

            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        }
    }

    /// List all executions
    pub fn list_executions(&self) -> Vec<ExecutionResponse> {
        let pending = self.pending.read();

        pending.iter()
            .map(|(id, state)| ExecutionResponse {
                id: id.clone(),
                action_digest: state.request.action_digest.clone(),
                stage: state.stage,
                result: state.result.clone(),
                error: state.error.clone(),
                queued_at: state.queued_at,
                started_at: state.started_at,
                completed_at: state.completed_at,
            })
            .collect()
    }
}

/// Execution statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionStats {
    /// Active executions
    pub active: usize,
    /// Queued executions
    pub queued: usize,
    /// Completed executions
    pub completed: usize,
    /// Successful executions
    pub successful: usize,
    /// Maximum concurrent
    pub max_concurrent: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_basic_execution() {
        let service = ExecutionService::new(ExecutionConfig::default());

        let request = ExecutionRequest {
            instance_name: "test".to_string(),
            action_digest: Digest::new("action123", 100),
            action: None,
            skip_cache_lookup: false,
            execution_policy: None,
            results_cache_policy: None,
        };

        let response = service.execute(request).await.unwrap();
        assert!(!response.id.is_empty());

        // Wait for completion
        let final_response = service.wait_execution(&response.id, 10).await.unwrap();
        assert_eq!(final_response.stage, ExecutionStage::Completed);
        assert!(final_response.result.is_some());
    }

    #[test]
    fn test_stats() {
        let service = ExecutionService::new(ExecutionConfig {
            max_concurrent: 5,
            ..Default::default()
        });

        let stats = service.stats();
        assert_eq!(stats.max_concurrent, 5);
        assert_eq!(stats.active, 0);
        assert_eq!(stats.queued, 0);
    }
}
