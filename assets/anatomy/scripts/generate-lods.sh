#!/bin/bash
# Generate LOD variants for all high-poly models
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PROCESSED_DIR="$PROJECT_ROOT/assets/anatomy/processed"

# Target triangle counts based on budget
HIGH_TARGET=100000
MED_TARGET=30000
LOW_TARGET=10000

# Calculate simplification ratio based on input triangle count
calculate_ratio() {
  local input_triangles=$1
  local target_triangles=$2
  if [ "$input_triangles" -le "$target_triangles" ]; then
    echo "1.0"
  else
    echo "scale=4; $target_triangles / $input_triangles" | bc
  fi
}

echo "Generating LODs..."
echo "Processed directory: $PROCESSED_DIR"

for high_model in $(find "$PROCESSED_DIR" -name "model-high.glb"); do
  dir=$(dirname "$high_model")
  asset_id=$(basename "$dir")
  info_file="${dir}/model-high.info.json"

  echo ""
  echo "Processing: $asset_id"

  # Get triangle count from info file
  if [ -f "$info_file" ]; then
    triangles=$(cat "$info_file" | grep total_triangles | grep -oE '[0-9]+' | head -1)
  else
    triangles=100000
  fi

  echo "  Input triangles: $triangles"

  # Skip if already has LODs
  if [ -f "${dir}/model-med.glb" ] && [ -f "${dir}/model-low.glb" ]; then
    echo "  Skipping (LODs exist)"
    continue
  fi

  # Calculate ratios
  med_ratio=$(calculate_ratio "$triangles" "$MED_TARGET")
  low_ratio=$(calculate_ratio "$triangles" "$LOW_TARGET")

  echo "  Medium ratio: $med_ratio (target: $MED_TARGET)"
  echo "  Low ratio: $low_ratio (target: $LOW_TARGET)"

  # Generate Medium LOD
  if [ ! -f "${dir}/model-med.glb" ]; then
    echo "  Generating medium LOD..."
    gltf-transform simplify "$high_model" "${dir}/model-med.glb" \
      --ratio "$med_ratio" \
      --error 0.001 \
      --lock-border 2>&1 || {
        echo "  Warning: Medium simplify failed, copying high as fallback"
        cp "$high_model" "${dir}/model-med.glb"
      }
  fi

  # Generate Low LOD
  if [ ! -f "${dir}/model-low.glb" ]; then
    echo "  Generating low LOD..."
    gltf-transform simplify "$high_model" "${dir}/model-low.glb" \
      --ratio "$low_ratio" \
      --error 0.01 2>&1 || {
        echo "  Warning: Low simplify failed, copying medium as fallback"
        cp "${dir}/model-med.glb" "${dir}/model-low.glb"
      }
  fi

  # Report sizes
  high_size=$(du -h "$high_model" | cut -f1)
  med_size=$(du -h "${dir}/model-med.glb" | cut -f1)
  low_size=$(du -h "${dir}/model-low.glb" | cut -f1)

  echo "  Sizes: High=$high_size, Med=$med_size, Low=$low_size"
  echo "  ✓ LODs generated for: $asset_id"
done

echo ""
echo "LOD generation complete!"
