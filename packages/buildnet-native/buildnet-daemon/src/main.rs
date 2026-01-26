//! BuildNet Daemon
//!
//! Native build orchestration service with:
//! - HTTP API server (Axum)
//! - Unix socket for local IPC
//! - File watching with auto-rebuild
//! - PM2 integration

mod api;
mod cli;

use std::path::PathBuf;
use std::sync::Arc;

use anyhow::Result;
use clap::Parser;
use tokio::signal;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use buildnet_core::{ArtifactCache, Config, StateManager};

#[derive(Parser, Debug)]
#[command(name = "buildnetd")]
#[command(about = "BuildNet Daemon - Native build orchestration service")]
#[command(version)]
struct Args {
    /// Configuration file path
    #[arg(short, long, default_value = ".buildnet/config.json")]
    config: PathBuf,

    /// HTTP port
    #[arg(short, long, default_value_t = 9876)]
    port: u16,

    /// Run in foreground (don't daemonize)
    #[arg(short, long)]
    foreground: bool,

    /// Verbose output
    #[arg(short, long)]
    verbose: bool,

    /// Project root directory
    #[arg(long)]
    project_root: Option<PathBuf>,

    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(clap::Subcommand, Debug)]
enum Command {
    /// Start the daemon
    Start,
    /// Stop the daemon
    Stop,
    /// Check daemon status
    Status,
    /// Trigger a build
    Build {
        /// Specific package to build (default: all)
        #[arg(short, long)]
        package: Option<String>,
        /// Force rebuild even if cached
        #[arg(short, long)]
        force: bool,
    },
    /// Initialize configuration
    Init {
        /// Project type (pnpm, npm, yarn)
        #[arg(short = 't', long, default_value = "pnpm")]
        project_type: String,
    },
    /// Show cache statistics
    Stats,
    /// Clear cache
    Clear {
        /// Clear everything (including state)
        #[arg(long)]
        all: bool,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // Initialize logging
    let log_level = if args.verbose { "debug" } else { "info" };
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| format!("buildnet={}", log_level)),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Determine project root
    let project_root = args
        .project_root
        .unwrap_or_else(|| std::env::current_dir().expect("Failed to get current directory"));

    match args.command {
        Some(Command::Init { project_type }) => {
            cli::init_config(&project_root, &project_type)?;
        }
        Some(Command::Status) => {
            cli::show_status(args.port).await?;
        }
        Some(Command::Stop) => {
            cli::stop_daemon(args.port).await?;
        }
        Some(Command::Build { package, force }) => {
            cli::trigger_build(args.port, package.as_deref(), force).await?;
        }
        Some(Command::Stats) => {
            cli::show_stats(args.port).await?;
        }
        Some(Command::Clear { all }) => {
            cli::clear_cache(&project_root, all)?;
        }
        Some(Command::Start) | None => {
            // Load or create config
            let config = if args.config.exists() {
                Config::load(&args.config)?
            } else {
                tracing::info!("No config found, using defaults for pnpm monorepo");
                Config::for_pnpm_monorepo(project_root.clone())
            };

            // Initialize state manager
            let db_path = project_root.join(&config.db_path);
            let state = Arc::new(StateManager::new(&db_path)?);

            // Initialize artifact cache
            let cache_path = project_root.join(&config.cache_path);
            let cache = Arc::new(ArtifactCache::new(&cache_path)?);

            tracing::info!("Starting BuildNet daemon on port {}", args.port);
            tracing::info!("Project root: {:?}", project_root);
            tracing::info!("Database: {:?}", db_path);
            tracing::info!("Cache: {:?}", cache_path);

            // Start the API server
            let app = api::create_router(config, state, cache);

            let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", args.port)).await?;

            tracing::info!("BuildNet daemon ready at http://127.0.0.1:{}", args.port);

            // Run with graceful shutdown
            axum::serve(listener, app)
                .with_graceful_shutdown(shutdown_signal())
                .await?;

            tracing::info!("BuildNet daemon stopped");
        }
    }

    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("Failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }

    tracing::info!("Shutdown signal received");
}
