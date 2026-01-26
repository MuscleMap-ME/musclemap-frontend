//! Cargo target and artifact management

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

use crate::{BuildNetError, Result};

/// Target triple (e.g., x86_64-unknown-linux-gnu)
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct TargetTriple(pub String);

impl TargetTriple {
    /// Get the host target triple
    pub fn host() -> Self {
        // Use rustc to determine host triple
        let output = std::process::Command::new("rustc")
            .args(["--version", "--verbose"])
            .output();

        if let Ok(output) = output {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if line.starts_with("host:") {
                    let triple = line.trim_start_matches("host:").trim();
                    return TargetTriple(triple.to_string());
                }
            }
        }

        // Fallback to compile-time target
        TargetTriple(std::env::consts::ARCH.to_string() + "-unknown-" + std::env::consts::OS)
    }

    /// Common cross-compilation targets
    pub fn common_targets() -> Vec<Self> {
        vec![
            TargetTriple("x86_64-unknown-linux-gnu".into()),
            TargetTriple("x86_64-unknown-linux-musl".into()),
            TargetTriple("aarch64-unknown-linux-gnu".into()),
            TargetTriple("x86_64-apple-darwin".into()),
            TargetTriple("aarch64-apple-darwin".into()),
            TargetTriple("x86_64-pc-windows-msvc".into()),
            TargetTriple("x86_64-pc-windows-gnu".into()),
        ]
    }

    /// Check if this is a Linux target
    pub fn is_linux(&self) -> bool {
        self.0.contains("linux")
    }

    /// Check if this is a macOS target
    pub fn is_macos(&self) -> bool {
        self.0.contains("darwin") || self.0.contains("apple")
    }

    /// Check if this is a Windows target
    pub fn is_windows(&self) -> bool {
        self.0.contains("windows")
    }

    /// Check if this is a musl target (static linking)
    pub fn is_musl(&self) -> bool {
        self.0.contains("musl")
    }

    /// Get the binary extension for this target
    pub fn binary_extension(&self) -> &'static str {
        if self.is_windows() {
            ".exe"
        } else {
            ""
        }
    }

    /// Get the library extension for this target
    pub fn library_extension(&self, static_lib: bool) -> &'static str {
        if static_lib {
            if self.is_windows() {
                ".lib"
            } else {
                ".a"
            }
        } else if self.is_windows() {
            ".dll"
        } else if self.is_macos() {
            ".dylib"
        } else {
            ".so"
        }
    }
}

impl Default for TargetTriple {
    fn default() -> Self {
        Self::host()
    }
}

impl std::fmt::Display for TargetTriple {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Build artifact information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildArtifact {
    /// Artifact name
    pub name: String,
    /// Artifact type
    pub artifact_type: ArtifactType,
    /// Path to the artifact
    pub path: PathBuf,
    /// File size in bytes
    pub size: u64,
    /// Hash of the artifact content
    pub hash: String,
    /// Target triple
    pub target: TargetTriple,
    /// Profile (debug/release)
    pub profile: String,
    /// Build timestamp
    pub built_at: DateTime<Utc>,
    /// Features enabled
    pub features: Vec<String>,
}

/// Type of build artifact
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ArtifactType {
    /// Binary executable
    Binary,
    /// Static library (.a, .lib)
    StaticLib,
    /// Dynamic library (.so, .dylib, .dll)
    DynamicLib,
    /// Procedural macro
    ProcMacro,
    /// rlib (Rust library)
    Rlib,
    /// cdylib (C-compatible dynamic library)
    Cdylib,
}

impl ArtifactType {
    /// Get the file extension for this artifact type
    pub fn extension(&self, target: &TargetTriple) -> &'static str {
        match self {
            ArtifactType::Binary => target.binary_extension(),
            ArtifactType::StaticLib => target.library_extension(true),
            ArtifactType::DynamicLib | ArtifactType::Cdylib => target.library_extension(false),
            ArtifactType::ProcMacro => target.library_extension(false),
            ArtifactType::Rlib => ".rlib",
        }
    }
}

/// Cache for compiled targets
pub struct TargetCache {
    /// Cache directory
    cache_dir: PathBuf,
    /// Cached artifacts index
    index: parking_lot::RwLock<HashMap<String, Vec<CachedArtifact>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CachedArtifact {
    /// Artifact info
    artifact: BuildArtifact,
    /// Source hash (for cache invalidation)
    source_hash: String,
    /// Cache file path
    cache_path: PathBuf,
    /// Cached at timestamp
    cached_at: DateTime<Utc>,
    /// Access count
    access_count: u64,
}

impl TargetCache {
    /// Create a new target cache
    pub fn new(cache_dir: &Path) -> Result<Self> {
        std::fs::create_dir_all(cache_dir)?;

        let index_path = cache_dir.join("index.json");
        let index = if index_path.exists() {
            let content = std::fs::read_to_string(&index_path)?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            HashMap::new()
        };

        Ok(Self {
            cache_dir: cache_dir.to_path_buf(),
            index: parking_lot::RwLock::new(index),
        })
    }

    /// Store an artifact in the cache
    pub fn store(
        &self,
        artifact: &BuildArtifact,
        source_hash: &str,
    ) -> Result<()> {
        let cache_key = self.cache_key(&artifact.name, &artifact.target, &artifact.profile);

        // Create cache directory for this artifact
        let cache_subdir = self.cache_dir.join(&cache_key);
        std::fs::create_dir_all(&cache_subdir)?;

        // Copy artifact to cache
        let cache_path = cache_subdir.join(artifact.path.file_name().unwrap());
        std::fs::copy(&artifact.path, &cache_path)?;

        // Update index
        let cached = CachedArtifact {
            artifact: artifact.clone(),
            source_hash: source_hash.to_string(),
            cache_path,
            cached_at: Utc::now(),
            access_count: 0,
        };

        {
            let mut index = self.index.write();
            let entries = index.entry(cache_key).or_default();

            // Remove old entries with same source hash
            entries.retain(|e| e.source_hash != source_hash);

            // Add new entry
            entries.push(cached);

            // Keep only last 5 versions per artifact
            if entries.len() > 5 {
                entries.sort_by(|a, b| b.cached_at.cmp(&a.cached_at));
                entries.truncate(5);
            }
        }

        self.save_index()?;
        Ok(())
    }

    /// Restore an artifact from cache
    pub fn restore(
        &self,
        name: &str,
        target: &TargetTriple,
        profile: &str,
        source_hash: &str,
        dest: &Path,
    ) -> Result<Option<BuildArtifact>> {
        let cache_key = self.cache_key(name, target, profile);

        let cached = {
            let mut index = self.index.write();
            if let Some(entries) = index.get_mut(&cache_key) {
                if let Some(entry) = entries.iter_mut().find(|e| e.source_hash == source_hash) {
                    entry.access_count += 1;
                    Some(entry.clone())
                } else {
                    None
                }
            } else {
                None
            }
        };

        if let Some(cached) = cached {
            if cached.cache_path.exists() {
                std::fs::create_dir_all(dest.parent().unwrap())?;
                std::fs::copy(&cached.cache_path, dest)?;
                return Ok(Some(cached.artifact));
            }
        }

        Ok(None)
    }

    /// Check if an artifact is cached
    pub fn has_cached(
        &self,
        name: &str,
        target: &TargetTriple,
        profile: &str,
        source_hash: &str,
    ) -> bool {
        let cache_key = self.cache_key(name, target, profile);

        let index = self.index.read();
        if let Some(entries) = index.get(&cache_key) {
            entries.iter().any(|e| e.source_hash == source_hash && e.cache_path.exists())
        } else {
            false
        }
    }

    /// Get cache statistics
    pub fn stats(&self) -> CacheStats {
        let index = self.index.read();

        let mut total_entries = 0;
        let mut total_size = 0u64;
        let mut by_target: HashMap<String, usize> = HashMap::new();
        let mut by_profile: HashMap<String, usize> = HashMap::new();

        for entries in index.values() {
            for entry in entries {
                total_entries += 1;
                total_size += entry.artifact.size;

                *by_target.entry(entry.artifact.target.0.clone()).or_default() += 1;
                *by_profile.entry(entry.artifact.profile.clone()).or_default() += 1;
            }
        }

        CacheStats {
            total_entries,
            total_size,
            by_target,
            by_profile,
        }
    }

    /// Clean old cache entries
    pub fn clean(&self, max_age_days: u64) -> Result<u64> {
        let cutoff = Utc::now() - chrono::Duration::days(max_age_days as i64);
        let mut removed = 0u64;

        {
            let mut index = self.index.write();
            for entries in index.values_mut() {
                let before = entries.len();
                entries.retain(|e| {
                    if e.cached_at < cutoff {
                        let _ = std::fs::remove_file(&e.cache_path);
                        false
                    } else {
                        true
                    }
                });
                removed += (before - entries.len()) as u64;
            }
        }

        self.save_index()?;
        Ok(removed)
    }

    fn cache_key(&self, name: &str, target: &TargetTriple, profile: &str) -> String {
        format!("{}-{}-{}", name, target.0, profile)
    }

    fn save_index(&self) -> Result<()> {
        let index = self.index.read();
        let content = serde_json::to_string_pretty(&*index)?;
        std::fs::write(self.cache_dir.join("index.json"), content)?;
        Ok(())
    }
}

/// Cache statistics
#[derive(Debug, Clone, Serialize)]
pub struct CacheStats {
    pub total_entries: usize,
    pub total_size: u64,
    pub by_target: HashMap<String, usize>,
    pub by_profile: HashMap<String, usize>,
}
