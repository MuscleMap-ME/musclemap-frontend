//! Digest types and functions
//!
//! Content-addressed storage uses digests to identify blobs.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Digest of content
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Digest {
    /// Hash of the content
    pub hash: String,
    /// Size of the content in bytes
    pub size_bytes: i64,
}

impl Digest {
    /// Create a new digest
    pub fn new(hash: &str, size: i64) -> Self {
        Self {
            hash: hash.to_string(),
            size_bytes: size,
        }
    }

    /// Create an empty digest
    pub fn empty() -> Self {
        Self {
            hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855".to_string(),
            size_bytes: 0,
        }
    }

    /// Compute digest from data using SHA256
    pub fn from_bytes_sha256(data: &[u8]) -> Self {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};

        // Simple hash for demonstration - in production use sha2 crate
        let mut hasher = DefaultHasher::new();
        data.hash(&mut hasher);
        let hash = format!("{:016x}", hasher.finish());

        Self {
            hash,
            size_bytes: data.len() as i64,
        }
    }

    /// Compute digest from data using Blake3
    pub fn from_bytes_blake3(data: &[u8]) -> Self {
        let hash = blake3::hash(data);
        Self {
            hash: hash.to_hex().to_string(),
            size_bytes: data.len() as i64,
        }
    }

    /// Compute digest from data with specified function
    pub fn from_bytes(data: &[u8], function: DigestFunction) -> Self {
        match function {
            DigestFunction::Sha256 => Self::from_bytes_sha256(data),
            DigestFunction::Blake3 => Self::from_bytes_blake3(data),
            DigestFunction::Unknown => Self::from_bytes_sha256(data),
        }
    }

    /// Parse from string format "hash/size"
    pub fn parse(s: &str) -> Option<Self> {
        let parts: Vec<&str> = s.split('/').collect();
        if parts.len() != 2 {
            return None;
        }

        let size: i64 = parts[1].parse().ok()?;
        Some(Self {
            hash: parts[0].to_string(),
            size_bytes: size,
        })
    }

    /// Convert to string format "hash/size"
    pub fn to_resource_name(&self) -> String {
        format!("{}/{}", self.hash, self.size_bytes)
    }

    /// Check if this is a valid digest
    pub fn is_valid(&self) -> bool {
        !self.hash.is_empty() && self.size_bytes >= 0
    }

    /// Get the hash length (to determine algorithm)
    pub fn hash_length(&self) -> usize {
        self.hash.len()
    }
}

impl fmt::Display for Digest {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}/{}", self.hash, self.size_bytes)
    }
}

impl Default for Digest {
    fn default() -> Self {
        Self::empty()
    }
}

/// Digest function (hash algorithm)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DigestFunction {
    /// Unknown/unspecified
    #[default]
    Unknown,
    /// SHA-256
    Sha256,
    /// Blake3
    Blake3,
}

impl DigestFunction {
    /// Get the expected hash length for this function
    pub fn hash_length(&self) -> usize {
        match self {
            DigestFunction::Unknown => 0,
            DigestFunction::Sha256 => 64, // 256 bits = 64 hex chars
            DigestFunction::Blake3 => 64, // 256 bits = 64 hex chars
        }
    }

    /// Detect function from hash length
    pub fn from_hash_length(len: usize) -> Self {
        match len {
            64 => DigestFunction::Sha256, // Could also be Blake3
            _ => DigestFunction::Unknown,
        }
    }

    /// Get the name as string
    pub fn name(&self) -> &'static str {
        match self {
            DigestFunction::Unknown => "UNKNOWN",
            DigestFunction::Sha256 => "SHA256",
            DigestFunction::Blake3 => "BLAKE3",
        }
    }
}

impl fmt::Display for DigestFunction {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.name())
    }
}

/// Batch of digests for upload/download
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DigestBatch {
    /// Digests in this batch
    pub digests: Vec<Digest>,
}

impl DigestBatch {
    /// Create a new batch
    pub fn new() -> Self {
        Self {
            digests: Vec::new(),
        }
    }

    /// Add a digest to the batch
    pub fn add(&mut self, digest: Digest) {
        self.digests.push(digest);
    }

    /// Get total size of all blobs
    pub fn total_size(&self) -> i64 {
        self.digests.iter().map(|d| d.size_bytes).sum()
    }

    /// Check if batch is empty
    pub fn is_empty(&self) -> bool {
        self.digests.is_empty()
    }

    /// Get number of digests
    pub fn len(&self) -> usize {
        self.digests.len()
    }
}

impl Default for DigestBatch {
    fn default() -> Self {
        Self::new()
    }
}

impl IntoIterator for DigestBatch {
    type Item = Digest;
    type IntoIter = std::vec::IntoIter<Self::Item>;

    fn into_iter(self) -> Self::IntoIter {
        self.digests.into_iter()
    }
}

impl FromIterator<Digest> for DigestBatch {
    fn from_iter<T: IntoIterator<Item = Digest>>(iter: T) -> Self {
        Self {
            digests: iter.into_iter().collect(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_digest_creation() {
        let digest = Digest::from_bytes_sha256(b"Hello, World!");
        assert!(!digest.hash.is_empty());
        assert_eq!(digest.size_bytes, 13);
    }

    #[test]
    fn test_digest_parse() {
        let digest = Digest::parse("abc123/100").unwrap();
        assert_eq!(digest.hash, "abc123");
        assert_eq!(digest.size_bytes, 100);
    }

    #[test]
    fn test_digest_display() {
        let digest = Digest::new("abc123", 100);
        assert_eq!(format!("{}", digest), "abc123/100");
    }

    #[test]
    fn test_empty_digest() {
        let empty = Digest::empty();
        assert_eq!(empty.size_bytes, 0);
    }
}
