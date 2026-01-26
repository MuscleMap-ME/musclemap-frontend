//! File watching with debouncing for BuildNet

use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use notify_debouncer_mini::{new_debouncer, DebouncedEvent, DebouncedEventKind};
use parking_lot::Mutex;
use tokio::sync::mpsc;

use crate::{BuildNetError, Result};

/// File change event
#[derive(Debug, Clone)]
pub struct FileChange {
    pub path: PathBuf,
    pub kind: ChangeKind,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChangeKind {
    Create,
    Modify,
    Delete,
}

/// File watcher with debouncing
pub struct FileWatcher {
    /// Watched paths
    watched: Arc<Mutex<HashSet<PathBuf>>>,
    /// Change receiver
    rx: mpsc::Receiver<Vec<FileChange>>,
    /// Debouncer handle (kept alive)
    _debouncer: notify_debouncer_mini::Debouncer<RecommendedWatcher>,
}

impl FileWatcher {
    /// Create a new file watcher
    pub fn new(debounce_ms: u64) -> Result<(Self, mpsc::Sender<Vec<FileChange>>)> {
        let (tx, rx) = mpsc::channel(100);
        let tx_clone = tx.clone();

        let watched = Arc::new(Mutex::new(HashSet::new()));

        // Create debounced watcher
        let debouncer = new_debouncer(
            Duration::from_millis(debounce_ms),
            move |events: std::result::Result<Vec<DebouncedEvent>, notify::Error>| {
                if let Ok(events) = events {
                    let changes: Vec<FileChange> = events
                        .into_iter()
                        .map(|e| FileChange {
                            path: e.path,
                            kind: match e.kind {
                                DebouncedEventKind::Any => ChangeKind::Modify,
                                DebouncedEventKind::AnyContinuous => ChangeKind::Modify,
                                _ => ChangeKind::Modify,
                            },
                        })
                        .collect();

                    if !changes.is_empty() {
                        let _ = tx_clone.blocking_send(changes);
                    }
                }
            },
        )
        .map_err(|e| BuildNetError::Watch(e.into()))?;

        Ok((
            Self {
                watched,
                rx,
                _debouncer: debouncer,
            },
            tx,
        ))
    }

    /// Watch a path
    pub fn watch(&mut self, path: &Path) -> Result<()> {
        self._debouncer
            .watcher()
            .watch(path, RecursiveMode::Recursive)
            .map_err(|e| BuildNetError::Watch(e))?;

        self.watched.lock().insert(path.to_path_buf());

        tracing::info!("Watching path: {:?}", path);

        Ok(())
    }

    /// Unwatch a path
    pub fn unwatch(&mut self, path: &Path) -> Result<()> {
        self._debouncer
            .watcher()
            .unwatch(path)
            .map_err(|e| BuildNetError::Watch(e))?;

        self.watched.lock().remove(path);

        Ok(())
    }

    /// Receive the next batch of changes
    pub async fn recv(&mut self) -> Option<Vec<FileChange>> {
        self.rx.recv().await
    }

    /// Get all watched paths
    pub fn watched_paths(&self) -> Vec<PathBuf> {
        self.watched.lock().iter().cloned().collect()
    }
}

/// Simple pattern matcher for glob-like patterns
pub fn matches_pattern(path: &Path, pattern: &str) -> bool {
    // Simple glob matching - handles ** and *
    let path_str = path.to_string_lossy();

    if pattern.contains("**") {
        // Double star matches any path
        let parts: Vec<&str> = pattern.split("**").collect();
        if parts.len() == 2 {
            let prefix = parts[0].trim_end_matches('/');
            let suffix = parts[1].trim_start_matches('/');

            return path_str.starts_with(prefix) && path_str.ends_with(suffix);
        }
    }

    // Single star matches any filename component
    if pattern.contains('*') {
        let regex_pattern = pattern
            .replace('.', r"\.")
            .replace('*', ".*")
            .replace('?', ".");
        if let Ok(re) = regex::Regex::new(&format!("^{}$", regex_pattern)) {
            return re.is_match(&path_str);
        }
    }

    // Exact match
    path_str == pattern
}

/// Filter changes to only those matching patterns
pub fn filter_changes(changes: &[FileChange], patterns: &[String]) -> Vec<FileChange> {
    changes
        .iter()
        .filter(|c| patterns.iter().any(|p| matches_pattern(&c.path, p)))
        .cloned()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pattern_matching() {
        assert!(matches_pattern(
            Path::new("src/lib.rs"),
            "src/**/*.rs"
        ));
        assert!(matches_pattern(
            Path::new("src/module/file.rs"),
            "src/**/*.rs"
        ));
        assert!(!matches_pattern(
            Path::new("tests/test.rs"),
            "src/**/*.rs"
        ));
    }
}
