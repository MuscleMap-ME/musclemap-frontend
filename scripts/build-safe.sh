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
# 7. INCREMENTAL BUILDS: Skips unchanged packages to save time
#
# Usage:
#   ./scripts/build-safe.sh              # Incremental build with PM2 management
#   ./scripts/build-safe.sh --force      # Force rebuild everything
#   ./scripts/build-safe.sh --no-pm2     # Build only (don't touch PM2)
#   ./scripts/build-safe.sh --packages   # Build packages only
#   ./scripts/build-safe.sh --frontend   # Build frontend only
#
# =============================================================================

set -e

# Configuration
LOCK_FILE="/tmp/musclemap-build.lock"
LOCK_TIMEOUT=600  # 10 minutes max wait for lock
BUILD_CACHE_DIR=".build-cache"  # Directory to store build hashes

# Memory requirements (MB) - adjusted based on whether PM2 is running
# With PM2 running: ~1GB used by Node processes, so we need less available
# Without PM2: Full memory available for build
MIN_MEMORY_PACKAGES=300   # MB needed for package builds
MIN_MEMORY_API=400        # MB needed for API build
MIN_MEMORY_FRONTEND=1500  # MB needed for Vite build (with LOW_MEMORY mode)

# Parse arguments
MANAGE_PM2=false  # Default: Keep PM2 running (production safe)
BUILD_PACKAGES=true
BUILD_API=true
BUILD_FRONTEND=true
FORCE_REBUILD=false
AGGRESSIVE_MEMORY=false  # Use more aggressive memory limits

for arg in "$@"; do
    case $arg in
        --stop-pm2)
            MANAGE_PM2=true  # Explicitly request PM2 stop (for maintenance windows)
            ;;
        --force)
            FORCE_REBUILD=true
            ;;
        --aggressive)
            AGGRESSIVE_MEMORY=true  # Use lower memory limits (slower but safer)
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
            echo "Usage: $0 [--stop-pm2] [--force] [--aggressive] [--packages|--api|--frontend]"
            echo "  --stop-pm2   Stop PM2 during build (use during maintenance windows)"
            echo "  --force      Force rebuild everything (ignore cache)"
            echo "  --aggressive Use aggressive memory limits (slower, but safer)"
            echo "  --packages   Only build workspace packages"
            echo "  --api        Only build API"
            echo "  --frontend   Only build frontend"
            echo ""
            echo "Default: Keeps PM2 running to avoid downtime on production servers"
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
skip() { echo -e "${GREEN}[SKIP]${NC} $1 (unchanged)"; }

# =============================================================================
# Incremental Build Support
# =============================================================================

# Ensure build cache directory exists
mkdir -p "$BUILD_CACHE_DIR"

# Calculate hash of source files in a directory
# Uses find + md5/shasum to create a content-based hash
get_source_hash() {
    local dir=$1
    local src_dir="$dir/src"
    local pkg_json="$dir/package.json"
    local tsconfig="$dir/tsconfig.json"

    # If src directory doesn't exist, check for direct .ts files
    if [ ! -d "$src_dir" ]; then
        src_dir="$dir"
    fi

    # Create hash from:
    # 1. All TypeScript/JavaScript source files
    # 2. package.json (dependencies might change)
    # 3. tsconfig.json (build config might change)
    {
        find "$src_dir" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec cat {} \; 2>/dev/null
        cat "$pkg_json" 2>/dev/null
        cat "$tsconfig" 2>/dev/null
    } | {
        # Use md5 on macOS, md5sum on Linux
        if command -v md5 &> /dev/null; then
            md5 -q
        else
            md5sum | cut -d' ' -f1
        fi
    }
}

# Check if a package needs rebuilding
# Returns 0 if rebuild needed, 1 if can skip
needs_rebuild() {
    local pkg_name=$1
    local pkg_dir=$2

    # Force rebuild if --force flag is set
    if [ "$FORCE_REBUILD" = true ]; then
        return 0
    fi

    local cache_file="$BUILD_CACHE_DIR/${pkg_name}.hash"
    local dist_dir="$pkg_dir/dist"

    # Rebuild if dist doesn't exist
    if [ ! -d "$dist_dir" ]; then
        log "$pkg_name: No dist/ found, will build"
        return 0
    fi

    # Rebuild if no cached hash
    if [ ! -f "$cache_file" ]; then
        log "$pkg_name: No build cache, will build"
        return 0
    fi

    # Compare current hash with cached hash
    local current_hash=$(get_source_hash "$pkg_dir")
    local cached_hash=$(cat "$cache_file" 2>/dev/null)

    if [ "$current_hash" != "$cached_hash" ]; then
        log "$pkg_name: Source changed, will rebuild"
        return 0
    fi

    # No rebuild needed
    return 1
}

# Save the build hash after successful build
save_build_hash() {
    local pkg_name=$1
    local pkg_dir=$2
    local cache_file="$BUILD_CACHE_DIR/${pkg_name}.hash"

    get_source_hash "$pkg_dir" > "$cache_file"
}

# Check if frontend needs rebuilding
frontend_needs_rebuild() {
    # Force rebuild if --force flag is set
    if [ "$FORCE_REBUILD" = true ]; then
        return 0
    fi

    local cache_file="$BUILD_CACHE_DIR/frontend.hash"
    local dist_dir="./dist"

    # Rebuild if dist doesn't exist
    if [ ! -d "$dist_dir" ]; then
        log "Frontend: No dist/ found, will build"
        return 0
    fi

    # Rebuild if no cached hash
    if [ ! -f "$cache_file" ]; then
        log "Frontend: No build cache, will build"
        return 0
    fi

    # Calculate hash from src/, public/, and config files
    local current_hash
    current_hash=$({
        find ./src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" \) -exec cat {} \; 2>/dev/null
        find ./public -type f -exec cat {} \; 2>/dev/null
        cat ./package.json ./vite.config.js ./index.html 2>/dev/null
    } | {
        if command -v md5 &> /dev/null; then
            md5 -q
        else
            md5sum | cut -d' ' -f1
        fi
    })

    local cached_hash=$(cat "$cache_file" 2>/dev/null)

    if [ "$current_hash" != "$cached_hash" ]; then
        log "Frontend: Source changed, will rebuild"
        return 0
    fi

    return 1
}

# Save frontend build hash
save_frontend_hash() {
    local cache_file="$BUILD_CACHE_DIR/frontend.hash"

    {
        find ./src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" \) -exec cat {} \; 2>/dev/null
        find ./public -type f -exec cat {} \; 2>/dev/null
        cat ./package.json ./vite.config.js ./index.html 2>/dev/null
    } | {
        if command -v md5 &> /dev/null; then
            md5 -q
        else
            md5sum | cut -d' ' -f1
        fi
    } > "$cache_file"
}

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

# Build workspace packages (with incremental support)
build_packages() {
    stage "Building Workspace Packages"
    check_memory $MIN_MEMORY_PACKAGES "packages" || return 1

    local built_count=0
    local skipped_count=0

    # Build shared (dependency for others)
    if needs_rebuild "shared" "packages/shared"; then
        log "Building shared..."
        pnpm -C packages/shared build
        save_build_hash "shared" "packages/shared"
        ((built_count++))
    else
        skip "packages/shared"
        ((skipped_count++))
    fi

    # Build core (depends on shared)
    if needs_rebuild "core" "packages/core"; then
        log "Building core..."
        pnpm -C packages/core build
        save_build_hash "core" "packages/core"
        ((built_count++))
    else
        skip "packages/core"
        ((skipped_count++))
    fi

    # Build plugin-sdk (depends on core)
    if needs_rebuild "plugin-sdk" "packages/plugin-sdk"; then
        log "Building plugin-sdk..."
        pnpm -C packages/plugin-sdk build
        save_build_hash "plugin-sdk" "packages/plugin-sdk"
        ((built_count++))
    else
        skip "packages/plugin-sdk"
        ((skipped_count++))
    fi

    # client and ui can build in parallel (no interdependency)
    local need_client=false
    local need_ui=false

    needs_rebuild "client" "packages/client" && need_client=true
    needs_rebuild "ui" "packages/ui" && need_ui=true

    if [ "$need_client" = true ] || [ "$need_ui" = true ]; then
        log "Building client and ui..."
        local failed=0

        if [ "$need_client" = true ]; then
            pnpm -C packages/client build &
            local pid_client=$!
        fi

        if [ "$need_ui" = true ]; then
            pnpm -C packages/ui build &
            local pid_ui=$!
        fi

        # Wait and check exit codes
        if [ "$need_client" = true ]; then
            if wait $pid_client; then
                save_build_hash "client" "packages/client"
                ((built_count++))
            else
                failed=1
            fi
        else
            skip "packages/client"
            ((skipped_count++))
        fi

        if [ "$need_ui" = true ]; then
            if wait $pid_ui; then
                save_build_hash "ui" "packages/ui"
                ((built_count++))
            else
                failed=1
            fi
        else
            skip "packages/ui"
            ((skipped_count++))
        fi

        if [ $failed -eq 1 ]; then
            error "Package build failed"
            return 1
        fi
    else
        skip "packages/client"
        skip "packages/ui"
        ((skipped_count+=2))
    fi

    success "Packages: $built_count built, $skipped_count skipped"
}

# Build API (with incremental support)
build_api() {
    stage "Building API"

    if needs_rebuild "api" "apps/api"; then
        check_memory $MIN_MEMORY_API "API" || return 1
        if ! pnpm -C apps/api build; then
            error "API build failed!"
            return 1
        fi
        save_build_hash "api" "apps/api"
        success "API built"
    else
        skip "apps/api"
    fi
}

# Build frontend with Vite (with incremental support)
build_frontend() {
    stage "Building Frontend (Vite)"

    if frontend_needs_rebuild; then
        check_memory $MIN_MEMORY_FRONTEND "frontend" || return 1

        # Determine memory limit based on available memory and mode
        local available_mem=$(get_available_memory)
        local node_mem=3072  # Default 3GB for Node.js heap

        if [ "$MANAGE_PM2" = false ]; then
            # PM2 is running, use conservative memory limit
            # Leave ~2GB for PM2 processes and OS
            if [ "$available_mem" -lt 3000 ]; then
                node_mem=2048  # 2GB if memory is tight
            fi
        else
            # PM2 is stopped, can use more memory
            node_mem=4096  # 4GB
        fi

        if [ "$AGGRESSIVE_MEMORY" = true ]; then
            node_mem=1536  # Very conservative 1.5GB
        fi

        export NODE_OPTIONS="--max-old-space-size=${node_mem}"

        # Skip inline compression to reduce peak memory
        # Compression will be done in post-build stage
        export SKIP_COMPRESSION=true

        # Enable low memory mode to reduce Rollup parallelism
        # This prevents OOM during the module transformation phase
        export LOW_MEMORY=true

        log "Available memory: ${available_mem}MB"
        log "Node.js heap limit: ${node_mem}MB"
        log "PM2 running: $([ "$MANAGE_PM2" = false ] && echo "yes (production safe)" || echo "no (stopped)")"
        log "SKIP_COMPRESSION: $SKIP_COMPRESSION"
        log "LOW_MEMORY: $LOW_MEMORY"

        # Run build and capture exit code
        if ! pnpm build; then
            unset NODE_OPTIONS
            unset SKIP_COMPRESSION
            unset LOW_MEMORY
            error "Frontend build failed!"
            return 1
        fi

        unset NODE_OPTIONS
        unset SKIP_COMPRESSION
        unset LOW_MEMORY

        # Save hash after successful build
        save_frontend_hash

        success "Frontend built"
    else
        skip "Frontend (no changes detected)"
    fi
}

# Compress assets post-build
compress_assets() {
    stage "Compressing Assets"

    if [ -f "./scripts/compress-assets.sh" ]; then
        # Check if brotli files are missing (gzip exists but not brotli)
        local gz_count=0
        local br_count=0
        if [ -d "./dist" ]; then
            gz_count=$(find ./dist -name "*.gz" -type f 2>/dev/null | wc -l | tr -d ' ')
            br_count=$(find ./dist -name "*.br" -type f 2>/dev/null | wc -l | tr -d ' ')
        fi

        # Force compression if: force rebuild requested, or brotli files missing but gzip exists
        if [ "$FORCE_REBUILD" = true ]; then
            log "Force rebuild - recompressing all assets"
            ./scripts/compress-assets.sh --force
        elif [ "$gz_count" -gt 0 ] && [ "$br_count" -eq 0 ]; then
            log "Brotli files missing (gz: $gz_count, br: $br_count) - generating..."
            ./scripts/compress-assets.sh --force
        else
            ./scripts/compress-assets.sh
        fi
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
    log "PM2 management: $([ "$MANAGE_PM2" = true ] && echo "will stop" || echo "keep running (production safe)")"
    log "Force rebuild: $FORCE_REBUILD"
    log "Aggressive memory: $AGGRESSIVE_MEMORY"
    log "Build cache: $BUILD_CACHE_DIR/"

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
