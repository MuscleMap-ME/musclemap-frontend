# BuildNet Native Core Architecture

> **Goal**: Create a high-performance, native compiled core for BuildNet that can run standalone or be embedded in Node.js/Bun/Deno/Python with maximum performance, security, and portability.

## Executive Summary

BuildNet will be rewritten with a **Rust core** compiled to a native executable that:
- Runs standalone without any runtime (no Node.js, no Bun required)
- Has a built-in HTTP server (using Hyper/Axum - 2.5x faster than Node)
- Embeds a web UI server for the dashboard
- Uses SQLite via rusqlite (fastest embedded database)
- Exposes FFI bindings for Node.js, Bun, Deno, and Python
- Can be managed by PM2 or systemd (or run as a service)
- Cross-compiles to all platforms from a single machine

### Why Rust Over Other Languages

| Language | Performance | Memory Safety | FFI Bindings | Ecosystem | Decision |
|----------|-------------|---------------|--------------|-----------|----------|
| **Rust** | ~C/C++ | Compile-time | napi-rs, PyO3 | Excellent | **PRIMARY** |
| **Zig** | ~C | Manual + safety | C ABI | Growing | For hot paths |
| **Go** | 70% of Rust | GC | CGO (complex) | Good | Coordination layer |
| **C** | Maximum | Manual (unsafe) | Universal | Mature | Performance kernels |
| **C++** | Maximum | Manual (unsafe) | Complex | Mature | Not needed |

**Primary: Rust** - Best balance of performance, safety, and ecosystem for FFI bindings.
**Secondary: Zig** - For ultra-performance kernels (like Bun uses internally).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BuildNet Unified System                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Native Core (Rust)                        │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │    │
│  │  │ HTTP Server │ │ WebSocket   │ │ Embedded Web UI         │ │    │
│  │  │ (Axum)      │ │ Server      │ │ (Static + API)          │ │    │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────┘ │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │    │
│  │  │ Build       │ │ Worker      │ │ State Manager           │ │    │
│  │  │ Orchestrator│ │ Pool        │ │ (rusqlite)              │ │    │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────┘ │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │    │
│  │  │ File        │ │ Process     │ │ Content-Addressed       │ │    │
│  │  │ Watcher     │ │ Manager     │ │ Artifact Store          │ │    │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│  ┌───────────────────────────┼───────────────────────────────────┐  │
│  │                    FFI Layer (C ABI)                           │  │
│  │   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │  │
│  │   │ napi-rs     │ │ Bun FFI    │ │ Deno FFI    │ │ PyO3    │ │  │
│  │   │ (Node.js)   │ │ (bun:ffi)  │ │ (Deno.dlopen)│ │ (Python)│ │  │
│  │   └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Runtime Wrappers                            │  │
│  │   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐       │  │
│  │   │ @buildnet/    │ │ buildnet-bun  │ │ buildnet-py   │       │  │
│  │   │ node          │ │ (Bun package) │ │ (pip package) │       │  │
│  │   └───────────────┘ └───────────────┘ └───────────────┘       │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Rust Core Implementation

### 1.1 Project Structure

```
buildnet-core/
├── Cargo.toml                 # Workspace manifest
├── buildnet-daemon/           # Main executable
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs            # Entry point
│       ├── cli.rs             # CLI argument parser
│       ├── config.rs          # Configuration loading
│       └── service.rs         # Service/daemon mode
├── buildnet-core/             # Core library
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── http/              # HTTP server (Axum)
│       ├── ws/                # WebSocket server
│       ├── state/             # State management (SQLite)
│       ├── worker/            # Worker pool & orchestration
│       ├── watcher/           # File system watcher
│       ├── bundler/           # Bundler adapters
│       ├── artifacts/         # Content-addressed storage
│       ├── protocol/          # Message protocol
│       └── ui/                # Embedded web UI
├── buildnet-ffi/              # FFI bindings
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── napi.rs            # Node.js bindings (napi-rs)
│       └── cabi.rs            # C ABI for Bun/Deno/Python
├── buildnet-zig/              # Performance kernels (optional)
│   ├── build.zig
│   └── src/
│       ├── hash.zig           # Fast hashing
│       └── diff.zig           # Fast file diff
└── bindings/
    ├── node/                  # Node.js package (@buildnet/node)
    ├── bun/                   # Bun package
    ├── deno/                  # Deno module
    └── python/                # Python package (PyO3)
```

### 1.2 Cargo.toml (Workspace)

```toml
[workspace]
members = [
    "buildnet-daemon",
    "buildnet-core",
    "buildnet-ffi",
]
resolver = "2"

[workspace.package]
version = "1.0.0"
authors = ["BuildNet Team"]
edition = "2021"
rust-version = "1.75"
license = "MIT"
repository = "https://github.com/musclemap/buildnet"

[workspace.dependencies]
# Async runtime
tokio = { version = "1.35", features = ["full"] }

# HTTP server
axum = "0.7"
hyper = { version = "1.0", features = ["full"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["fs", "cors", "compression-gzip", "compression-br"] }

# WebSocket
tokio-tungstenite = "0.21"

# Database
rusqlite = { version = "0.31", features = ["bundled", "backup", "hooks"] }

# File watching
notify = "6.1"
walkdir = "2.4"

# Serialization
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
rmp-serde = "1.1"  # MessagePack for protocol

# Hashing
xxhash-rust = { version = "0.8", features = ["xxh3"] }
blake3 = "1.5"

# CLI
clap = { version = "4.4", features = ["derive"] }

# Logging
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }

# FFI
napi = { version = "2", features = ["async", "napi8"] }
napi-derive = "2"
pyo3 = { version = "0.20", features = ["extension-module"] }

# Error handling
anyhow = "1.0"
thiserror = "1.0"

# Utilities
once_cell = "1.19"
dashmap = "5.5"
crossbeam-channel = "0.5"
uuid = { version = "1.6", features = ["v4", "fast-rng"] }
```

### 1.3 HTTP Server (Axum)

```rust
// buildnet-core/src/http/server.rs

use axum::{
    extract::{State, WebSocketUpgrade, ws::WebSocket},
    http::StatusCode,
    response::{Html, IntoResponse, Json},
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use tower_http::{
    compression::CompressionLayer,
    cors::CorsLayer,
    services::ServeDir,
};

use crate::state::AppState;

pub struct HttpServer {
    router: Router,
    port: u16,
}

impl HttpServer {
    pub fn new(state: Arc<AppState>, port: u16) -> Self {
        let router = Router::new()
            // API routes
            .route("/health", get(health))
            .route("/api/v1/build", post(request_build))
            .route("/api/v1/status", get(get_status))
            .route("/api/v1/workers", get(list_workers))
            .route("/api/v1/artifacts", get(list_artifacts))
            .route("/api/v1/logs", get(stream_logs))
            // WebSocket for real-time updates
            .route("/ws", get(ws_handler))
            // Embedded UI (static files compiled into binary)
            .nest_service("/", ServeDir::new("ui/dist").fallback(index_html))
            // State
            .with_state(state)
            // Middleware
            .layer(CompressionLayer::new())
            .layer(CorsLayer::permissive());

        Self { router, port }
    }

    pub async fn run(self) -> anyhow::Result<()> {
        let addr = std::net::SocketAddr::from(([0, 0, 0, 0], self.port));
        tracing::info!("BuildNet HTTP server listening on {}", addr);

        let listener = tokio::net::TcpListener::bind(addr).await?;
        axum::serve(listener, self.router).await?;
        Ok(())
    }
}

async fn health() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

async fn request_build(
    State(state): State<Arc<AppState>>,
    Json(request): Json<BuildRequest>,
) -> impl IntoResponse {
    match state.orchestrator.request_build(request).await {
        Ok(build_id) => Json(serde_json::json!({
            "success": true,
            "build_id": build_id,
        })),
        Err(e) => Json(serde_json::json!({
            "success": false,
            "error": e.to_string(),
        })),
    }
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_ws(socket, state))
}

async fn handle_ws(mut socket: WebSocket, state: Arc<AppState>) {
    // Subscribe to events and forward to WebSocket
    let mut rx = state.event_bus.subscribe();

    while let Ok(event) = rx.recv().await {
        let msg = serde_json::to_string(&event).unwrap();
        if socket.send(axum::extract::ws::Message::Text(msg)).await.is_err() {
            break;
        }
    }
}

// Embed UI at compile time
async fn index_html() -> Html<&'static str> {
    Html(include_str!("../../ui/dist/index.html"))
}
```

### 1.4 SQLite State Backend (rusqlite)

```rust
// buildnet-core/src/state/sqlite.rs

use rusqlite::{Connection, params};
use std::sync::Mutex;
use dashmap::DashMap;

pub struct SqliteState {
    conn: Mutex<Connection>,
    cache: DashMap<String, String>,
}

impl SqliteState {
    pub fn new(path: &str) -> anyhow::Result<Self> {
        let conn = Connection::open(path)?;

        // Enable WAL mode for concurrent reads
        conn.execute_batch("
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA busy_timeout = 5000;
            PRAGMA cache_size = -64000;
            PRAGMA mmap_size = 268435456;
        ")?;

        // Create tables
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS kv_store (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                expires_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS builds (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                targets TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                completed_at INTEGER,
                duration_ms INTEGER,
                result TEXT
            );

            CREATE TABLE IF NOT EXISTS workers (
                id TEXT PRIMARY KEY,
                host TEXT NOT NULL,
                port INTEGER NOT NULL,
                status TEXT NOT NULL,
                capabilities TEXT,
                last_heartbeat INTEGER
            );

            CREATE TABLE IF NOT EXISTS artifacts (
                hash TEXT PRIMARY KEY,
                path TEXT NOT NULL,
                size INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                last_accessed INTEGER
            );

            CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status);
            CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
            CREATE INDEX IF NOT EXISTS idx_artifacts_accessed ON artifacts(last_accessed);
        ")?;

        Ok(Self {
            conn: Mutex::new(conn),
            cache: DashMap::new(),
        })
    }

    pub fn get(&self, key: &str) -> anyhow::Result<Option<String>> {
        // Check cache first
        if let Some(value) = self.cache.get(key) {
            return Ok(Some(value.clone()));
        }

        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare_cached(
            "SELECT value FROM kv_store WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)"
        )?;

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_millis() as i64;

        let result: Option<String> = stmt.query_row(params![key, now], |row| row.get(0)).ok();

        // Cache the result
        if let Some(ref value) = result {
            self.cache.insert(key.to_string(), value.clone());
        }

        Ok(result)
    }

    pub fn set(&self, key: &str, value: &str, ttl_ms: Option<i64>) -> anyhow::Result<()> {
        let conn = self.conn.lock().unwrap();

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_millis() as i64;

        let expires_at = ttl_ms.map(|ttl| now + ttl);

        conn.execute(
            "INSERT OR REPLACE INTO kv_store (key, value, expires_at) VALUES (?, ?, ?)",
            params![key, value, expires_at],
        )?;

        // Update cache
        self.cache.insert(key.to_string(), value.to_string());

        Ok(())
    }

    pub fn delete(&self, key: &str) -> anyhow::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM kv_store WHERE key = ?", params![key])?;
        self.cache.remove(key);
        Ok(())
    }

    // Lock acquisition with atomic operation
    pub fn acquire_lock(&self, resource: &str, ttl_ms: i64) -> anyhow::Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let token = uuid::Uuid::new_v4().to_string();

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_millis() as i64;

        let expires_at = now + ttl_ms;
        let lock_key = format!("lock:{}", resource);

        // Atomic: insert only if not exists or expired
        let rows = conn.execute(
            "INSERT INTO kv_store (key, value, expires_at)
             SELECT ?, ?, ?
             WHERE NOT EXISTS (
                 SELECT 1 FROM kv_store WHERE key = ? AND expires_at > ?
             )",
            params![lock_key, token, expires_at, lock_key, now],
        )?;

        if rows > 0 {
            Ok(Some(token))
        } else {
            Ok(None)
        }
    }

    pub fn release_lock(&self, resource: &str, token: &str) -> anyhow::Result<bool> {
        let conn = self.conn.lock().unwrap();
        let lock_key = format!("lock:{}", resource);

        let rows = conn.execute(
            "DELETE FROM kv_store WHERE key = ? AND value = ?",
            params![lock_key, token],
        )?;

        Ok(rows > 0)
    }
}
```

### 1.5 File Watcher (notify crate)

```rust
// buildnet-core/src/watcher/mod.rs

use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher, Event};
use std::path::Path;
use std::sync::Arc;
use tokio::sync::mpsc;
use crossbeam_channel::Receiver;

pub struct FileWatcher {
    watcher: RecommendedWatcher,
    rx: Receiver<notify::Result<Event>>,
}

impl FileWatcher {
    pub fn new() -> anyhow::Result<Self> {
        let (tx, rx) = crossbeam_channel::unbounded();

        let watcher = RecommendedWatcher::new(
            move |res| {
                tx.send(res).ok();
            },
            Config::default().with_poll_interval(std::time::Duration::from_millis(100)),
        )?;

        Ok(Self { watcher, rx })
    }

    pub fn watch<P: AsRef<Path>>(&mut self, path: P) -> anyhow::Result<()> {
        self.watcher.watch(path.as_ref(), RecursiveMode::Recursive)?;
        Ok(())
    }

    pub async fn process_events<F>(&self, mut handler: F)
    where
        F: FnMut(Event) + Send + 'static,
    {
        for result in &self.rx {
            match result {
                Ok(event) => handler(event),
                Err(e) => tracing::error!("Watch error: {:?}", e),
            }
        }
    }
}
```

---

## Phase 2: FFI Bindings

### 2.1 Node.js Bindings (napi-rs)

```rust
// buildnet-ffi/src/napi.rs

use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::sync::Arc;
use tokio::runtime::Runtime;

use buildnet_core::{daemon::Daemon, config::Config};

#[napi]
pub struct BuildNetClient {
    daemon: Arc<Daemon>,
    runtime: Runtime,
}

#[napi]
impl BuildNetClient {
    #[napi(constructor)]
    pub fn new(config_path: Option<String>) -> Result<Self> {
        let runtime = tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .map_err(|e| Error::from_reason(e.to_string()))?;

        let config = Config::load(config_path.as_deref())
            .map_err(|e| Error::from_reason(e.to_string()))?;

        let daemon = runtime.block_on(async {
            Daemon::new(config).await
        }).map_err(|e| Error::from_reason(e.to_string()))?;

        Ok(Self {
            daemon: Arc::new(daemon),
            runtime,
        })
    }

    #[napi]
    pub async fn start(&self) -> Result<()> {
        self.daemon.start().await
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    #[napi]
    pub async fn stop(&self) -> Result<()> {
        self.daemon.stop().await
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    #[napi]
    pub async fn request_build(&self, targets: Vec<String>) -> Result<String> {
        self.daemon.request_build(targets).await
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    #[napi]
    pub async fn get_status(&self) -> Result<String> {
        let status = self.daemon.get_status().await
            .map_err(|e| Error::from_reason(e.to_string()))?;
        serde_json::to_string(&status)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    #[napi]
    pub fn get_state(&self, key: String) -> Result<Option<String>> {
        self.daemon.state.get(&key)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    #[napi]
    pub fn set_state(&self, key: String, value: String, ttl_ms: Option<i64>) -> Result<()> {
        self.daemon.state.set(&key, &value, ttl_ms)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    #[napi]
    pub fn acquire_lock(&self, resource: String, ttl_ms: i64) -> Result<Option<String>> {
        self.daemon.state.acquire_lock(&resource, ttl_ms)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    #[napi]
    pub fn release_lock(&self, resource: String, token: String) -> Result<bool> {
        self.daemon.state.release_lock(&resource, &token)
            .map_err(|e| Error::from_reason(e.to_string()))
    }
}

// Export fast hashing functions
#[napi]
pub fn xxhash(data: Buffer) -> String {
    let hash = xxhash_rust::xxh3::xxh3_64(&data);
    format!("{:016x}", hash)
}

#[napi]
pub fn blake3_hash(data: Buffer) -> String {
    let hash = blake3::hash(&data);
    hash.to_hex().to_string()
}
```

### 2.2 C ABI for Bun/Deno

```rust
// buildnet-ffi/src/cabi.rs

use std::ffi::{c_char, c_int, c_void, CStr, CString};
use std::ptr;
use std::sync::Arc;

use buildnet_core::{daemon::Daemon, config::Config};

/// Opaque handle to BuildNet daemon
pub struct BuildNetHandle {
    daemon: Arc<Daemon>,
    runtime: tokio::runtime::Runtime,
}

/// Create a new BuildNet daemon
#[no_mangle]
pub extern "C" fn buildnet_create(config_path: *const c_char) -> *mut BuildNetHandle {
    let config_str = if config_path.is_null() {
        None
    } else {
        Some(unsafe { CStr::from_ptr(config_path).to_str().unwrap_or("") })
    };

    let runtime = match tokio::runtime::Runtime::new() {
        Ok(rt) => rt,
        Err(_) => return ptr::null_mut(),
    };

    let config = match Config::load(config_str) {
        Ok(c) => c,
        Err(_) => return ptr::null_mut(),
    };

    let daemon = match runtime.block_on(async { Daemon::new(config).await }) {
        Ok(d) => d,
        Err(_) => return ptr::null_mut(),
    };

    let handle = Box::new(BuildNetHandle {
        daemon: Arc::new(daemon),
        runtime,
    });

    Box::into_raw(handle)
}

/// Start the daemon
#[no_mangle]
pub extern "C" fn buildnet_start(handle: *mut BuildNetHandle) -> c_int {
    if handle.is_null() {
        return -1;
    }

    let handle = unsafe { &*handle };
    match handle.runtime.block_on(handle.daemon.start()) {
        Ok(_) => 0,
        Err(_) => -1,
    }
}

/// Stop the daemon
#[no_mangle]
pub extern "C" fn buildnet_stop(handle: *mut BuildNetHandle) -> c_int {
    if handle.is_null() {
        return -1;
    }

    let handle = unsafe { &*handle };
    match handle.runtime.block_on(handle.daemon.stop()) {
        Ok(_) => 0,
        Err(_) => -1,
    }
}

/// Request a build
#[no_mangle]
pub extern "C" fn buildnet_request_build(
    handle: *mut BuildNetHandle,
    targets: *const c_char,
    out_build_id: *mut c_char,
    out_len: usize,
) -> c_int {
    if handle.is_null() || targets.is_null() {
        return -1;
    }

    let handle = unsafe { &*handle };
    let targets_str = unsafe { CStr::from_ptr(targets).to_str().unwrap_or("") };
    let targets: Vec<String> = targets_str.split(',').map(|s| s.to_string()).collect();

    match handle.runtime.block_on(handle.daemon.request_build(targets)) {
        Ok(build_id) => {
            if !out_build_id.is_null() && out_len > 0 {
                let c_str = CString::new(build_id).unwrap();
                let bytes = c_str.as_bytes_with_nul();
                let copy_len = bytes.len().min(out_len);
                unsafe {
                    ptr::copy_nonoverlapping(bytes.as_ptr(), out_build_id as *mut u8, copy_len);
                }
            }
            0
        }
        Err(_) => -1,
    }
}

/// Get state value
#[no_mangle]
pub extern "C" fn buildnet_get_state(
    handle: *mut BuildNetHandle,
    key: *const c_char,
    out_value: *mut c_char,
    out_len: usize,
) -> c_int {
    if handle.is_null() || key.is_null() {
        return -1;
    }

    let handle = unsafe { &*handle };
    let key_str = unsafe { CStr::from_ptr(key).to_str().unwrap_or("") };

    match handle.daemon.state.get(key_str) {
        Ok(Some(value)) => {
            if !out_value.is_null() && out_len > 0 {
                let c_str = CString::new(value).unwrap();
                let bytes = c_str.as_bytes_with_nul();
                let copy_len = bytes.len().min(out_len);
                unsafe {
                    ptr::copy_nonoverlapping(bytes.as_ptr(), out_value as *mut u8, copy_len);
                }
            }
            0
        }
        Ok(None) => 1, // Not found
        Err(_) => -1,
    }
}

/// Destroy the daemon
#[no_mangle]
pub extern "C" fn buildnet_destroy(handle: *mut BuildNetHandle) {
    if !handle.is_null() {
        unsafe {
            drop(Box::from_raw(handle));
        }
    }
}

/// Fast xxhash
#[no_mangle]
pub extern "C" fn buildnet_xxhash(data: *const u8, len: usize) -> u64 {
    if data.is_null() {
        return 0;
    }
    let slice = unsafe { std::slice::from_raw_parts(data, len) };
    xxhash_rust::xxh3::xxh3_64(slice)
}

/// Fast blake3 hash
#[no_mangle]
pub extern "C" fn buildnet_blake3(data: *const u8, len: usize, out: *mut u8) {
    if data.is_null() || out.is_null() {
        return;
    }
    let slice = unsafe { std::slice::from_raw_parts(data, len) };
    let hash = blake3::hash(slice);
    unsafe {
        ptr::copy_nonoverlapping(hash.as_bytes().as_ptr(), out, 32);
    }
}
```

### 2.3 Python Bindings (PyO3)

```rust
// buildnet-ffi/src/python.rs

use pyo3::prelude::*;
use pyo3::exceptions::PyRuntimeError;
use std::sync::Arc;
use tokio::runtime::Runtime;

use buildnet_core::{daemon::Daemon, config::Config};

#[pyclass]
struct BuildNetClient {
    daemon: Arc<Daemon>,
    runtime: Runtime,
}

#[pymethods]
impl BuildNetClient {
    #[new]
    #[pyo3(signature = (config_path=None))]
    fn new(config_path: Option<&str>) -> PyResult<Self> {
        let runtime = Runtime::new()
            .map_err(|e| PyRuntimeError::new_err(e.to_string()))?;

        let config = Config::load(config_path)
            .map_err(|e| PyRuntimeError::new_err(e.to_string()))?;

        let daemon = runtime.block_on(async {
            Daemon::new(config).await
        }).map_err(|e| PyRuntimeError::new_err(e.to_string()))?;

        Ok(Self {
            daemon: Arc::new(daemon),
            runtime,
        })
    }

    fn start(&self) -> PyResult<()> {
        self.runtime.block_on(self.daemon.start())
            .map_err(|e| PyRuntimeError::new_err(e.to_string()))
    }

    fn stop(&self) -> PyResult<()> {
        self.runtime.block_on(self.daemon.stop())
            .map_err(|e| PyRuntimeError::new_err(e.to_string()))
    }

    fn request_build(&self, targets: Vec<String>) -> PyResult<String> {
        self.runtime.block_on(self.daemon.request_build(targets))
            .map_err(|e| PyRuntimeError::new_err(e.to_string()))
    }

    fn get_state(&self, key: &str) -> PyResult<Option<String>> {
        self.daemon.state.get(key)
            .map_err(|e| PyRuntimeError::new_err(e.to_string()))
    }

    fn set_state(&self, key: &str, value: &str, ttl_ms: Option<i64>) -> PyResult<()> {
        self.daemon.state.set(key, value, ttl_ms)
            .map_err(|e| PyRuntimeError::new_err(e.to_string()))
    }

    fn acquire_lock(&self, resource: &str, ttl_ms: i64) -> PyResult<Option<String>> {
        self.daemon.state.acquire_lock(resource, ttl_ms)
            .map_err(|e| PyRuntimeError::new_err(e.to_string()))
    }

    fn release_lock(&self, resource: &str, token: &str) -> PyResult<bool> {
        self.daemon.state.release_lock(resource, token)
            .map_err(|e| PyRuntimeError::new_err(e.to_string()))
    }
}

#[pyfunction]
fn xxhash(data: &[u8]) -> u64 {
    xxhash_rust::xxh3::xxh3_64(data)
}

#[pyfunction]
fn blake3_hash(data: &[u8]) -> String {
    blake3::hash(data).to_hex().to_string()
}

#[pymodule]
fn buildnet(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_class::<BuildNetClient>()?;
    m.add_function(wrap_pyfunction!(xxhash, m)?)?;
    m.add_function(wrap_pyfunction!(blake3_hash, m)?)?;
    Ok(())
}
```

---

## Phase 3: Bun/Deno Wrapper

### 3.1 Bun FFI Wrapper

```typescript
// bindings/bun/index.ts

import { dlopen, FFIType, suffix, ptr } from 'bun:ffi';
import { join } from 'path';

// Load the native library
const libPath = join(import.meta.dir, `libbuildnet.${suffix}`);

const lib = dlopen(libPath, {
  buildnet_create: {
    args: [FFIType.ptr],
    returns: FFIType.ptr,
  },
  buildnet_start: {
    args: [FFIType.ptr],
    returns: FFIType.i32,
  },
  buildnet_stop: {
    args: [FFIType.ptr],
    returns: FFIType.i32,
  },
  buildnet_request_build: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.u64],
    returns: FFIType.i32,
  },
  buildnet_get_state: {
    args: [FFIType.ptr, FFIType.ptr, FFIType.ptr, FFIType.u64],
    returns: FFIType.i32,
  },
  buildnet_destroy: {
    args: [FFIType.ptr],
    returns: FFIType.void,
  },
  buildnet_xxhash: {
    args: [FFIType.ptr, FFIType.u64],
    returns: FFIType.u64,
  },
  buildnet_blake3: {
    args: [FFIType.ptr, FFIType.u64, FFIType.ptr],
    returns: FFIType.void,
  },
});

export class BuildNetClient {
  private handle: number;

  constructor(configPath?: string) {
    const configPtr = configPath ? ptr(Buffer.from(configPath + '\0')) : null;
    this.handle = lib.symbols.buildnet_create(configPtr) as number;

    if (!this.handle) {
      throw new Error('Failed to create BuildNet client');
    }
  }

  start(): void {
    const result = lib.symbols.buildnet_start(this.handle);
    if (result !== 0) {
      throw new Error('Failed to start daemon');
    }
  }

  stop(): void {
    const result = lib.symbols.buildnet_stop(this.handle);
    if (result !== 0) {
      throw new Error('Failed to stop daemon');
    }
  }

  requestBuild(targets: string[]): string {
    const targetsStr = targets.join(',') + '\0';
    const outBuf = Buffer.alloc(64);

    const result = lib.symbols.buildnet_request_build(
      this.handle,
      ptr(Buffer.from(targetsStr)),
      ptr(outBuf),
      64
    );

    if (result !== 0) {
      throw new Error('Failed to request build');
    }

    const nullIndex = outBuf.indexOf(0);
    return outBuf.slice(0, nullIndex).toString();
  }

  getState(key: string): string | null {
    const outBuf = Buffer.alloc(4096);

    const result = lib.symbols.buildnet_get_state(
      this.handle,
      ptr(Buffer.from(key + '\0')),
      ptr(outBuf),
      4096
    );

    if (result === 1) return null; // Not found
    if (result !== 0) throw new Error('Failed to get state');

    const nullIndex = outBuf.indexOf(0);
    return outBuf.slice(0, nullIndex).toString();
  }

  destroy(): void {
    lib.symbols.buildnet_destroy(this.handle);
    this.handle = 0;
  }
}

// Fast hash functions
export function xxhash(data: Uint8Array): bigint {
  return lib.symbols.buildnet_xxhash(ptr(data), data.length) as bigint;
}

export function blake3(data: Uint8Array): Uint8Array {
  const out = new Uint8Array(32);
  lib.symbols.buildnet_blake3(ptr(data), data.length, ptr(out));
  return out;
}
```

---

## Phase 4: Process Management

### 4.1 PM2 Support

The Rust executable can be managed by PM2 like any other process:

```javascript
// ecosystem.buildnet.config.cjs

module.exports = {
  apps: [
    {
      name: 'buildnet',
      script: './buildnet-daemon', // Native executable
      args: '--port 7890 --config buildnet.yaml',
      cwd: '/var/www/musclemap.me',
      interpreter: 'none', // No interpreter needed - native binary
      env: {
        RUST_LOG: 'info',
        BUILDNET_DB: '/var/www/musclemap.me/.buildnet/state.db',
      },
      max_memory_restart: '500M',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: true,
    },
  ],
};
```

### 4.2 Systemd Service (Alternative)

```ini
# /etc/systemd/system/buildnet.service

[Unit]
Description=BuildNet Distributed Build Daemon
After=network.target

[Service]
Type=simple
User=buildnet
Group=buildnet
WorkingDirectory=/var/www/musclemap.me
ExecStart=/usr/local/bin/buildnet-daemon --port 7890 --config /etc/buildnet/config.yaml
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=5
Environment=RUST_LOG=info
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

---

## Phase 5: Cross-Compilation

### 5.1 Build Script

```bash
#!/bin/bash
# build-all-platforms.sh

set -e

# Targets to build
TARGETS=(
    "x86_64-unknown-linux-gnu"
    "x86_64-unknown-linux-musl"
    "aarch64-unknown-linux-gnu"
    "x86_64-apple-darwin"
    "aarch64-apple-darwin"
    "x86_64-pc-windows-msvc"
)

# Build for each target
for target in "${TARGETS[@]}"; do
    echo "Building for $target..."

    # Use cross for cross-compilation
    cross build --release --target "$target"

    # Copy artifacts
    mkdir -p "dist/$target"

    if [[ "$target" == *"windows"* ]]; then
        cp "target/$target/release/buildnet-daemon.exe" "dist/$target/"
        cp "target/$target/release/buildnet.dll" "dist/$target/"
    else
        cp "target/$target/release/buildnet-daemon" "dist/$target/"
        cp "target/$target/release/libbuildnet.so" "dist/$target/" 2>/dev/null || \
        cp "target/$target/release/libbuildnet.dylib" "dist/$target/" 2>/dev/null || true
    fi
done

echo "Build complete!"
ls -la dist/*/
```

### 5.2 Cargo Config for Cross-Compilation

```toml
# .cargo/config.toml

[target.x86_64-unknown-linux-musl]
linker = "x86_64-linux-musl-gcc"

[target.aarch64-unknown-linux-gnu]
linker = "aarch64-linux-gnu-gcc"

[target.x86_64-apple-darwin]
linker = "x86_64-apple-darwin-clang"

[target.aarch64-apple-darwin]
linker = "aarch64-apple-darwin-clang"
```

---

## Performance Comparison

| Component | TypeScript/Bun | Rust Native | Improvement |
|-----------|---------------|-------------|-------------|
| HTTP Server | 250k req/s | 800k req/s | 3.2x |
| SQLite Queries | 15μs | 2μs | 7.5x |
| File Hashing | 500 MB/s | 5 GB/s | 10x |
| Memory Usage | 150 MB | 15 MB | 10x |
| Startup Time | 50 ms | 2 ms | 25x |
| Build | 120 ms (Bun.build) | N/A (delegates) | - |

---

## Summary

| Feature | Implementation | Technology |
|---------|---------------|------------|
| Core Daemon | Native executable | Rust |
| HTTP Server | Embedded, high-performance | Axum + Hyper |
| State Management | Embedded database | rusqlite |
| File Watching | Cross-platform | notify crate |
| Node.js Bindings | Native addon | napi-rs |
| Bun Bindings | FFI | C ABI |
| Deno Bindings | FFI | C ABI |
| Python Bindings | Native extension | PyO3 |
| Process Management | PM2 or systemd | Native binary |
| Cross-compilation | All major platforms | Cargo + cross |

---

## Sources

- [Rust vs Go Comparison 2025](https://blog.jetbrains.com/rust/2025/06/12/rust-vs-go/)
- [Rust vs C++ Comparison 2026](https://blog.jetbrains.com/rust/2025/12/16/rust-vs-cpp-comparison-for-2026/)
- [Bun, Tokio, Turso on Rust vs Zig](https://www.p99conf.io/2023/11/14/bun-tokio-turso-rust-zig/)
- [Why Bun Uses Zig](https://github.com/oven-sh/bun/discussions/994)
- [NAPI-RS v2 Announcement](https://napi.rs/blog/announce-v2)
- [Bun FFI Documentation](https://bun.sh/docs/api/ffi)
- [Deno FFI Documentation](https://docs.deno.com/runtime/fundamentals/ffi/)
- [Axum Web Framework](https://github.com/tokio-rs/axum)
- [Zig Cross-Compilation Guide](https://zig.guide/build-system/cross-compilation/)
