//! Checkpoint management
//!
//! Creates periodic checkpoints for fast recovery and state synchronization.

use std::path::{Path, PathBuf};
use std::sync::Arc;
use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use flate2::write::GzEncoder;
use flate2::read::GzDecoder;
use flate2::Compression;
use std::io::{Read, Write};

use crate::{BuildNetError, Result};

/// Checkpoint configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckpointConfig {
    /// Interval between checkpoints in seconds
    pub interval_secs: u64,
    /// Maximum number of checkpoints to keep
    pub max_checkpoints: usize,
    /// Compress checkpoints
    pub compression: bool,
}

impl Default for CheckpointConfig {
    fn default() -> Self {
        Self {
            interval_secs: 300, // 5 minutes
            max_checkpoints: 10,
            compression: true,
        }
    }
}

/// Checkpoint metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Checkpoint {
    /// Checkpoint ID
    pub id: String,
    /// Creation time
    pub created_at: DateTime<Utc>,
    /// State sequence number
    pub sequence: u64,
    /// Checkpoint path
    pub path: PathBuf,
    /// Size in bytes (compressed if applicable)
    pub size_bytes: u64,
    /// Original size (before compression)
    pub original_size: u64,
    /// Is compressed
    pub compressed: bool,
    /// Checksum
    pub checksum: String,
}

/// Checkpoint manager
pub struct CheckpointManager {
    /// Data directory
    data_dir: PathBuf,
    /// Configuration
    config: CheckpointConfig,
    /// Checkpoints
    checkpoints: Arc<RwLock<Vec<Checkpoint>>>,
    /// Current sequence
    sequence: Arc<RwLock<u64>>,
    /// Last checkpoint time
    last_checkpoint: Arc<RwLock<Option<DateTime<Utc>>>>,
}

impl CheckpointManager {
    /// Create a new checkpoint manager
    pub fn new(data_dir: &str, config: CheckpointConfig) -> Result<Self> {
        let data_path = PathBuf::from(data_dir);
        let checkpoint_dir = data_path.join("checkpoints");

        // Create checkpoint directory
        if !checkpoint_dir.exists() {
            std::fs::create_dir_all(&checkpoint_dir)
                .map_err(|e| BuildNetError::Internal(e.into()))?;
        }

        // Load existing checkpoints
        let checkpoints = Self::load_checkpoints(&checkpoint_dir)?;

        let last = checkpoints.iter()
            .map(|c| c.created_at)
            .max();

        let max_seq = checkpoints.iter()
            .map(|c| c.sequence)
            .max()
            .unwrap_or(0);

        Ok(Self {
            data_dir: data_path,
            config,
            checkpoints: Arc::new(RwLock::new(checkpoints)),
            sequence: Arc::new(RwLock::new(max_seq)),
            last_checkpoint: Arc::new(RwLock::new(last)),
        })
    }

    /// Load existing checkpoints
    fn load_checkpoints(checkpoint_dir: &Path) -> Result<Vec<Checkpoint>> {
        let manifest_path = checkpoint_dir.join("manifest.json");

        if !manifest_path.exists() {
            return Ok(Vec::new());
        }

        let content = std::fs::read_to_string(&manifest_path)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        let checkpoints: Vec<Checkpoint> = serde_json::from_str(&content)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        // Filter out checkpoints whose files don't exist
        let valid: Vec<_> = checkpoints.into_iter()
            .filter(|c| c.path.exists())
            .collect();

        Ok(valid)
    }

    /// Save checkpoint manifest
    fn save_manifest(&self) -> Result<()> {
        let checkpoint_dir = self.data_dir.join("checkpoints");
        let manifest_path = checkpoint_dir.join("manifest.json");

        let checkpoints = self.checkpoints.read();
        let content = serde_json::to_string_pretty(&*checkpoints)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        std::fs::write(&manifest_path, content)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        Ok(())
    }

    /// Get last checkpoint time
    pub fn last_checkpoint_time(&self) -> Option<DateTime<Utc>> {
        *self.last_checkpoint.read()
    }

    /// Check if a checkpoint is due
    pub fn checkpoint_due(&self) -> bool {
        let last = self.last_checkpoint.read();

        match *last {
            Some(t) => {
                let elapsed = (Utc::now() - t).num_seconds() as u64;
                elapsed >= self.config.interval_secs
            }
            None => true,
        }
    }

    /// Create a checkpoint
    pub async fn create_checkpoint(&self) -> Result<Checkpoint> {
        let checkpoint_dir = self.data_dir.join("checkpoints");
        let id = uuid::Uuid::new_v4().to_string();

        // Increment sequence
        let seq = {
            let mut seq = self.sequence.write();
            *seq += 1;
            *seq
        };

        // Read state database
        let state_db = self.data_dir.join("state.db");
        let data = if state_db.exists() {
            std::fs::read(&state_db)
                .map_err(|e| BuildNetError::Internal(e.into()))?
        } else {
            Vec::new()
        };

        let original_size = data.len() as u64;

        // Compute checksum
        let checksum = self.compute_checksum(&data);

        // Compress if enabled
        let (final_data, compressed) = if self.config.compression && !data.is_empty() {
            let compressed = self.compress(&data)?;
            (compressed, true)
        } else {
            (data, false)
        };

        // Write checkpoint file
        let extension = if compressed { "gz" } else { "db" };
        let filename = format!("checkpoint_{}.{}", id, extension);
        let checkpoint_path = checkpoint_dir.join(&filename);

        std::fs::write(&checkpoint_path, &final_data)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        let size_bytes = final_data.len() as u64;

        let checkpoint = Checkpoint {
            id: id.clone(),
            created_at: Utc::now(),
            sequence: seq,
            path: checkpoint_path,
            size_bytes,
            original_size,
            compressed,
            checksum,
        };

        // Add to list and cleanup old checkpoints
        {
            let mut checkpoints = self.checkpoints.write();
            checkpoints.push(checkpoint.clone());

            // Remove old checkpoints
            while checkpoints.len() > self.config.max_checkpoints {
                if let Some(old) = checkpoints.first() {
                    if old.path.exists() {
                        let _ = std::fs::remove_file(&old.path);
                    }
                }
                checkpoints.remove(0);
            }
        }

        // Update last checkpoint time
        *self.last_checkpoint.write() = Some(Utc::now());

        self.save_manifest()?;

        tracing::info!(
            "Created checkpoint {} (seq={}, size={} -> {} bytes, compressed={})",
            id, seq, original_size, size_bytes, compressed
        );

        Ok(checkpoint)
    }

    /// Restore from a checkpoint
    pub async fn restore_checkpoint(&self, checkpoint_id: &str) -> Result<()> {
        let checkpoints = self.checkpoints.read();
        let checkpoint = checkpoints.iter()
            .find(|c| c.id == checkpoint_id)
            .cloned()
            .ok_or_else(|| BuildNetError::Internal(anyhow::anyhow!(
                "Checkpoint {} not found", checkpoint_id
            )))?;

        drop(checkpoints);

        if !checkpoint.path.exists() {
            return Err(BuildNetError::Internal(anyhow::anyhow!(
                "Checkpoint file not found: {:?}", checkpoint.path
            )));
        }

        // Read checkpoint data
        let data = std::fs::read(&checkpoint.path)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        // Decompress if needed
        let restored_data = if checkpoint.compressed {
            self.decompress(&data)?
        } else {
            data
        };

        // Verify checksum
        let checksum = self.compute_checksum(&restored_data);
        if checksum != checkpoint.checksum {
            return Err(BuildNetError::Internal(anyhow::anyhow!(
                "Checkpoint checksum mismatch"
            )));
        }

        // Backup current state
        let state_db = self.data_dir.join("state.db");
        if state_db.exists() {
            let backup = self.data_dir.join(format!("state.db.pre-restore.{}", Utc::now().timestamp()));
            std::fs::copy(&state_db, &backup)
                .map_err(|e| BuildNetError::Internal(e.into()))?;
        }

        // Write restored data
        std::fs::write(&state_db, &restored_data)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        // Update sequence
        *self.sequence.write() = checkpoint.sequence;

        tracing::info!(
            "Restored checkpoint {} (seq={}, size={})",
            checkpoint_id, checkpoint.sequence, restored_data.len()
        );

        Ok(())
    }

    /// List all checkpoints
    pub fn list_checkpoints(&self) -> Vec<Checkpoint> {
        self.checkpoints.read().clone()
    }

    /// Get the latest checkpoint
    pub fn latest_checkpoint(&self) -> Option<Checkpoint> {
        let checkpoints = self.checkpoints.read();
        checkpoints.iter()
            .filter(|c| c.path.exists())
            .max_by_key(|c| c.sequence)
            .cloned()
    }

    /// Delete a checkpoint
    pub fn delete_checkpoint(&self, checkpoint_id: &str) -> Result<bool> {
        let mut checkpoints = self.checkpoints.write();

        if let Some(pos) = checkpoints.iter().position(|c| c.id == checkpoint_id) {
            let checkpoint = checkpoints.remove(pos);

            if checkpoint.path.exists() {
                std::fs::remove_file(&checkpoint.path)
                    .map_err(|e| BuildNetError::Internal(e.into()))?;
            }

            drop(checkpoints);
            self.save_manifest()?;

            return Ok(true);
        }

        Ok(false)
    }

    /// Compute checksum for data
    fn compute_checksum(&self, data: &[u8]) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        let mut hasher = DefaultHasher::new();
        data.hash(&mut hasher);
        format!("{:016x}", hasher.finish())
    }

    /// Compress data
    fn compress(&self, data: &[u8]) -> Result<Vec<u8>> {
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(data)
            .map_err(|e| BuildNetError::Internal(e.into()))?;
        encoder.finish()
            .map_err(|e| BuildNetError::Internal(e.into()))
    }

    /// Decompress data
    fn decompress(&self, data: &[u8]) -> Result<Vec<u8>> {
        let mut decoder = GzDecoder::new(data);
        let mut decompressed = Vec::new();
        decoder.read_to_end(&mut decompressed)
            .map_err(|e| BuildNetError::Internal(e.into()))?;
        Ok(decompressed)
    }

    /// Get current sequence number
    pub fn sequence(&self) -> u64 {
        *self.sequence.read()
    }

    /// Get storage usage
    pub fn storage_usage(&self) -> u64 {
        let checkpoints = self.checkpoints.read();
        checkpoints.iter().map(|c| c.size_bytes).sum()
    }

    /// Cleanup old checkpoints beyond max
    pub fn cleanup(&self) -> Result<usize> {
        let mut removed = 0;
        let mut checkpoints = self.checkpoints.write();

        while checkpoints.len() > self.config.max_checkpoints {
            if let Some(old) = checkpoints.first() {
                if old.path.exists() {
                    let _ = std::fs::remove_file(&old.path);
                }
                removed += 1;
            }
            checkpoints.remove(0);
        }

        if removed > 0 {
            drop(checkpoints);
            self.save_manifest()?;
        }

        Ok(removed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_checkpoint_creation() {
        let temp = TempDir::new().unwrap();
        let manager = CheckpointManager::new(
            temp.path().to_str().unwrap(),
            CheckpointConfig::default(),
        ).unwrap();

        // Create a dummy state file
        let state_db = temp.path().join("state.db");
        std::fs::write(&state_db, b"test data").unwrap();

        let checkpoint = manager.create_checkpoint().await.unwrap();
        assert!(checkpoint.path.exists());
        assert_eq!(checkpoint.sequence, 1);
    }

    #[tokio::test]
    async fn test_checkpoint_restore() {
        let temp = TempDir::new().unwrap();
        let manager = CheckpointManager::new(
            temp.path().to_str().unwrap(),
            CheckpointConfig::default(),
        ).unwrap();

        // Create state file
        let state_db = temp.path().join("state.db");
        std::fs::write(&state_db, b"original data").unwrap();

        // Create checkpoint
        let checkpoint = manager.create_checkpoint().await.unwrap();

        // Modify state
        std::fs::write(&state_db, b"modified data").unwrap();

        // Restore checkpoint
        manager.restore_checkpoint(&checkpoint.id).await.unwrap();

        // Verify data restored
        let restored = std::fs::read(&state_db).unwrap();
        assert_eq!(restored, b"original data");
    }

    #[test]
    fn test_compression() {
        let temp = TempDir::new().unwrap();
        let manager = CheckpointManager::new(
            temp.path().to_str().unwrap(),
            CheckpointConfig {
                compression: true,
                ..Default::default()
            },
        ).unwrap();

        let original = b"Hello, World! This is test data that should compress well.";
        let compressed = manager.compress(original).unwrap();
        let decompressed = manager.decompress(&compressed).unwrap();

        assert_eq!(original.as_slice(), decompressed.as_slice());
    }
}
