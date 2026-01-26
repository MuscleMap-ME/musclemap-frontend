//! HTTP API for BuildNet daemon

use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::{header, StatusCode, Uri},
    response::{
        sse::{Event, KeepAlive, Sse},
        Html, IntoResponse, Response,
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

/// Shared application state
pub struct AppState {
    pub config: Config,
    pub state: Arc<StateManager>,
    pub cache: Arc<ArtifactCache>,
    pub orchestrator: BuildOrchestrator,
    /// Channel for build events
    pub events_tx: broadcast::Sender<BuildEvent>,
}

/// Build event for SSE streaming
#[derive(Debug, Clone, Serialize)]
pub struct BuildEvent {
    pub event_type: String,
    pub package: Option<String>,
    pub message: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
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

        // Shutdown
        .route("/shutdown", post(shutdown))

        .layer(CorsLayer::permissive())
        .with_state(app_state)
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
    Json(opts): Json<BuildOptions>,
) -> Result<Json<BuildResponse>, AppError> {
    let start = std::time::Instant::now();

    // Broadcast build start event
    let _ = state.events_tx.send(BuildEvent {
        event_type: "build_start".into(),
        package: None,
        message: "Starting full build".into(),
        timestamp: chrono::Utc::now(),
    });

    let results = state.orchestrator.build_all().await?;

    let success = results.iter().all(|r| {
        matches!(
            r.status,
            buildnet_core::state::BuildStatus::Completed | buildnet_core::state::BuildStatus::Cached
        )
    });

    // Broadcast build complete event
    let _ = state.events_tx.send(BuildEvent {
        event_type: "build_complete".into(),
        package: None,
        message: format!(
            "Build {} in {}ms",
            if success { "succeeded" } else { "failed" },
            start.elapsed().as_millis()
        ),
        timestamp: chrono::Utc::now(),
    });

    Ok(Json(BuildResponse {
        success,
        results,
        total_duration_ms: start.elapsed().as_millis() as u64,
    }))
}

async fn build_package(
    State(state): State<Arc<AppState>>,
    Path(package_name): Path<String>,
    Json(opts): Json<BuildOptions>,
) -> Result<Json<buildnet_core::builder::BuildResult>, AppError> {
    let package = state
        .config
        .packages
        .iter()
        .find(|p| p.name == package_name)
        .ok_or_else(|| AppError::NotFound(format!("Package not found: {}", package_name)))?;

    // Broadcast build start event
    let _ = state.events_tx.send(BuildEvent {
        event_type: "build_start".into(),
        package: Some(package_name.clone()),
        message: format!("Starting build for {}", package_name),
        timestamp: chrono::Utc::now(),
    });

    let result = state.orchestrator.build_package(package).await?;

    // Broadcast build complete event
    let _ = state.events_tx.send(BuildEvent {
        event_type: "build_complete".into(),
        package: Some(package_name.clone()),
        message: format!("Build {} for {} in {}ms", result.status, package_name, result.duration_ms),
        timestamp: chrono::Utc::now(),
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
    State(state): State<Arc<AppState>>,
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
// Events Stream (SSE)
// ============================================================================

async fn events_stream(
    State(state): State<Arc<AppState>>,
) -> Sse<impl tokio_stream::Stream<Item = Result<Event, std::convert::Infallible>>> {
    let rx = state.events_tx.subscribe();
    let stream = BroadcastStream::new(rx);

    let event_stream = stream.filter_map(|result| {
        result.ok().map(|event| {
            Ok(Event::default()
                .event(&event.event_type)
                .json_data(&event)
                .unwrap())
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
// Error Handling
// ============================================================================

#[derive(Debug)]
pub enum AppError {
    Internal(buildnet_core::BuildNetError),
    NotFound(String),
}

impl From<buildnet_core::BuildNetError> for AppError {
    fn from(err: buildnet_core::BuildNetError) -> Self {
        AppError::Internal(err)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            AppError::Internal(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
        };

        let body = Json(serde_json::json!({
            "error": message,
        }));

        (status, body).into_response()
    }
}
