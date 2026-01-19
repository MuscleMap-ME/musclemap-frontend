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
#   ./scripts/compress-assets.sh --force   # Force recompression of all files
#
# =============================================================================

set -e

# Configuration
DIST_DIR="./dist"
FORCE_RECOMPRESS=false
THRESHOLD=1024  # Only compress files > 1KB
GZIP_LEVEL=9    # Maximum compression
BROTLI_LEVEL=11 # Maximum brotli compression (higher than gzip)

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE_RECOMPRESS=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [directory] [--force]"
            echo "  directory    Directory to compress (default: ./dist)"
            echo "  --force, -f  Force recompression of all files"
            exit 0
            ;;
        *)
            if [ -d "$1" ]; then
                DIST_DIR="$1"
            fi
            shift
            ;;
    esac
done

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
[ "$FORCE_RECOMPRESS" = true ] && log "Force recompression: enabled"

# Check for brotli command
HAS_BROTLI=false
if command -v brotli &> /dev/null; then
    HAS_BROTLI=true
    log "Brotli available: yes"
else
    warn "Brotli not installed - only gzip compression will be used"
    warn "Install with: apt install brotli (Linux) or brew install brotli (macOS)"
fi

# Count files - use a temp file to avoid subshell variable scope issues
TEMP_COUNTS=$(mktemp)
echo "0 0 0 0 0" > "$TEMP_COUNTS"  # total gzip brotli skipped saved

# Function to update counts
update_counts() {
    local field=$1
    local increment=$2
    local counts
    counts=$(cat "$TEMP_COUNTS")
    local total gzip_c brotli_c skipped saved
    read -r total gzip_c brotli_c skipped saved <<< "$counts"

    case $field in
        total) total=$((total + increment)) ;;
        gzip) gzip_c=$((gzip_c + increment)) ;;
        brotli) brotli_c=$((brotli_c + increment)) ;;
        skipped) skipped=$((skipped + increment)) ;;
        saved) saved=$((saved + increment)) ;;
    esac

    echo "$total $gzip_c $brotli_c $skipped $saved" > "$TEMP_COUNTS"
}

# Check if compressed file needs update
needs_compression() {
    local source_file="$1"
    local compressed_file="$2"

    # Force mode always recompresses
    [ "$FORCE_RECOMPRESS" = true ] && return 0

    # No compressed file exists
    [ ! -f "$compressed_file" ] && return 0

    # Source is newer than compressed
    [ "$source_file" -nt "$compressed_file" ] && return 0

    # No compression needed
    return 1
}

# Find compressible files
# Include: .js, .css, .html, .json, .svg, .xml, .txt, .map
while IFS= read -r -d '' file; do
    update_counts total 1

    # Get file size (works on both Linux and macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        size=$(stat -f%z "$file" 2>/dev/null || echo 0)
    else
        size=$(stat -c%s "$file" 2>/dev/null || echo 0)
    fi

    # Skip small files
    if [ "$size" -lt "$THRESHOLD" ]; then
        update_counts skipped 1
        continue
    fi

    original_size=$size
    file_compressed=false

    # Gzip compression
    if needs_compression "$file" "${file}.gz"; then
        if gzip -${GZIP_LEVEL} -k -f "$file" 2>/dev/null; then
            update_counts gzip 1
            file_compressed=true

            # Calculate savings
            if [[ "$OSTYPE" == "darwin"* ]]; then
                gz_size=$(stat -f%z "${file}.gz" 2>/dev/null || echo "$original_size")
            else
                gz_size=$(stat -c%s "${file}.gz" 2>/dev/null || echo "$original_size")
            fi
            saved=$((original_size - gz_size))
            if [ "$saved" -gt 0 ]; then
                update_counts saved "$saved"
            fi
        fi
    fi

    # Brotli compression (if available)
    if [ "$HAS_BROTLI" = true ]; then
        if needs_compression "$file" "${file}.br"; then
            if brotli -q ${BROTLI_LEVEL} -k -f "$file" 2>/dev/null; then
                update_counts brotli 1
                file_compressed=true
            fi
        fi
    fi

    # Show progress for large files
    if [ "$file_compressed" = true ] && [ "$size" -gt 100000 ]; then
        basename_file=$(basename "$file")
        echo "  Compressed: $basename_file"
    fi

done < <(find "$DIST_DIR" -type f \( \
    -name "*.js" \
    -o -name "*.css" \
    -o -name "*.html" \
    -o -name "*.json" \
    -o -name "*.svg" \
    -o -name "*.xml" \
    -o -name "*.txt" \
    -o -name "*.map" \
\) ! -name "*.gz" ! -name "*.br" -print0)

# Read final counts
counts=$(cat "$TEMP_COUNTS")
read -r total_files compressed_gzip compressed_brotli skipped total_saved <<< "$counts"
rm -f "$TEMP_COUNTS"

# Summary
echo ""
success "Compression complete!"
log "Files processed: $total_files"
log "Gzip compressed: $compressed_gzip"
[ "$HAS_BROTLI" = true ] && log "Brotli compressed: $compressed_brotli"
log "Skipped (too small): $skipped"

# Show size savings
if [ "$total_saved" -gt 0 ]; then
    if [ "$total_saved" -gt 1048576 ]; then
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
    # Extract just the filename and size
    size=$(echo "$line" | awk '{print $5}')
    filepath=$(echo "$line" | awk '{print $NF}')
    echo "  $filepath ($size)"
done

# Check for brotli files
if [ "$HAS_BROTLI" = true ]; then
    br_count=$(find "$DIST_DIR" -name "*.br" -type f 2>/dev/null | wc -l | tr -d ' ')
    if [ "$br_count" -gt 0 ]; then
        echo ""
        log "Largest assets (brotli):"
        find "$DIST_DIR" -name "*.br" -type f -exec ls -lh {} \; 2>/dev/null | \
            sort -k5 -h -r | head -5 | while read -r line; do
            size=$(echo "$line" | awk '{print $5}')
            filepath=$(echo "$line" | awk '{print $NF}')
            echo "  $filepath ($size)"
        done
    fi
fi
