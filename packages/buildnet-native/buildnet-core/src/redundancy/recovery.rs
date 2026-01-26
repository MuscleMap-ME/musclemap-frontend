//! Recovery management
//!
//! Handles crash recovery and state restoration.

use std::path::{Path, PathBuf};
use std::sync::Arc;
use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};

use crate::{BuildNetError, Result};

/// Recovery strategy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryStrategy {
    /// Automatically recover on startup
    pub auto_recover: bool,
    /// Verify data integrity after recovery
    pub verify_integrity: bool,
    /// Maximum recovery attempts
    pub max_attempts: usize,
    /// Recovery timeout in seconds
    pub timeout_secs: u64,
    /// Prefer newer checkpoint over consistency
    pub prefer_newer: bool,
}

impl Default for RecoveryStrategy {
    fn default() -> Self {
        Self {
            auto_recover: true,
            verify_integrity: true,
            max_attempts: 3,
            timeout_secs: 300,
            prefer_newer: false,
        }
    }
}

/// Recovery point
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryPoint {
    /// Point ID
    pub id: String,
    /// Creation time
    pub created_at: DateTime<Utc>,
    /// Recovery type
    pub recovery_type: RecoveryType,
    /// State snapshot path
    pub snapshot_path: PathBuf,
    /// Build queue backup
    pub queue_backup: Option<PathBuf>,
    /// Is verified
    pub verified: bool,
    /// Size in bytes
    pub size_bytes: u64,
}

/// Recovery type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RecoveryType {
    /// Full snapshot
    Full,
    /// Incremental from previous
    Incremental,
    /// Emergency (crash recovery)
    Emergency,
    /// Manual backup
    Manual,
}

/// Recovery status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecoveryStatus {
    /// Is recovery in progress
    pub in_progress: bool,
    /// Current phase
    pub phase: RecoveryPhase,
    /// Progress percentage
    pub progress: f32,
    /// Started at
    pub started_at: Option<DateTime<Utc>>,
    /// Completed at
    pub completed_at: Option<DateTime<Utc>>,
    /// Error message if failed
    pub error: Option<String>,
}

/// Recovery phase
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum RecoveryPhase {
    #[default]
    Idle,
    Preparing,
    LoadingSnapshot,
    RestoringState,
    RestoringQueue,
    Verifying,
    Completed,
    Failed,
}

/// Recovery manager
pub struct RecoveryManager {
    /// Data directory
    data_dir: PathBuf,
    /// Strategy
    strategy: RecoveryStrategy,
    /// Recovery points
    points: Arc<RwLock<Vec<RecoveryPoint>>>,
    /// Current status
    status: Arc<RwLock<RecoveryStatus>>,
}

impl RecoveryManager {
    /// Create a new recovery manager
    pub fn new(data_dir: &str, strategy: RecoveryStrategy) -> Result<Self> {
        let data_path = PathBuf::from(data_dir);
        let recovery_dir = data_path.join("recovery");

        // Create recovery directory
        if !recovery_dir.exists() {
            std::fs::create_dir_all(&recovery_dir)
                .map_err(|e| BuildNetError::Internal(e.into()))?;
        }

        // Load existing recovery points
        let points = Self::load_recovery_points(&recovery_dir)?;

        Ok(Self {
            data_dir: data_path,
            strategy,
            points: Arc::new(RwLock::new(points)),
            status: Arc::new(RwLock::new(RecoveryStatus {
                in_progress: false,
                phase: RecoveryPhase::Idle,
                progress: 0.0,
                started_at: None,
                completed_at: None,
                error: None,
            })),
        })
    }

    /// Load existing recovery points from disk
    fn load_recovery_points(recovery_dir: &Path) -> Result<Vec<RecoveryPoint>> {
        let manifest_path = recovery_dir.join("manifest.json");

        if !manifest_path.exists() {
            return Ok(Vec::new());
        }

        let content = std::fs::read_to_string(&manifest_path)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        let points: Vec<RecoveryPoint> = serde_json::from_str(&content)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        Ok(points)
    }

    /// Save recovery points manifest
    fn save_manifest(&self) -> Result<()> {
        let recovery_dir = self.data_dir.join("recovery");
        let manifest_path = recovery_dir.join("manifest.json");

        let points = self.points.read();
        let content = serde_json::to_string_pretty(&*points)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        std::fs::write(&manifest_path, content)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        Ok(())
    }

    /// Get current status
    pub fn status(&self) -> RecoveryStatus {
        self.status.read().clone()
    }

    /// Create a recovery point
    pub async fn create_recovery_point(&self, recovery_type: RecoveryType) -> Result<RecoveryPoint> {
        let recovery_dir = self.data_dir.join("recovery");
        let id = uuid::Uuid::new_v4().to_string();
        let snapshot_dir = recovery_dir.join(&id);

        std::fs::create_dir_all(&snapshot_dir)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        // Copy state database
        let state_db = self.data_dir.join("state.db");
        let snapshot_db = snapshot_dir.join("state.db");

        if state_db.exists() {
            std::fs::copy(&state_db, &snapshot_db)
                .map_err(|e| BuildNetError::Internal(e.into()))?;
        }

        // Get snapshot size
        let size = if snapshot_db.exists() {
            std::fs::metadata(&snapshot_db)
                .map(|m| m.len())
                .unwrap_or(0)
        } else {
            0
        };

        let point = RecoveryPoint {
            id: id.clone(),
            created_at: Utc::now(),
            recovery_type,
            snapshot_path: snapshot_dir,
            queue_backup: None,
            verified: false,
            size_bytes: size,
        };

        // Add to points
        {
            let mut points = self.points.write();
            points.push(point.clone());

            // Keep only last 10 recovery points
            if points.len() > 10 {
                let excess = points.len() - 10;
                let to_remove: Vec<_> = points.drain(..excess).collect();
                for old_point in to_remove {
                    if old_point.snapshot_path.exists() {
                        let _ = std::fs::remove_dir_all(&old_point.snapshot_path);
                    }
                }
            }
        }

        self.save_manifest()?;

        Ok(point)
    }

    /// Perform recovery
    pub async fn recover(&self) -> Result<()> {
        self.update_status(RecoveryPhase::Preparing, 0.0, None);

        let points = self.points.read();
        let latest = points.iter()
            .filter(|p| p.snapshot_path.exists())
            .max_by_key(|p| p.created_at);

        let point = match latest {
            Some(p) => p.clone(),
            None => {
                self.update_status(RecoveryPhase::Failed, 0.0, Some("No recovery points available"));
                return Err(BuildNetError::Internal(anyhow::anyhow!("No recovery points available")));
            }
        };

        drop(points);

        let mut attempts = 0;
        while attempts < self.strategy.max_attempts {
            attempts += 1;

            match self.perform_recovery(&point).await {
                Ok(()) => {
                    self.update_status(RecoveryPhase::Completed, 100.0, None);
                    return Ok(());
                }
                Err(e) if attempts < self.strategy.max_attempts => {
                    tracing::warn!("Recovery attempt {} failed: {}", attempts, e);
                    tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                }
                Err(e) => {
                    self.update_status(RecoveryPhase::Failed, 0.0, Some(&e.to_string()));
                    return Err(e);
                }
            }
        }

        Ok(())
    }

    /// Perform actual recovery from a point
    async fn perform_recovery(&self, point: &RecoveryPoint) -> Result<()> {
        self.update_status(RecoveryPhase::LoadingSnapshot, 20.0, None);

        // Copy snapshot to active location
        let snapshot_db = point.snapshot_path.join("state.db");
        let active_db = self.data_dir.join("state.db");

        if snapshot_db.exists() {
            // Backup current if exists
            if active_db.exists() {
                let backup = self.data_dir.join("state.db.backup");
                std::fs::copy(&active_db, &backup)
                    .map_err(|e| BuildNetError::Internal(e.into()))?;
            }

            self.update_status(RecoveryPhase::RestoringState, 40.0, None);

            std::fs::copy(&snapshot_db, &active_db)
                .map_err(|e| BuildNetError::Internal(e.into()))?;
        }

        self.update_status(RecoveryPhase::RestoringQueue, 60.0, None);

        // Restore queue if available
        if let Some(queue_path) = &point.queue_backup {
            if queue_path.exists() {
                let active_queue = self.data_dir.join("queue.db");
                std::fs::copy(queue_path, &active_queue)
                    .map_err(|e| BuildNetError::Internal(e.into()))?;
            }
        }

        if self.strategy.verify_integrity {
            self.update_status(RecoveryPhase::Verifying, 80.0, None);
            self.verify_integrity().await?;
        }

        Ok(())
    }

    /// Verify data integrity after recovery
    async fn verify_integrity(&self) -> Result<()> {
        let state_db = self.data_dir.join("state.db");

        if !state_db.exists() {
            return Ok(()); // Nothing to verify
        }

        // Open and run integrity check
        let conn = rusqlite::Connection::open(&state_db)
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        let result: String = conn.query_row("PRAGMA integrity_check", [], |row| row.get(0))
            .map_err(|e| BuildNetError::Internal(e.into()))?;

        if result != "ok" {
            return Err(BuildNetError::Internal(anyhow::anyhow!(
                "Database integrity check failed: {}", result
            )));
        }

        Ok(())
    }

    /// Update recovery status
    fn update_status(&self, phase: RecoveryPhase, progress: f32, error: Option<&str>) {
        let mut status = self.status.write();

        if phase == RecoveryPhase::Preparing && !status.in_progress {
            status.in_progress = true;
            status.started_at = Some(Utc::now());
            status.completed_at = None;
            status.error = None;
        }

        status.phase = phase;
        status.progress = progress;

        if let Some(err) = error {
            status.error = Some(err.to_string());
        }

        if phase == RecoveryPhase::Completed || phase == RecoveryPhase::Failed {
            status.in_progress = false;
            status.completed_at = Some(Utc::now());
        }
    }

    /// Get all recovery points
    pub fn list_recovery_points(&self) -> Vec<RecoveryPoint> {
        self.points.read().clone()
    }

    /// Delete a recovery point
    pub fn delete_recovery_point(&self, id: &str) -> Result<bool> {
        let mut points = self.points.write();

        if let Some(pos) = points.iter().position(|p| p.id == id) {
            let point = points.remove(pos);

            // Delete files
            if point.snapshot_path.exists() {
                std::fs::remove_dir_all(&point.snapshot_path)
                    .map_err(|e| BuildNetError::Internal(e.into()))?;
            }

            drop(points);
            self.save_manifest()?;

            return Ok(true);
        }

        Ok(false)
    }

    /// Get the latest recovery point
    pub fn latest_point(&self) -> Option<RecoveryPoint> {
        let points = self.points.read();
        points.iter()
            .filter(|p| p.snapshot_path.exists())
            .max_by_key(|p| p.created_at)
            .cloned()
    }

    /// Check if auto-recovery should be performed
    pub fn should_auto_recover(&self) -> bool {
        if !self.strategy.auto_recover {
            return false;
        }

        // Check for crash marker
        let crash_marker = self.data_dir.join(".crash_marker");
        crash_marker.exists()
    }

    /// Create crash marker (called on unexpected shutdown)
    pub fn create_crash_marker(&self) -> Result<()> {
        let crash_marker = self.data_dir.join(".crash_marker");
        std::fs::write(&crash_marker, Utc::now().to_rfc3339())
            .map_err(|e| BuildNetError::Internal(e.into()))?;
        Ok(())
    }

    /// Remove crash marker (called after successful startup)
    pub fn remove_crash_marker(&self) -> Result<()> {
        let crash_marker = self.data_dir.join(".crash_marker");
        if crash_marker.exists() {
            std::fs::remove_file(&crash_marker)
                .map_err(|e| BuildNetError::Internal(e.into()))?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_create_recovery_point() {
        let temp = TempDir::new().unwrap();
        let manager = RecoveryManager::new(
            temp.path().to_str().unwrap(),
            RecoveryStrategy::default(),
        ).unwrap();

        let point = manager.create_recovery_point(RecoveryType::Full).await.unwrap();
        assert!(point.snapshot_path.exists());
        assert_eq!(point.recovery_type, RecoveryType::Full);
    }

    #[test]
    fn test_crash_marker() {
        let temp = TempDir::new().unwrap();
        let manager = RecoveryManager::new(
            temp.path().to_str().unwrap(),
            RecoveryStrategy::default(),
        ).unwrap();

        assert!(!manager.should_auto_recover());

        manager.create_crash_marker().unwrap();
        assert!(manager.should_auto_recover());

        manager.remove_crash_marker().unwrap();
        assert!(!manager.should_auto_recover());
    }
}
