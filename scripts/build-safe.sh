#!/bin/bash
# =============================================================================
# MuscleMap Memory-Safe Build Orchestrator
# =============================================================================
#
# This script solves the following problems on the 8GB RAM VPS:
# 1. Prevents concurrent builds via file locking
# 2. Stops PM2 before build to free ~1GB memory
# 3. Stages builds by memory requirement (packages -> API -> frontend)
# 4. Sets proper NODE_OPTIONS for Vite's high memory usage
# 5. Moves compression to post-build to reduce peak memory
# 6. Automatically restarts PM2 after successful build
#
# Usage:
#   ./scripts/build-safe.sh              # Full build with PM2 management
#   ./scripts/build-safe.sh --no-pm2     # Build only (don't touch PM2)
#   ./scripts/build-safe.sh --packages   # Build packages only
#   ./scripts/build-safe.sh --frontend   # Build frontend only
#
# =============================================================================

set -e

# Configuration
LOCK_FILE="/tmp/musclemap-build.lock"
LOCK_TIMEOUT=600  # 10 minutes max wait for lock
MIN_MEMORY_PACKAGES=400   # MB needed for package builds
MIN_MEMORY_API=600        # MB needed for API build
MIN_MEMORY_FRONTEND=2000  # MB needed for Vite build

# Parse arguments
MANAGE_PM2=true
BUILD_PACKAGES=true
BUILD_API=true
BUILD_FRONTEND=true

for arg in "$@"; do
    case $arg in
        --no-pm2)
            MANAGE_PM2=false
            ;;
        --packages)
            BUILD_API=false
            BUILD_FRONTEND=false
            ;;
        --frontend)
            BUILD_PACKAGES=false
            BUILD_API=false
            ;;
        --api)
            BUILD_PACKAGES=false
            BUILD_FRONTEND=false
            ;;
        --help)
            echo "Usage: $0 [--no-pm2] [--packages|--api|--frontend]"
            echo "  --no-pm2     Don't stop/start PM2 during build"
            echo "  --packages   Only build workspace packages"
            echo "  --api        Only build API"
            echo "  --frontend   Only build frontend"
            exit 0
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log() { echo -e "${BLUE}[BUILD]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
stage() { echo -e "\n${CYAN}=== $1 ===${NC}"; }

# Get available memory in MB (works on Linux)
get_available_memory() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - use vm_stat (approximate)
        local pages_free=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
        local pages_inactive=$(vm_stat | grep "Pages inactive" | awk '{print $3}' | tr -d '.')
        echo $(( (pages_free + pages_inactive) * 4096 / 1024 / 1024 ))
    else
        # Linux - use /proc/meminfo for accurate available memory
        grep MemAvailable /proc/meminfo | awk '{print int($2/1024)}'
    fi
}

# Acquire build lock (prevents concurrent builds)
acquire_lock() {
    local waited=0
    local lock_owner=""

    while ! mkdir "$LOCK_FILE" 2>/dev/null; do
        if [ $waited -ge $LOCK_TIMEOUT ]; then
            error "Build lock timeout after ${LOCK_TIMEOUT}s"
            error "Another build may be stuck. Check with: ls -la $LOCK_FILE"
            error "Remove stale lock with: rm -rf $LOCK_FILE"
            exit 1
        fi

        # Show who holds the lock
        if [ -f "$LOCK_FILE/info" ]; then
            lock_owner=$(cat "$LOCK_FILE/info" 2>/dev/null || echo "unknown")
        fi

        warn "Build in progress ($lock_owner), waiting... (${waited}s/${LOCK_TIMEOUT}s)"
        sleep 10
        waited=$((waited + 10))
    done

    # Store lock info for debugging
    echo "PID=$$ TIME=$(date -Iseconds) HOST=$(hostname)" > "$LOCK_FILE/info"

    # Ensure lock is released on exit
    trap 'release_lock' EXIT INT TERM

    log "Build lock acquired (PID: $$)"
}

# Release build lock
release_lock() {
    if [ -d "$LOCK_FILE" ]; then
        rm -rf "$LOCK_FILE"
        log "Build lock released"
    fi
}

# Check minimum memory requirement
check_memory() {
    local required=$1
    local stage_name=$2
    local available=$(get_available_memory)

    if [ "$available" -lt "$required" ]; then
        error "Insufficient memory for $stage_name"
        error "  Required: ${required}MB"
        error "  Available: ${available}MB"
        error "Try: pm2 stop all (to free memory)"
        return 1
    fi

    log "Memory OK for $stage_name: ${available}MB available (need ${required}MB)"
    return 0
}

# Build workspace packages
build_packages() {
    stage "Building Workspace Packages"
    check_memory $MIN_MEMORY_PACKAGES "packages" || return 1

    log "Building shared..."
    pnpm -C packages/shared build

    log "Building core..."
    pnpm -C packages/core build

    log "Building plugin-sdk..."
    pnpm -C packages/plugin-sdk build

    # client and ui can build in parallel (no interdependency)
    log "Building client and ui in parallel..."
    pnpm -C packages/client build &
    local pid_client=$!
    pnpm -C packages/ui build &
    local pid_ui=$!

    # Wait for both and check exit codes
    local failed=0
    wait $pid_client || failed=1
    wait $pid_ui || failed=1

    if [ $failed -eq 1 ]; then
        error "Package build failed"
        return 1
    fi

    success "All packages built"
}

# Build API
build_api() {
    stage "Building API"
    check_memory $MIN_MEMORY_API "API" || return 1

    pnpm -C apps/api build
    success "API built"
}

# Build frontend with Vite
build_frontend() {
    stage "Building Frontend (Vite)"
    check_memory $MIN_MEMORY_FRONTEND "frontend" || return 1

    # Set Node.js memory limit for Vite's Rollup bundler
    # 4GB is safe on 8GB machine when PM2 is stopped
    export NODE_OPTIONS="--max-old-space-size=4096"

    # Skip inline compression to reduce peak memory
    # Compression will be done in post-build stage
    export SKIP_COMPRESSION=true

    log "Building with NODE_OPTIONS: $NODE_OPTIONS"
    log "SKIP_COMPRESSION: $SKIP_COMPRESSION"

    pnpm build

    unset NODE_OPTIONS
    unset SKIP_COMPRESSION

    success "Frontend built"
}

# Compress assets post-build
compress_assets() {
    stage "Compressing Assets"

    if [ -f "./scripts/compress-assets.sh" ]; then
        ./scripts/compress-assets.sh
    else
        warn "compress-assets.sh not found, skipping compression"
    fi
}

# Stop PM2 processes
stop_pm2() {
    stage "Stopping PM2 Processes"

    if command -v pm2 &> /dev/null; then
        local before_mem=$(get_available_memory)
        pm2 stop all 2>/dev/null || true
        sleep 2
        local after_mem=$(get_available_memory)
        local freed=$((after_mem - before_mem))
        success "PM2 stopped (freed ~${freed}MB)"
    else
        warn "PM2 not found, skipping"
    fi
}

# Start PM2 processes
start_pm2() {
    stage "Starting PM2 Processes"

    if command -v pm2 &> /dev/null; then
        if [ -f "ecosystem.config.cjs" ]; then
            pm2 start ecosystem.config.cjs --env production
            pm2 save
            success "PM2 started"
        else
            warn "ecosystem.config.cjs not found, skipping PM2 start"
        fi
    else
        warn "PM2 not found, skipping"
    fi
}

# Main build orchestration
main() {
    local start_time=$(date +%s)

    echo ""
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}  MuscleMap Memory-Safe Build${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""

    log "Build started at $(date)"
    log "Available memory: $(get_available_memory)MB"
    log "PM2 management: $MANAGE_PM2"

    # Acquire lock (prevents concurrent builds)
    acquire_lock

    # Stop PM2 to free memory
    if [ "$MANAGE_PM2" = true ]; then
        stop_pm2
    fi

    # Stage 1: Build packages
    if [ "$BUILD_PACKAGES" = true ]; then
        build_packages || {
            error "Package build failed"
            [ "$MANAGE_PM2" = true ] && start_pm2
            exit 1
        }
    fi

    # Stage 2: Build API
    if [ "$BUILD_API" = true ]; then
        build_api || {
            error "API build failed"
            [ "$MANAGE_PM2" = true ] && start_pm2
            exit 1
        }
    fi

    # Stage 3: Build frontend
    if [ "$BUILD_FRONTEND" = true ]; then
        build_frontend || {
            error "Frontend build failed"
            [ "$MANAGE_PM2" = true ] && start_pm2
            exit 1
        }
    fi

    # Stage 4: Compress assets (only if frontend was built)
    if [ "$BUILD_FRONTEND" = true ]; then
        compress_assets || warn "Compression had issues (non-fatal)"
    fi

    # Stage 5: Restart PM2
    if [ "$MANAGE_PM2" = true ]; then
        start_pm2
    fi

    # Summary
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))

    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  Build Complete!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    success "Total time: ${minutes}m ${seconds}s"
    success "Available memory: $(get_available_memory)MB"
    log "Build finished at $(date)"
}

# Run main function
main
