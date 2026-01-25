#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Build Stability Analyzer
# ═══════════════════════════════════════════════════════════════════════════════
# Compares two builds to measure chunk stability and estimate rsync transfer size.
# Use this to validate that incremental builds are producing minimal changes.
#
# Usage:
#   ./scripts/analyze-build-stability.sh [--compare PATH] [--verbose]
#
# Examples:
#   ./scripts/analyze-build-stability.sh                    # Compare against last build
#   ./scripts/analyze-build-stability.sh --compare /tmp/old-dist  # Compare specific dirs
#   ./scripts/analyze-build-stability.sh --verbose          # Show all changed files
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CACHE_DIR="$PROJECT_ROOT/.intelligent-cache"
MANIFEST_FILE="$CACHE_DIR/build-manifest.json"
DIST_DIR="$PROJECT_ROOT/dist"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
COMPARE_DIR=""
VERBOSE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --compare)
            COMPARE_DIR="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Ensure dist exists
if [ ! -d "$DIST_DIR" ]; then
    echo -e "${RED}Error: dist/ directory not found. Run a build first.${NC}"
    exit 1
fi

# Generate current manifest
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Build Stability Analyzer${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Create manifest of current build
mkdir -p "$CACHE_DIR"
CURRENT_MANIFEST="$CACHE_DIR/current-manifest.json"

echo -e "${CYAN}Analyzing current build...${NC}"

# Generate manifest with file sizes and hashes
node -e "
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const distDir = '$DIST_DIR';
const manifest = {};

function walkDir(dir, basePath = '') {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const relativePath = path.join(basePath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            walkDir(filePath, relativePath);
        } else {
            const content = fs.readFileSync(filePath);
            const hash = crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
            manifest[relativePath] = {
                size: stat.size,
                hash: hash,
            };
        }
    }
}

walkDir(distDir);
fs.writeFileSync('$CURRENT_MANIFEST', JSON.stringify(manifest, null, 2));
console.log('Files analyzed:', Object.keys(manifest).length);
"

# Check if we have a previous manifest to compare
PREVIOUS_MANIFEST="$CACHE_DIR/previous-manifest.json"

if [ -n "$COMPARE_DIR" ]; then
    # Use specified directory for comparison
    if [ ! -d "$COMPARE_DIR" ]; then
        echo -e "${RED}Error: Comparison directory not found: $COMPARE_DIR${NC}"
        exit 1
    fi

    echo -e "${CYAN}Generating manifest for comparison directory...${NC}"
    node -e "
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const distDir = '$COMPARE_DIR';
const manifest = {};

function walkDir(dir, basePath = '') {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const relativePath = path.join(basePath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            walkDir(filePath, relativePath);
        } else {
            const content = fs.readFileSync(filePath);
            const hash = crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
            manifest[relativePath] = {
                size: stat.size,
                hash: hash,
            };
        }
    }
}

walkDir(distDir);
fs.writeFileSync('$PREVIOUS_MANIFEST', JSON.stringify(manifest, null, 2));
"
elif [ ! -f "$PREVIOUS_MANIFEST" ]; then
    echo -e "${YELLOW}No previous build manifest found.${NC}"
    echo -e "${YELLOW}Saving current manifest for future comparisons.${NC}"
    cp "$CURRENT_MANIFEST" "$PREVIOUS_MANIFEST"
    echo ""
    echo -e "${GREEN}Current build summary:${NC}"
    node -e "
const manifest = require('$CURRENT_MANIFEST');
const files = Object.entries(manifest);
const totalSize = files.reduce((sum, [_, f]) => sum + f.size, 0);
const jsFiles = files.filter(([p]) => p.endsWith('.js'));
const cssFiles = files.filter(([p]) => p.endsWith('.css'));
console.log('  Total files:', files.length);
console.log('  JS files:', jsFiles.length);
console.log('  CSS files:', cssFiles.length);
console.log('  Total size:', (totalSize / 1024 / 1024).toFixed(2), 'MB');
"
    exit 0
fi

# Compare manifests
echo ""
echo -e "${CYAN}Comparing with previous build...${NC}"
echo ""

node -e "
const fs = require('fs');

const current = JSON.parse(fs.readFileSync('$CURRENT_MANIFEST', 'utf8'));
const previous = JSON.parse(fs.readFileSync('$PREVIOUS_MANIFEST', 'utf8'));
const verbose = $VERBOSE;

const currentFiles = new Set(Object.keys(current));
const previousFiles = new Set(Object.keys(previous));

// Calculate differences
const unchanged = [];
const modified = [];
const added = [];
const removed = [];

for (const file of currentFiles) {
    if (!previousFiles.has(file)) {
        added.push({ file, size: current[file].size });
    } else if (current[file].hash !== previous[file].hash) {
        modified.push({
            file,
            oldSize: previous[file].size,
            newSize: current[file].size,
            delta: current[file].size - previous[file].size
        });
    } else {
        unchanged.push(file);
    }
}

for (const file of previousFiles) {
    if (!currentFiles.has(file)) {
        removed.push({ file, size: previous[file].size });
    }
}

// Calculate totals
const totalFiles = currentFiles.size;
const unchangedPercent = ((unchanged.length / totalFiles) * 100).toFixed(1);
const modifiedPercent = ((modified.length / totalFiles) * 100).toFixed(1);
const addedPercent = ((added.length / totalFiles) * 100).toFixed(1);
const removedPercent = ((removed.length / previousFiles.size) * 100).toFixed(1);

// Estimate rsync transfer
// rsync typically transfers ~10-20% of file size for modified files (delta encoding)
// For added files, full size is transferred
const rsyncEstimate =
    added.reduce((sum, f) => sum + f.size, 0) +  // Full transfer for new files
    modified.reduce((sum, f) => sum + Math.abs(f.delta) + (f.newSize * 0.1), 0);  // Delta + overhead

console.log('═══════════════════════════════════════════════════════════════');
console.log('  BUILD STABILITY REPORT');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('  Summary:');
console.log('  ────────────────────────────────────────');
console.log('  Unchanged files:  ' + unchanged.length.toString().padStart(5) + ' (' + unchangedPercent + '%)');
console.log('  Modified files:   ' + modified.length.toString().padStart(5) + ' (' + modifiedPercent + '%)');
console.log('  Added files:      ' + added.length.toString().padStart(5) + ' (' + addedPercent + '%)');
console.log('  Removed files:    ' + removed.length.toString().padStart(5) + ' (' + removedPercent + '%)');
console.log('  ────────────────────────────────────────');
console.log('  Total files:      ' + totalFiles.toString().padStart(5));
console.log('');
console.log('  Stability Score: ' + unchangedPercent + '% (target: >90%)');
console.log('');
console.log('  Estimated rsync transfer: ' + (rsyncEstimate / 1024).toFixed(1) + ' KB');
console.log('');

// Show details if verbose or if there are changes
if (verbose || modified.length > 0 || added.length > 0 || removed.length > 0) {
    console.log('  Changed Files:');
    console.log('  ────────────────────────────────────────');

    if (modified.length > 0) {
        console.log('');
        console.log('  Modified:');
        for (const f of modified.slice(0, verbose ? 100 : 10)) {
            const deltaStr = f.delta >= 0 ? '+' + f.delta : f.delta.toString();
            console.log('    • ' + f.file + ' (' + deltaStr + ' bytes)');
        }
        if (!verbose && modified.length > 10) {
            console.log('    ... and ' + (modified.length - 10) + ' more');
        }
    }

    if (added.length > 0) {
        console.log('');
        console.log('  Added:');
        for (const f of added.slice(0, verbose ? 100 : 10)) {
            console.log('    + ' + f.file + ' (' + (f.size / 1024).toFixed(1) + ' KB)');
        }
        if (!verbose && added.length > 10) {
            console.log('    ... and ' + (added.length - 10) + ' more');
        }
    }

    if (removed.length > 0) {
        console.log('');
        console.log('  Removed:');
        for (const f of removed.slice(0, verbose ? 100 : 10)) {
            console.log('    - ' + f.file + ' (' + (f.size / 1024).toFixed(1) + ' KB)');
        }
        if (!verbose && removed.length > 10) {
            console.log('    ... and ' + (removed.length - 10) + ' more');
        }
    }
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════');

// Rating
if (unchanged.length / totalFiles >= 0.95) {
    console.log('  ✅ EXCELLENT: Highly stable build');
} else if (unchanged.length / totalFiles >= 0.90) {
    console.log('  ✅ GOOD: Stable build');
} else if (unchanged.length / totalFiles >= 0.70) {
    console.log('  ⚠️  FAIR: Some unnecessary rebuilds');
} else {
    console.log('  ❌ POOR: Many files changed - check for non-deterministic builds');
}
console.log('═══════════════════════════════════════════════════════════════');
"

# Save current manifest as previous for next comparison
cp "$CURRENT_MANIFEST" "$PREVIOUS_MANIFEST"
echo ""
echo -e "${GREEN}Manifest saved for future comparisons.${NC}"
