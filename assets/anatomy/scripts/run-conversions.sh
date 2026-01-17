#!/bin/bash
# Run all pending conversions
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SOURCES_DIR="$PROJECT_ROOT/assets/anatomy/sources"
PROCESSED_DIR="$PROJECT_ROOT/assets/anatomy/processed"

# Find Blender
if [ -x "/Applications/Blender.app/Contents/MacOS/Blender" ]; then
  BLENDER="/Applications/Blender.app/Contents/MacOS/Blender"
elif command -v blender &> /dev/null; then
  BLENDER=$(which blender)
else
  echo "Error: Blender not found. Please install Blender or update path."
  echo "  macOS: /Applications/Blender.app/Contents/MacOS/Blender"
  echo "  Linux: Install via package manager or snap"
  exit 1
fi

echo "Using Blender: $BLENDER"
echo "Sources directory: $SOURCES_DIR"
echo "Processed directory: $PROCESSED_DIR"
echo ""

# Function to determine asset type from directory structure or filename
get_asset_type() {
  local asset_id="$1"
  local raw_dir="$2"

  # Check for muscle-related keywords in asset_id
  if echo "$asset_id" | grep -qiE 'muscle|muscular|musculoskeletal|anatomy'; then
    echo "muscles"
  elif echo "$asset_id" | grep -qiE 'skeleton|bone|skull'; then
    echo "skeleton"
  else
    echo "body"
  fi
}

# Function to determine sex from asset_id
get_sex() {
  local asset_id="$1"

  if echo "$asset_id" | grep -qi 'female'; then
    echo "female"
  elif echo "$asset_id" | grep -qi 'both\|neutral'; then
    echo "neutral"
  else
    echo "male"
  fi
}

# Process each source asset
process_count=0
skip_count=0
error_count=0

for vendor_dir in "$SOURCES_DIR"/*/; do
  vendor=$(basename "$vendor_dir")
  echo "Processing vendor: $vendor"

  for asset_dir in "$vendor_dir"/*/; do
    asset_id=$(basename "$asset_dir")
    raw_dir="${asset_dir}raw"

    # Find input file (prefer BLEND, then GLTF/GLB, then FBX, then OBJ)
    input_file=""
    for ext in blend gltf glb fbx obj; do
      found=$(find "$raw_dir" -maxdepth 2 -type f -iname "*.$ext" 2>/dev/null | head -1)
      if [ -n "$found" ]; then
        input_file="$found"
        break
      fi
    done

    # Special case for Z-Anatomy: extract the zip first
    if [ -z "$input_file" ] && [ -f "${raw_dir}/Z-Anatomy.zip" ]; then
      echo "  Extracting Z-Anatomy.zip..."
      unzip -o -q "${raw_dir}/Z-Anatomy.zip" -d "${raw_dir}/extracted" 2>/dev/null || true
      input_file=$(find "${raw_dir}/extracted" -type f -name "*.blend" 2>/dev/null | head -1)
    fi

    if [ -z "$input_file" ]; then
      echo "  Warning: No convertible file found in $raw_dir"
      ((skip_count++))
      continue
    fi

    # Determine output path based on asset type and sex
    asset_type=$(get_asset_type "$asset_id" "$raw_dir")
    sex=$(get_sex "$asset_id")

    output_dir="${PROCESSED_DIR}/${sex}/${asset_type}/${asset_id}"
    mkdir -p "$output_dir"

    output_file="${output_dir}/model-high.glb"

    # Skip if already converted
    if [ -f "$output_file" ]; then
      echo "  Skipping (already exists): $asset_id"
      ((skip_count++))
      continue
    fi

    echo "  Converting: $input_file"
    echo "    -> $output_file"
    echo "    Type: $asset_type, Sex: $sex"

    # Determine if we should export muscles separately
    export_muscles_flag=""
    if [ "$asset_type" = "muscles" ]; then
      export_muscles_flag="--export-muscles"
    fi

    # Run Blender conversion
    if "$BLENDER" --background --python "${SCRIPT_DIR}/convert-to-glb.py" -- "$input_file" "$output_file" $export_muscles_flag 2>&1; then
      echo "  ✓ Converted: $asset_id"
      ((process_count++))
    else
      echo "  ✗ Error converting: $asset_id"
      ((error_count++))
    fi

    echo ""
  done
done

echo "============================================"
echo "Conversion Summary:"
echo "  Processed: $process_count"
echo "  Skipped:   $skip_count"
echo "  Errors:    $error_count"
echo "============================================"

if [ $error_count -gt 0 ]; then
  echo "Warning: Some conversions failed. Check logs above."
  exit 1
fi

echo "All conversions complete!"
