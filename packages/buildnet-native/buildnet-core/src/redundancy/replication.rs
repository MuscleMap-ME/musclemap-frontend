//! State replication
//!
//! Replicates state changes from leader to followers for consistency.

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};

use crate::{BuildNetError, Result};
use super::ClusterNode;

/// Replication configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplicationConfig {
    /// Replication mode
    pub mode: ReplicationMode,
    /// Batch size for replication
    pub batch_size: usize,
    /// Retry count for failed replications
    pub retry_count: usize,
    /// Retry delay in milliseconds
    pub retry_delay_ms: u64,
    /// Compression enabled
    pub compression: bool,
    /// Maximum lag before follower is considered unhealthy
    pub max_lag_bytes: u64,
}

impl Default for ReplicationConfig {
    fn default() -> Self {
        Self {
            mode: ReplicationMode::Async,
            batch_size: 100,
            retry_count: 3,
            retry_delay_ms: 1000,
            compression: true,
            max_lag_bytes: 1024 * 1024 * 10, // 10MB
        }
    }
}

/// Replication mode
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReplicationMode {
    /// Synchronous - wait for all replicas
    Sync,
    /// Asynchronous - don't wait for replicas
    Async,
    /// Semi-synchronous - wait for at least one replica
    SemiSync,
}

/// Replica node info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplicaNode {
    /// Node ID
    pub id: String,
    /// Node address
    pub address: String,
    /// Replication position
    pub position: u64,
    /// Last sync time
    pub last_sync: DateTime<Utc>,
    /// Sync lag in bytes
    pub lag_bytes: u64,
    /// Is in sync
    pub is_synced: bool,
}

/// Replication entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplicationEntry {
    /// Sequence number
    pub sequence: u64,
    /// Timestamp
    pub timestamp: DateTime<Utc>,
    /// Operation type
    pub operation: ReplicationOp,
    /// Key (for targeted replication)
    pub key: Option<String>,
    /// Data payload
    pub data: Vec<u8>,
    /// Checksum
    pub checksum: u32,
}

/// Replication operation type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReplicationOp {
    /// Insert/create
    Insert,
    /// Update
    Update,
    /// Delete
    Delete,
    /// Full sync
    FullSync,
    /// Checkpoint
    Checkpoint,
}

/// State replicator
pub struct StateReplicator {
    /// Configuration
    config: ReplicationConfig,
    /// Node ID
    node_id: String,
    /// Current sequence number
    sequence: AtomicU64,
    /// Replication log (in-memory ring buffer)
    log: Arc<RwLock<Vec<ReplicationEntry>>>,
    /// Replica status
    replicas: Arc<RwLock<HashMap<String, ReplicaNode>>>,
    /// HTTP client for replication
    client: reqwest::Client,
    /// Replication lag in ms
    lag_ms: AtomicU64,
}

impl StateReplicator {
    /// Create a new state replicator
    pub fn new(config: ReplicationConfig, node_id: &str) -> Result<Self> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        Ok(Self {
            config,
            node_id: node_id.to_string(),
            sequence: AtomicU64::new(0),
            log: Arc::new(RwLock::new(Vec::with_capacity(1000))),
            replicas: Arc::new(RwLock::new(HashMap::new())),
            client,
            lag_ms: AtomicU64::new(0),
        })
    }

    /// Get current replication lag in milliseconds
    pub fn lag_ms(&self) -> u64 {
        self.lag_ms.load(Ordering::Relaxed)
    }

    /// Get current sequence number
    pub fn sequence(&self) -> u64 {
        self.sequence.load(Ordering::Relaxed)
    }

    /// Add a replica node
    pub fn add_replica(&self, id: &str, address: &str) {
        let mut replicas = self.replicas.write();
        replicas.insert(id.to_string(), ReplicaNode {
            id: id.to_string(),
            address: address.to_string(),
            position: 0,
            last_sync: Utc::now(),
            lag_bytes: 0,
            is_synced: false,
        });
    }

    /// Remove a replica node
    pub fn remove_replica(&self, id: &str) {
        let mut replicas = self.replicas.write();
        replicas.remove(id);
    }

    /// Create a replication entry
    pub fn create_entry(&self, operation: ReplicationOp, key: Option<&str>, data: &[u8]) -> ReplicationEntry {
        let seq = self.sequence.fetch_add(1, Ordering::SeqCst);

        // Simple CRC32-like checksum
        let checksum = data.iter().fold(0u32, |acc, &b| {
            acc.wrapping_add(b as u32).wrapping_mul(31)
        });

        let entry = ReplicationEntry {
            sequence: seq,
            timestamp: Utc::now(),
            operation,
            key: key.map(String::from),
            data: if self.config.compression {
                self.compress(data)
            } else {
                data.to_vec()
            },
            checksum,
        };

        // Add to log
        let mut log = self.log.write();
        log.push(entry.clone());

        // Trim old entries (keep last 1000)
        if log.len() > 1000 {
            log.drain(0..log.len() - 1000);
        }

        entry
    }

    /// Replicate data to all followers
    pub async fn replicate(&self, operation: ReplicationOp, key: Option<&str>, data: &[u8]) -> Result<()> {
        let entry = self.create_entry(operation, key, data);

        let replicas = self.replicas.read().clone();
        if replicas.is_empty() {
            return Ok(());
        }

        match self.config.mode {
            ReplicationMode::Sync => {
                self.replicate_sync(&entry, &replicas).await
            }
            ReplicationMode::Async => {
                self.replicate_async(entry, replicas);
                Ok(())
            }
            ReplicationMode::SemiSync => {
                self.replicate_semi_sync(&entry, &replicas).await
            }
        }
    }

    /// Replicate to specific nodes (used by RedundancyCoordinator)
    pub async fn replicate_to_nodes(&self, data: &[u8], nodes: &[ClusterNode]) -> Result<()> {
        let entry = self.create_entry(ReplicationOp::Update, None, data);

        let serialized = serde_json::to_vec(&entry)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        for node in nodes {
            let url = format!("{}/replicate", node.address);

            for attempt in 0..self.config.retry_count {
                match self.client.post(&url)
                    .body(serialized.clone())
                    .header("Content-Type", "application/octet-stream")
                    .send()
                    .await
                {
                    Ok(response) if response.status().is_success() => {
                        break;
                    }
                    Ok(_) | Err(_) if attempt < self.config.retry_count - 1 => {
                        tokio::time::sleep(std::time::Duration::from_millis(
                            self.config.retry_delay_ms
                        )).await;
                    }
                    Err(e) => {
                        tracing::warn!("Failed to replicate to {}: {}", node.id, e);
                    }
                    _ => {}
                }
            }
        }

        Ok(())
    }

    /// Synchronous replication - wait for all
    async fn replicate_sync(&self, entry: &ReplicationEntry, replicas: &HashMap<String, ReplicaNode>) -> Result<()> {
        let serialized = serde_json::to_vec(entry)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        let mut failures = Vec::new();

        for replica in replicas.values() {
            if let Err(e) = self.send_to_replica(replica, &serialized).await {
                failures.push((replica.id.clone(), e));
            }
        }

        if !failures.is_empty() {
            return Err(BuildNetError::Distributed(
                format!("Replication failed for {} nodes", failures.len())
            ));
        }

        Ok(())
    }

    /// Asynchronous replication - fire and forget
    fn replicate_async(&self, entry: ReplicationEntry, replicas: HashMap<String, ReplicaNode>) {
        let client = self.client.clone();
        let retry_count = self.config.retry_count;
        let retry_delay = self.config.retry_delay_ms;

        tokio::spawn(async move {
            let serialized = match serde_json::to_vec(&entry) {
                Ok(s) => s,
                Err(e) => {
                    tracing::error!("Failed to serialize replication entry: {}", e);
                    return;
                }
            };

            for replica in replicas.values() {
                let url = format!("{}/replicate", replica.address);

                for attempt in 0..retry_count {
                    match client.post(&url)
                        .body(serialized.clone())
                        .header("Content-Type", "application/octet-stream")
                        .send()
                        .await
                    {
                        Ok(response) if response.status().is_success() => {
                            break;
                        }
                        _ if attempt < retry_count - 1 => {
                            tokio::time::sleep(std::time::Duration::from_millis(retry_delay)).await;
                        }
                        Err(e) => {
                            tracing::warn!("Async replication to {} failed: {}", replica.id, e);
                        }
                        _ => {}
                    }
                }
            }
        });
    }

    /// Semi-synchronous - wait for at least one
    async fn replicate_semi_sync(&self, entry: &ReplicationEntry, replicas: &HashMap<String, ReplicaNode>) -> Result<()> {
        let serialized = serde_json::to_vec(entry)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        let mut success = false;

        for replica in replicas.values() {
            if self.send_to_replica(replica, &serialized).await.is_ok() {
                success = true;
                break;
            }
        }

        if !success {
            return Err(BuildNetError::Distributed(
                "Semi-sync replication failed: no replicas acknowledged".into()
            ));
        }

        Ok(())
    }

    /// Send data to a specific replica
    async fn send_to_replica(&self, replica: &ReplicaNode, data: &[u8]) -> Result<()> {
        let url = format!("{}/replicate", replica.address);

        for attempt in 0..self.config.retry_count {
            match self.client.post(&url)
                .body(data.to_vec())
                .header("Content-Type", "application/octet-stream")
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {
                    return Ok(());
                }
                Ok(response) => {
                    if attempt >= self.config.retry_count - 1 {
                        return Err(BuildNetError::Internal(anyhow::anyhow!(
                            "Replica {} returned status {}", replica.id, response.status()
                        )));
                    }
                }
                Err(e) if attempt >= self.config.retry_count - 1 => {
                    return Err(BuildNetError::Internal(e.into()));
                }
                _ => {}
            }

            tokio::time::sleep(std::time::Duration::from_millis(self.config.retry_delay_ms)).await;
        }

        Ok(())
    }

    /// Apply a received replication entry (for followers)
    pub fn apply_entry(&self, entry: &ReplicationEntry) -> Result<()> {
        // Verify checksum
        let decompressed = if self.config.compression {
            self.decompress(&entry.data)?
        } else {
            entry.data.clone()
        };

        let checksum = decompressed.iter().fold(0u32, |acc, &b| {
            acc.wrapping_add(b as u32).wrapping_mul(31)
        });

        if checksum != entry.checksum {
            return Err(BuildNetError::Internal(anyhow::anyhow!("Checksum mismatch")));
        }

        // Update sequence
        let current = self.sequence.load(Ordering::Relaxed);
        if entry.sequence > current {
            self.sequence.store(entry.sequence, Ordering::Relaxed);
        }

        // Calculate lag
        let lag = (Utc::now() - entry.timestamp).num_milliseconds().max(0) as u64;
        self.lag_ms.store(lag, Ordering::Relaxed);

        Ok(())
    }

    /// Get entries since a sequence number (for catching up)
    pub fn get_entries_since(&self, since_seq: u64) -> Vec<ReplicationEntry> {
        let log = self.log.read();
        log.iter()
            .filter(|e| e.sequence > since_seq)
            .cloned()
            .collect()
    }

    /// Simple compression using run-length encoding
    fn compress(&self, data: &[u8]) -> Vec<u8> {
        // For simplicity, using basic compression
        // In production, use flate2 or lz4
        let mut compressed = Vec::new();
        let mut i = 0;

        while i < data.len() {
            let byte = data[i];
            let mut count = 1u8;

            while i + (count as usize) < data.len()
                && data[i + (count as usize)] == byte
                && count < 255
            {
                count += 1;
            }

            if count >= 4 {
                // Use RLE: 0x00 <count> <byte>
                compressed.push(0x00);
                compressed.push(count);
                compressed.push(byte);
            } else {
                for _ in 0..count {
                    if byte == 0x00 {
                        compressed.push(0x00);
                        compressed.push(1);
                        compressed.push(0x00);
                    } else {
                        compressed.push(byte);
                    }
                }
            }

            i += count as usize;
        }

        compressed
    }

    /// Decompress data
    fn decompress(&self, data: &[u8]) -> Result<Vec<u8>> {
        let mut decompressed = Vec::new();
        let mut i = 0;

        while i < data.len() {
            if data[i] == 0x00 && i + 2 < data.len() {
                let count = data[i + 1];
                let byte = data[i + 2];
                for _ in 0..count {
                    decompressed.push(byte);
                }
                i += 3;
            } else {
                decompressed.push(data[i]);
                i += 1;
            }
        }

        Ok(decompressed)
    }

    /// Get replica status
    pub fn get_replica_status(&self) -> Vec<ReplicaNode> {
        let replicas = self.replicas.read();
        replicas.values().cloned().collect()
    }

    /// Update replica position
    pub fn update_replica_position(&self, id: &str, position: u64) {
        let mut replicas = self.replicas.write();
        if let Some(replica) = replicas.get_mut(id) {
            replica.position = position;
            replica.last_sync = Utc::now();

            let current_seq = self.sequence.load(Ordering::Relaxed);
            replica.lag_bytes = current_seq.saturating_sub(position);
            replica.is_synced = replica.lag_bytes < self.config.max_lag_bytes;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compression_roundtrip() {
        let replicator = StateReplicator::new(ReplicationConfig::default(), "node1").unwrap();

        let original = b"Hello, World! Hello, Hello, Hello!";
        let compressed = replicator.compress(original);
        let decompressed = replicator.decompress(&compressed).unwrap();

        assert_eq!(original.as_slice(), decompressed.as_slice());
    }

    #[test]
    fn test_entry_creation() {
        let replicator = StateReplicator::new(ReplicationConfig::default(), "node1").unwrap();

        let entry1 = replicator.create_entry(ReplicationOp::Insert, Some("key1"), b"data1");
        let entry2 = replicator.create_entry(ReplicationOp::Update, Some("key2"), b"data2");

        assert_eq!(entry1.sequence, 0);
        assert_eq!(entry2.sequence, 1);
    }
}
