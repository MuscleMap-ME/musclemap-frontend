#!/bin/bash
# Apply Draco mesh compression and copy to public directory
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PROCESSED_DIR="$PROJECT_ROOT/assets/anatomy/processed"
PUBLIC_DIR="$PROJECT_ROOT/public/models/anatomy"

echo "Applying Draco compression and copying to public directory..."
echo "Processed: $PROCESSED_DIR"
echo "Public: $PUBLIC_DIR"

mkdir -p "$PUBLIC_DIR/bodies" "$PUBLIC_DIR/muscles" "$PUBLIC_DIR/textures"

for model in $(find "$PROCESSED_DIR" -name "*.glb"); do
  dir=$(dirname "$model")
  filename=$(basename "$model")
  asset_id=$(basename "$dir")

  # Determine the asset type from the path
  if echo "$dir" | grep -q "/body/"; then
    output_subdir="bodies"
  else
    output_subdir="muscles"
  fi

  # Determine LOD from filename
  lod=$(echo "$filename" | sed -E 's/model-(high|med|low)\.glb/\1/')

  output_path="${PUBLIC_DIR}/${output_subdir}/${asset_id}-model-${lod}.glb"

  echo ""
  echo "Processing: $model"
  echo "  -> $output_path"

  # Apply Draco compression
  gltf-transform draco "$model" "$output_path" \
    --method edgebreaker \
    --quantize-position 14 \
    --quantize-normal 10 \
    --quantize-texcoord 12 2>&1 || {
      echo "  Warning: Draco compression failed, copying without compression"
      cp "$model" "$output_path"
    }

  # Report compression
  original_size=$(du -h "$model" | cut -f1)
  compressed_size=$(du -h "$output_path" | cut -f1)
  echo "  Size: $original_size -> $compressed_size"
done

echo ""
echo "============================================"
echo "Public model files created:"
find "$PUBLIC_DIR" -name "*.glb" -exec ls -lh {} \; | awk '{print "  " $NF ": " $5}'
echo "============================================"
echo "Draco compression complete!"
