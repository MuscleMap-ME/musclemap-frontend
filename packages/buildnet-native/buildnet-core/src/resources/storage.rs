//! Storage tier management

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use chrono::{DateTime, Utc, Duration};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use tokio::fs;

use super::{StorageConfig, TieringResult};
use crate::{BuildNetError, Result};

/// Storage tier
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum StorageTier {
    /// Hot storage - frequently accessed, fast
    Hot,
    /// Warm storage - occasionally accessed
    Warm,
    /// Cold storage - rarely accessed, archived
    Cold,
}

impl StorageTier {
    /// Get compression level for this tier
    pub fn compression_level(&self) -> u32 {
        match self {
            StorageTier::Hot => 1,   // Fast compression
            StorageTier::Warm => 6,  // Balanced
            StorageTier::Cold => 9,  // Maximum compression
        }
    }
}

/// Artifact metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtifactMeta {
    /// Artifact ID (content hash)
    pub id: String,
    /// Current storage tier
    pub tier: StorageTier,
    /// File path within tier
    pub path: PathBuf,
    /// Size in bytes
    pub size: u64,
    /// Last accessed time
    pub last_accessed: DateTime<Utc>,
    /// Created time
    pub created: DateTime<Utc>,
    /// Access count
    pub access_count: u64,
}

/// Storage manager
pub struct StorageManager {
    config: StorageConfig,
    /// Artifact metadata indexed by ID
    artifacts: Arc<RwLock<HashMap<String, ArtifactMeta>>>,
    /// Current size per tier
    tier_sizes: Arc<RwLock<HashMap<StorageTier, u64>>>,
}

impl StorageManager {
    /// Create a new storage manager
    pub fn new(config: StorageConfig) -> Self {
        let mut tier_sizes = HashMap::new();
        tier_sizes.insert(StorageTier::Hot, 0);
        tier_sizes.insert(StorageTier::Warm, 0);
        tier_sizes.insert(StorageTier::Cold, 0);

        Self {
            config,
            artifacts: Arc::new(RwLock::new(HashMap::new())),
            tier_sizes: Arc::new(RwLock::new(tier_sizes)),
        }
    }

    /// Initialize storage directories
    pub async fn init(&self) -> Result<()> {
        fs::create_dir_all(&self.config.hot_path).await?;
        fs::create_dir_all(&self.config.warm_path).await?;
        fs::create_dir_all(&self.config.cold_path).await?;
        Ok(())
    }

    /// Get path for a tier
    pub fn tier_path(&self, tier: StorageTier) -> &str {
        match tier {
            StorageTier::Hot => &self.config.hot_path,
            StorageTier::Warm => &self.config.warm_path,
            StorageTier::Cold => &self.config.cold_path,
        }
    }

    /// Get full path for an artifact
    pub fn artifact_path(&self, id: &str, tier: StorageTier) -> PathBuf {
        PathBuf::from(self.tier_path(tier)).join(format!("{}.tar.gz", id))
    }

    /// Record artifact access (updates last_accessed)
    pub fn record_access(&self, id: &str) {
        let mut artifacts = self.artifacts.write();
        if let Some(meta) = artifacts.get_mut(id) {
            meta.last_accessed = Utc::now();
            meta.access_count += 1;
        }
    }

    /// Store artifact metadata
    pub fn store_meta(&self, meta: ArtifactMeta) {
        let mut artifacts = self.artifacts.write();
        let mut sizes = self.tier_sizes.write();

        // Update size tracking
        if let Some(old) = artifacts.get(&meta.id) {
            if let Some(size) = sizes.get_mut(&old.tier) {
                *size = size.saturating_sub(old.size);
            }
        }

        if let Some(size) = sizes.get_mut(&meta.tier) {
            *size += meta.size;
        }

        artifacts.insert(meta.id.clone(), meta);
    }

    /// Get artifact metadata
    pub fn get_meta(&self, id: &str) -> Option<ArtifactMeta> {
        let artifacts = self.artifacts.read();
        artifacts.get(id).cloned()
    }

    /// Get best tier for storing new artifact
    pub fn best_tier_for_store(&self, size: u64) -> StorageTier {
        let sizes = self.tier_sizes.read();
        let hot_size = sizes.get(&StorageTier::Hot).unwrap_or(&0);

        if hot_size + size <= self.config.hot_max_bytes {
            StorageTier::Hot
        } else {
            StorageTier::Warm
        }
    }

    /// Move artifact between tiers
    pub async fn move_tier(&self, id: &str, target_tier: StorageTier) -> Result<()> {
        let source = {
            let artifacts = self.artifacts.read();
            artifacts.get(id).cloned()
        };

        let source = source.ok_or_else(|| BuildNetError::ArtifactNotFound(id.to_string()))?;

        if source.tier == target_tier {
            return Ok(());
        }

        let source_path = self.artifact_path(id, source.tier);
        let target_path = self.artifact_path(id, target_tier);

        // Move file
        fs::rename(&source_path, &target_path).await?;

        // Update metadata
        let mut artifacts = self.artifacts.write();
        let mut sizes = self.tier_sizes.write();

        if let Some(meta) = artifacts.get_mut(id) {
            // Update sizes
            if let Some(size) = sizes.get_mut(&source.tier) {
                *size = size.saturating_sub(meta.size);
            }
            if let Some(size) = sizes.get_mut(&target_tier) {
                *size += meta.size;
            }

            meta.tier = target_tier;
            meta.path = target_path;
        }

        Ok(())
    }

    /// Delete artifact
    pub async fn delete(&self, id: &str) -> Result<()> {
        let meta = {
            let artifacts = self.artifacts.read();
            artifacts.get(id).cloned()
        };

        if let Some(meta) = meta {
            let path = self.artifact_path(id, meta.tier);
            fs::remove_file(&path).await?;

            let mut artifacts = self.artifacts.write();
            let mut sizes = self.tier_sizes.write();

            artifacts.remove(id);
            if let Some(size) = sizes.get_mut(&meta.tier) {
                *size = size.saturating_sub(meta.size);
            }
        }

        Ok(())
    }

    /// Run storage tiering (move artifacts between tiers based on age)
    pub async fn run_tiering(&self) -> Result<TieringResult> {
        let now = Utc::now();
        let hot_threshold = now - Duration::days(self.config.hot_threshold_days as i64);
        let warm_threshold = now - Duration::days(self.config.warm_threshold_days as i64);

        let mut hot_to_warm = 0;
        let mut warm_to_cold = 0;
        let mut deleted = 0;
        let mut bytes_freed = 0u64;

        // Get candidates for tiering
        let candidates: Vec<ArtifactMeta> = {
            let artifacts = self.artifacts.read();
            artifacts.values().cloned().collect()
        };

        for meta in candidates {
            match meta.tier {
                StorageTier::Hot => {
                    if meta.last_accessed < hot_threshold {
                        self.move_tier(&meta.id, StorageTier::Warm).await?;
                        hot_to_warm += 1;
                    }
                }
                StorageTier::Warm => {
                    if meta.last_accessed < warm_threshold {
                        self.move_tier(&meta.id, StorageTier::Cold).await?;
                        warm_to_cold += 1;
                    }
                }
                StorageTier::Cold => {
                    // Delete cold artifacts older than warm_threshold * 2
                    let delete_threshold = now - Duration::days(self.config.warm_threshold_days as i64 * 2);
                    if meta.last_accessed < delete_threshold && meta.access_count < 3 {
                        bytes_freed += meta.size;
                        self.delete(&meta.id).await?;
                        deleted += 1;
                    }
                }
            }
        }

        Ok(TieringResult {
            hot_to_warm,
            warm_to_cold,
            deleted,
            bytes_freed,
        })
    }

    /// Get storage statistics
    pub fn get_stats(&self) -> StorageStats {
        let sizes = self.tier_sizes.read();
        let artifacts = self.artifacts.read();

        let mut hot_count = 0;
        let mut warm_count = 0;
        let mut cold_count = 0;

        for meta in artifacts.values() {
            match meta.tier {
                StorageTier::Hot => hot_count += 1,
                StorageTier::Warm => warm_count += 1,
                StorageTier::Cold => cold_count += 1,
            }
        }

        StorageStats {
            hot_bytes: *sizes.get(&StorageTier::Hot).unwrap_or(&0),
            hot_max_bytes: self.config.hot_max_bytes,
            hot_count,
            warm_bytes: *sizes.get(&StorageTier::Warm).unwrap_or(&0),
            warm_max_bytes: self.config.warm_max_bytes,
            warm_count,
            cold_bytes: *sizes.get(&StorageTier::Cold).unwrap_or(&0),
            cold_count,
        }
    }

    /// Scan storage directories and rebuild metadata
    pub async fn scan_and_rebuild(&self) -> Result<usize> {
        let mut count = 0;

        for tier in [StorageTier::Hot, StorageTier::Warm, StorageTier::Cold] {
            let path = self.tier_path(tier);
            if let Ok(mut entries) = fs::read_dir(path).await {
                while let Ok(Some(entry)) = entries.next_entry().await {
                    let file_path = entry.path();
                    if file_path.extension().map_or(false, |e| e == "gz") {
                        if let Ok(metadata) = entry.metadata().await {
                            let id = file_path
                                .file_stem()
                                .and_then(|s| s.to_str())
                                .map(|s| s.trim_end_matches(".tar"))
                                .unwrap_or_default()
                                .to_string();

                            let modified = metadata.modified()
                                .ok()
                                .map(DateTime::<Utc>::from)
                                .unwrap_or_else(Utc::now);

                            let meta = ArtifactMeta {
                                id: id.clone(),
                                tier,
                                path: file_path,
                                size: metadata.len(),
                                last_accessed: modified,
                                created: modified,
                                access_count: 0,
                            };

                            self.store_meta(meta);
                            count += 1;
                        }
                    }
                }
            }
        }

        Ok(count)
    }
}

/// Storage statistics
#[derive(Debug, Clone, Serialize)]
pub struct StorageStats {
    pub hot_bytes: u64,
    pub hot_max_bytes: u64,
    pub hot_count: usize,
    pub warm_bytes: u64,
    pub warm_max_bytes: u64,
    pub warm_count: usize,
    pub cold_bytes: u64,
    pub cold_count: usize,
}

impl StorageStats {
    /// Get total bytes used
    pub fn total_bytes(&self) -> u64 {
        self.hot_bytes + self.warm_bytes + self.cold_bytes
    }

    /// Get total artifact count
    pub fn total_count(&self) -> usize {
        self.hot_count + self.warm_count + self.cold_count
    }

    /// Get hot tier usage percentage
    pub fn hot_usage_percent(&self) -> f64 {
        if self.hot_max_bytes > 0 {
            (self.hot_bytes as f64 / self.hot_max_bytes as f64) * 100.0
        } else {
            0.0
        }
    }

    /// Get warm tier usage percentage
    pub fn warm_usage_percent(&self) -> f64 {
        if self.warm_max_bytes > 0 {
            (self.warm_bytes as f64 / self.warm_max_bytes as f64) * 100.0
        } else {
            0.0
        }
    }
}
