#!/bin/bash
# =============================================================================
# MuscleMap Pre-Bundle Vendor Script
# =============================================================================
#
# This script pre-bundles heavy vendor dependencies into optimized chunks that
# can be reused across multiple app builds. This dramatically speeds up rebuilds
# because the vendor transformation (the slowest part) only happens when
# dependencies change.
#
# How it works:
# 1. Creates a hash of pnpm-lock.yaml to detect dependency changes
# 2. If vendors are already built and hash matches, skips vendor build
# 3. Uses Vite in library mode to create optimized vendor bundles
# 4. Stores bundles in .vendor-cache/ for reuse
#
# Usage:
#   ./scripts/build-vendors.sh              # Build vendors if needed
#   ./scripts/build-vendors.sh --force      # Force rebuild vendors
#   ./scripts/build-vendors.sh --clean      # Remove vendor cache
#
# After running this, use build-with-vendors.sh for fast app builds.
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VENDOR_CACHE_DIR="$PROJECT_ROOT/.vendor-cache"
VENDOR_HASH_FILE="$VENDOR_CACHE_DIR/.vendor-hash"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${BLUE}[VENDOR]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
stage() { echo -e "\n${CYAN}=== $1 ===${NC}"; }

# Parse arguments
FORCE_BUILD=false
CLEAN_CACHE=false

for arg in "$@"; do
    case $arg in
        --force|-f)
            FORCE_BUILD=true
            ;;
        --clean|-c)
            CLEAN_CACHE=true
            ;;
        --help|-h)
            echo "Usage: $0 [--force] [--clean]"
            echo "  --force, -f  Force rebuild vendors even if unchanged"
            echo "  --clean, -c  Remove vendor cache directory"
            exit 0
            ;;
    esac
done

cd "$PROJECT_ROOT"

# Clean if requested
if [ "$CLEAN_CACHE" = true ]; then
    log "Cleaning vendor cache..."
    rm -rf "$VENDOR_CACHE_DIR"
    success "Vendor cache cleaned"
    exit 0
fi

# Calculate hash of dependencies
calculate_hash() {
    if command -v md5sum &> /dev/null; then
        cat pnpm-lock.yaml package.json | md5sum | cut -d' ' -f1
    else
        cat pnpm-lock.yaml package.json | md5 -q
    fi
}

CURRENT_HASH=$(calculate_hash)

# Check if we need to rebuild
if [ "$FORCE_BUILD" = false ] && [ -d "$VENDOR_CACHE_DIR" ] && [ -f "$VENDOR_HASH_FILE" ]; then
    CACHED_HASH=$(cat "$VENDOR_HASH_FILE")
    if [ "$CURRENT_HASH" = "$CACHED_HASH" ]; then
        success "Vendor cache is up to date (hash: ${CURRENT_HASH:0:8}...)"
        exit 0
    else
        log "Dependencies changed, rebuilding vendors..."
    fi
fi

stage "Building Vendor Bundles"
START_TIME=$(date +%s)

# Create cache directory
mkdir -p "$VENDOR_CACHE_DIR"

# Create a temporary Vite config for vendor bundling
VENDOR_CONFIG="$VENDOR_CACHE_DIR/vite.vendor.config.mjs"

cat > "$VENDOR_CONFIG" << 'EOF'
import { defineConfig } from 'vite';
import { resolve } from 'path';

// These are the heavy vendor packages that take longest to transform
// By pre-bundling them, we avoid re-processing 5000+ modules on every build
export default defineConfig({
  build: {
    outDir: '.vendor-cache/bundles',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    reportCompressedSize: false,
    lib: {
      entry: {
        // Three.js ecosystem (~800KB, ~3000 modules)
        'three-vendor': resolve(__dirname, '../node_modules/three/build/three.module.js'),
        // Recharts and D3 (~500KB, ~500 modules)
        'd3-vendor': resolve(__dirname, '../node_modules/d3/src/index.js'),
        // Apollo GraphQL (~170KB, ~200 modules)
        'apollo-vendor': resolve(__dirname, '../node_modules/@apollo/client/index.js'),
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      // Don't bundle React - it's small and needs to be the same instance
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        // Preserve module structure for tree-shaking
        preserveModules: false,
        // Use consistent chunk naming
        chunkFileNames: '[name]-[hash].js',
      },
    },
  },
});
EOF

log "Building three-vendor, d3-vendor, apollo-vendor..."

# Run Vite build with vendor config
if ! pnpm vite build --config "$VENDOR_CONFIG" 2>&1; then
    warn "Vendor build failed - will use standard build"
    rm -rf "$VENDOR_CACHE_DIR"
    exit 1
fi

# Save the hash
echo "$CURRENT_HASH" > "$VENDOR_HASH_FILE"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Show what was built
echo ""
success "Vendor bundles built in ${DURATION}s"
log "Bundles saved to: $VENDOR_CACHE_DIR/bundles/"
ls -lh "$VENDOR_CACHE_DIR/bundles/"*.js 2>/dev/null | while read -r line; do
    echo "  $line" | awk '{print "  " $NF " (" $5 ")"}'
done

echo ""
log "Next steps:"
echo "  1. Run './scripts/build-with-vendors.sh' for fast app builds"
echo "  2. Vendors will be rebuilt automatically when dependencies change"
