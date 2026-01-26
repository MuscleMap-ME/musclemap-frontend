//! Distributed build protocol

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::TaskStatus;
use crate::notifications::Priority;

/// Build task for distributed execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildTask {
    /// Task ID
    pub id: String,
    /// Parent build ID
    pub build_id: String,
    /// Package name
    pub package: String,
    /// Build command
    pub command: String,
    /// Working directory
    pub working_dir: String,
    /// Environment variables
    pub env: Vec<(String, String)>,
    /// Task status
    pub status: TaskStatus,
    /// Required capabilities (e.g., "rust", "node", "docker")
    pub required_capabilities: Vec<String>,
    /// Task priority
    pub priority: Priority,
    /// Estimated duration (seconds)
    pub estimated_duration_secs: Option<u64>,
    /// Input artifact hashes (dependencies)
    pub input_artifacts: Vec<String>,
    /// Output artifact patterns
    pub output_patterns: Vec<String>,
    /// Created timestamp
    pub created_at: DateTime<Utc>,
    /// Timeout (seconds)
    pub timeout_secs: u64,
}

impl BuildTask {
    /// Create a new build task
    pub fn new(build_id: &str, package: &str, command: &str) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            build_id: build_id.to_string(),
            package: package.to_string(),
            command: command.to_string(),
            working_dir: ".".to_string(),
            env: vec![],
            status: TaskStatus::Pending,
            required_capabilities: vec![],
            priority: Priority::Medium,
            estimated_duration_secs: None,
            input_artifacts: vec![],
            output_patterns: vec![],
            created_at: Utc::now(),
            timeout_secs: 600, // 10 minutes default
        }
    }

    /// Set working directory
    pub fn with_working_dir(mut self, dir: &str) -> Self {
        self.working_dir = dir.to_string();
        self
    }

    /// Add environment variable
    pub fn with_env(mut self, key: &str, value: &str) -> Self {
        self.env.push((key.to_string(), value.to_string()));
        self
    }

    /// Add required capability
    pub fn with_capability(mut self, cap: &str) -> Self {
        self.required_capabilities.push(cap.to_string());
        self
    }

    /// Set priority
    pub fn with_priority(mut self, priority: Priority) -> Self {
        self.priority = priority;
        self
    }

    /// Set timeout
    pub fn with_timeout(mut self, timeout_secs: u64) -> Self {
        self.timeout_secs = timeout_secs;
        self
    }

    /// Add input artifact hash
    pub fn with_input_artifact(mut self, hash: &str) -> Self {
        self.input_artifacts.push(hash.to_string());
        self
    }

    /// Add output pattern
    pub fn with_output_pattern(mut self, pattern: &str) -> Self {
        self.output_patterns.push(pattern.to_string());
        self
    }
}

/// Task execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskResult {
    /// Task ID
    pub task_id: String,
    /// Build ID
    pub build_id: String,
    /// Worker ID that executed the task
    pub worker_id: String,
    /// Success status
    pub success: bool,
    /// Exit code
    pub exit_code: Option<i32>,
    /// Standard output
    pub stdout: String,
    /// Standard error
    pub stderr: String,
    /// Duration (milliseconds)
    pub duration_ms: u64,
    /// Output artifact hash (if produced)
    pub output_artifact: Option<String>,
    /// Completed timestamp
    pub completed_at: DateTime<Utc>,
    /// Error message if failed
    pub error: Option<String>,
}

impl TaskResult {
    /// Create a success result
    pub fn success(task_id: &str, build_id: &str, worker_id: &str, duration_ms: u64) -> Self {
        Self {
            task_id: task_id.to_string(),
            build_id: build_id.to_string(),
            worker_id: worker_id.to_string(),
            success: true,
            exit_code: Some(0),
            stdout: String::new(),
            stderr: String::new(),
            duration_ms,
            output_artifact: None,
            completed_at: Utc::now(),
            error: None,
        }
    }

    /// Create a failure result
    pub fn failure(task_id: &str, build_id: &str, worker_id: &str, error: &str) -> Self {
        Self {
            task_id: task_id.to_string(),
            build_id: build_id.to_string(),
            worker_id: worker_id.to_string(),
            success: false,
            exit_code: None,
            stdout: String::new(),
            stderr: String::new(),
            duration_ms: 0,
            output_artifact: None,
            completed_at: Utc::now(),
            error: Some(error.to_string()),
        }
    }

    /// Set output
    pub fn with_output(mut self, stdout: &str, stderr: &str) -> Self {
        self.stdout = stdout.to_string();
        self.stderr = stderr.to_string();
        self
    }

    /// Set exit code
    pub fn with_exit_code(mut self, code: i32) -> Self {
        self.exit_code = Some(code);
        self.success = code == 0;
        self
    }

    /// Set output artifact
    pub fn with_artifact(mut self, hash: &str) -> Self {
        self.output_artifact = Some(hash.to_string());
        self
    }
}

/// Message types for node communication
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum NodeMessage {
    /// Register with coordinator
    Register {
        node_id: String,
        address: String,
        capabilities: super::WorkerCapabilities,
    },
    /// Heartbeat
    Heartbeat {
        node_id: String,
        cpu_usage: f32,
        memory_usage: f32,
        active_tasks: usize,
    },
    /// Task assignment
    AssignTask {
        task: BuildTask,
    },
    /// Task started
    TaskStarted {
        task_id: String,
        worker_id: String,
    },
    /// Task progress
    TaskProgress {
        task_id: String,
        worker_id: String,
        progress_percent: u8,
        message: Option<String>,
    },
    /// Task completed
    TaskCompleted {
        result: TaskResult,
    },
    /// Cancel task
    CancelTask {
        task_id: String,
    },
    /// Request artifact
    RequestArtifact {
        artifact_hash: String,
        from_node: String,
    },
    /// Transfer artifact
    TransferArtifact {
        artifact_hash: String,
        data: Vec<u8>,
    },
    /// Node going offline
    Shutdown {
        node_id: String,
        drain: bool,
    },
    /// Error response
    Error {
        code: String,
        message: String,
    },
}

impl NodeMessage {
    /// Get message type name
    pub fn message_type(&self) -> &'static str {
        match self {
            NodeMessage::Register { .. } => "register",
            NodeMessage::Heartbeat { .. } => "heartbeat",
            NodeMessage::AssignTask { .. } => "assign_task",
            NodeMessage::TaskStarted { .. } => "task_started",
            NodeMessage::TaskProgress { .. } => "task_progress",
            NodeMessage::TaskCompleted { .. } => "task_completed",
            NodeMessage::CancelTask { .. } => "cancel_task",
            NodeMessage::RequestArtifact { .. } => "request_artifact",
            NodeMessage::TransferArtifact { .. } => "transfer_artifact",
            NodeMessage::Shutdown { .. } => "shutdown",
            NodeMessage::Error { .. } => "error",
        }
    }

    /// Serialize to MessagePack
    pub fn to_msgpack(&self) -> crate::Result<Vec<u8>> {
        rmp_serde::to_vec(self)
            .map_err(|e| crate::BuildNetError::Serialization(serde_json::Error::io(std::io::Error::new(
                std::io::ErrorKind::Other,
                e.to_string()
            ))))
    }

    /// Deserialize from MessagePack
    pub fn from_msgpack(data: &[u8]) -> crate::Result<Self> {
        rmp_serde::from_slice(data)
            .map_err(|e| crate::BuildNetError::Serialization(serde_json::Error::io(std::io::Error::new(
                std::io::ErrorKind::Other,
                e.to_string()
            ))))
    }
}

/// Artifact transfer metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtifactTransfer {
    /// Artifact hash
    pub hash: String,
    /// Size in bytes
    pub size: u64,
    /// Compression type
    pub compression: String,
    /// Number of chunks
    pub num_chunks: usize,
    /// Checksum
    pub checksum: String,
}

/// Artifact chunk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtifactChunk {
    /// Artifact hash
    pub artifact_hash: String,
    /// Chunk index
    pub chunk_index: usize,
    /// Total chunks
    pub total_chunks: usize,
    /// Chunk data
    pub data: Vec<u8>,
}
