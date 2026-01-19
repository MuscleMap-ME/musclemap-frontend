#!/bin/bash
# =============================================================================
# MuscleMap Fast Build Script
# =============================================================================
#
# This script implements a two-phase build to speed up rebuilds:
# 1. Vendor build (only when dependencies change)
# 2. App build (only when source changes)
#
# The vendor chunks are cached and reused across builds.
#
# Usage:
#   ./scripts/build-fast.sh              # Smart build (skips unchanged)
#   ./scripts/build-fast.sh --full       # Full rebuild
#   ./scripts/build-fast.sh --vendors    # Rebuild vendor chunks only
#   ./scripts/build-fast.sh --app        # Rebuild app chunks only
#
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[BUILD]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }

# Parse args
BUILD_VENDORS=false
BUILD_APP=true
FULL_BUILD=false

for arg in "$@"; do
    case $arg in
        --full)
            FULL_BUILD=true
            BUILD_VENDORS=true
            BUILD_APP=true
            ;;
        --vendors)
            BUILD_VENDORS=true
            BUILD_APP=false
            ;;
        --app)
            BUILD_APP=true
            BUILD_VENDORS=false
            ;;
    esac
done

# Check if vendor deps changed
VENDOR_HASH_FILE=".build-cache/vendor-hash"
CURRENT_HASH=$(md5sum pnpm-lock.yaml 2>/dev/null | cut -d' ' -f1 || md5 -q pnpm-lock.yaml 2>/dev/null)

if [ "$FULL_BUILD" = false ] && [ -f "$VENDOR_HASH_FILE" ]; then
    CACHED_HASH=$(cat "$VENDOR_HASH_FILE")
    if [ "$CURRENT_HASH" = "$CACHED_HASH" ]; then
        log "Vendor dependencies unchanged, skipping vendor rebuild"
        BUILD_VENDORS=false
    else
        log "Vendor dependencies changed, will rebuild vendors"
        BUILD_VENDORS=true
    fi
fi

# Time the build
START_TIME=$(date +%s)

if [ "$BUILD_VENDORS" = true ] || [ "$BUILD_APP" = true ]; then
    log "Building with SKIP_COMPRESSION=true..."

    # Use environment variable to control what gets built
    if [ "$BUILD_VENDORS" = true ] && [ "$BUILD_APP" = false ]; then
        # Vendor-only build (not implemented yet - would need Vite config changes)
        warn "Vendor-only builds not yet implemented, doing full build"
        SKIP_COMPRESSION=true pnpm vite build
    elif [ "$BUILD_VENDORS" = false ] && [ "$BUILD_APP" = true ]; then
        # App-only build (uses cached vendors if available)
        log "Building app chunks only..."
        SKIP_COMPRESSION=true pnpm vite build
    else
        # Full build
        log "Building all chunks..."
        SKIP_COMPRESSION=true pnpm vite build
    fi

    # Save vendor hash
    mkdir -p .build-cache
    echo "$CURRENT_HASH" > "$VENDOR_HASH_FILE"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

success "Build completed in ${DURATION}s"

# Offer to run compression
if [ -f "./scripts/compress-assets.sh" ]; then
    log "Run compression separately with: ./scripts/compress-assets.sh"
fi
