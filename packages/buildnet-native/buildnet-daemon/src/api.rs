//! HTTP API for BuildNet daemon

use std::sync::Arc;
use std::sync::RwLock;
use std::collections::VecDeque;
use std::time::{Duration, Instant};

use axum::{
    extract::{Path, State},
    http::{header, HeaderMap, StatusCode, Uri},
    response::{
        sse::{Event, KeepAlive, Sse},
        Html, IntoResponse,
    },
    routing::{get, post},
    Json, Router,
};
use rust_embed::RustEmbed;
use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;
use tokio_stream::wrappers::BroadcastStream;
use tokio_stream::StreamExt;
use tower_http::cors::CorsLayer;

/// Embedded static files for the web UI
#[derive(RustEmbed)]
#[folder = "static/"]
struct Assets;

use buildnet_core::{
    ArtifactCache, BuildOrchestrator, Config, StateManager,
    state::BuildState,
};

/// Request source information for tracking how the daemon was contacted
#[derive(Debug, Clone, Serialize)]
pub struct RequestSource {
    /// Detected source type: "api", "cli", "web-panel", "curl", "unknown"
    pub source_type: String,
    /// User-Agent header if present
    pub user_agent: Option<String>,
    /// Client IP address
    pub ip: Option<String>,
    /// Referer header if present
    pub referer: Option<String>,
    /// X-Forwarded-For header (for proxied requests)
    pub forwarded_for: Option<String>,
}

/// Request log entry for audit trail
#[derive(Debug, Clone, Serialize)]
pub struct RequestLogEntry {
    pub id: u64,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub method: String,
    pub path: String,
    pub source: RequestSource,
    /// Build details if this was a build request
    pub build_info: Option<BuildRequestInfo>,
}

/// Details about a build request
#[derive(Debug, Clone, Serialize)]
pub struct BuildRequestInfo {
    /// "full" or "single"
    pub build_type: String,
    /// Target package if single build
    pub package: Option<String>,
    /// Was force flag set
    pub force: bool,
    /// List of packages that will be built
    pub packages: Vec<String>,
}

/// Simple token bucket rate limiter for build requests
pub struct RateLimiter {
    /// Timestamps of recent requests
    requests: RwLock<VecDeque<Instant>>,
    /// Maximum requests allowed in the window
    max_requests: usize,
    /// Time window for rate limiting
    window: Duration,
}

impl RateLimiter {
    /// Create a new rate limiter
    pub fn new(max_requests: usize, window: Duration) -> Self {
        Self {
            requests: RwLock::new(VecDeque::with_capacity(max_requests + 1)),
            max_requests,
            window,
        }
    }

    /// Check if a request is allowed and record it if so.
    /// Returns Ok(()) if allowed, Err with wait time if rate limited.
    pub fn check(&self) -> Result<(), Duration> {
        let now = Instant::now();
        let mut requests = self.requests.write().unwrap();

        // Remove old requests outside the window
        while let Some(&oldest) = requests.front() {
            if now.duration_since(oldest) > self.window {
                requests.pop_front();
            } else {
                break;
            }
        }

        // Check if we're under the limit
        if requests.len() >= self.max_requests {
            // Calculate how long until the oldest request expires
            if let Some(&oldest) = requests.front() {
                let wait_time = self.window.saturating_sub(now.duration_since(oldest));
                return Err(wait_time);
            }
        }

        // Record this request
        requests.push_back(now);
        Ok(())
    }
}

/// Shared application state
pub struct AppState {
    pub config: Config,
    pub state: Arc<StateManager>,
    pub cache: Arc<ArtifactCache>,
    pub orchestrator: BuildOrchestrator,
    /// Channel for build events
    pub events_tx: broadcast::Sender<BuildEvent>,
    /// Request log (bounded circular buffer)
    pub request_log: RwLock<VecDeque<RequestLogEntry>>,
    /// Request counter for IDs
    pub request_counter: RwLock<u64>,
    /// Rate limiter for build requests (10 builds per minute)
    pub build_rate_limiter: RateLimiter,
}

/// Build event for SSE streaming
#[derive(Debug, Clone, Serialize)]
pub struct BuildEvent {
    pub event_type: String,
    pub package: Option<String>,
    pub message: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    /// Request source information (for build events)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<RequestSource>,
    /// Build request details
    #[serde(skip_serializing_if = "Option::is_none")]
    pub build_info: Option<BuildRequestInfo>,
    /// Log level: info, warn, error, debug
    pub level: String,
}


/// Helper to detect request source from headers
fn detect_request_source(headers: &HeaderMap) -> RequestSource {
    let user_agent = headers
        .get(header::USER_AGENT)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let referer = headers
        .get(header::REFERER)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let forwarded_for = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    // Try to get IP from various headers (Caddy/nginx proxy headers)
    let ip = forwarded_for.clone()
        .or_else(|| headers.get("x-real-ip").and_then(|v| v.to_str().ok()).map(|s| s.to_string()))
        .or_else(|| headers.get("cf-connecting-ip").and_then(|v| v.to_str().ok()).map(|s| s.to_string()));

    // Detect source type from user-agent and referer
    let source_type = if let Some(ref ua) = user_agent {
        if ua.contains("curl") {
            "curl".to_string()
        } else if ua.contains("buildnet-cli") || ua.contains("buildnetd") {
            "cli".to_string()
        } else if ua.contains("Mozilla") || ua.contains("Chrome") || ua.contains("Safari") {
            if referer.as_ref().map(|r| r.contains("/empire") || r.contains("/buildnet")).unwrap_or(false) {
                "web-panel".to_string()
            } else {
                "browser".to_string()
            }
        } else if ua.contains("node") || ua.contains("axios") || ua.contains("fetch") {
            "api".to_string()
        } else {
            "unknown".to_string()
        }
    } else {
        "unknown".to_string()
    };

    RequestSource {
        source_type,
        user_agent,
        ip,
        referer,
        forwarded_for,
    }
}

/// Create the API router
pub fn create_router(
    config: Config,
    state: Arc<StateManager>,
    cache: Arc<ArtifactCache>,
) -> Router {
    let orchestrator = BuildOrchestrator::new(config.clone(), Arc::clone(&state), Arc::clone(&cache));
    let (events_tx, _) = broadcast::channel(100);

    let app_state = Arc::new(AppState {
        config,
        state,
        cache,
        orchestrator,
        events_tx,
        request_log: RwLock::new(VecDeque::with_capacity(100)),
        request_counter: RwLock::new(0),
        // Rate limit: 10 builds per minute to prevent abuse
        build_rate_limiter: RateLimiter::new(10, Duration::from_secs(60)),
    });

    Router::new()
        // Web UI - serve index.html at root
        .route("/", get(index_html))
        .route("/static/{*file}", get(static_handler))

        // Health and status
        .route("/health", get(health))
        .route("/status", get(status))
        .route("/stats", get(stats))

        // Build operations
        .route("/build", post(build_all))
        .route("/build/{package}", post(build_package))

        // Build history
        .route("/builds", get(list_builds))
        .route("/builds/{id}", get(get_build))

        // Cache operations
        .route("/cache/stats", get(cache_stats))
        .route("/cache/clear", post(cache_clear))

        // Configuration
        .route("/config", get(get_config))

        // Events stream
        .route("/events", get(events_stream))

        // Request log (new endpoint for viewing how daemon was contacted)
        .route("/requests", get(list_requests))

        // Shutdown
        .route("/shutdown", post(shutdown))

        // Network endpoints for distributed builds
        .route("/network/nodes", get(list_network_nodes))
        .route("/network/nodes/{node_id}", get(get_network_node))
        .route("/network/join", post(join_network))
        .route("/network/leave", post(leave_network))

        // Ledger endpoints for build history
        .route("/ledger/history", get(ledger_history))
        .route("/ledger/sync", get(ledger_sync_status))
        .route("/ledger/sync", post(ledger_force_sync))
        .route("/ledger/builds", get(ledger_builds))

        .layer(CorsLayer::permissive())
        .with_state(app_state)
}

/// Helper to log a request
fn log_request(
    state: &AppState,
    method: &str,
    path: &str,
    source: RequestSource,
    build_info: Option<BuildRequestInfo>,
) -> u64 {
    let mut counter = state.request_counter.write().unwrap();
    *counter += 1;
    let id = *counter;

    let entry = RequestLogEntry {
        id,
        timestamp: chrono::Utc::now(),
        method: method.to_string(),
        path: path.to_string(),
        source,
        build_info,
    };

    let mut log = state.request_log.write().unwrap();
    if log.len() >= 100 {
        log.pop_front();
    }
    log.push_back(entry);

    id
}

// ============================================================================
// Static File Serving
// ============================================================================

async fn index_html() -> impl IntoResponse {
    match Assets::get("index.html") {
        Some(content) => Html(content.data.into_owned()).into_response(),
        None => (StatusCode::NOT_FOUND, "Not found").into_response(),
    }
}

async fn static_handler(uri: Uri) -> impl IntoResponse {
    let path = uri.path().trim_start_matches("/static/");

    match Assets::get(path) {
        Some(content) => {
            let mime = mime_guess::from_path(path).first_or_octet_stream();
            ([(header::CONTENT_TYPE, mime.as_ref())], content.data.into_owned()).into_response()
        }
        None => (StatusCode::NOT_FOUND, "Not found").into_response(),
    }
}

// ============================================================================
// Health and Status
// ============================================================================

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    version: &'static str,
    uptime_secs: u64,
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        version: buildnet_core::VERSION,
        uptime_secs: 0, // TODO: Track uptime
    })
}

#[derive(Serialize)]
struct StatusResponse {
    status: &'static str,
    version: &'static str,
    project_root: String,
    packages: Vec<String>,
    state_stats: buildnet_core::state::StateStats,
}

async fn status(State(state): State<Arc<AppState>>) -> Result<Json<StatusResponse>, AppError> {
    let state_stats = state.state.stats()?;

    Ok(Json(StatusResponse {
        status: "running",
        version: buildnet_core::VERSION,
        project_root: state.config.project_root.to_string_lossy().to_string(),
        packages: state.config.packages.iter().map(|p| p.name.clone()).collect(),
        state_stats,
    }))
}

async fn stats(State(state): State<Arc<AppState>>) -> Result<Json<buildnet_core::state::StateStats>, AppError> {
    let stats = state.state.stats()?;
    Ok(Json(stats))
}

// ============================================================================
// Build Operations
// ============================================================================

#[derive(Deserialize)]
struct BuildOptions {
    #[serde(default)]
    force: bool,
}

#[derive(Serialize)]
struct BuildResponse {
    success: bool,
    results: Vec<buildnet_core::builder::BuildResult>,
    total_duration_ms: u64,
}

async fn build_all(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(opts): Json<BuildOptions>,
) -> Result<Json<BuildResponse>, AppError> {
    // Check rate limit before starting build
    if let Err(wait_time) = state.build_rate_limiter.check() {
        return Err(AppError::RateLimited(format!(
            "Rate limit exceeded. Please wait {} seconds before making another build request.",
            wait_time.as_secs() + 1
        )));
    }

    let start = std::time::Instant::now();

    // Detect request source
    let source = detect_request_source(&headers);
    let packages: Vec<String> = state.config.packages.iter().map(|p| p.name.clone()).collect();

    // Build request info
    let build_info = BuildRequestInfo {
        build_type: "full".to_string(),
        package: None,
        force: opts.force,
        packages: packages.clone(),
    };

    // Log the request
    log_request(&state, "POST", "/build", source.clone(), Some(build_info.clone()));

    // Broadcast build start event with full details
    let _ = state.events_tx.send(BuildEvent {
        event_type: "build_start".into(),
        package: None,
        message: format!(
            "Starting full build via {} ({} packages, force={})",
            source.source_type,
            packages.len(),
            opts.force
        ),
        timestamp: chrono::Utc::now(),
        source: Some(source.clone()),
        build_info: Some(build_info.clone()),
        level: "info".to_string(),
    });

    // Broadcast request received event
    let _ = state.events_tx.send(BuildEvent {
        event_type: "request_received".into(),
        package: None,
        message: format!(
            "Build request from {} (IP: {}, UA: {})",
            source.source_type,
            source.ip.as_deref().unwrap_or("unknown"),
            source.user_agent.as_deref().unwrap_or("none").chars().take(50).collect::<String>()
        ),
        timestamp: chrono::Utc::now(),
        source: Some(source.clone()),
        build_info: None,
        level: "debug".to_string(),
    });

    let results = state.orchestrator.build_all().await?;

    let success = results.iter().all(|r| {
        matches!(
            r.status,
            buildnet_core::state::BuildStatus::Completed | buildnet_core::state::BuildStatus::Cached
        )
    });

    // Broadcast build complete event with details
    let _ = state.events_tx.send(BuildEvent {
        event_type: "build_complete".into(),
        package: None,
        message: format!(
            "Build {} in {}ms via {} ({} packages)",
            if success { "succeeded" } else { "failed" },
            start.elapsed().as_millis(),
            source.source_type,
            packages.len()
        ),
        timestamp: chrono::Utc::now(),
        source: Some(source),
        build_info: Some(build_info),
        level: if success { "success".to_string() } else { "error".to_string() },
    });

    Ok(Json(BuildResponse {
        success,
        results,
        total_duration_ms: start.elapsed().as_millis() as u64,
    }))
}

async fn build_package(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Path(package_name): Path<String>,
    Json(opts): Json<BuildOptions>,
) -> Result<Json<buildnet_core::builder::BuildResult>, AppError> {
    // Check rate limit before starting build
    if let Err(wait_time) = state.build_rate_limiter.check() {
        return Err(AppError::RateLimited(format!(
            "Rate limit exceeded. Please wait {} seconds before making another build request.",
            wait_time.as_secs() + 1
        )));
    }

    // Validate package name format to prevent injection attacks
    // Only allow alphanumeric, hyphens, underscores, and @/ for scoped packages
    if !package_name.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_' || c == '@' || c == '/') {
        return Err(AppError::BadRequest(format!("Invalid package name format: {}", package_name)));
    }
    if package_name.len() > 100 {
        return Err(AppError::BadRequest("Package name too long".to_string()));
    }

    let package = state
        .config
        .packages
        .iter()
        .find(|p| p.name == package_name)
        .ok_or_else(|| AppError::NotFound(format!("Package not found: {}", package_name)))?;

    // Detect request source
    let source = detect_request_source(&headers);

    // Build request info
    let build_info = BuildRequestInfo {
        build_type: "single".to_string(),
        package: Some(package_name.clone()),
        force: opts.force,
        packages: vec![package_name.clone()],
    };

    // Log the request
    log_request(&state, "POST", &format!("/build/{}", package_name), source.clone(), Some(build_info.clone()));

    // Broadcast build start event with full details
    let _ = state.events_tx.send(BuildEvent {
        event_type: "build_start".into(),
        package: Some(package_name.clone()),
        message: format!(
            "Starting single package build for {} via {} (force={})",
            package_name,
            source.source_type,
            opts.force
        ),
        timestamp: chrono::Utc::now(),
        source: Some(source.clone()),
        build_info: Some(build_info.clone()),
        level: "info".to_string(),
    });

    let result = state.orchestrator.build_package(package).await?;

    // Broadcast build complete event with details
    let _ = state.events_tx.send(BuildEvent {
        event_type: "build_complete".into(),
        package: Some(package_name.clone()),
        message: format!(
            "Build {} for {} in {}ms via {}",
            result.status,
            package_name,
            result.duration_ms,
            source.source_type
        ),
        timestamp: chrono::Utc::now(),
        source: Some(source),
        build_info: Some(build_info),
        level: if matches!(result.status, buildnet_core::state::BuildStatus::Completed | buildnet_core::state::BuildStatus::Cached) {
            "success".to_string()
        } else {
            "error".to_string()
        },
    });

    Ok(Json(result))
}

// ============================================================================
// Build History
// ============================================================================

async fn list_builds(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<BuildState>>, AppError> {
    let builds = state.state.recent_builds(50)?;
    Ok(Json(builds))
}

async fn get_build(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<BuildState>, AppError> {
    // TODO: Implement get_build in StateManager
    Err(AppError::NotFound(format!("Build not found: {}", id)))
}

// ============================================================================
// Cache Operations
// ============================================================================

async fn cache_stats(
    State(state): State<Arc<AppState>>,
) -> Result<Json<buildnet_core::cache::CacheStats>, AppError> {
    let stats = state.cache.stats()?;
    Ok(Json(stats))
}

#[derive(Deserialize)]
struct CacheClearOptions {
    #[serde(default)]
    max_size_mb: Option<u64>,
}

#[derive(Serialize)]
struct CacheClearResponse {
    removed: usize,
}

async fn cache_clear(
    State(state): State<Arc<AppState>>,
    Json(opts): Json<CacheClearOptions>,
) -> Result<Json<CacheClearResponse>, AppError> {
    let removed = if let Some(max_size_mb) = opts.max_size_mb {
        state.cache.clean(max_size_mb * 1024 * 1024)?
    } else {
        state.cache.clean(0)?
    };

    Ok(Json(CacheClearResponse { removed }))
}

// ============================================================================
// Configuration
// ============================================================================

async fn get_config(State(state): State<Arc<AppState>>) -> Json<Config> {
    Json(state.config.clone())
}

// ============================================================================
// Request Log
// ============================================================================

#[derive(Serialize)]
struct RequestLogResponse {
    requests: Vec<RequestLogEntry>,
    total: usize,
}

async fn list_requests(
    State(app_state): State<Arc<AppState>>,
) -> Json<RequestLogResponse> {
    let log = app_state.request_log.read().unwrap();
    let requests: Vec<RequestLogEntry> = log.iter().rev().cloned().collect();
    let total = requests.len();
    Json(RequestLogResponse { requests, total })
}

// ============================================================================
// Events Stream (SSE)
// ============================================================================

async fn events_stream(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Sse<impl tokio_stream::Stream<Item = Result<Event, std::convert::Infallible>>> {
    // Log the SSE connection
    let source = detect_request_source(&headers);
    log_request(&state, "GET", "/events", source.clone(), None);

    // Broadcast connection event
    let _ = state.events_tx.send(BuildEvent {
        event_type: "client_connected".into(),
        package: None,
        message: format!(
            "SSE client connected from {} ({})",
            source.source_type,
            source.ip.as_deref().unwrap_or("unknown")
        ),
        timestamp: chrono::Utc::now(),
        source: Some(source),
        build_info: None,
        level: "debug".to_string(),
    });

    let rx = state.events_tx.subscribe();
    let stream = BroadcastStream::new(rx);

    let event_stream = stream.filter_map(|result| {
        result.ok().and_then(|event| {
            // Send as default event (no named event type) so frontend onmessage receives it
            // The event_type is included in the JSON payload for the frontend to distinguish
            // Use ok() instead of unwrap() to gracefully handle serialization errors
            Event::default()
                .json_data(&event)
                .ok()
                .map(Ok)
        })
    });

    Sse::new(event_stream).keep_alive(KeepAlive::default())
}

// ============================================================================
// Shutdown
// ============================================================================

async fn shutdown() -> Json<serde_json::Value> {
    tracing::info!("Shutdown requested via API");
    // Use tokio spawn to avoid blocking and give time to respond
    tokio::spawn(async {
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        std::process::exit(0);
    });
    Json(serde_json::json!({"status": "shutting_down"}))
}

// ============================================================================
// Network Endpoints
// ============================================================================

#[derive(Serialize)]
struct NetworkNodesResponse {
    local: LocalNodeInfo,
    peers: Vec<PeerInfo>,
}

#[derive(Serialize)]
struct LocalNodeInfo {
    id: String,
    address: String,
    role: String,
    status: String,
}

#[derive(Serialize)]
struct PeerInfo {
    id: String,
    address: String,
    role: String,
    status: String,
}

async fn list_network_nodes(
    State(_state): State<Arc<AppState>>,
) -> Json<NetworkNodesResponse> {
    // In a full implementation, this would query the NetworkManager
    // For now, return local node info only (single-node mode)
    Json(NetworkNodesResponse {
        local: LocalNodeInfo {
            id: uuid::Uuid::new_v4().to_string(),
            address: "127.0.0.1:9877".to_string(),
            role: "standalone".to_string(),
            status: "online".to_string(),
        },
        peers: vec![],
    })
}

#[derive(Serialize)]
struct NodeInfoResponse {
    id: String,
    address: String,
    status: String,
    role: String,
    capabilities: NodeCapabilitiesInfo,
    stats: NodeStatsInfo,
}

#[derive(Serialize)]
struct NodeCapabilitiesInfo {
    cpu_cores: u32,
    memory_mb: u64,
    disk_mb: u64,
    tools: Vec<String>,
}

#[derive(Serialize)]
struct NodeStatsInfo {
    builds_completed: u64,
    tasks_processed: u64,
    uptime_secs: u64,
}

async fn get_network_node(
    State(state): State<Arc<AppState>>,
    Path(node_id): Path<String>,
) -> Result<Json<NodeInfoResponse>, AppError> {
    // Get stats from the state manager for this node
    let stats = state.state.stats()?;

    Ok(Json(NodeInfoResponse {
        id: node_id,
        address: "127.0.0.1:9877".to_string(),
        status: "online".to_string(),
        role: "standalone".to_string(),
        capabilities: NodeCapabilitiesInfo {
            cpu_cores: std::thread::available_parallelism()
                .map(|p| p.get() as u32)
                .unwrap_or(1),
            memory_mb: 8192, // Would need sysinfo crate for actual value
            disk_mb: 102400,
            tools: vec!["pnpm".to_string(), "node".to_string(), "cargo".to_string()],
        },
        stats: NodeStatsInfo {
            builds_completed: stats.total_builds as u64,
            tasks_processed: stats.total_builds as u64,
            uptime_secs: 0, // TODO: Track uptime
        },
    }))
}

#[derive(Deserialize)]
struct JoinNetworkRequest {
    bootstrap_addr: String,
}

#[derive(Serialize)]
struct JoinNetworkResponse {
    success: bool,
    connected_peers: u32,
    coordinator: Option<String>,
}

async fn join_network(
    State(_state): State<Arc<AppState>>,
    Json(req): Json<JoinNetworkRequest>,
) -> Json<JoinNetworkResponse> {
    // In a full distributed implementation, this would:
    // 1. Connect to the bootstrap node
    // 2. Perform peer discovery
    // 3. Join the coordinator election
    tracing::info!("Join network request for bootstrap: {}", req.bootstrap_addr);

    Json(JoinNetworkResponse {
        success: true,
        connected_peers: 0,
        coordinator: None,
    })
}

#[derive(Serialize)]
struct LeaveNetworkResponse {
    success: bool,
}

async fn leave_network(
    State(_state): State<Arc<AppState>>,
) -> Json<LeaveNetworkResponse> {
    // In a full distributed implementation, this would gracefully leave the network
    tracing::info!("Leave network request");

    Json(LeaveNetworkResponse { success: true })
}

// ============================================================================
// Ledger Endpoints
// ============================================================================

#[derive(Deserialize)]
struct LedgerHistoryQuery {
    #[serde(default = "default_limit")]
    limit: usize,
}

fn default_limit() -> usize {
    20
}

#[derive(Serialize)]
struct LedgerHistoryResponse {
    entries: Vec<LedgerEntryInfo>,
    merkle_root: String,
    total_entries: usize,
}

#[derive(Serialize)]
struct LedgerEntryInfo {
    id: String,
    entry_type: String,
    origin_node: String,
    build_id: Option<String>,
    timestamp: String,
}

async fn ledger_history(
    State(state): State<Arc<AppState>>,
    axum::extract::Query(query): axum::extract::Query<LedgerHistoryQuery>,
) -> Json<LedgerHistoryResponse> {
    // Get recent builds from state manager and convert to ledger entries
    let builds = state.state.recent_builds(query.limit).unwrap_or_default();

    let entries: Vec<LedgerEntryInfo> = builds
        .iter()
        .map(|b| LedgerEntryInfo {
            id: b.id.clone(),
            entry_type: format!("build_{}", b.status),
            origin_node: "local".to_string(),
            build_id: Some(b.id.clone()),
            timestamp: b.started_at.to_rfc3339(),
        })
        .collect();

    let total = entries.len();

    Json(LedgerHistoryResponse {
        entries,
        merkle_root: "0".repeat(64), // Placeholder merkle root
        total_entries: total,
    })
}

#[derive(Serialize)]
struct LedgerSyncStatusResponse {
    local: LocalLedgerInfo,
    peers: Vec<PeerSyncInfo>,
}

#[derive(Serialize)]
struct LocalLedgerInfo {
    entry_count: usize,
    merkle_root: String,
}

#[derive(Serialize)]
struct PeerSyncInfo {
    peer_id: String,
    status: String,
    entries_behind: usize,
}

async fn ledger_sync_status(
    State(state): State<Arc<AppState>>,
) -> Json<LedgerSyncStatusResponse> {
    let stats = state.state.stats().unwrap_or_else(|_| {
        buildnet_core::state::StateStats {
            total_builds: 0,
            cached_builds: 0,
            failed_builds: 0,
            cached_files: 0,
            artifacts: 0,
        }
    });

    Json(LedgerSyncStatusResponse {
        local: LocalLedgerInfo {
            entry_count: stats.total_builds,
            merkle_root: "0".repeat(64),
        },
        peers: vec![], // No peers in standalone mode
    })
}

#[derive(Deserialize)]
struct ForceSyncRequest {
    #[serde(default)]
    peer_id: Option<String>,
    #[serde(default)]
    all: bool,
}

#[derive(Serialize)]
struct ForceSyncResponse {
    success: bool,
    synced_entries: usize,
}

async fn ledger_force_sync(
    State(_state): State<Arc<AppState>>,
    Json(_req): Json<ForceSyncRequest>,
) -> Json<ForceSyncResponse> {
    // In distributed mode, this would trigger sync with peers
    Json(ForceSyncResponse {
        success: true,
        synced_entries: 0,
    })
}

#[derive(Deserialize)]
struct LedgerBuildsQuery {
    #[serde(default = "default_builds_limit")]
    limit: usize,
}

fn default_builds_limit() -> usize {
    10
}

#[derive(Serialize)]
struct LedgerBuildsResponse {
    builds: Vec<LedgerBuildInfo>,
}

#[derive(Serialize)]
struct LedgerBuildInfo {
    build_id: String,
    packages: Vec<String>,
    success: bool,
    duration_ms: u64,
    started_at: String,
}

async fn ledger_builds(
    State(state): State<Arc<AppState>>,
    axum::extract::Query(query): axum::extract::Query<LedgerBuildsQuery>,
) -> Json<LedgerBuildsResponse> {
    let builds = state.state.recent_builds(query.limit).unwrap_or_default();

    let build_infos: Vec<LedgerBuildInfo> = builds
        .iter()
        .map(|b| LedgerBuildInfo {
            build_id: b.id.clone(),
            packages: vec![b.package.clone()], // Single package per build state
            success: matches!(
                b.status,
                buildnet_core::state::BuildStatus::Completed | buildnet_core::state::BuildStatus::Cached
            ),
            duration_ms: b.duration_ms.unwrap_or(0) as u64,
            started_at: b.started_at.to_rfc3339(),
        })
        .collect();

    Json(LedgerBuildsResponse { builds: build_infos })
}

// ============================================================================
// Error Handling
// ============================================================================

#[derive(Debug)]
pub enum AppError {
    Internal(buildnet_core::BuildNetError),
    NotFound(String),
    BadRequest(String),
    RateLimited(String),
}

impl From<buildnet_core::BuildNetError> for AppError {
    fn from(err: buildnet_core::BuildNetError) -> Self {
        AppError::Internal(err)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, code, message, hint) = match &self {
            AppError::Internal(e) => {
                // Check for specific error types and provide helpful messages
                let err_str = e.to_string();
                if err_str.contains("Build in progress") || err_str.contains("already being built") {
                    (
                        StatusCode::CONFLICT, // 409 Conflict
                        "BUILD_IN_PROGRESS",
                        err_str,
                        Some("Another build is currently running. The build will complete automatically - check the Build History section for status."),
                    )
                } else if err_str.contains("Build failed") {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "BUILD_FAILED",
                        err_str,
                        Some("Check the build output and logs for details."),
                    )
                } else {
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "INTERNAL_ERROR",
                        err_str,
                        None,
                    )
                }
            }
            AppError::NotFound(msg) => (
                StatusCode::NOT_FOUND,
                "NOT_FOUND",
                msg.clone(),
                None,
            ),
            AppError::BadRequest(msg) => (
                StatusCode::BAD_REQUEST,
                "BAD_REQUEST",
                msg.clone(),
                None,
            ),
            AppError::RateLimited(msg) => (
                StatusCode::TOO_MANY_REQUESTS,
                "RATE_LIMITED",
                msg.clone(),
                Some("Please wait before making another build request."),
            ),
        };

        let mut body = serde_json::json!({
            "error": message,
            "code": code,
        });

        if let Some(hint_text) = hint {
            body["hint"] = serde_json::json!(hint_text);
        }

        (status, Json(body)).into_response()
    }
}
