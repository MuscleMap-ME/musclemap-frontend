#!/bin/bash
set -e

# Build all WASM crates using wasm-pack
# Outputs to pkg/ directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Add cargo bin to PATH
export PATH="$HOME/.cargo/bin:$PATH"

echo "🦀 Building MuscleMap WASM modules..."

# Check for wasm-pack
if ! command -v wasm-pack &> /dev/null; then
    echo "❌ wasm-pack not found. Installing..."
    cargo install wasm-pack
fi

# Clean previous builds
rm -rf pkg

# Create pkg directory
mkdir -p pkg

# Build each crate
CRATES=(
    "geo"
    "tu"
    "rank"
    "ratelimit"
    "scoring"
    "load"
    "crypto"
)

for crate in "${CRATES[@]}"; do
    echo ""
    echo "📦 Building musclemap-${crate}..."

    cd "crates/${crate}"

    # Build with wasm-pack for web target
    wasm-pack build \
        --target web \
        --out-dir "../../pkg/musclemap_${crate}" \
        --release

    # Remove .gitignore that wasm-pack creates
    rm -f "../../pkg/musclemap_${crate}/.gitignore"

    cd "$PROJECT_DIR"

    echo "✅ musclemap-${crate} built successfully"
done

echo ""
echo "🎉 All WASM modules built successfully!"
echo ""
echo "Output directory: pkg/"
echo ""
ls -la pkg/

# Calculate total size
echo ""
echo "📊 Total WASM size:"
find pkg -name "*.wasm" -exec ls -lh {} \; | awk '{print $5, $NF}'
echo ""
TOTAL_SIZE=$(find pkg -name "*.wasm" -exec cat {} \; | wc -c)
echo "Total: $(echo "scale=2; $TOTAL_SIZE / 1024" | bc) KB"
