#!/bin/bash
# Setup script to create symlinks from private submodule to main repo
# Run this after cloning the repository with submodules

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PRIVATE_DIR="$PROJECT_ROOT/private"

echo "Setting up private configuration..."

# Check if private directory exists
if [ ! -d "$PRIVATE_DIR" ]; then
    echo "ERROR: private/ directory not found."
    echo ""
    echo "To set up the private configuration:"
    echo "  1. Get access to the private repository"
    echo "  2. Run: git submodule add git@github.com:jeanpaulniko/musclemap-private.git private"
    echo "  3. Run this script again"
    echo ""
    echo "If you don't have access to the private repo, you can still use the public"
    echo "build scripts, but some features may be limited."
    exit 1
fi

# Function to create symlink safely
create_symlink() {
    local source="$1"
    local target="$2"

    if [ -e "$source" ]; then
        # Remove existing file/symlink at target
        if [ -e "$target" ] || [ -L "$target" ]; then
            rm -f "$target"
        fi

        # Create symlink
        ln -s "$source" "$target"
        echo "  ✓ Linked $(basename "$target")"
    else
        echo "  ⚠ Source not found: $source"
    fi
}

echo ""
echo "Creating symlinks..."

# Root level files
create_symlink "$PRIVATE_DIR/CLAUDE.md" "$PROJECT_ROOT/CLAUDE.md"
create_symlink "$PRIVATE_DIR/ecosystem.config.cjs" "$PROJECT_ROOT/ecosystem.config.cjs"

# Scripts
create_symlink "$PRIVATE_DIR/scripts/intelligent-cache.mjs" "$SCRIPT_DIR/intelligent-cache.mjs"
create_symlink "$PRIVATE_DIR/scripts/build-daemon.mjs" "$SCRIPT_DIR/build-daemon.mjs"
create_symlink "$PRIVATE_DIR/scripts/aggressive-cache.mjs" "$SCRIPT_DIR/aggressive-cache.mjs"
create_symlink "$PRIVATE_DIR/scripts/chunked-build.mjs" "$SCRIPT_DIR/chunked-build.mjs"
create_symlink "$PRIVATE_DIR/scripts/deploy.sh" "$SCRIPT_DIR/deploy.sh"
create_symlink "$PRIVATE_DIR/scripts/deploy-branch.sh" "$SCRIPT_DIR/deploy-branch.sh"
create_symlink "$PRIVATE_DIR/scripts/approved-commands.txt" "$SCRIPT_DIR/approved-commands.txt"
create_symlink "$PRIVATE_DIR/scripts/run-approved-command.sh" "$SCRIPT_DIR/run-approved-command.sh"
create_symlink "$PRIVATE_DIR/scripts/add-approved-command.sh" "$SCRIPT_DIR/add-approved-command.sh"

echo ""
echo "Private configuration setup complete!"
echo ""
echo "You can now use all build and deployment commands normally."
