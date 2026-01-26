#!/bin/bash
#
# Build BuildNet for all supported platforms
#
# Usage:
#   ./scripts/build-all-platforms.sh           # Build all platforms
#   ./scripts/build-all-platforms.sh macos     # Build for macOS only
#   ./scripts/build-all-platforms.sh linux     # Build for Linux only
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${PROJECT_DIR}/dist"

# Target architectures
MACOS_ARM64="aarch64-apple-darwin"
MACOS_X64="x86_64-apple-darwin"
LINUX_X64="x86_64-unknown-linux-gnu"
LINUX_ARM64="aarch64-unknown-linux-gnu"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           BuildNet Cross-Platform Build Script                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Function to build for a target
build_target() {
    local target="$1"
    local output_name="$2"

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Building for: $target"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    cd "$PROJECT_DIR"

    # Check if we need cross compilation
    if [[ "$target" == *"linux"* ]] && [[ "$(uname)" == "Darwin" ]]; then
        # Cross compile for Linux from macOS using cross
        if command -v cross &> /dev/null; then
            cross build --release --target "$target"
        else
            echo "⚠️  'cross' not installed. Installing..."
            cargo install cross --git https://github.com/cross-rs/cross
            cross build --release --target "$target"
        fi
    else
        # Native or rustup target
        rustup target add "$target" 2>/dev/null || true
        cargo build --release --target "$target"
    fi

    # Copy binary to output directory
    local binary_path="target/${target}/release/buildnetd"
    if [[ -f "$binary_path" ]]; then
        cp "$binary_path" "${OUTPUT_DIR}/${output_name}"
        echo "✓ Built: ${OUTPUT_DIR}/${output_name}"
        echo "  Size: $(du -h "${OUTPUT_DIR}/${output_name}" | cut -f1)"
    else
        echo "✗ Failed to find binary at $binary_path"
        return 1
    fi
}

# Parse arguments
BUILD_TARGET="${1:-all}"

case "$BUILD_TARGET" in
    macos|darwin)
        build_target "$MACOS_ARM64" "buildnetd-darwin-arm64"
        # Optionally build x64 for Intel Macs
        # build_target "$MACOS_X64" "buildnetd-darwin-x64"
        ;;
    linux)
        build_target "$LINUX_X64" "buildnetd-linux-x64"
        # Optionally build arm64 for ARM Linux
        # build_target "$LINUX_ARM64" "buildnetd-linux-arm64"
        ;;
    all)
        # Build for current platform first (fastest)
        if [[ "$(uname)" == "Darwin" ]]; then
            if [[ "$(uname -m)" == "arm64" ]]; then
                build_target "$MACOS_ARM64" "buildnetd-darwin-arm64"
            else
                build_target "$MACOS_X64" "buildnetd-darwin-x64"
            fi
        fi

        # Cross-compile for Linux
        echo ""
        echo "Cross-compiling for Linux..."
        build_target "$LINUX_X64" "buildnetd-linux-x64"
        ;;
    *)
        echo "Usage: $0 [macos|linux|all]"
        exit 1
        ;;
esac

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                     Build Complete                             ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Binaries available in: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR" 2>/dev/null || true
