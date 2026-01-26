//! Ledger Synchronization
//!
//! Keeps ledger entries synchronized across all nodes in the network.

use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use super::{DistributedLedger, LedgerEntry, EntryId, MerkleProof};
use crate::Result;
use crate::network::NodeId;

/// Synchronization state for a peer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncState {
    /// Peer node ID
    pub peer_id: NodeId,
    /// Last synchronized entry ID
    pub last_sync_id: Option<EntryId>,
    /// Last sync timestamp
    pub last_sync_at: Option<DateTime<Utc>>,
    /// Peer's Merkle root (last known)
    pub peer_merkle_root: String,
    /// Number of entries behind
    pub entries_behind: usize,
    /// Sync status
    pub status: SyncStatus,
    /// Last error (if any)
    pub last_error: Option<String>,
}

/// Sync status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncStatus {
    /// In sync with peer
    InSync,
    /// Syncing with peer
    Syncing,
    /// Behind peer
    Behind,
    /// Ahead of peer
    Ahead,
    /// Sync failed
    Failed,
    /// Unknown (never synced)
    Unknown,
}

/// Sync progress information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncProgress {
    /// Peer being synced
    pub peer_id: NodeId,
    /// Total entries to sync
    pub total_entries: usize,
    /// Synced entries
    pub synced_entries: usize,
    /// Bytes transferred
    pub bytes_transferred: u64,
    /// Started at
    pub started_at: DateTime<Utc>,
    /// Estimated completion
    pub eta_seconds: Option<u64>,
}

impl SyncProgress {
    /// Get progress percentage
    pub fn percent(&self) -> f64 {
        if self.total_entries == 0 {
            100.0
        } else {
            (self.synced_entries as f64 / self.total_entries as f64) * 100.0
        }
    }
}

/// Ledger synchronization manager
pub struct LedgerSync {
    /// Local node ID
    local_node_id: NodeId,
    /// Ledger reference
    ledger: Arc<DistributedLedger>,
    /// Sync state per peer
    peer_states: RwLock<HashMap<NodeId, SyncState>>,
    /// Active syncs
    active_syncs: RwLock<HashSet<NodeId>>,
    /// Batch size for sync
    batch_size: usize,
}

impl LedgerSync {
    /// Create a new sync manager
    pub fn new(
        local_node_id: NodeId,
        ledger: Arc<DistributedLedger>,
        batch_size: usize,
    ) -> Self {
        Self {
            local_node_id,
            ledger,
            peer_states: RwLock::new(HashMap::new()),
            active_syncs: RwLock::new(HashSet::new()),
            batch_size,
        }
    }

    /// Start sync with a peer
    pub async fn start_sync(&self, peer_id: &NodeId) -> Result<SyncProgress> {
        // Check if already syncing
        {
            let active = self.active_syncs.read().await;
            if active.contains(peer_id) {
                return Err(crate::BuildNetError::State(
                    format!("Already syncing with {}", peer_id)
                ));
            }
        }

        // Mark as syncing
        {
            let mut active = self.active_syncs.write().await;
            active.insert(peer_id.clone());
        }

        // Get peer's state
        let peer_state = self.get_peer_state(peer_id).await;
        let last_sync_id = peer_state.and_then(|s| s.last_sync_id);

        // Calculate entries to sync
        let entries_to_sync = if let Some(ref last_id) = last_sync_id {
            self.ledger.get_since(last_id, self.batch_size * 10).await?
        } else {
            self.ledger.get_recent(self.batch_size * 10).await?
        };

        Ok(SyncProgress {
            peer_id: peer_id.clone(),
            total_entries: entries_to_sync.len(),
            synced_entries: 0,
            bytes_transferred: 0,
            started_at: Utc::now(),
            eta_seconds: None,
        })
    }

    /// Process incoming entries from peer
    pub async fn receive_entries(
        &self,
        peer_id: &NodeId,
        entries: Vec<LedgerEntry>,
        peer_merkle_root: &str,
    ) -> Result<SyncResult> {
        let mut accepted = 0;
        let mut rejected = 0;
        let mut duplicates = 0;

        for entry in entries {
            // Check if we already have this entry
            if let Some(_existing) = self.ledger.get(&entry.id).await? {
                duplicates += 1;
                continue;
            }

            // Verify entry signature
            if !entry.verify(&[]) {
                rejected += 1;
                tracing::warn!("Rejected entry {} from {}: invalid signature", entry.id, peer_id);
                continue;
            }

            // Store entry
            match self.ledger.append(entry).await {
                Ok(_) => accepted += 1,
                Err(e) => {
                    rejected += 1;
                    tracing::warn!("Failed to store entry from {}: {}", peer_id, e);
                }
            }
        }

        // Update peer state
        {
            let mut states = self.peer_states.write().await;
            let state = states.entry(peer_id.clone()).or_insert_with(|| SyncState {
                peer_id: peer_id.clone(),
                last_sync_id: None,
                last_sync_at: None,
                peer_merkle_root: String::new(),
                entries_behind: 0,
                status: SyncStatus::Unknown,
                last_error: None,
            });

            state.last_sync_at = Some(Utc::now());
            state.peer_merkle_root = peer_merkle_root.to_string();

            // Check if in sync
            if self.ledger.merkle_root() == peer_merkle_root {
                state.status = SyncStatus::InSync;
                state.entries_behind = 0;
            } else {
                state.status = SyncStatus::Behind;
            }
        }

        Ok(SyncResult {
            accepted,
            rejected,
            duplicates,
            peer_id: peer_id.clone(),
        })
    }

    /// Get entries to send to a peer
    pub async fn get_entries_for_peer(
        &self,
        peer_id: &NodeId,
        since: Option<&EntryId>,
    ) -> Result<(Vec<LedgerEntry>, String)> {
        let entries = if let Some(since_id) = since {
            self.ledger.get_since(since_id, self.batch_size).await?
        } else {
            self.ledger.get_recent(self.batch_size).await?
        };

        let merkle_root = self.ledger.merkle_root();

        Ok((entries, merkle_root))
    }

    /// Complete sync with a peer
    pub async fn complete_sync(&self, peer_id: &NodeId, last_entry_id: EntryId) {
        // Update peer state
        {
            let mut states = self.peer_states.write().await;
            if let Some(state) = states.get_mut(peer_id) {
                state.last_sync_id = Some(last_entry_id);
                state.last_sync_at = Some(Utc::now());
                state.status = SyncStatus::InSync;
            }
        }

        // Remove from active syncs
        {
            let mut active = self.active_syncs.write().await;
            active.remove(peer_id);
        }
    }

    /// Cancel sync with a peer
    pub async fn cancel_sync(&self, peer_id: &NodeId, error: Option<String>) {
        // Update peer state
        {
            let mut states = self.peer_states.write().await;
            if let Some(state) = states.get_mut(peer_id) {
                state.status = SyncStatus::Failed;
                state.last_error = error;
            }
        }

        // Remove from active syncs
        {
            let mut active = self.active_syncs.write().await;
            active.remove(peer_id);
        }
    }

    /// Get sync state for a peer
    pub async fn get_peer_state(&self, peer_id: &NodeId) -> Option<SyncState> {
        let states = self.peer_states.read().await;
        states.get(peer_id).cloned()
    }

    /// Get all peer states
    pub async fn get_all_states(&self) -> Vec<SyncState> {
        let states = self.peer_states.read().await;
        states.values().cloned().collect()
    }

    /// Check if currently syncing with a peer
    pub async fn is_syncing(&self, peer_id: &NodeId) -> bool {
        let active = self.active_syncs.read().await;
        active.contains(peer_id)
    }

    /// Get active sync count
    pub async fn active_sync_count(&self) -> usize {
        let active = self.active_syncs.read().await;
        active.len()
    }

    /// Verify entry with Merkle proof from peer
    pub async fn verify_entry_proof(
        &self,
        entry: &LedgerEntry,
        proof: &MerkleProof,
        peer_merkle_root: &str,
    ) -> bool {
        // Check proof matches entry hash
        if proof.leaf_hash != entry.hash() {
            return false;
        }

        // Verify proof leads to peer's root
        crate::ledger::MerkleTree::verify_proof_against_root(proof, peer_merkle_root)
    }

    /// Detect and resolve conflicts
    pub async fn detect_conflicts(&self, peer_id: &NodeId) -> Vec<ConflictEntry> {
        // Compare Merkle roots - if different, need to find divergence point
        let peer_state = match self.get_peer_state(peer_id).await {
            Some(s) => s,
            None => return vec![],
        };

        let local_root = self.ledger.merkle_root();

        if local_root == peer_state.peer_merkle_root {
            return vec![];
        }

        // Would need to implement actual conflict detection here
        // by comparing entry histories
        vec![]
    }
}

/// Result of sync operation
#[derive(Debug, Clone, Serialize)]
pub struct SyncResult {
    /// Entries accepted
    pub accepted: usize,
    /// Entries rejected
    pub rejected: usize,
    /// Duplicate entries skipped
    pub duplicates: usize,
    /// Peer ID
    pub peer_id: NodeId,
}

/// A conflicting entry
#[derive(Debug, Clone, Serialize)]
pub struct ConflictEntry {
    /// Local entry
    pub local: LedgerEntry,
    /// Remote entry
    pub remote: LedgerEntry,
    /// Conflict type
    pub conflict_type: ConflictType,
}

/// Type of conflict
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConflictType {
    /// Same ID, different content
    ContentMismatch,
    /// Different chain order
    OrderMismatch,
    /// Signature mismatch
    SignatureMismatch,
}

/// Sync request message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncRequest {
    /// Requesting node
    pub from_node: NodeId,
    /// Last known entry ID
    pub since: Option<EntryId>,
    /// Batch size limit
    pub limit: usize,
    /// Local Merkle root
    pub merkle_root: String,
}

/// Sync response message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResponse {
    /// Responding node
    pub from_node: NodeId,
    /// Entries to sync
    pub entries: Vec<LedgerEntry>,
    /// Has more entries
    pub has_more: bool,
    /// Next cursor for pagination
    pub next_cursor: Option<EntryId>,
    /// Current Merkle root
    pub merkle_root: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_state_default() {
        let state = SyncState {
            peer_id: "peer-1".to_string(),
            last_sync_id: None,
            last_sync_at: None,
            peer_merkle_root: String::new(),
            entries_behind: 0,
            status: SyncStatus::Unknown,
            last_error: None,
        };

        assert_eq!(state.status, SyncStatus::Unknown);
        assert!(state.last_sync_id.is_none());
    }

    #[test]
    fn test_sync_progress_percent() {
        let progress = SyncProgress {
            peer_id: "peer-1".to_string(),
            total_entries: 100,
            synced_entries: 50,
            bytes_transferred: 1024,
            started_at: Utc::now(),
            eta_seconds: Some(60),
        };

        assert_eq!(progress.percent(), 50.0);
    }

    #[test]
    fn test_sync_progress_empty() {
        let progress = SyncProgress {
            peer_id: "peer-1".to_string(),
            total_entries: 0,
            synced_entries: 0,
            bytes_transferred: 0,
            started_at: Utc::now(),
            eta_seconds: None,
        };

        assert_eq!(progress.percent(), 100.0);
    }
}
