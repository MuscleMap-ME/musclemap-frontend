//! Distributed Ledger
//!
//! Maintains a synchronized history of all build events across the network:
//! - Immutable event log
//! - Merkle tree verification
//! - Peer synchronization
//! - Conflict resolution

mod entry;
mod merkle;
mod sync;
mod storage;

pub use entry::{LedgerEntry, EntryType, EntryId, BuildRecord, TaskRecord, ArtifactRecord};
pub use merkle::{MerkleTree, MerkleNode, MerkleProof};
pub use sync::{LedgerSync, SyncState, SyncProgress};
pub use storage::{LedgerStorage, SqliteLedgerStorage};

use std::collections::HashMap;
use std::sync::Arc;
use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};

use crate::Result;
use crate::network::NodeId;

/// Distributed ledger configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerConfig {
    /// Maximum entries per sync batch
    #[serde(default = "default_batch_size")]
    pub sync_batch_size: usize,
    /// Sync interval in seconds
    #[serde(default = "default_sync_interval")]
    pub sync_interval_secs: u64,
    /// Keep history for N days
    #[serde(default = "default_retention_days")]
    pub retention_days: u32,
    /// Enable Merkle verification
    #[serde(default = "default_true")]
    pub verify_merkle: bool,
    /// Storage path
    pub storage_path: Option<String>,
}

fn default_batch_size() -> usize { 1000 }
fn default_sync_interval() -> u64 { 30 }
fn default_retention_days() -> u32 { 90 }
fn default_true() -> bool { true }

impl Default for LedgerConfig {
    fn default() -> Self {
        Self {
            sync_batch_size: default_batch_size(),
            sync_interval_secs: default_sync_interval(),
            retention_days: default_retention_days(),
            verify_merkle: true,
            storage_path: None,
        }
    }
}

/// Distributed ledger
pub struct DistributedLedger {
    /// Configuration
    config: LedgerConfig,
    /// Local node ID
    local_node_id: NodeId,
    /// Storage backend
    storage: Arc<dyn LedgerStorage>,
    /// In-memory entry cache
    cache: RwLock<LedgerCache>,
    /// Merkle tree for verification
    merkle: RwLock<MerkleTree>,
    /// Sync state per peer
    peer_sync: RwLock<HashMap<NodeId, SyncState>>,
    /// Latest known entries per node
    node_heads: RwLock<HashMap<NodeId, EntryId>>,
}

/// In-memory cache for recent entries
struct LedgerCache {
    /// Recent entries by ID
    entries: HashMap<EntryId, LedgerEntry>,
    /// Entries by type
    by_type: HashMap<EntryType, Vec<EntryId>>,
    /// Entries by build ID
    by_build: HashMap<String, Vec<EntryId>>,
    /// Maximum cache size
    max_size: usize,
}

impl LedgerCache {
    fn new(max_size: usize) -> Self {
        Self {
            entries: HashMap::new(),
            by_type: HashMap::new(),
            by_build: HashMap::new(),
            max_size,
        }
    }

    fn insert(&mut self, entry: LedgerEntry) {
        let id = entry.id.clone();

        // Add to type index
        self.by_type
            .entry(entry.entry_type)
            .or_insert_with(Vec::new)
            .push(id.clone());

        // Add to build index if applicable
        if let Some(build_id) = &entry.build_id {
            self.by_build
                .entry(build_id.clone())
                .or_insert_with(Vec::new)
                .push(id.clone());
        }

        // Add entry
        self.entries.insert(id, entry);

        // Evict if over capacity
        if self.entries.len() > self.max_size {
            self.evict_oldest();
        }
    }

    fn get(&self, id: &EntryId) -> Option<&LedgerEntry> {
        self.entries.get(id)
    }

    fn evict_oldest(&mut self) {
        // Find oldest entry
        if let Some((oldest_id, _)) = self.entries.iter()
            .min_by_key(|(_, e)| e.timestamp)
            .map(|(id, e)| (id.clone(), e.timestamp))
        {
            self.entries.remove(&oldest_id);
        }
    }
}

impl DistributedLedger {
    /// Create a new distributed ledger
    pub fn new(
        config: LedgerConfig,
        local_node_id: NodeId,
        storage: Arc<dyn LedgerStorage>,
    ) -> Result<Self> {
        let cache_size = config.sync_batch_size * 10;

        Ok(Self {
            config,
            local_node_id,
            storage,
            cache: RwLock::new(LedgerCache::new(cache_size)),
            merkle: RwLock::new(MerkleTree::new()),
            peer_sync: RwLock::new(HashMap::new()),
            node_heads: RwLock::new(HashMap::new()),
        })
    }

    /// Append a new entry to the ledger
    pub async fn append(&self, entry: LedgerEntry) -> Result<EntryId> {
        let id = entry.id.clone();

        // Store in persistent storage
        self.storage.store(&entry).await?;

        // Update Merkle tree
        {
            let mut merkle = self.merkle.write();
            merkle.add_leaf(&entry.hash());
        }

        // Add to cache
        {
            let mut cache = self.cache.write();
            cache.insert(entry);
        }

        // Update our head
        {
            let mut heads = self.node_heads.write();
            heads.insert(self.local_node_id.clone(), id.clone());
        }

        Ok(id)
    }

    /// Record a build start
    pub async fn record_build_start(
        &self,
        build_id: &str,
        packages: &[String],
        initiator: &NodeId,
    ) -> Result<EntryId> {
        let entry = LedgerEntry::build_started(
            &self.local_node_id,
            build_id,
            packages,
            initiator,
        );
        self.append(entry).await
    }

    /// Record a build completion
    pub async fn record_build_complete(
        &self,
        build_id: &str,
        success: bool,
        duration_ms: u64,
        artifacts: &[String],
    ) -> Result<EntryId> {
        let entry = LedgerEntry::build_completed(
            &self.local_node_id,
            build_id,
            success,
            duration_ms,
            artifacts,
        );
        self.append(entry).await
    }

    /// Record a task assignment
    pub async fn record_task_assigned(
        &self,
        task_id: &str,
        build_id: &str,
        worker_id: &NodeId,
        package: &str,
    ) -> Result<EntryId> {
        let entry = LedgerEntry::task_assigned(
            &self.local_node_id,
            task_id,
            build_id,
            worker_id,
            package,
        );
        self.append(entry).await
    }

    /// Record a task completion
    pub async fn record_task_complete(
        &self,
        task_id: &str,
        build_id: &str,
        worker_id: &NodeId,
        success: bool,
        duration_ms: u64,
        artifact_hash: Option<&str>,
    ) -> Result<EntryId> {
        let entry = LedgerEntry::task_completed(
            &self.local_node_id,
            task_id,
            build_id,
            worker_id,
            success,
            duration_ms,
            artifact_hash,
        );
        self.append(entry).await
    }

    /// Record artifact storage
    pub async fn record_artifact_stored(
        &self,
        artifact_hash: &str,
        size: u64,
        locations: &[NodeId],
    ) -> Result<EntryId> {
        let entry = LedgerEntry::artifact_stored(
            &self.local_node_id,
            artifact_hash,
            size,
            locations,
        );
        self.append(entry).await
    }

    /// Get an entry by ID
    pub async fn get(&self, id: &EntryId) -> Result<Option<LedgerEntry>> {
        // Check cache first
        {
            let cache = self.cache.read();
            if let Some(entry) = cache.get(id) {
                return Ok(Some(entry.clone()));
            }
        }

        // Fall back to storage
        self.storage.get(id).await
    }

    /// Get entries for a build
    pub async fn get_build_history(&self, build_id: &str) -> Result<Vec<LedgerEntry>> {
        self.storage.get_by_build(build_id).await
    }

    /// Get recent entries
    pub async fn get_recent(&self, limit: usize) -> Result<Vec<LedgerEntry>> {
        self.storage.get_recent(limit).await
    }

    /// Get entries since a specific entry ID
    pub async fn get_since(&self, since: &EntryId, limit: usize) -> Result<Vec<LedgerEntry>> {
        self.storage.get_since(since, limit).await
    }

    /// Get entries by type
    pub async fn get_by_type(&self, entry_type: EntryType, limit: usize) -> Result<Vec<LedgerEntry>> {
        self.storage.get_by_type(entry_type, limit).await
    }

    /// Get current Merkle root
    pub fn merkle_root(&self) -> String {
        let merkle = self.merkle.read();
        merkle.root()
    }

    /// Generate Merkle proof for an entry
    pub fn merkle_proof(&self, id: &EntryId) -> Option<MerkleProof> {
        let merkle = self.merkle.read();
        let cache = self.cache.read();

        if let Some(entry) = cache.get(id) {
            merkle.generate_proof(&entry.hash())
        } else {
            None
        }
    }

    /// Verify a Merkle proof
    pub fn verify_proof(&self, proof: &MerkleProof) -> bool {
        let merkle = self.merkle.read();
        merkle.verify_proof(proof)
    }

    /// Get sync state for a peer
    pub fn get_peer_sync(&self, peer: &NodeId) -> Option<SyncState> {
        let sync = self.peer_sync.read();
        sync.get(peer).cloned()
    }

    /// Update sync state for a peer
    pub fn update_peer_sync(&self, peer: &NodeId, state: SyncState) {
        let mut sync = self.peer_sync.write();
        sync.insert(peer.clone(), state);
    }

    /// Get the latest entry ID for a node
    pub fn get_node_head(&self, node: &NodeId) -> Option<EntryId> {
        let heads = self.node_heads.read();
        heads.get(node).cloned()
    }

    /// Set the latest entry ID for a node
    pub fn set_node_head(&self, node: &NodeId, entry_id: EntryId) {
        let mut heads = self.node_heads.write();
        heads.insert(node.clone(), entry_id);
    }

    /// Get statistics
    pub async fn stats(&self) -> Result<LedgerStats> {
        let storage_stats = self.storage.stats().await?;
        let cache = self.cache.read();
        let merkle = self.merkle.read();

        Ok(LedgerStats {
            total_entries: storage_stats.total_entries,
            cached_entries: cache.entries.len(),
            merkle_height: merkle.height(),
            oldest_entry: storage_stats.oldest_timestamp,
            newest_entry: storage_stats.newest_timestamp,
            storage_size_bytes: storage_stats.size_bytes,
        })
    }

    /// Prune old entries
    pub async fn prune(&self) -> Result<usize> {
        let cutoff = Utc::now() - chrono::Duration::days(self.config.retention_days as i64);
        self.storage.prune_before(cutoff).await
    }
}

/// Ledger statistics
#[derive(Debug, Clone, Serialize)]
pub struct LedgerStats {
    pub total_entries: usize,
    pub cached_entries: usize,
    pub merkle_height: usize,
    pub oldest_entry: Option<DateTime<Utc>>,
    pub newest_entry: Option<DateTime<Utc>>,
    pub storage_size_bytes: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ledger_config_default() {
        let config = LedgerConfig::default();
        assert_eq!(config.sync_batch_size, 1000);
        assert_eq!(config.sync_interval_secs, 30);
        assert_eq!(config.retention_days, 90);
        assert!(config.verify_merkle);
    }

    #[test]
    fn test_ledger_cache() {
        let mut cache = LedgerCache::new(10);

        let entry = LedgerEntry::build_started(
            "node-1",
            "build-1",
            &["pkg-a".to_string()],
            "initiator",
        );
        let id = entry.id.clone();

        cache.insert(entry);

        assert!(cache.get(&id).is_some());
    }
}
