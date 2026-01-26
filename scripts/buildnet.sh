#!/bin/bash
# =============================================================================
# BuildNet Native CLI Wrapper
# =============================================================================
#
# Unified interface for BuildNet Native - the Rust-based build system.
# Automatically detects environment (local vs production) and routes to the
# appropriate BuildNet endpoint.
#
# Usage:
#   ./scripts/buildnet.sh build           # Build all packages
#   ./scripts/buildnet.sh build api       # Build single package
#   ./scripts/buildnet.sh build --force   # Force rebuild
#   ./scripts/buildnet.sh status          # Show daemon status
#   ./scripts/buildnet.sh health          # Quick health check
#   ./scripts/buildnet.sh start           # Start BuildNet daemon via PM2
#   ./scripts/buildnet.sh stop            # Stop BuildNet daemon
#   ./scripts/buildnet.sh restart         # Restart BuildNet daemon
#   ./scripts/buildnet.sh logs            # View BuildNet logs
#   ./scripts/buildnet.sh cache-stats     # Show cache statistics
#   ./scripts/buildnet.sh cache-clear     # Clear build cache
#   ./scripts/buildnet.sh events          # Stream build events (SSE)
#
# Environment Variables:
#   BUILDNET_URL      Override BuildNet API URL (default: auto-detect)
#   BUILDNET_TIMEOUT  Request timeout in seconds (default: 600)
#
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMEOUT="${BUILDNET_TIMEOUT:-600}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging functions
log() { echo -e "${BLUE}[BuildNet]${NC} $1"; }
success() { echo -e "${GREEN}[BuildNet]${NC} $1"; }
warn() { echo -e "${YELLOW}[BuildNet]${NC} $1"; }
error() { echo -e "${RED}[BuildNet]${NC} $1"; }

# =============================================================================
# DETECT BUILDNET ENDPOINT
# =============================================================================

detect_buildnet_url() {
    # Allow override via environment variable
    if [ -n "$BUILDNET_URL" ]; then
        echo "$BUILDNET_URL"
        return
    fi

    # Check if we're on production server
    if [ -d "/var/www/musclemap.me" ]; then
        # On production server, use localhost
        echo "http://localhost:9876"
        return
    fi

    # Try local BuildNet first
    if curl -s --connect-timeout 1 http://localhost:9876/health >/dev/null 2>&1; then
        echo "http://localhost:9876"
        return
    fi

    # Fall back to production BuildNet (proxied via Caddy)
    if curl -s --connect-timeout 2 https://musclemap.me/buildnet/health >/dev/null 2>&1; then
        echo "https://musclemap.me/buildnet"
        return
    fi

    # No BuildNet available
    echo ""
}

# =============================================================================
# FALLBACK TO INTELLIGENT CACHE
# =============================================================================

fallback_build() {
    warn "BuildNet Native not available, falling back to intelligent-cache.mjs"

    local force=""
    if [[ "$1" == "--force" ]]; then
        force="--force"
    fi

    cd "$PROJECT_ROOT"
    node scripts/intelligent-cache.mjs $force
}

# =============================================================================
# API FUNCTIONS
# =============================================================================

buildnet_health() {
    local url="$1"

    local response
    response=$(curl -s --connect-timeout 5 "$url/health" 2>/dev/null)

    if [ -z "$response" ]; then
        error "BuildNet is not responding"
        return 1
    fi

    local status
    status=$(echo "$response" | jq -r '.status // "unknown"' 2>/dev/null)

    # Handle various status values that indicate healthy
    if [ "$status" = "healthy" ] || [ "$status" = "ok" ] || [ "$status" = "running" ]; then
        local uptime
        uptime=$(echo "$response" | jq -r '.uptime // .uptime_secs // "unknown"' 2>/dev/null)
        success "BuildNet is healthy (uptime: $uptime)"
        return 0
    else
        error "BuildNet status: $status"
        return 1
    fi
}

buildnet_status() {
    local url="$1"

    local response
    response=$(curl -s --connect-timeout 5 "$url/status" 2>/dev/null)

    if [ -z "$response" ]; then
        error "BuildNet is not responding"
        return 1
    fi

    echo "$response" | jq '.' 2>/dev/null || echo "$response"
}

buildnet_stats() {
    local url="$1"

    local response
    response=$(curl -s --connect-timeout 5 "$url/stats" 2>/dev/null)

    if [ -z "$response" ]; then
        error "BuildNet is not responding"
        return 1
    fi

    echo "$response" | jq '.' 2>/dev/null || echo "$response"
}

buildnet_build() {
    local url="$1"
    local package="$2"
    local force="$3"

    log "Triggering build via BuildNet Native..."

    local endpoint="$url/build"
    local payload='{}'

    # Build specific package or all
    if [ -n "$package" ] && [ "$package" != "--force" ]; then
        endpoint="$url/build/$package"
        log "Building package: $package"
    else
        log "Building all packages"
    fi

    # Add force flag
    if [ "$force" = "--force" ] || [ "$package" = "--force" ]; then
        payload='{"force": true}'
        log "Force rebuild enabled"
    fi

    # Make the build request
    local response
    local http_code

    http_code=$(curl -s -w "%{http_code}" -o /tmp/buildnet_response.json \
        -X POST "$endpoint" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        --max-time "$TIMEOUT" 2>/dev/null)

    response=$(cat /tmp/buildnet_response.json 2>/dev/null)
    rm -f /tmp/buildnet_response.json

    if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ]; then
        error "Build request failed (HTTP $http_code)"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        return 1
    fi

    # Parse response
    local build_status
    build_status=$(echo "$response" | jq -r '.status // "unknown"' 2>/dev/null)

    if [ "$build_status" = "completed" ] || [ "$build_status" = "success" ]; then
        local duration
        local tier
        duration=$(echo "$response" | jq -r '.duration_ms // .duration // "?"' 2>/dev/null)
        tier=$(echo "$response" | jq -r '.tier // "?"' 2>/dev/null)

        success "Build completed in ${duration}ms (tier: $tier)"

        # Show build results if available
        local results
        results=$(echo "$response" | jq -r '.results // empty' 2>/dev/null)
        if [ -n "$results" ]; then
            echo ""
            echo "Build Results:"
            echo "$results" | jq '.' 2>/dev/null || echo "$results"
        fi

        return 0
    elif [ "$build_status" = "skipped" ]; then
        success "Build skipped (no changes detected)"
        return 0
    else
        error "Build failed: $build_status"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        return 1
    fi
}

buildnet_cache_stats() {
    local url="$1"

    local response
    response=$(curl -s --connect-timeout 5 "$url/cache/stats" 2>/dev/null)

    if [ -z "$response" ]; then
        error "BuildNet is not responding"
        return 1
    fi

    echo "$response" | jq '.' 2>/dev/null || echo "$response"
}

buildnet_cache_clear() {
    local url="$1"

    log "Clearing build cache..."

    local response
    response=$(curl -s -X POST --connect-timeout 10 "$url/cache/clear" 2>/dev/null)

    if [ -z "$response" ]; then
        error "BuildNet is not responding"
        return 1
    fi

    success "Cache cleared"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
}

buildnet_builds() {
    local url="$1"

    local response
    response=$(curl -s --connect-timeout 5 "$url/builds" 2>/dev/null)

    if [ -z "$response" ]; then
        error "BuildNet is not responding"
        return 1
    fi

    echo "$response" | jq '.' 2>/dev/null || echo "$response"
}

buildnet_events() {
    local url="$1"

    log "Streaming build events (Ctrl+C to stop)..."
    curl -N "$url/events" 2>/dev/null
}

buildnet_start() {
    log "Starting BuildNet daemon via PM2..."
    cd "$PROJECT_ROOT"

    # Check if already running
    if pm2 jlist 2>/dev/null | jq -e '.[] | select(.name == "buildnet")' >/dev/null 2>&1; then
        local status
        status=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name == "buildnet") | .pm2_env.status' 2>/dev/null)
        if [ "$status" = "online" ]; then
            success "BuildNet is already running"
            return 0
        fi
    fi

    # Start via PM2
    pm2 start ecosystem.config.cjs --only buildnet

    # Wait for startup
    sleep 2

    # Verify it started
    if curl -s --connect-timeout 5 http://localhost:9876/health >/dev/null 2>&1; then
        success "BuildNet daemon started successfully"
    else
        warn "BuildNet started but health check failed - may still be initializing"
    fi
}

buildnet_stop() {
    log "Stopping BuildNet daemon..."
    pm2 stop buildnet 2>/dev/null || warn "BuildNet was not running"
    success "BuildNet daemon stopped"
}

buildnet_restart() {
    log "Restarting BuildNet daemon..."
    pm2 restart buildnet 2>/dev/null || {
        warn "BuildNet was not running, starting fresh..."
        buildnet_start
        return
    }

    # Wait for startup
    sleep 2

    # Verify it started
    if curl -s --connect-timeout 5 http://localhost:9876/health >/dev/null 2>&1; then
        success "BuildNet daemon restarted successfully"
    else
        warn "BuildNet restarted but health check failed - may still be initializing"
    fi
}

buildnet_logs() {
    log "Viewing BuildNet logs..."
    pm2 logs buildnet --lines 100 --nostream 2>/dev/null || {
        warn "Could not get PM2 logs, trying log files..."
        if [ -f "$PROJECT_ROOT/.buildnet/logs/combined.log" ]; then
            tail -100 "$PROJECT_ROOT/.buildnet/logs/combined.log"
        else
            error "No BuildNet logs found"
        fi
    }
}

# =============================================================================
# MAIN
# =============================================================================

show_help() {
    echo "BuildNet Native CLI Wrapper"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Build Commands:"
    echo "  build [package] [--force]  Build all packages or specific package"
    echo "  status                     Show BuildNet daemon status"
    echo "  health                     Quick health check"
    echo "  stats                      Show build statistics"
    echo "  builds                     List recent builds"
    echo ""
    echo "Cache Commands:"
    echo "  cache-stats                Show cache statistics"
    echo "  cache-clear                Clear the build cache"
    echo ""
    echo "Daemon Commands:"
    echo "  start                      Start BuildNet daemon via PM2"
    echo "  stop                       Stop BuildNet daemon"
    echo "  restart                    Restart BuildNet daemon"
    echo "  logs                       View BuildNet logs"
    echo "  events                     Stream build events (SSE)"
    echo ""
    echo "Options:"
    echo "  --help, -h                 Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  BUILDNET_URL               Override BuildNet API URL"
    echo "  BUILDNET_TIMEOUT           Request timeout in seconds (default: 600)"
    echo ""
    echo "Examples:"
    echo "  $0 build                   # Build all packages"
    echo "  $0 build api               # Build only the API"
    echo "  $0 build --force           # Force rebuild everything"
    echo "  $0 status                  # Check daemon status"
}

main() {
    local command="${1:-}"
    shift || true

    case "$command" in
        build)
            local url
            url=$(detect_buildnet_url)

            if [ -z "$url" ]; then
                fallback_build "$@"
            else
                log "Using BuildNet at: $url"
                buildnet_build "$url" "$@" || fallback_build "$@"
            fi
            ;;

        status)
            local url
            url=$(detect_buildnet_url)

            if [ -z "$url" ]; then
                error "BuildNet is not available"
                echo ""
                echo "To start BuildNet:"
                echo "  pnpm buildnet:start"
                exit 1
            fi

            log "Using BuildNet at: $url"
            buildnet_status "$url"
            ;;

        health)
            local url
            url=$(detect_buildnet_url)

            if [ -z "$url" ]; then
                error "BuildNet is not available"
                exit 1
            fi

            buildnet_health "$url"
            ;;

        stats)
            local url
            url=$(detect_buildnet_url)

            if [ -z "$url" ]; then
                error "BuildNet is not available"
                exit 1
            fi

            buildnet_stats "$url"
            ;;

        builds)
            local url
            url=$(detect_buildnet_url)

            if [ -z "$url" ]; then
                error "BuildNet is not available"
                exit 1
            fi

            buildnet_builds "$url"
            ;;

        cache-stats)
            local url
            url=$(detect_buildnet_url)

            if [ -z "$url" ]; then
                error "BuildNet is not available"
                exit 1
            fi

            buildnet_cache_stats "$url"
            ;;

        cache-clear)
            local url
            url=$(detect_buildnet_url)

            if [ -z "$url" ]; then
                error "BuildNet is not available"
                exit 1
            fi

            buildnet_cache_clear "$url"
            ;;

        events)
            local url
            url=$(detect_buildnet_url)

            if [ -z "$url" ]; then
                error "BuildNet is not available"
                exit 1
            fi

            buildnet_events "$url"
            ;;

        start)
            buildnet_start
            ;;

        stop)
            buildnet_stop
            ;;

        restart)
            buildnet_restart
            ;;

        logs)
            buildnet_logs
            ;;

        --help|-h|help)
            show_help
            ;;

        "")
            error "No command specified"
            echo ""
            show_help
            exit 1
            ;;

        *)
            error "Unknown command: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
