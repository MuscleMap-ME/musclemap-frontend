//! Ledger Storage Backends
//!
//! Persistent storage for ledger entries.

use std::path::Path;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use rusqlite::{Connection, params};
use parking_lot::Mutex;

use super::{LedgerEntry, EntryId, EntryType};
use crate::Result;

/// Storage statistics
#[derive(Debug, Clone)]
pub struct StorageStats {
    pub total_entries: usize,
    pub oldest_timestamp: Option<DateTime<Utc>>,
    pub newest_timestamp: Option<DateTime<Utc>>,
    pub size_bytes: u64,
}

/// Ledger storage trait
#[async_trait]
pub trait LedgerStorage: Send + Sync {
    /// Store an entry
    async fn store(&self, entry: &LedgerEntry) -> Result<()>;

    /// Get entry by ID
    async fn get(&self, id: &EntryId) -> Result<Option<LedgerEntry>>;

    /// Get entries by build ID
    async fn get_by_build(&self, build_id: &str) -> Result<Vec<LedgerEntry>>;

    /// Get recent entries
    async fn get_recent(&self, limit: usize) -> Result<Vec<LedgerEntry>>;

    /// Get entries since a specific ID
    async fn get_since(&self, since: &EntryId, limit: usize) -> Result<Vec<LedgerEntry>>;

    /// Get entries by type
    async fn get_by_type(&self, entry_type: EntryType, limit: usize) -> Result<Vec<LedgerEntry>>;

    /// Prune entries before a timestamp
    async fn prune_before(&self, before: DateTime<Utc>) -> Result<usize>;

    /// Get storage statistics
    async fn stats(&self) -> Result<StorageStats>;
}

/// SQLite-based ledger storage
pub struct SqliteLedgerStorage {
    conn: Mutex<Connection>,
}

impl SqliteLedgerStorage {
    /// Create new SQLite storage
    pub fn new(path: &Path) -> Result<Self> {
        let conn = Connection::open(path)?;

        // Create tables
        conn.execute_batch(r#"
            CREATE TABLE IF NOT EXISTS ledger_entries (
                id TEXT PRIMARY KEY,
                entry_type TEXT NOT NULL,
                origin_node TEXT NOT NULL,
                build_id TEXT,
                timestamp TEXT NOT NULL,
                prev_hash TEXT NOT NULL,
                data TEXT NOT NULL,
                signature BLOB NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_entries_type ON ledger_entries(entry_type);
            CREATE INDEX IF NOT EXISTS idx_entries_build ON ledger_entries(build_id);
            CREATE INDEX IF NOT EXISTS idx_entries_timestamp ON ledger_entries(timestamp);
            CREATE INDEX IF NOT EXISTS idx_entries_origin ON ledger_entries(origin_node);
        "#)?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// Create in-memory storage (for testing)
    pub fn in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;

        conn.execute_batch(r#"
            CREATE TABLE ledger_entries (
                id TEXT PRIMARY KEY,
                entry_type TEXT NOT NULL,
                origin_node TEXT NOT NULL,
                build_id TEXT,
                timestamp TEXT NOT NULL,
                prev_hash TEXT NOT NULL,
                data TEXT NOT NULL,
                signature BLOB NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX idx_entries_type ON ledger_entries(entry_type);
            CREATE INDEX idx_entries_build ON ledger_entries(build_id);
            CREATE INDEX idx_entries_timestamp ON ledger_entries(timestamp);
        "#)?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    fn entry_from_row(row: &rusqlite::Row) -> rusqlite::Result<LedgerEntry> {
        let entry_type_str: String = row.get(1)?;
        let timestamp_str: String = row.get(4)?;
        let data_str: String = row.get(6)?;

        Ok(LedgerEntry {
            id: row.get(0)?,
            entry_type: serde_json::from_str(&format!("\"{}\"", entry_type_str))
                .unwrap_or(EntryType::BuildStarted),
            origin_node: row.get(2)?,
            build_id: row.get(3)?,
            timestamp: DateTime::parse_from_rfc3339(&timestamp_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
            prev_hash: row.get(5)?,
            data: serde_json::from_str(&data_str).unwrap_or(serde_json::Value::Null),
            signature: row.get(7)?,
        })
    }
}

#[async_trait]
impl LedgerStorage for SqliteLedgerStorage {
    async fn store(&self, entry: &LedgerEntry) -> Result<()> {
        let conn = self.conn.lock();

        let entry_type = serde_json::to_string(&entry.entry_type)?
            .trim_matches('"')
            .to_string();

        conn.execute(
            r#"
            INSERT OR REPLACE INTO ledger_entries
            (id, entry_type, origin_node, build_id, timestamp, prev_hash, data, signature)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            "#,
            params![
                entry.id,
                entry_type,
                entry.origin_node,
                entry.build_id,
                entry.timestamp.to_rfc3339(),
                entry.prev_hash,
                entry.data.to_string(),
                entry.signature,
            ],
        )?;

        Ok(())
    }

    async fn get(&self, id: &EntryId) -> Result<Option<LedgerEntry>> {
        let conn = self.conn.lock();

        let result = conn.query_row(
            "SELECT * FROM ledger_entries WHERE id = ?1",
            params![id],
            Self::entry_from_row,
        );

        match result {
            Ok(entry) => Ok(Some(entry)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(crate::BuildNetError::Database(e)),
        }
    }

    async fn get_by_build(&self, build_id: &str) -> Result<Vec<LedgerEntry>> {
        let conn = self.conn.lock();

        let mut stmt = conn.prepare(
            "SELECT * FROM ledger_entries WHERE build_id = ?1 ORDER BY timestamp ASC"
        )?;

        let entries = stmt.query_map(params![build_id], Self::entry_from_row)?
            .filter_map(|r| r.ok())
            .collect();

        Ok(entries)
    }

    async fn get_recent(&self, limit: usize) -> Result<Vec<LedgerEntry>> {
        let conn = self.conn.lock();

        let mut stmt = conn.prepare(
            "SELECT * FROM ledger_entries ORDER BY timestamp DESC LIMIT ?1"
        )?;

        let entries = stmt.query_map(params![limit as i64], Self::entry_from_row)?
            .filter_map(|r| r.ok())
            .collect();

        Ok(entries)
    }

    async fn get_since(&self, since: &EntryId, limit: usize) -> Result<Vec<LedgerEntry>> {
        let conn = self.conn.lock();

        // Get timestamp of the since entry
        let since_timestamp: String = conn.query_row(
            "SELECT timestamp FROM ledger_entries WHERE id = ?1",
            params![since],
            |row| row.get(0),
        ).unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string());

        let mut stmt = conn.prepare(
            "SELECT * FROM ledger_entries WHERE timestamp > ?1 ORDER BY timestamp ASC LIMIT ?2"
        )?;

        let entries = stmt.query_map(params![since_timestamp, limit as i64], Self::entry_from_row)?
            .filter_map(|r| r.ok())
            .collect();

        Ok(entries)
    }

    async fn get_by_type(&self, entry_type: EntryType, limit: usize) -> Result<Vec<LedgerEntry>> {
        let conn = self.conn.lock();

        let type_str = serde_json::to_string(&entry_type)?
            .trim_matches('"')
            .to_string();

        let mut stmt = conn.prepare(
            "SELECT * FROM ledger_entries WHERE entry_type = ?1 ORDER BY timestamp DESC LIMIT ?2"
        )?;

        let entries = stmt.query_map(params![type_str, limit as i64], Self::entry_from_row)?
            .filter_map(|r| r.ok())
            .collect();

        Ok(entries)
    }

    async fn prune_before(&self, before: DateTime<Utc>) -> Result<usize> {
        let conn = self.conn.lock();

        let deleted = conn.execute(
            "DELETE FROM ledger_entries WHERE timestamp < ?1",
            params![before.to_rfc3339()],
        )?;

        Ok(deleted)
    }

    async fn stats(&self) -> Result<StorageStats> {
        let conn = self.conn.lock();

        let total_entries: usize = conn.query_row(
            "SELECT COUNT(*) FROM ledger_entries",
            [],
            |row| row.get(0),
        )?;

        let oldest: Option<String> = conn.query_row(
            "SELECT MIN(timestamp) FROM ledger_entries",
            [],
            |row| row.get(0),
        ).ok();

        let newest: Option<String> = conn.query_row(
            "SELECT MAX(timestamp) FROM ledger_entries",
            [],
            |row| row.get(0),
        ).ok();

        // Estimate size (page_count * page_size)
        let page_count: i64 = conn.query_row(
            "PRAGMA page_count",
            [],
            |row| row.get(0),
        ).unwrap_or(0);

        let page_size: i64 = conn.query_row(
            "PRAGMA page_size",
            [],
            |row| row.get(0),
        ).unwrap_or(4096);

        Ok(StorageStats {
            total_entries,
            oldest_timestamp: oldest.and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                .map(|dt| dt.with_timezone(&Utc)),
            newest_timestamp: newest.and_then(|s| DateTime::parse_from_rfc3339(&s).ok())
                .map(|dt| dt.with_timezone(&Utc)),
            size_bytes: (page_count * page_size) as u64,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_sqlite_storage_basic() {
        let storage = SqliteLedgerStorage::in_memory().unwrap();

        let entry = LedgerEntry::build_started(
            "node-1",
            "build-1",
            &["pkg-a".to_string()],
            "initiator",
        );
        let id = entry.id.clone();

        // Store
        storage.store(&entry).await.unwrap();

        // Retrieve
        let retrieved = storage.get(&id).await.unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().id, id);
    }

    #[tokio::test]
    async fn test_sqlite_storage_by_build() {
        let storage = SqliteLedgerStorage::in_memory().unwrap();

        let entry1 = LedgerEntry::build_started(
            "node-1",
            "build-1",
            &["pkg-a".to_string()],
            "initiator",
        );
        let entry2 = LedgerEntry::build_completed(
            "node-1",
            "build-1",
            true,
            1000,
            &["hash-1".to_string()],
        );

        storage.store(&entry1).await.unwrap();
        storage.store(&entry2).await.unwrap();

        let entries = storage.get_by_build("build-1").await.unwrap();
        assert_eq!(entries.len(), 2);
    }

    #[tokio::test]
    async fn test_sqlite_storage_stats() {
        let storage = SqliteLedgerStorage::in_memory().unwrap();

        let entry = LedgerEntry::build_started(
            "node-1",
            "build-1",
            &["pkg-a".to_string()],
            "initiator",
        );

        storage.store(&entry).await.unwrap();

        let stats = storage.stats().await.unwrap();
        assert_eq!(stats.total_entries, 1);
        assert!(stats.oldest_timestamp.is_some());
    }
}
