//! Content Addressable Storage (CAS)
//!
//! Stores blobs by their content digest, enabling deduplication and caching.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};

use crate::{BuildNetError, Result};
use super::digest::{Digest, DigestFunction};

/// Content Addressable Storage
pub struct ContentAddressableStorage {
    /// Storage backend
    backend: CasBackendImpl,
    /// Digest function to use
    digest_function: DigestFunction,
    /// Maximum inline size
    max_inline_size: usize,
}

/// CAS backend implementation
enum CasBackendImpl {
    /// Local filesystem storage
    Local(LocalCas),
    /// In-memory storage
    Memory(MemoryCas),
}

/// Local filesystem CAS
struct LocalCas {
    /// Base directory
    base_dir: PathBuf,
}

/// In-memory CAS (for testing)
struct MemoryCas {
    /// Blob storage
    blobs: Arc<RwLock<HashMap<String, Vec<u8>>>>,
}

impl ContentAddressableStorage {
    /// Create a new local CAS
    pub fn local(base_dir: &Path, digest_function: DigestFunction) -> Result<Self> {
        // Create directory structure
        std::fs::create_dir_all(base_dir)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        Ok(Self {
            backend: CasBackendImpl::Local(LocalCas {
                base_dir: base_dir.to_path_buf(),
            }),
            digest_function,
            max_inline_size: 64 * 1024, // 64KB
        })
    }

    /// Create an in-memory CAS (for testing)
    pub fn memory(digest_function: DigestFunction) -> Self {
        Self {
            backend: CasBackendImpl::Memory(MemoryCas {
                blobs: Arc::new(RwLock::new(HashMap::new())),
            }),
            digest_function,
            max_inline_size: 64 * 1024,
        }
    }

    /// Store a blob
    pub async fn put(&self, data: &[u8]) -> Result<Digest> {
        let digest = Digest::from_bytes(data, self.digest_function);

        match &self.backend {
            CasBackendImpl::Local(local) => {
                let path = local.blob_path(&digest);
                if let Some(parent) = path.parent() {
                    std::fs::create_dir_all(parent)
                        .map_err(|e| BuildNetError::Internal(e.into()))?;
                }
                std::fs::write(&path, data)
                    .map_err(|e| BuildNetError::Internal(e.into()))?;
            }
            CasBackendImpl::Memory(mem) => {
                let mut blobs = mem.blobs.write();
                blobs.insert(digest.hash.clone(), data.to_vec());
            }
        }

        Ok(digest)
    }

    /// Get a blob
    pub async fn get(&self, digest: &Digest) -> Result<Option<Vec<u8>>> {
        match &self.backend {
            CasBackendImpl::Local(local) => {
                let path = local.blob_path(digest);
                if path.exists() {
                    let data = std::fs::read(&path)
                        .map_err(|e| BuildNetError::Internal(e.into()))?;

                    // Verify size
                    if data.len() as i64 != digest.size_bytes {
                        return Err(BuildNetError::Internal(anyhow::anyhow!(
                            "Size mismatch: expected {}, got {}", digest.size_bytes, data.len()
                        )));
                    }

                    Ok(Some(data))
                } else {
                    Ok(None)
                }
            }
            CasBackendImpl::Memory(mem) => {
                let blobs = mem.blobs.read();
                Ok(blobs.get(&digest.hash).cloned())
            }
        }
    }

    /// Check if a blob exists
    pub async fn contains(&self, digest: &Digest) -> bool {
        match &self.backend {
            CasBackendImpl::Local(local) => {
                local.blob_path(digest).exists()
            }
            CasBackendImpl::Memory(mem) => {
                let blobs = mem.blobs.read();
                blobs.contains_key(&digest.hash)
            }
        }
    }

    /// Delete a blob
    pub async fn delete(&self, digest: &Digest) -> Result<bool> {
        match &self.backend {
            CasBackendImpl::Local(local) => {
                let path = local.blob_path(digest);
                if path.exists() {
                    std::fs::remove_file(&path)
                        .map_err(|e| BuildNetError::Internal(e.into()))?;
                    Ok(true)
                } else {
                    Ok(false)
                }
            }
            CasBackendImpl::Memory(mem) => {
                let mut blobs = mem.blobs.write();
                Ok(blobs.remove(&digest.hash).is_some())
            }
        }
    }

    /// Find missing blobs from a list
    pub async fn find_missing(&self, digests: &[Digest]) -> Vec<Digest> {
        let mut missing = Vec::new();

        for digest in digests {
            if !self.contains(digest).await {
                missing.push(digest.clone());
            }
        }

        missing
    }

    /// Batch upload blobs
    pub async fn batch_put(&self, blobs: &[(Vec<u8>, Option<Digest>)]) -> Result<Vec<Digest>> {
        let mut digests = Vec::with_capacity(blobs.len());

        for (data, _expected_digest) in blobs {
            let digest = self.put(data).await?;
            digests.push(digest);
        }

        Ok(digests)
    }

    /// Batch download blobs
    pub async fn batch_get(&self, digests: &[Digest]) -> Result<Vec<Option<Vec<u8>>>> {
        let mut results = Vec::with_capacity(digests.len());

        for digest in digests {
            results.push(self.get(digest).await?);
        }

        Ok(results)
    }

    /// Get storage statistics
    pub fn stats(&self) -> CasStats {
        match &self.backend {
            CasBackendImpl::Local(local) => {
                let mut stats = CasStats::default();

                if let Ok(entries) = std::fs::read_dir(&local.base_dir) {
                    for entry in entries.flatten() {
                        if let Ok(metadata) = entry.metadata() {
                            if metadata.is_file() {
                                stats.blob_count += 1;
                                stats.total_size += metadata.len();
                            } else if metadata.is_dir() {
                                // Recursively count
                                stats.blob_count += Self::count_files(&entry.path());
                                stats.total_size += Self::dir_size(&entry.path());
                            }
                        }
                    }
                }

                stats
            }
            CasBackendImpl::Memory(mem) => {
                let blobs = mem.blobs.read();
                CasStats {
                    blob_count: blobs.len(),
                    total_size: blobs.values().map(|v| v.len() as u64).sum(),
                }
            }
        }
    }

    /// Count files in directory recursively
    fn count_files(path: &Path) -> usize {
        let mut count = 0;
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_file() {
                        count += 1;
                    } else if metadata.is_dir() {
                        count += Self::count_files(&entry.path());
                    }
                }
            }
        }
        count
    }

    /// Get total directory size
    fn dir_size(path: &Path) -> u64 {
        let mut size = 0;
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_file() {
                        size += metadata.len();
                    } else if metadata.is_dir() {
                        size += Self::dir_size(&entry.path());
                    }
                }
            }
        }
        size
    }
}

impl LocalCas {
    /// Get path for a blob
    fn blob_path(&self, digest: &Digest) -> PathBuf {
        // Use first 2 chars as sharding prefix
        let prefix = if digest.hash.len() >= 2 {
            &digest.hash[..2]
        } else {
            "00"
        };

        self.base_dir
            .join(prefix)
            .join(&digest.hash)
    }
}

/// CAS statistics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CasStats {
    /// Number of blobs stored
    pub blob_count: usize,
    /// Total size in bytes
    pub total_size: u64,
}

/// Blob store (simplified interface)
pub struct BlobStore {
    /// Inner CAS
    cas: ContentAddressableStorage,
}

impl BlobStore {
    /// Create a new blob store
    pub fn new(cas: ContentAddressableStorage) -> Self {
        Self { cas }
    }

    /// Store data and return digest
    pub async fn store(&self, data: &[u8]) -> Result<Digest> {
        self.cas.put(data).await
    }

    /// Retrieve data by digest
    pub async fn retrieve(&self, digest: &Digest) -> Result<Option<Vec<u8>>> {
        self.cas.get(digest).await
    }

    /// Check existence
    pub async fn exists(&self, digest: &Digest) -> bool {
        self.cas.contains(digest).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_memory_cas() {
        let cas = ContentAddressableStorage::memory(DigestFunction::Sha256);

        let data = b"Hello, World!";
        let digest = cas.put(data).await.unwrap();

        assert!(cas.contains(&digest).await);

        let retrieved = cas.get(&digest).await.unwrap().unwrap();
        assert_eq!(retrieved, data);
    }

    #[tokio::test]
    async fn test_find_missing() {
        let cas = ContentAddressableStorage::memory(DigestFunction::Sha256);

        let digest1 = cas.put(b"data1").await.unwrap();
        let digest2 = Digest::new("nonexistent", 5);

        let missing = cas.find_missing(&[digest1, digest2]).await;
        assert_eq!(missing.len(), 1);
        assert_eq!(missing[0].hash, "nonexistent");
    }
}
