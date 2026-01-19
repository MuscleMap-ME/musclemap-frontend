#!/bin/bash
# =============================================================================
# MuscleMap Fast Build with Pre-bundled Vendors
# =============================================================================
#
# This script provides the fastest possible production builds by:
# 1. Using pre-bundled vendor chunks (built once, reused many times)
# 2. Only rebuilding app code when source files change
# 3. Running compression as a separate post-build step
#
# Expected build times:
#   - First build (with vendor build): ~60s
#   - Subsequent builds (vendors cached): ~20-25s
#   - No changes detected: ~1s
#
# Usage:
#   ./scripts/build-with-vendors.sh           # Smart incremental build
#   ./scripts/build-with-vendors.sh --full    # Force full rebuild
#   ./scripts/build-with-vendors.sh --no-compress  # Skip compression
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[BUILD]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
stage() { echo -e "\n${CYAN}=== $1 ===${NC}"; }

# Parse arguments
FULL_BUILD=false
SKIP_COMPRESS=false

for arg in "$@"; do
    case $arg in
        --full|-f)
            FULL_BUILD=true
            ;;
        --no-compress)
            SKIP_COMPRESS=true
            ;;
        --help|-h)
            echo "Usage: $0 [--full] [--no-compress]"
            echo "  --full, -f      Force full rebuild including vendors"
            echo "  --no-compress   Skip post-build compression"
            exit 0
            ;;
    esac
done

cd "$PROJECT_ROOT"
START_TIME=$(date +%s)

echo ""
echo "============================================"
echo "  MuscleMap Fast Build"
echo "============================================"
echo ""

# Step 1: Build vendors if needed
stage "Checking Vendor Cache"
if [ "$FULL_BUILD" = true ]; then
    "$SCRIPT_DIR/build-vendors.sh" --force
else
    "$SCRIPT_DIR/build-vendors.sh"
fi

# Step 2: Check if app source changed
stage "Checking Source Changes"
BUILD_CACHE_DIR=".build-cache"
APP_HASH_FILE="$BUILD_CACHE_DIR/app-hash"

# Hash all source files
calculate_app_hash() {
    find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" \) \
        -exec cat {} \; 2>/dev/null | \
        if command -v md5sum &> /dev/null; then
            md5sum | cut -d' ' -f1
        else
            md5 -q
        fi
}

mkdir -p "$BUILD_CACHE_DIR"
CURRENT_APP_HASH=$(calculate_app_hash)

NEEDS_BUILD=true
if [ "$FULL_BUILD" = false ] && [ -d "dist" ] && [ -f "$APP_HASH_FILE" ]; then
    CACHED_APP_HASH=$(cat "$APP_HASH_FILE")
    if [ "$CURRENT_APP_HASH" = "$CACHED_APP_HASH" ]; then
        success "Source unchanged, skipping build"
        NEEDS_BUILD=false
    else
        log "Source files changed, rebuilding..."
    fi
fi

# Step 3: Build app
if [ "$NEEDS_BUILD" = true ]; then
    stage "Building Application"

    # Set environment for optimized build
    export SKIP_COMPRESSION=true
    export NODE_OPTIONS="--max-old-space-size=4096"

    # Run Vite build
    BUILD_START=$(date +%s)
    pnpm vite build
    BUILD_END=$(date +%s)
    BUILD_DURATION=$((BUILD_END - BUILD_START))

    success "Build completed in ${BUILD_DURATION}s"

    # Save app hash
    echo "$CURRENT_APP_HASH" > "$APP_HASH_FILE"
fi

# Step 4: Compress assets
if [ "$SKIP_COMPRESS" = false ] && [ -f "$SCRIPT_DIR/compress-assets.sh" ]; then
    stage "Compressing Assets"
    "$SCRIPT_DIR/compress-assets.sh"
fi

END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))

echo ""
echo "============================================"
echo "  Build Complete!"
echo "============================================"
success "Total time: ${TOTAL_DURATION}s"

# Show output size
if [ -d "dist" ]; then
    DIST_SIZE=$(du -sh dist 2>/dev/null | cut -f1)
    log "Output size: $DIST_SIZE"
fi
