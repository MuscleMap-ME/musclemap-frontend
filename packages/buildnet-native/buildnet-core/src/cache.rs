//! Content-addressed artifact cache for BuildNet
//!
//! Stores build artifacts by their content hash for deduplication and fast restoration.

use std::path::{Path, PathBuf};

use flate2::read::GzDecoder;
use flate2::write::GzEncoder;
use flate2::Compression;
use serde::{Deserialize, Serialize};
use tar::{Archive, Builder};

use crate::hasher::content_hash;
use crate::{BuildNetError, Result};

/// Artifact metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtifactMeta {
    pub hash: String,
    pub package: String,
    pub size: u64,
    pub file_count: usize,
    pub created_at: chrono::DateTime<chrono::Utc>,
    /// Last time this artifact was accessed (for LRU eviction)
    #[serde(default = "chrono::Utc::now")]
    pub last_used_at: chrono::DateTime<chrono::Utc>,
}

/// Content-addressed artifact cache
pub struct ArtifactCache {
    /// Root directory for cache storage
    cache_dir: PathBuf,
}

impl ArtifactCache {
    /// Create a new artifact cache
    pub fn new(cache_dir: &Path) -> Result<Self> {
        std::fs::create_dir_all(cache_dir)?;

        Ok(Self {
            cache_dir: cache_dir.to_path_buf(),
        })
    }

    /// Get the path for an artifact by its hash
    fn artifact_path(&self, hash: &str) -> PathBuf {
        // Use first 2 characters as subdirectory for better filesystem performance
        let subdir = &hash[..2.min(hash.len())];
        self.cache_dir.join(subdir).join(format!("{}.tar.gz", hash))
    }

    /// Get the metadata path for an artifact
    fn meta_path(&self, hash: &str) -> PathBuf {
        let subdir = &hash[..2.min(hash.len())];
        self.cache_dir.join(subdir).join(format!("{}.json", hash))
    }

    /// Store a directory as an artifact
    pub fn store(&self, package: &str, source_dir: &Path) -> Result<String> {
        // Create tarball in memory first to compute hash
        let mut tar_data = Vec::new();
        {
            let encoder = GzEncoder::new(&mut tar_data, Compression::fast());
            let mut builder = Builder::new(encoder);

            // Add all files from the directory
            builder.append_dir_all(".", source_dir)?;
            builder.into_inner()?.finish()?;
        }

        // Compute content hash
        let hash = content_hash(&tar_data);

        // Get artifact path
        let artifact_path = self.artifact_path(&hash);

        // Only store if not already cached
        if !artifact_path.exists() {
            // Create parent directory
            if let Some(parent) = artifact_path.parent() {
                std::fs::create_dir_all(parent)?;
            }

            // Write tarball
            std::fs::write(&artifact_path, &tar_data)?;

            // Count files and write metadata
            let file_count = count_files(source_dir)?;
            let now = chrono::Utc::now();
            let meta = ArtifactMeta {
                hash: hash.clone(),
                package: package.to_string(),
                size: tar_data.len() as u64,
                file_count,
                created_at: now,
                last_used_at: now,
            };

            let meta_json = serde_json::to_string_pretty(&meta)?;
            std::fs::write(self.meta_path(&hash), meta_json)?;

            tracing::info!(
                "Stored artifact {} for package {} ({} bytes, {} files)",
                &hash[..8],
                package,
                tar_data.len(),
                file_count
            );
        } else {
            tracing::debug!("Artifact {} already cached", &hash[..8]);
        }

        Ok(hash)
    }

    /// Update the last_used_at timestamp for an artifact (for LRU tracking)
    fn touch(&self, hash: &str) -> Result<()> {
        let meta_path = self.meta_path(hash);

        if !meta_path.exists() {
            return Ok(()); // No metadata to update
        }

        if let Ok(meta_json) = std::fs::read_to_string(&meta_path) {
            if let Ok(mut meta) = serde_json::from_str::<ArtifactMeta>(&meta_json) {
                meta.last_used_at = chrono::Utc::now();
                if let Ok(updated_json) = serde_json::to_string_pretty(&meta) {
                    // Ignore write errors - touch is best-effort
                    let _ = std::fs::write(&meta_path, updated_json);
                }
            }
        }

        Ok(())
    }

    /// Restore an artifact to a directory
    pub fn restore(&self, hash: &str, target_dir: &Path) -> Result<()> {
        let artifact_path = self.artifact_path(hash);

        if !artifact_path.exists() {
            return Err(BuildNetError::ArtifactNotFound(hash.to_string()));
        }

        // Update last_used_at for LRU tracking
        self.touch(hash)?;

        // Clear target directory
        if target_dir.exists() {
            std::fs::remove_dir_all(target_dir)?;
        }
        std::fs::create_dir_all(target_dir)?;

        // Extract tarball
        let tar_data = std::fs::read(&artifact_path)?;

        // Verify hash
        let actual_hash = content_hash(&tar_data);
        if actual_hash != hash {
            return Err(BuildNetError::HashMismatch {
                expected: hash.to_string(),
                actual: actual_hash,
            });
        }

        let decoder = GzDecoder::new(&tar_data[..]);
        let mut archive = Archive::new(decoder);
        archive.unpack(target_dir)?;

        tracing::info!("Restored artifact {} to {:?}", &hash[..8], target_dir);

        Ok(())
    }

    /// Check if an artifact exists
    pub fn exists(&self, hash: &str) -> bool {
        self.artifact_path(hash).exists()
    }

    /// Get artifact metadata
    pub fn get_meta(&self, hash: &str) -> Result<Option<ArtifactMeta>> {
        let meta_path = self.meta_path(hash);

        if !meta_path.exists() {
            return Ok(None);
        }

        let meta_json = std::fs::read_to_string(meta_path)?;
        let meta: ArtifactMeta = serde_json::from_str(&meta_json)?;

        Ok(Some(meta))
    }

    /// Remove an artifact
    pub fn remove(&self, hash: &str) -> Result<()> {
        let artifact_path = self.artifact_path(hash);
        let meta_path = self.meta_path(hash);

        if artifact_path.exists() {
            std::fs::remove_file(&artifact_path)?;
        }
        if meta_path.exists() {
            std::fs::remove_file(&meta_path)?;
        }

        Ok(())
    }

    /// Get cache statistics
    pub fn stats(&self) -> Result<CacheStats> {
        let mut total_size = 0u64;
        let mut artifact_count = 0usize;

        for entry in walkdir::WalkDir::new(&self.cache_dir)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_file() && entry.path().extension().map_or(false, |e| e == "gz")
            {
                total_size += entry.metadata().map(|m| m.len()).unwrap_or(0);
                artifact_count += 1;
            }
        }

        Ok(CacheStats {
            cache_dir: self.cache_dir.clone(),
            total_size,
            artifact_count,
        })
    }

    /// Clean old artifacts (LRU eviction)
    pub fn clean(&self, max_size: u64) -> Result<usize> {
        let stats = self.stats()?;

        if stats.total_size <= max_size {
            return Ok(0);
        }

        // Collect all artifacts with their metadata
        let mut artifacts: Vec<(PathBuf, ArtifactMeta)> = Vec::new();

        for entry in walkdir::WalkDir::new(&self.cache_dir)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_file()
                && entry.path().extension().map_or(false, |e| e == "json")
            {
                if let Ok(meta_json) = std::fs::read_to_string(entry.path()) {
                    if let Ok(meta) = serde_json::from_str::<ArtifactMeta>(&meta_json) {
                        artifacts.push((entry.path().to_path_buf(), meta));
                    }
                }
            }
        }

        // Sort by last_used_at time (least recently used first) - true LRU eviction
        artifacts.sort_by(|a, b| a.1.last_used_at.cmp(&b.1.last_used_at));

        let mut removed = 0;
        let mut current_size = stats.total_size;

        for (meta_path, meta) in artifacts {
            if current_size <= max_size {
                break;
            }

            self.remove(&meta.hash)?;
            current_size = current_size.saturating_sub(meta.size);
            removed += 1;

            tracing::info!(
                "Evicted artifact {} ({} bytes)",
                &meta.hash[..8],
                meta.size
            );
        }

        Ok(removed)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheStats {
    pub cache_dir: PathBuf,
    pub total_size: u64,
    pub artifact_count: usize,
}

fn count_files(dir: &Path) -> Result<usize> {
    let mut count = 0;
    for entry in walkdir::WalkDir::new(dir).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            count += 1;
        }
    }
    Ok(count)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_store_and_restore() {
        let cache_dir = tempdir().unwrap();
        let source_dir = tempdir().unwrap();
        let target_dir = tempdir().unwrap();

        // Create some test files
        std::fs::write(source_dir.path().join("file1.txt"), "hello").unwrap();
        std::fs::write(source_dir.path().join("file2.txt"), "world").unwrap();

        let cache = ArtifactCache::new(cache_dir.path()).unwrap();

        // Store
        let hash = cache.store("test-package", source_dir.path()).unwrap();
        assert!(!hash.is_empty());
        assert!(cache.exists(&hash));

        // Restore
        cache.restore(&hash, target_dir.path()).unwrap();

        // Verify
        assert_eq!(
            std::fs::read_to_string(target_dir.path().join("file1.txt")).unwrap(),
            "hello"
        );
        assert_eq!(
            std::fs::read_to_string(target_dir.path().join("file2.txt")).unwrap(),
            "world"
        );
    }

    #[test]
    fn test_deduplication() {
        let cache_dir = tempdir().unwrap();
        let source_dir = tempdir().unwrap();

        std::fs::write(source_dir.path().join("file.txt"), "content").unwrap();

        let cache = ArtifactCache::new(cache_dir.path()).unwrap();

        // Store twice
        let hash1 = cache.store("pkg1", source_dir.path()).unwrap();
        let hash2 = cache.store("pkg2", source_dir.path()).unwrap();

        // Same content = same hash
        assert_eq!(hash1, hash2);

        // Only one artifact stored
        let stats = cache.stats().unwrap();
        assert_eq!(stats.artifact_count, 1);
    }
}
