//! SQLite state management for BuildNet
//!
//! Uses WAL mode for concurrent reads, connection pooling via r2d2.

use std::path::Path;
use std::sync::Arc;

use chrono::{DateTime, Utc};
use parking_lot::RwLock;
use r2d2::{Pool, PooledConnection};
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{BuildNetError, Result};

/// Safely parse an RFC3339 timestamp string, returning None on parse errors.
/// This prevents panics from malformed database data.
fn parse_datetime_safe(s: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(s)
        .ok()
        .map(|dt| dt.with_timezone(&Utc))
}

/// Parse an RFC3339 timestamp, returning an error with context on failure.
fn parse_datetime(s: &str) -> std::result::Result<DateTime<Utc>, rusqlite::Error> {
    DateTime::parse_from_rfc3339(s)
        .map(|dt| dt.with_timezone(&Utc))
        .map_err(|e| {
            rusqlite::Error::FromSqlConversionFailure(
                0,
                rusqlite::types::Type::Text,
                Box::new(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    format!("Invalid RFC3339 timestamp '{}': {}", s, e),
                )),
            )
        })
}

/// SQLite connection pool
pub type DbPool = Pool<SqliteConnectionManager>;
pub type DbConnection = PooledConnection<SqliteConnectionManager>;

/// Build state stored in SQLite
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildState {
    pub id: String,
    pub package: String,
    pub source_hash: String,
    pub output_hash: Option<String>,
    pub status: BuildStatus,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub duration_ms: Option<i64>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BuildStatus {
    Pending,
    Running,
    Completed,
    Failed,
    Cached,
    Skipped,
}

impl std::fmt::Display for BuildStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BuildStatus::Pending => write!(f, "pending"),
            BuildStatus::Running => write!(f, "running"),
            BuildStatus::Completed => write!(f, "completed"),
            BuildStatus::Failed => write!(f, "failed"),
            BuildStatus::Cached => write!(f, "cached"),
            BuildStatus::Skipped => write!(f, "skipped"),
        }
    }
}

impl std::str::FromStr for BuildStatus {
    type Err = BuildNetError;

    fn from_str(s: &str) -> Result<Self> {
        match s {
            "pending" => Ok(BuildStatus::Pending),
            "running" => Ok(BuildStatus::Running),
            "completed" => Ok(BuildStatus::Completed),
            "failed" => Ok(BuildStatus::Failed),
            "cached" => Ok(BuildStatus::Cached),
            "skipped" => Ok(BuildStatus::Skipped),
            _ => Err(BuildNetError::InvalidConfig(format!(
                "Invalid build status: {}",
                s
            ))),
        }
    }
}

/// File hash cache entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileHashEntry {
    pub path: String,
    pub hash: String,
    pub size: i64,
    pub mtime: i64,
}

/// State manager with SQLite backend
pub struct StateManager {
    pool: DbPool,
    /// In-memory cache for hot data
    build_cache: Arc<RwLock<std::collections::HashMap<String, BuildState>>>,
}

impl StateManager {
    /// Create a new state manager with the given database path
    pub fn new(db_path: &Path) -> Result<Self> {
        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let manager = SqliteConnectionManager::file(db_path);
        let pool = Pool::builder()
            .max_size(10)
            .build(manager)
            .map_err(|e| BuildNetError::Pool(e.to_string()))?;

        let state_manager = Self {
            pool,
            build_cache: Arc::new(RwLock::new(std::collections::HashMap::new())),
        };

        state_manager.init_schema()?;

        Ok(state_manager)
    }

    /// Create an in-memory state manager (for testing)
    pub fn in_memory() -> Result<Self> {
        let manager = SqliteConnectionManager::memory();
        let pool = Pool::builder()
            .max_size(1)
            .build(manager)
            .map_err(|e| BuildNetError::Pool(e.to_string()))?;

        let state_manager = Self {
            pool,
            build_cache: Arc::new(RwLock::new(std::collections::HashMap::new())),
        };

        state_manager.init_schema()?;

        Ok(state_manager)
    }

    /// Get a database connection from the pool
    pub fn conn(&self) -> Result<DbConnection> {
        self.pool.get().map_err(|e| BuildNetError::Pool(e.to_string()))
    }

    /// Initialize the database schema
    fn init_schema(&self) -> Result<()> {
        let conn = self.conn()?;

        // Enable WAL mode for better concurrent performance
        conn.execute_batch(
            "
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA busy_timeout = 5000;
            PRAGMA cache_size = -64000;
            PRAGMA foreign_keys = ON;
            ",
        )?;

        // Create tables
        conn.execute_batch(
            "
            -- Build history
            CREATE TABLE IF NOT EXISTS builds (
                id TEXT PRIMARY KEY,
                package TEXT NOT NULL,
                source_hash TEXT NOT NULL,
                output_hash TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                started_at TEXT NOT NULL,
                completed_at TEXT,
                duration_ms INTEGER,
                error TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_builds_package ON builds(package);
            CREATE INDEX IF NOT EXISTS idx_builds_source_hash ON builds(source_hash);
            CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status);

            -- File hash cache (for incremental hashing)
            CREATE TABLE IF NOT EXISTS file_hashes (
                path TEXT PRIMARY KEY,
                hash TEXT NOT NULL,
                size INTEGER NOT NULL,
                mtime INTEGER NOT NULL,
                updated_at TEXT DEFAULT (datetime('now'))
            );

            -- Artifact cache metadata
            CREATE TABLE IF NOT EXISTS artifacts (
                hash TEXT PRIMARY KEY,
                package TEXT NOT NULL,
                size INTEGER NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                last_used_at TEXT DEFAULT (datetime('now')),
                use_count INTEGER DEFAULT 1
            );

            CREATE INDEX IF NOT EXISTS idx_artifacts_package ON artifacts(package);
            CREATE INDEX IF NOT EXISTS idx_artifacts_last_used ON artifacts(last_used_at);

            -- Build locks (for distributed coordination)
            CREATE TABLE IF NOT EXISTS build_locks (
                package TEXT PRIMARY KEY,
                holder_id TEXT NOT NULL,
                acquired_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            );

            -- Dependency graph
            CREATE TABLE IF NOT EXISTS dependencies (
                package TEXT NOT NULL,
                depends_on TEXT NOT NULL,
                PRIMARY KEY (package, depends_on)
            );
            ",
        )?;

        Ok(())
    }

    /// Record a build start
    pub fn start_build(&self, package: &str, source_hash: &str) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let conn = self.conn()?;
        conn.execute(
            "INSERT INTO builds (id, package, source_hash, status, started_at)
             VALUES (?1, ?2, ?3, 'running', ?4)",
            params![id, package, source_hash, now.to_rfc3339()],
        )?;

        let state = BuildState {
            id: id.clone(),
            package: package.to_string(),
            source_hash: source_hash.to_string(),
            output_hash: None,
            status: BuildStatus::Running,
            started_at: now,
            completed_at: None,
            duration_ms: None,
            error: None,
        };

        self.build_cache.write().insert(id.clone(), state);

        Ok(id)
    }

    /// Complete a build
    pub fn complete_build(
        &self,
        id: &str,
        output_hash: Option<&str>,
        status: BuildStatus,
        error: Option<&str>,
    ) -> Result<()> {
        let now = Utc::now();

        let conn = self.conn()?;

        // Get the start time to calculate duration
        let started_at: String = conn.query_row(
            "SELECT started_at FROM builds WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )?;

        let started = DateTime::parse_from_rfc3339(&started_at)
            .map_err(|e| BuildNetError::InvalidConfig(e.to_string()))?
            .with_timezone(&Utc);

        let duration_ms = (now - started).num_milliseconds();

        conn.execute(
            "UPDATE builds SET
                output_hash = ?1,
                status = ?2,
                completed_at = ?3,
                duration_ms = ?4,
                error = ?5
             WHERE id = ?6",
            params![
                output_hash,
                status.to_string(),
                now.to_rfc3339(),
                duration_ms,
                error,
                id
            ],
        )?;

        // Update cache
        if let Some(state) = self.build_cache.write().get_mut(id) {
            state.output_hash = output_hash.map(String::from);
            state.status = status;
            state.completed_at = Some(now);
            state.duration_ms = Some(duration_ms);
            state.error = error.map(String::from);
        }

        Ok(())
    }

    /// Check if a cached build exists for the given source hash
    pub fn find_cached_build(&self, package: &str, source_hash: &str) -> Result<Option<BuildState>> {
        let conn = self.conn()?;

        let result = conn.query_row(
            "SELECT id, package, source_hash, output_hash, status, started_at,
                    completed_at, duration_ms, error
             FROM builds
             WHERE package = ?1 AND source_hash = ?2 AND status = 'completed'
             ORDER BY completed_at DESC
             LIMIT 1",
            params![package, source_hash],
            |row| {
                Ok(BuildState {
                    id: row.get(0)?,
                    package: row.get(1)?,
                    source_hash: row.get(2)?,
                    output_hash: row.get(3)?,
                    status: row.get::<_, String>(4)?.parse().unwrap_or(BuildStatus::Pending),
                    started_at: parse_datetime(&row.get::<_, String>(5)?)?,
                    completed_at: row
                        .get::<_, Option<String>>(6)?
                        .and_then(|s| parse_datetime_safe(&s)),
                    duration_ms: row.get(7)?,
                    error: row.get(8)?,
                })
            },
        );

        match result {
            Ok(state) => Ok(Some(state)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// Get file hash from cache
    pub fn get_file_hash(&self, path: &str) -> Result<Option<FileHashEntry>> {
        let conn = self.conn()?;

        let result = conn.query_row(
            "SELECT path, hash, size, mtime FROM file_hashes WHERE path = ?1",
            params![path],
            |row| {
                Ok(FileHashEntry {
                    path: row.get(0)?,
                    hash: row.get(1)?,
                    size: row.get(2)?,
                    mtime: row.get(3)?,
                })
            },
        );

        match result {
            Ok(entry) => Ok(Some(entry)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// Update file hash cache
    pub fn set_file_hash(&self, path: &str, hash: &str, size: i64, mtime: i64) -> Result<()> {
        let conn = self.conn()?;

        conn.execute(
            "INSERT OR REPLACE INTO file_hashes (path, hash, size, mtime, updated_at)
             VALUES (?1, ?2, ?3, ?4, datetime('now'))",
            params![path, hash, size, mtime],
        )?;

        Ok(())
    }

    /// Batch update file hashes
    pub fn set_file_hashes(&self, entries: &[FileHashEntry]) -> Result<()> {
        let mut conn = self.conn()?;
        let tx = conn.transaction()?;

        {
            let mut stmt = tx.prepare(
                "INSERT OR REPLACE INTO file_hashes (path, hash, size, mtime, updated_at)
                 VALUES (?1, ?2, ?3, ?4, datetime('now'))",
            )?;

            for entry in entries {
                stmt.execute(params![entry.path, entry.hash, entry.size, entry.mtime])?;
            }
        }

        tx.commit()?;
        Ok(())
    }

    /// Acquire a build lock
    pub fn acquire_lock(&self, package: &str, holder_id: &str, ttl_secs: i64) -> Result<bool> {
        let conn = self.conn()?;
        let now = Utc::now();
        let expires = now + chrono::Duration::seconds(ttl_secs);

        // Clean up expired locks first
        conn.execute(
            "DELETE FROM build_locks WHERE expires_at < ?1",
            params![now.to_rfc3339()],
        )?;

        // Try to acquire lock
        let result = conn.execute(
            "INSERT OR IGNORE INTO build_locks (package, holder_id, acquired_at, expires_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![package, holder_id, now.to_rfc3339(), expires.to_rfc3339()],
        )?;

        Ok(result > 0)
    }

    /// Release a build lock
    pub fn release_lock(&self, package: &str, holder_id: &str) -> Result<()> {
        let conn = self.conn()?;

        conn.execute(
            "DELETE FROM build_locks WHERE package = ?1 AND holder_id = ?2",
            params![package, holder_id],
        )?;

        Ok(())
    }

    /// Atomically acquire a build lock and start a build in a single transaction.
    /// This prevents race conditions where another process could start a build
    /// between lock acquisition and build start.
    pub fn acquire_lock_and_start_build(
        &self,
        package: &str,
        holder_id: &str,
        ttl_secs: i64,
        source_hash: &str,
    ) -> Result<String> {
        let mut conn = self.conn()?;
        let tx = conn.transaction()?;

        let now = Utc::now();
        let expires = now + chrono::Duration::seconds(ttl_secs);
        let id = Uuid::new_v4().to_string();

        // Clean up expired locks first
        tx.execute(
            "DELETE FROM build_locks WHERE expires_at < ?1",
            params![now.to_rfc3339()],
        )?;

        // Try to acquire lock
        let lock_result = tx.execute(
            "INSERT OR IGNORE INTO build_locks (package, holder_id, acquired_at, expires_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![package, holder_id, now.to_rfc3339(), expires.to_rfc3339()],
        )?;

        if lock_result == 0 {
            // Lock not acquired - someone else has it
            return Err(crate::BuildNetError::LockFailed(format!(
                "Lock already held for package '{}'",
                package
            )));
        }

        // Insert build record in same transaction
        tx.execute(
            "INSERT INTO builds (id, package, source_hash, status, started_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                id,
                package,
                source_hash,
                BuildStatus::Running.to_string(),
                now.to_rfc3339()
            ],
        )?;

        tx.commit()?;

        // Update in-memory cache
        let state = BuildState {
            id: id.clone(),
            package: package.to_string(),
            source_hash: source_hash.to_string(),
            output_hash: None,
            status: BuildStatus::Running,
            started_at: now,
            completed_at: None,
            duration_ms: None,
            error: None,
        };

        self.build_cache.write().insert(id.clone(), state);

        Ok(id)
    }

    /// Get recent builds
    pub fn recent_builds(&self, limit: usize) -> Result<Vec<BuildState>> {
        let conn = self.conn()?;

        let mut stmt = conn.prepare(
            "SELECT id, package, source_hash, output_hash, status, started_at,
                    completed_at, duration_ms, error
             FROM builds
             ORDER BY started_at DESC
             LIMIT ?1",
        )?;

        let builds = stmt
            .query_map(params![limit as i64], |row| {
                Ok(BuildState {
                    id: row.get(0)?,
                    package: row.get(1)?,
                    source_hash: row.get(2)?,
                    output_hash: row.get(3)?,
                    status: row.get::<_, String>(4)?.parse().unwrap_or(BuildStatus::Pending),
                    started_at: parse_datetime(&row.get::<_, String>(5)?)?,
                    completed_at: row
                        .get::<_, Option<String>>(6)?
                        .and_then(|s| parse_datetime_safe(&s)),
                    duration_ms: row.get(7)?,
                    error: row.get(8)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(builds)
    }

    /// Get build statistics
    pub fn stats(&self) -> Result<StateStats> {
        let conn = self.conn()?;

        let total_builds: i64 =
            conn.query_row("SELECT COUNT(*) FROM builds", [], |row| row.get(0))?;

        let cached_builds: i64 = conn.query_row(
            "SELECT COUNT(*) FROM builds WHERE status = 'cached'",
            [],
            |row| row.get(0),
        )?;

        let failed_builds: i64 = conn.query_row(
            "SELECT COUNT(*) FROM builds WHERE status = 'failed'",
            [],
            |row| row.get(0),
        )?;

        let cached_files: i64 =
            conn.query_row("SELECT COUNT(*) FROM file_hashes", [], |row| row.get(0))?;

        let artifacts: i64 =
            conn.query_row("SELECT COUNT(*) FROM artifacts", [], |row| row.get(0))?;

        Ok(StateStats {
            total_builds: total_builds as usize,
            cached_builds: cached_builds as usize,
            failed_builds: failed_builds as usize,
            cached_files: cached_files as usize,
            artifacts: artifacts as usize,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateStats {
    pub total_builds: usize,
    pub cached_builds: usize,
    pub failed_builds: usize,
    pub cached_files: usize,
    pub artifacts: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_state_manager() {
        let manager = StateManager::in_memory().unwrap();

        // Start a build
        let id = manager.start_build("test-package", "abc123").unwrap();
        assert!(!id.is_empty());

        // Complete the build
        manager
            .complete_build(&id, Some("output123"), BuildStatus::Completed, None)
            .unwrap();

        // Find cached build
        let cached = manager.find_cached_build("test-package", "abc123").unwrap();
        assert!(cached.is_some());
        assert_eq!(cached.unwrap().output_hash, Some("output123".to_string()));
    }

    #[test]
    fn test_file_hash_cache() {
        let manager = StateManager::in_memory().unwrap();

        manager
            .set_file_hash("/path/to/file.ts", "hash123", 1024, 1234567890)
            .unwrap();

        let entry = manager.get_file_hash("/path/to/file.ts").unwrap();
        assert!(entry.is_some());
        assert_eq!(entry.unwrap().hash, "hash123");
    }

    #[test]
    fn test_build_lock() {
        let manager = StateManager::in_memory().unwrap();

        // Acquire lock
        let acquired = manager.acquire_lock("test-package", "holder1", 60).unwrap();
        assert!(acquired);

        // Try to acquire same lock with different holder
        let acquired2 = manager.acquire_lock("test-package", "holder2", 60).unwrap();
        assert!(!acquired2);

        // Release lock
        manager.release_lock("test-package", "holder1").unwrap();

        // Now holder2 can acquire
        let acquired3 = manager.acquire_lock("test-package", "holder2", 60).unwrap();
        assert!(acquired3);
    }
}
