#!/bin/bash
# =============================================================================
# MuscleMap Post-Build Asset Compression
# =============================================================================
#
# Compresses built assets with gzip and brotli AFTER the main build completes.
# This reduces peak memory usage during the Vite build phase.
#
# Why separate compression?
# - Vite's inline compression plugins add ~500MB to peak memory
# - Moving to post-build allows the Vite process to exit first
# - Compression can run with lower memory requirements
# - Can be parallelized more easily
#
# Usage:
#   ./scripts/compress-assets.sh           # Compress dist/
#   ./scripts/compress-assets.sh ./build   # Compress custom directory
#
# =============================================================================

set -e

# Configuration
DIST_DIR="${1:-./dist}"
THRESHOLD=1024  # Only compress files > 1KB
GZIP_LEVEL=9    # Maximum compression
BROTLI_LEVEL=11 # Maximum brotli compression (higher than gzip)

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[COMPRESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }

# Check if directory exists
if [ ! -d "$DIST_DIR" ]; then
    warn "Directory not found: $DIST_DIR"
    exit 0
fi

log "Compressing assets in: $DIST_DIR"
log "Threshold: ${THRESHOLD} bytes"

# Check for brotli command
HAS_BROTLI=false
if command -v brotli &> /dev/null; then
    HAS_BROTLI=true
    log "Brotli available: yes"
else
    warn "Brotli not installed - only gzip compression will be used"
    warn "Install with: apt install brotli (Linux) or brew install brotli (macOS)"
fi

# Count files
total_files=0
compressed_gzip=0
compressed_brotli=0
skipped=0
total_saved=0

# Find compressible files
# Include: .js, .css, .html, .json, .svg, .xml, .txt, .map
find "$DIST_DIR" -type f \( \
    -name "*.js" \
    -o -name "*.css" \
    -o -name "*.html" \
    -o -name "*.json" \
    -o -name "*.svg" \
    -o -name "*.xml" \
    -o -name "*.txt" \
    -o -name "*.map" \
\) | while read -r file; do
    # Skip already compressed files
    [[ "$file" == *.gz ]] && continue
    [[ "$file" == *.br ]] && continue

    ((total_files++)) || true

    # Get file size (works on both Linux and macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        size=$(stat -f%z "$file" 2>/dev/null)
    else
        size=$(stat -c%s "$file" 2>/dev/null)
    fi

    # Skip small files
    if [ "$size" -lt "$THRESHOLD" ]; then
        ((skipped++)) || true
        continue
    fi

    original_size=$size

    # Gzip compression
    if gzip -${GZIP_LEVEL} -k -f "$file" 2>/dev/null; then
        ((compressed_gzip++)) || true

        # Calculate savings
        if [[ "$OSTYPE" == "darwin"* ]]; then
            gz_size=$(stat -f%z "${file}.gz" 2>/dev/null)
        else
            gz_size=$(stat -c%s "${file}.gz" 2>/dev/null)
        fi
        saved=$((original_size - gz_size))
        total_saved=$((total_saved + saved))
    fi

    # Brotli compression (if available)
    if [ "$HAS_BROTLI" = true ]; then
        if brotli -${BROTLI_LEVEL} -k -f "$file" 2>/dev/null; then
            ((compressed_brotli++)) || true
        fi
    fi
done

# Summary
echo ""
success "Compression complete!"
log "Files processed: $total_files"
log "Gzip compressed: $compressed_gzip"
[ "$HAS_BROTLI" = true ] && log "Brotli compressed: $compressed_brotli"
log "Skipped (too small): $skipped"

# Show size savings
if [ $total_saved -gt 0 ]; then
    if [ $total_saved -gt 1048576 ]; then
        log "Total saved: $((total_saved / 1048576)) MB"
    else
        log "Total saved: $((total_saved / 1024)) KB"
    fi
fi

# List largest compressed files
echo ""
log "Largest assets (gzipped):"
find "$DIST_DIR" -name "*.gz" -type f -exec ls -lh {} \; 2>/dev/null | \
    sort -k5 -h -r | head -5 | while read -r line; do
    echo "  $line" | awk '{print "  " $9 " (" $5 ")"}'
done
