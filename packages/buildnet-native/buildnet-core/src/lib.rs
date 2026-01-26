//! BuildNet Core Library
//!
//! High-performance build orchestration engine with:
//! - SQLite state management (WAL mode, connection pooling)
//! - Content-addressed artifact caching
//! - File watching with debouncing
//! - Parallel build execution
//! - Cross-runtime IPC via MessagePack

pub mod state;
pub mod cache;
pub mod watcher;
pub mod builder;
pub mod hasher;
pub mod config;
pub mod error;

pub use error::{BuildNetError, Result};
pub use state::StateManager;
pub use cache::ArtifactCache;
pub use watcher::FileWatcher;
pub use builder::BuildOrchestrator;
pub use config::Config;

/// BuildNet version
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Default socket path for daemon communication
pub const DEFAULT_SOCKET_PATH: &str = "/tmp/buildnet.sock";

/// Default HTTP port for API server
pub const DEFAULT_HTTP_PORT: u16 = 9876;

/// Default database path
pub const DEFAULT_DB_PATH: &str = ".buildnet/state.db";
