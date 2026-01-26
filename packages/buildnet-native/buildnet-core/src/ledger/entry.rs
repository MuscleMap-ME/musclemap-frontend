//! Ledger Entry Types
//!
//! Immutable entries in the distributed ledger.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use uuid::Uuid;

use crate::network::NodeId;

/// Unique entry identifier
pub type EntryId = String;

/// Ledger entry type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EntryType {
    /// Build started
    BuildStarted,
    /// Build completed
    BuildCompleted,
    /// Task assigned
    TaskAssigned,
    /// Task completed
    TaskCompleted,
    /// Artifact stored
    ArtifactStored,
    /// Artifact replicated
    ArtifactReplicated,
    /// Node joined
    NodeJoined,
    /// Node left
    NodeLeft,
    /// Coordinator elected
    CoordinatorElected,
    /// Configuration changed
    ConfigChanged,
}

/// A single ledger entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerEntry {
    /// Unique entry ID
    pub id: EntryId,
    /// Entry type
    pub entry_type: EntryType,
    /// Node that created this entry
    pub origin_node: NodeId,
    /// Build ID (if applicable)
    pub build_id: Option<String>,
    /// Timestamp
    pub timestamp: DateTime<Utc>,
    /// Previous entry hash (for chain verification)
    pub prev_hash: String,
    /// Entry data (JSON)
    pub data: serde_json::Value,
    /// Signature from origin node
    pub signature: Vec<u8>,
}

impl LedgerEntry {
    /// Create a new entry
    fn new(
        entry_type: EntryType,
        origin_node: &str,
        build_id: Option<&str>,
        data: serde_json::Value,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            entry_type,
            origin_node: origin_node.to_string(),
            build_id: build_id.map(String::from),
            timestamp: Utc::now(),
            prev_hash: String::new(), // Set during append
            data,
            signature: vec![], // Set after signing
        }
    }

    /// Create build started entry
    pub fn build_started<S: AsRef<str>>(
        origin: impl AsRef<str>,
        build_id: &str,
        packages: &[S],
        initiator: impl AsRef<str>,
    ) -> Self {
        let pkgs: Vec<&str> = packages.iter().map(|s| s.as_ref()).collect();
        Self::new(
            EntryType::BuildStarted,
            origin.as_ref(),
            Some(build_id),
            serde_json::json!({
                "packages": pkgs,
                "initiator": initiator.as_ref(),
            }),
        )
    }

    /// Create build completed entry
    pub fn build_completed<S: AsRef<str>>(
        origin: impl AsRef<str>,
        build_id: &str,
        success: bool,
        duration_ms: u64,
        artifacts: &[S],
    ) -> Self {
        let arts: Vec<&str> = artifacts.iter().map(|s| s.as_ref()).collect();
        Self::new(
            EntryType::BuildCompleted,
            origin.as_ref(),
            Some(build_id),
            serde_json::json!({
                "success": success,
                "duration_ms": duration_ms,
                "artifacts": arts,
            }),
        )
    }

    /// Create task assigned entry
    pub fn task_assigned(
        origin: impl AsRef<str>,
        task_id: &str,
        build_id: &str,
        worker_id: impl AsRef<str>,
        package: &str,
    ) -> Self {
        Self::new(
            EntryType::TaskAssigned,
            origin.as_ref(),
            Some(build_id),
            serde_json::json!({
                "task_id": task_id,
                "worker_id": worker_id.as_ref(),
                "package": package,
            }),
        )
    }

    /// Create task completed entry
    pub fn task_completed(
        origin: impl AsRef<str>,
        task_id: &str,
        build_id: &str,
        worker_id: impl AsRef<str>,
        success: bool,
        duration_ms: u64,
        artifact_hash: Option<&str>,
    ) -> Self {
        Self::new(
            EntryType::TaskCompleted,
            origin.as_ref(),
            Some(build_id),
            serde_json::json!({
                "task_id": task_id,
                "worker_id": worker_id.as_ref(),
                "success": success,
                "duration_ms": duration_ms,
                "artifact_hash": artifact_hash,
            }),
        )
    }

    /// Create artifact stored entry
    pub fn artifact_stored<S: AsRef<str>>(
        origin: impl AsRef<str>,
        artifact_hash: &str,
        size: u64,
        locations: &[S],
    ) -> Self {
        let locs: Vec<&str> = locations.iter().map(|s| s.as_ref()).collect();
        Self::new(
            EntryType::ArtifactStored,
            origin.as_ref(),
            None,
            serde_json::json!({
                "artifact_hash": artifact_hash,
                "size": size,
                "locations": locs,
            }),
        )
    }

    /// Create artifact replicated entry
    pub fn artifact_replicated(
        origin: impl AsRef<str>,
        artifact_hash: &str,
        from_node: impl AsRef<str>,
        to_node: impl AsRef<str>,
    ) -> Self {
        Self::new(
            EntryType::ArtifactReplicated,
            origin.as_ref(),
            None,
            serde_json::json!({
                "artifact_hash": artifact_hash,
                "from_node": from_node.as_ref(),
                "to_node": to_node.as_ref(),
            }),
        )
    }

    /// Create node joined entry
    pub fn node_joined(
        origin: impl AsRef<str>,
        node_id: impl AsRef<str>,
        address: &str,
        capabilities: &serde_json::Value,
    ) -> Self {
        Self::new(
            EntryType::NodeJoined,
            origin.as_ref(),
            None,
            serde_json::json!({
                "node_id": node_id.as_ref(),
                "address": address,
                "capabilities": capabilities,
            }),
        )
    }

    /// Create node left entry
    pub fn node_left(
        origin: impl AsRef<str>,
        node_id: impl AsRef<str>,
        reason: &str,
    ) -> Self {
        Self::new(
            EntryType::NodeLeft,
            origin.as_ref(),
            None,
            serde_json::json!({
                "node_id": node_id.as_ref(),
                "reason": reason,
            }),
        )
    }

    /// Create coordinator elected entry
    pub fn coordinator_elected(
        origin: impl AsRef<str>,
        coordinator_id: impl AsRef<str>,
        election_id: &str,
    ) -> Self {
        Self::new(
            EntryType::CoordinatorElected,
            origin.as_ref(),
            None,
            serde_json::json!({
                "coordinator_id": coordinator_id.as_ref(),
                "election_id": election_id,
            }),
        )
    }

    /// Compute hash of this entry
    pub fn hash(&self) -> String {
        let mut hasher = Sha256::new();

        hasher.update(&self.id);
        hasher.update(&format!("{:?}", self.entry_type));
        hasher.update(&self.origin_node);
        hasher.update(self.build_id.as_deref().unwrap_or(""));
        hasher.update(self.timestamp.to_rfc3339());
        hasher.update(&self.prev_hash);
        hasher.update(self.data.to_string());

        format!("{:x}", hasher.finalize())
    }

    /// Set the previous hash (chain link)
    pub fn set_prev_hash(&mut self, prev_hash: String) {
        self.prev_hash = prev_hash;
    }

    /// Sign this entry (placeholder - would use real crypto)
    pub fn sign(&mut self, _private_key: &[u8]) {
        // In production, use ed25519 or similar
        let hash = self.hash();
        self.signature = hash.as_bytes().to_vec();
    }

    /// Verify signature
    pub fn verify(&self, _public_key: &[u8]) -> bool {
        // In production, verify ed25519 signature
        let hash = self.hash();
        self.signature == hash.as_bytes()
    }
}

/// Build record extracted from ledger entries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildRecord {
    pub build_id: String,
    pub packages: Vec<String>,
    pub initiator: NodeId,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub success: Option<bool>,
    pub duration_ms: Option<u64>,
    pub artifacts: Vec<String>,
    pub tasks: Vec<TaskRecord>,
}

/// Task record extracted from ledger entries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskRecord {
    pub task_id: String,
    pub build_id: String,
    pub package: String,
    pub worker_id: NodeId,
    pub assigned_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub success: Option<bool>,
    pub duration_ms: Option<u64>,
    pub artifact_hash: Option<String>,
}

/// Artifact record extracted from ledger entries
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtifactRecord {
    pub hash: String,
    pub size: u64,
    pub stored_at: DateTime<Utc>,
    pub locations: Vec<NodeId>,
    pub replications: Vec<ReplicationRecord>,
}

/// Replication record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplicationRecord {
    pub from_node: NodeId,
    pub to_node: NodeId,
    pub replicated_at: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_entry_hash() {
        let entry = LedgerEntry::build_started(
            "node-1",
            "build-1",
            &["pkg-a".to_string()],
            "initiator",
        );

        let hash1 = entry.hash();
        let hash2 = entry.hash();

        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64); // SHA256 hex
    }

    #[test]
    fn test_entry_sign_verify() {
        let mut entry = LedgerEntry::build_started(
            "node-1",
            "build-1",
            &["pkg-a".to_string()],
            "initiator",
        );

        let key = b"test-key";
        entry.sign(key);
        assert!(entry.verify(key));
    }

    #[test]
    fn test_entry_types() {
        let entry = LedgerEntry::task_assigned(
            "node-1",
            "task-1",
            "build-1",
            "worker-1",
            "package-a",
        );

        assert_eq!(entry.entry_type, EntryType::TaskAssigned);
        assert_eq!(entry.build_id, Some("build-1".to_string()));
    }
}
