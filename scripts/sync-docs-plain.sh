#!/bin/bash
# Sync docs-plain to public directory for static serving
# This makes the plain-text documentation browsable at /docs-plain/

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

SOURCE_DIR="$PROJECT_ROOT/docs-plain"
TARGET_DIR="$PROJECT_ROOT/public/docs-plain"
INDEX_TEMPLATE="$PROJECT_ROOT/scripts/docs-plain-index.html"

echo "📚 Syncing plain-text documentation..."
echo "   Source: $SOURCE_DIR"
echo "   Target: $TARGET_DIR"

# Create target directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Sync files (excluding any hidden files, preserving index.html)
rsync -av --delete \
  --exclude='.*' \
  --exclude='index.html' \
  "$SOURCE_DIR/" "$TARGET_DIR/"

# Copy the index.html template if it exists
if [ -f "$INDEX_TEMPLATE" ]; then
  cp "$INDEX_TEMPLATE" "$TARGET_DIR/index.html"
  echo "   Copied index.html"
fi

# Count files synced
FILE_COUNT=$(find "$TARGET_DIR" -type f | wc -l | tr -d ' ')
echo ""
echo "✅ Synced $FILE_COUNT documentation files"
echo ""
echo "📖 Documentation will be available at:"
echo "   Local:      http://localhost:5173/docs-plain/"
echo "   Production: https://musclemap.me/docs-plain/"
