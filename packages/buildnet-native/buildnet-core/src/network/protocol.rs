//! Network Protocol
//!
//! Message types and serialization for BuildNet P2P communication.

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use super::node::{NodeId, NodeInfo, NodeStatus};

/// Message envelope for all network communication
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Envelope {
    /// Unique message ID
    pub id: String,
    /// Sender node ID
    pub from: NodeId,
    /// Recipient node ID (None for broadcast)
    pub to: Option<NodeId>,
    /// Message timestamp
    pub timestamp: DateTime<Utc>,
    /// Message signature (Ed25519)
    pub signature: Vec<u8>,
    /// Message payload
    pub message: Message,
    /// Time-to-live for forwarding (hops)
    pub ttl: u8,
    /// Correlation ID for request/response
    pub correlation_id: Option<String>,
}

impl Envelope {
    /// Create a new envelope
    pub fn new(from: NodeId, to: Option<NodeId>, message: Message) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            from,
            to,
            timestamp: Utc::now(),
            signature: vec![],
            message,
            ttl: 10,
            correlation_id: None,
        }
    }

    /// Create a broadcast envelope
    pub fn broadcast(from: NodeId, message: Message) -> Self {
        Self::new(from, None, message)
    }

    /// Create a response envelope
    pub fn response(from: NodeId, to: NodeId, correlation_id: String, message: Message) -> Self {
        let mut env = Self::new(from, Some(to), message);
        env.correlation_id = Some(correlation_id);
        env
    }

    /// Check if envelope is expired
    pub fn is_expired(&self, max_age_secs: i64) -> bool {
        let age = Utc::now().signed_duration_since(self.timestamp);
        age.num_seconds() > max_age_secs
    }

    /// Check if envelope should be forwarded
    pub fn should_forward(&self) -> bool {
        self.ttl > 0 && self.to.is_none()
    }

    /// Decrement TTL for forwarding
    pub fn forward(&mut self) {
        if self.ttl > 0 {
            self.ttl -= 1;
        }
    }
}

/// Message types for BuildNet protocol
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum Message {
    // === Discovery Messages ===

    /// Announce node presence
    Announce(AnnounceMessage),
    /// Request node info
    Ping(PingMessage),
    /// Response to ping
    Pong(PongMessage),
    /// Node leaving the network
    Leave(LeaveMessage),

    // === Election Messages ===

    /// Start coordinator election
    Election(ElectionMessage),
    /// Vote for a node
    Vote(VoteMessage),
    /// Coordinator announcement
    CoordinatorAnnounce(CoordinatorAnnounceMessage),

    // === Build Messages ===

    /// Request to start a build
    BuildRequest(BuildRequestMessage),
    /// Build task assignment
    BuildAssign(BuildAssignMessage),
    /// Build status update
    BuildStatus(BuildStatusMessage),
    /// Build completed
    BuildComplete(BuildCompleteMessage),
    /// Build failed
    BuildFailed(BuildFailedMessage),
    /// Cancel a build
    BuildCancel(BuildCancelMessage),

    // === Resource Messages ===

    /// Request resource info
    ResourceQuery(ResourceQueryMessage),
    /// Resource info response
    ResourceInfo(ResourceInfoMessage),
    /// Resource allocation request
    ResourceAlloc(ResourceAllocMessage),
    /// Resource release
    ResourceRelease(ResourceReleaseMessage),

    // === Artifact Messages ===

    /// Request artifact
    ArtifactRequest(ArtifactRequestMessage),
    /// Artifact data (chunked)
    ArtifactData(ArtifactDataMessage),
    /// Artifact available notification
    ArtifactAvailable(ArtifactAvailableMessage),

    // === Ledger Messages ===

    /// Ledger entry
    LedgerEntry(LedgerEntryMessage),
    /// Ledger sync request
    LedgerSync(LedgerSyncMessage),
    /// Ledger sync response
    LedgerSyncResponse(LedgerSyncResponseMessage),

    // === Error Messages ===

    /// Error response
    Error(ErrorMessage),
}

/// Message type enum for filtering
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MessageType {
    Announce,
    Ping,
    Pong,
    Leave,
    Election,
    Vote,
    CoordinatorAnnounce,
    BuildRequest,
    BuildAssign,
    BuildStatus,
    BuildComplete,
    BuildFailed,
    BuildCancel,
    ResourceQuery,
    ResourceInfo,
    ResourceAlloc,
    ResourceRelease,
    ArtifactRequest,
    ArtifactData,
    ArtifactAvailable,
    LedgerEntry,
    LedgerSync,
    LedgerSyncResponse,
    Error,
}

impl Message {
    /// Get message type
    pub fn message_type(&self) -> MessageType {
        match self {
            Message::Announce(_) => MessageType::Announce,
            Message::Ping(_) => MessageType::Ping,
            Message::Pong(_) => MessageType::Pong,
            Message::Leave(_) => MessageType::Leave,
            Message::Election(_) => MessageType::Election,
            Message::Vote(_) => MessageType::Vote,
            Message::CoordinatorAnnounce(_) => MessageType::CoordinatorAnnounce,
            Message::BuildRequest(_) => MessageType::BuildRequest,
            Message::BuildAssign(_) => MessageType::BuildAssign,
            Message::BuildStatus(_) => MessageType::BuildStatus,
            Message::BuildComplete(_) => MessageType::BuildComplete,
            Message::BuildFailed(_) => MessageType::BuildFailed,
            Message::BuildCancel(_) => MessageType::BuildCancel,
            Message::ResourceQuery(_) => MessageType::ResourceQuery,
            Message::ResourceInfo(_) => MessageType::ResourceInfo,
            Message::ResourceAlloc(_) => MessageType::ResourceAlloc,
            Message::ResourceRelease(_) => MessageType::ResourceRelease,
            Message::ArtifactRequest(_) => MessageType::ArtifactRequest,
            Message::ArtifactData(_) => MessageType::ArtifactData,
            Message::ArtifactAvailable(_) => MessageType::ArtifactAvailable,
            Message::LedgerEntry(_) => MessageType::LedgerEntry,
            Message::LedgerSync(_) => MessageType::LedgerSync,
            Message::LedgerSyncResponse(_) => MessageType::LedgerSyncResponse,
            Message::Error(_) => MessageType::Error,
        }
    }
}

// === Discovery Message Types ===

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnnounceMessage {
    pub node_info: NodeInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PingMessage {
    pub sequence: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PongMessage {
    pub sequence: u64,
    pub node_info: NodeInfo,
    pub status: NodeStatus,
    pub load: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaveMessage {
    pub reason: String,
}

// === Election Message Types ===

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElectionMessage {
    pub election_id: String,
    pub candidate_id: NodeId,
    pub priority: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoteMessage {
    pub election_id: String,
    pub voter_id: NodeId,
    pub candidate_id: NodeId,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoordinatorAnnounceMessage {
    pub election_id: String,
    pub coordinator_id: NodeId,
    pub coordinator_info: NodeInfo,
}

// === Build Message Types ===

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildRequestMessage {
    pub build_id: String,
    pub config_id: String,
    pub pool_id: Option<String>,
    pub priority: u32,
    pub requested_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildAssignMessage {
    pub build_id: String,
    pub step_id: String,
    pub config: serde_json::Value,
    pub working_dir: String,
    pub artifacts_from: Vec<String>, // Build IDs to fetch artifacts from
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildStatusMessage {
    pub build_id: String,
    pub step_id: Option<String>,
    pub status: BuildStatus,
    pub progress: f64,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BuildStatus {
    Queued,
    Preparing,
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildCompleteMessage {
    pub build_id: String,
    pub artifacts: Vec<ArtifactInfo>,
    pub duration_secs: u64,
    pub logs: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtifactInfo {
    pub name: String,
    pub hash: String,
    pub size_bytes: u64,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildFailedMessage {
    pub build_id: String,
    pub step_id: Option<String>,
    pub error: String,
    pub logs: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildCancelMessage {
    pub build_id: String,
    pub reason: String,
}

// === Resource Message Types ===

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceQueryMessage {
    pub requirements: ResourceRequirements,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceRequirements {
    pub cpu_cores: Option<usize>,
    pub memory_bytes: Option<u64>,
    pub storage_bytes: Option<u64>,
    pub tools: Vec<String>,
    pub runtimes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceInfoMessage {
    pub node_id: NodeId,
    pub available: bool,
    pub resources: crate::discovery::NodeResources,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceAllocMessage {
    pub allocation_id: String,
    pub pool_id: String,
    pub resources: AllocatedResources,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllocatedResources {
    pub cpu_cores: usize,
    pub memory_bytes: u64,
    pub storage_path: String,
    pub storage_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceReleaseMessage {
    pub allocation_id: String,
    pub pool_id: String,
}

// === Artifact Message Types ===

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtifactRequestMessage {
    pub hash: String,
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtifactDataMessage {
    pub hash: String,
    pub chunk_index: u32,
    pub total_chunks: u32,
    pub data: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtifactAvailableMessage {
    pub hash: String,
    pub name: String,
    pub size_bytes: u64,
    pub node_id: NodeId,
}

// === Ledger Message Types ===

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerEntryMessage {
    pub entry: LedgerEntry,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub node_id: NodeId,
    pub event_type: LedgerEventType,
    pub data: serde_json::Value,
    pub hash: String,
    pub previous_hash: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LedgerEventType {
    NodeJoin,
    NodeLeave,
    BuildStart,
    BuildComplete,
    BuildFailed,
    ArtifactStore,
    ConfigChange,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerSyncMessage {
    pub from_index: u64,
    pub max_entries: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerSyncResponseMessage {
    pub entries: Vec<LedgerEntry>,
    pub has_more: bool,
    pub total_entries: u64,
}

// === Error Message Type ===

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorMessage {
    pub code: ErrorCode,
    pub message: String,
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ErrorCode {
    InvalidMessage,
    Unauthorized,
    NotFound,
    ResourceUnavailable,
    BuildFailed,
    NetworkError,
    InternalError,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_envelope_creation() {
        let msg = Message::Ping(PingMessage { sequence: 1 });
        let env = Envelope::new("node1".to_string(), Some("node2".to_string()), msg);

        assert!(!env.id.is_empty());
        assert_eq!(env.from, "node1");
        assert_eq!(env.to, Some("node2".to_string()));
    }

    #[test]
    fn test_message_serialization() {
        let msg = Message::Ping(PingMessage { sequence: 42 });
        let json = serde_json::to_string(&msg).unwrap();
        let parsed: Message = serde_json::from_str(&json).unwrap();

        if let Message::Ping(p) = parsed {
            assert_eq!(p.sequence, 42);
        } else {
            panic!("Wrong message type");
        }
    }

    #[test]
    fn test_envelope_expiry() {
        let msg = Message::Ping(PingMessage { sequence: 1 });
        let mut env = Envelope::new("node1".to_string(), None, msg);

        assert!(!env.is_expired(60));

        env.timestamp = Utc::now() - chrono::Duration::seconds(120);
        assert!(env.is_expired(60));
    }
}
