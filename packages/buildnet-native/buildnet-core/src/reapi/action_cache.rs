//! Action Cache
//!
//! Caches action results to avoid re-executing identical actions.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use chrono::{DateTime, Utc, Duration};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};

use crate::{BuildNetError, Result};
use super::digest::Digest;
use super::{OutputFile, OutputDirectory, LogFile};

/// Action cache
pub struct ActionCache {
    /// Cache storage
    storage: ActionCacheStorage,
    /// TTL for cached actions
    ttl: Duration,
}

/// Cache storage backend
enum ActionCacheStorage {
    /// In-memory cache
    Memory(Arc<RwLock<HashMap<String, CachedAction>>>),
    /// File-based cache
    File(FileCacheStorage),
}

/// File-based cache storage
struct FileCacheStorage {
    /// Base directory
    base_dir: PathBuf,
}

/// Cached action entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedAction {
    /// Action digest (key)
    pub action_digest: Digest,
    /// Action result
    pub result: ActionResult,
    /// When this was cached
    pub cached_at: DateTime<Utc>,
    /// Expiration time
    pub expires_at: DateTime<Utc>,
    /// Number of times this cache entry was hit
    pub hit_count: u64,
}

/// Result of an action execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionResult {
    /// Output files
    pub output_files: Vec<OutputFile>,
    /// Output directories
    pub output_directories: Vec<OutputDirectory>,
    /// Exit code
    pub exit_code: i32,
    /// Stdout digest (if captured)
    pub stdout_digest: Option<Digest>,
    /// Stderr digest (if captured)
    pub stderr_digest: Option<Digest>,
    /// Stdout raw (if small)
    pub stdout_raw: Option<Vec<u8>>,
    /// Stderr raw (if small)
    pub stderr_raw: Option<Vec<u8>>,
    /// Execution metadata
    pub execution_metadata: ExecutionMetadata,
}

/// Execution metadata
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExecutionMetadata {
    /// Worker that executed the action
    pub worker: Option<String>,
    /// Queue time in milliseconds
    pub queued_ms: u64,
    /// Worker start to completion time in milliseconds
    pub worker_ms: u64,
    /// Input fetch time in milliseconds
    pub input_fetch_ms: u64,
    /// Execution time in milliseconds
    pub execution_ms: u64,
    /// Output upload time in milliseconds
    pub output_upload_ms: u64,
    /// Virtual execution timestamp
    pub virtual_execution_timestamp: Option<DateTime<Utc>>,
}

impl ActionCache {
    /// Create an in-memory action cache
    pub fn memory(ttl_secs: u64) -> Self {
        Self {
            storage: ActionCacheStorage::Memory(Arc::new(RwLock::new(HashMap::new()))),
            ttl: Duration::seconds(ttl_secs as i64),
        }
    }

    /// Create a file-based action cache
    pub fn file(base_dir: &Path, ttl_secs: u64) -> Result<Self> {
        std::fs::create_dir_all(base_dir)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        Ok(Self {
            storage: ActionCacheStorage::File(FileCacheStorage {
                base_dir: base_dir.to_path_buf(),
            }),
            ttl: Duration::seconds(ttl_secs as i64),
        })
    }

    /// Get action result from cache
    pub async fn get(&self, action_digest: &Digest) -> Option<ActionResult> {
        let cached = match &self.storage {
            ActionCacheStorage::Memory(cache) => {
                let mut cache = cache.write();
                if let Some(entry) = cache.get_mut(&action_digest.hash) {
                    // Check expiration
                    if Utc::now() < entry.expires_at {
                        entry.hit_count += 1;
                        Some(entry.clone())
                    } else {
                        cache.remove(&action_digest.hash);
                        None
                    }
                } else {
                    None
                }
            }
            ActionCacheStorage::File(storage) => {
                let path = storage.cache_path(action_digest);
                if path.exists() {
                    match std::fs::read_to_string(&path) {
                        Ok(content) => {
                            match serde_json::from_str::<CachedAction>(&content) {
                                Ok(mut entry) if Utc::now() < entry.expires_at => {
                                    entry.hit_count += 1;
                                    // Update hit count
                                    let _ = std::fs::write(&path, serde_json::to_string(&entry).unwrap());
                                    Some(entry)
                                }
                                _ => {
                                    // Expired or corrupted, remove
                                    let _ = std::fs::remove_file(&path);
                                    None
                                }
                            }
                        }
                        Err(_) => None,
                    }
                } else {
                    None
                }
            }
        };

        cached.map(|c| c.result)
    }

    /// Store action result in cache
    pub async fn put(&self, action_digest: Digest, result: ActionResult) -> Result<()> {
        let now = Utc::now();
        let cached = CachedAction {
            action_digest: action_digest.clone(),
            result,
            cached_at: now,
            expires_at: now + self.ttl,
            hit_count: 0,
        };

        match &self.storage {
            ActionCacheStorage::Memory(cache) => {
                let mut cache = cache.write();
                cache.insert(action_digest.hash, cached);
            }
            ActionCacheStorage::File(storage) => {
                let path = storage.cache_path(&action_digest);
                if let Some(parent) = path.parent() {
                    std::fs::create_dir_all(parent)
                        .map_err(|e| BuildNetError::Internal(e.into()))?;
                }

                let content = serde_json::to_string_pretty(&cached)
                    .map_err(|e| BuildNetError::Internal(e.into()))?;

                std::fs::write(&path, content)
                    .map_err(|e| BuildNetError::Internal(e.into()))?;
            }
        }

        Ok(())
    }

    /// Check if action is cached
    pub async fn contains(&self, action_digest: &Digest) -> bool {
        match &self.storage {
            ActionCacheStorage::Memory(cache) => {
                let cache = cache.read();
                if let Some(entry) = cache.get(&action_digest.hash) {
                    Utc::now() < entry.expires_at
                } else {
                    false
                }
            }
            ActionCacheStorage::File(storage) => {
                let path = storage.cache_path(action_digest);
                if path.exists() {
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        if let Ok(entry) = serde_json::from_str::<CachedAction>(&content) {
                            return Utc::now() < entry.expires_at;
                        }
                    }
                }
                false
            }
        }
    }

    /// Delete action from cache
    pub async fn delete(&self, action_digest: &Digest) -> bool {
        match &self.storage {
            ActionCacheStorage::Memory(cache) => {
                let mut cache = cache.write();
                cache.remove(&action_digest.hash).is_some()
            }
            ActionCacheStorage::File(storage) => {
                let path = storage.cache_path(action_digest);
                if path.exists() {
                    std::fs::remove_file(&path).is_ok()
                } else {
                    false
                }
            }
        }
    }

    /// Clear all expired entries
    pub async fn cleanup(&self) -> usize {
        let now = Utc::now();
        let mut removed = 0;

        match &self.storage {
            ActionCacheStorage::Memory(cache) => {
                let mut cache = cache.write();
                let expired: Vec<_> = cache.iter()
                    .filter(|(_, v)| v.expires_at <= now)
                    .map(|(k, _)| k.clone())
                    .collect();

                for key in expired {
                    cache.remove(&key);
                    removed += 1;
                }
            }
            ActionCacheStorage::File(storage) => {
                if let Ok(entries) = Self::walk_dir(&storage.base_dir) {
                    for path in entries {
                        if let Ok(content) = std::fs::read_to_string(&path) {
                            if let Ok(entry) = serde_json::from_str::<CachedAction>(&content) {
                                if entry.expires_at <= now {
                                    let _ = std::fs::remove_file(&path);
                                    removed += 1;
                                }
                            }
                        }
                    }
                }
            }
        }

        removed
    }

    /// Get cache statistics
    pub fn stats(&self) -> ActionCacheStats {
        match &self.storage {
            ActionCacheStorage::Memory(cache) => {
                let cache = cache.read();
                let now = Utc::now();

                let valid_entries: Vec<_> = cache.values()
                    .filter(|e| e.expires_at > now)
                    .collect();

                ActionCacheStats {
                    total_entries: valid_entries.len(),
                    total_hits: valid_entries.iter().map(|e| e.hit_count).sum(),
                    oldest_entry: valid_entries.iter().map(|e| e.cached_at).min(),
                    newest_entry: valid_entries.iter().map(|e| e.cached_at).max(),
                }
            }
            ActionCacheStorage::File(storage) => {
                let mut stats = ActionCacheStats::default();
                let now = Utc::now();

                if let Ok(entries) = Self::walk_dir(&storage.base_dir) {
                    for path in entries {
                        if let Ok(content) = std::fs::read_to_string(&path) {
                            if let Ok(entry) = serde_json::from_str::<CachedAction>(&content) {
                                if entry.expires_at > now {
                                    stats.total_entries += 1;
                                    stats.total_hits += entry.hit_count;

                                    match stats.oldest_entry {
                                        Some(oldest) if entry.cached_at < oldest => {
                                            stats.oldest_entry = Some(entry.cached_at);
                                        }
                                        None => {
                                            stats.oldest_entry = Some(entry.cached_at);
                                        }
                                        _ => {}
                                    }

                                    match stats.newest_entry {
                                        Some(newest) if entry.cached_at > newest => {
                                            stats.newest_entry = Some(entry.cached_at);
                                        }
                                        None => {
                                            stats.newest_entry = Some(entry.cached_at);
                                        }
                                        _ => {}
                                    }
                                }
                            }
                        }
                    }
                }

                stats
            }
        }
    }

    /// Walk directory recursively
    fn walk_dir(path: &Path) -> Result<Vec<PathBuf>> {
        let mut files = Vec::new();

        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() && path.extension().map(|e| e == "json").unwrap_or(false) {
                    files.push(path);
                } else if path.is_dir() {
                    files.extend(Self::walk_dir(&path)?);
                }
            }
        }

        Ok(files)
    }
}

impl FileCacheStorage {
    /// Get cache file path for an action
    fn cache_path(&self, digest: &Digest) -> PathBuf {
        let prefix = if digest.hash.len() >= 2 {
            &digest.hash[..2]
        } else {
            "00"
        };

        self.base_dir
            .join(prefix)
            .join(format!("{}.json", digest.hash))
    }
}

/// Action cache statistics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ActionCacheStats {
    /// Total valid entries
    pub total_entries: usize,
    /// Total cache hits
    pub total_hits: u64,
    /// Oldest entry timestamp
    pub oldest_entry: Option<DateTime<Utc>>,
    /// Newest entry timestamp
    pub newest_entry: Option<DateTime<Utc>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_memory_cache() {
        let cache = ActionCache::memory(3600);

        let action_digest = Digest::new("test123", 100);
        let result = ActionResult {
            output_files: vec![],
            output_directories: vec![],
            exit_code: 0,
            stdout_digest: None,
            stderr_digest: None,
            stdout_raw: Some(b"Hello".to_vec()),
            stderr_raw: None,
            execution_metadata: ExecutionMetadata::default(),
        };

        cache.put(action_digest.clone(), result.clone()).await.unwrap();
        assert!(cache.contains(&action_digest).await);

        let retrieved = cache.get(&action_digest).await.unwrap();
        assert_eq!(retrieved.exit_code, 0);
    }

    #[tokio::test]
    async fn test_cache_expiration() {
        // Create cache with 1 second TTL
        let cache = ActionCache {
            storage: ActionCacheStorage::Memory(Arc::new(RwLock::new(HashMap::new()))),
            ttl: Duration::milliseconds(1),
        };

        let action_digest = Digest::new("test456", 100);
        let result = ActionResult {
            output_files: vec![],
            output_directories: vec![],
            exit_code: 0,
            stdout_digest: None,
            stderr_digest: None,
            stdout_raw: None,
            stderr_raw: None,
            execution_metadata: ExecutionMetadata::default(),
        };

        cache.put(action_digest.clone(), result).await.unwrap();

        // Wait for expiration
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;

        assert!(!cache.contains(&action_digest).await);
        assert!(cache.get(&action_digest).await.is_none());
    }
}
