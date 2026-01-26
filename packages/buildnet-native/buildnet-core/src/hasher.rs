//! Content hashing for BuildNet
//!
//! Uses xxHash3 for fast incremental hashing and Blake3 for content addressing.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use serde::{Deserialize, Serialize};
use walkdir::WalkDir;
use xxhash_rust::xxh3::xxh3_64;

use crate::Result;

/// File metadata for incremental hashing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMeta {
    pub path: PathBuf,
    pub size: u64,
    pub mtime: u64,
    pub hash: String,
}

/// Content hasher with mtime-based caching
pub struct ContentHasher {
    /// Cached file metadata (path -> meta)
    cache: HashMap<PathBuf, FileMeta>,
}

impl ContentHasher {
    pub fn new() -> Self {
        Self {
            cache: HashMap::new(),
        }
    }

    /// Load cache from a previous state
    pub fn with_cache(cache: HashMap<PathBuf, FileMeta>) -> Self {
        Self { cache }
    }

    /// Hash a single file, using cache if mtime unchanged
    pub fn hash_file(&mut self, path: &Path) -> Result<FileMeta> {
        let metadata = std::fs::metadata(path)?;
        let size = metadata.len();
        let mtime = metadata
            .modified()?
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        // Check cache - if mtime matches, return cached hash
        if let Some(cached) = self.cache.get(path) {
            if cached.size == size && cached.mtime == mtime {
                return Ok(cached.clone());
            }
        }

        // Read and hash file content
        let content = std::fs::read(path)?;
        let hash = format!("{:016x}", xxh3_64(&content));

        let meta = FileMeta {
            path: path.to_path_buf(),
            size,
            mtime,
            hash,
        };

        // Update cache
        self.cache.insert(path.to_path_buf(), meta.clone());

        Ok(meta)
    }

    /// Hash all files matching glob patterns
    pub fn hash_glob(&mut self, root: &Path, patterns: &[String]) -> Result<Vec<FileMeta>> {
        let mut results = Vec::new();

        for pattern in patterns {
            let full_pattern = root.join(pattern);
            let pattern_str = full_pattern.to_string_lossy();

            for entry in glob::glob(&pattern_str).map_err(|e| {
                crate::BuildNetError::InvalidConfig(format!("Invalid glob pattern: {}", e))
            })? {
                match entry {
                    Ok(path) if path.is_file() => {
                        results.push(self.hash_file(&path)?);
                    }
                    Ok(_) => {} // Skip directories
                    Err(e) => {
                        tracing::warn!("Glob error: {}", e);
                    }
                }
            }
        }

        Ok(results)
    }

    /// Hash a directory recursively
    pub fn hash_directory(&mut self, dir: &Path) -> Result<Vec<FileMeta>> {
        let mut results = Vec::new();

        for entry in WalkDir::new(dir).into_iter().filter_map(|e| e.ok()) {
            if entry.file_type().is_file() {
                results.push(self.hash_file(entry.path())?);
            }
        }

        Ok(results)
    }

    /// Compute a combined hash for a set of file hashes
    pub fn combine_hashes(hashes: &[&str]) -> String {
        let combined = hashes.join(":");
        format!("{:016x}", xxh3_64(combined.as_bytes()))
    }

    /// Export cache for persistence
    pub fn export_cache(&self) -> &HashMap<PathBuf, FileMeta> {
        &self.cache
    }

    /// Get cache statistics
    pub fn stats(&self) -> HasherStats {
        HasherStats {
            cached_files: self.cache.len(),
            total_size: self.cache.values().map(|m| m.size).sum(),
        }
    }
}

impl Default for ContentHasher {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HasherStats {
    pub cached_files: usize,
    pub total_size: u64,
}

/// Content-addressed hash using Blake3 (for artifact storage)
pub fn content_hash(data: &[u8]) -> String {
    blake3::hash(data).to_hex().to_string()
}

/// Hash a file using Blake3 for content addressing
pub fn content_hash_file(path: &Path) -> Result<String> {
    let data = std::fs::read(path)?;
    Ok(content_hash(&data))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_hash_file() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        std::fs::write(&file_path, "hello world").unwrap();

        let mut hasher = ContentHasher::new();
        let meta = hasher.hash_file(&file_path).unwrap();

        assert_eq!(meta.size, 11);
        assert!(!meta.hash.is_empty());

        // Second hash should use cache
        let meta2 = hasher.hash_file(&file_path).unwrap();
        assert_eq!(meta.hash, meta2.hash);
    }

    #[test]
    fn test_content_hash() {
        let hash = content_hash(b"hello world");
        assert_eq!(hash.len(), 64); // Blake3 produces 256-bit hash
    }
}
