# Claude Code Prompt: 3D Anatomy Asset Acquisition & Integration

> **IMPORTANT:** This is a comprehensive, multi-phase execution prompt. Execute each phase sequentially, stopping at designated review points to print summaries. Do not proceed to the next phase until the current phase is complete and validated.

---

## CONTEXT

You are working on the MuscleMap fitness application repository at `/Users/jeanpaulniko/Public/musclemap.me`. Your task is to discover, acquire, normalize, and integrate 3D anatomy assets into the application.

**Approved Parameters:**
- License policy: CC0 + CC-BY preferred; paid allowed up to $200 if necessary
- Rigging: Preferred (nice-to-have)
- Anatomy realism: Semi-realistic (fitness app aesthetic)
- Triangle budget: 100K high / 30K med / 10K low
- Texture budget: 2048×2048 max
- Muscle granularity: Individual muscles preferred; major groups acceptable as fallback
- Target platform: Web-only (React Native as stretch goal)

**Current Codebase State:**
- Three.js is installed (`three`, `@react-three/fiber`, `@react-three/drei`)
- No GLB/GLTF models exist yet - all 3D is procedural or SVG
- `muscleVisualizationStore` exists for visualization state
- `use3DMemoryManager` hook exists for memory optimization
- `Managed3DContainer` wrapper exists for memory-managed 3D
- Vite handles chunk splitting with `three-vendor` bundle

---

## PHASE 1: SETUP & CONFIGURATION

### Task 1.1: Create Directory Structure

Create the following directory structure:

```bash
mkdir -p assets/anatomy/{discovery,sources,processed/{male,female}/{body,muscles},manifests,manual-queue,config,scripts,validation}
mkdir -p public/models/anatomy/{bodies,muscles,textures}
mkdir -p src/lib/anatomy
mkdir -p src/pages/dev
mkdir -p src/components/anatomy
```

### Task 1.2: Create Configuration File

**Create file:** `assets/anatomy/config/anatomy-config.json`

```json
{
  "version": "1.0.0",
  "paths": {
    "discovery": "assets/anatomy/discovery",
    "sources": "assets/anatomy/sources",
    "processed": "assets/anatomy/processed",
    "manifests": "assets/anatomy/manifests",
    "manualQueue": "assets/anatomy/manual-queue",
    "publicModels": "public/models/anatomy",
    "scripts": "assets/anatomy/scripts"
  },
  "requirements": {
    "license": {
      "allowed": ["CC0-1.0", "CC-BY-4.0", "CC-BY-3.0", "CC-BY-SA-4.0", "MIT", "Apache-2.0", "Royalty-Free"],
      "preferred": ["CC0-1.0", "CC-BY-4.0"],
      "maxPaidBudget": 200
    },
    "quality": {
      "triangleBudget": {
        "high": 100000,
        "medium": 30000,
        "low": 10000
      },
      "textureMaxSize": 2048,
      "textureFormats": ["png", "jpg", "ktx2"],
      "modelFormat": "glb"
    },
    "muscles": {
      "minimumSeparateMeshes": 30,
      "fallbackMajorGroups": 12,
      "namingPattern": "^[a-z_]+_(L|R|C)?$"
    }
  },
  "targets": {
    "maleBody": { "required": true, "rigged": "preferred" },
    "femaleBody": { "required": true, "rigged": "preferred" },
    "maleMuscles": { "required": true, "separateMeshes": true },
    "femaleMuscles": { "required": false, "separateMeshes": true }
  }
}
```

### Task 1.3: Create Manifest Schema

**Create file:** `assets/anatomy/manifests/anatomy-assets.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Anatomy Assets Manifest",
  "type": "object",
  "required": ["version", "generated_at", "assets"],
  "properties": {
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "generated_at": { "type": "string", "format": "date-time" },
    "assets": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["id", "type", "sex", "files", "license"],
        "properties": {
          "id": { "type": "string" },
          "type": { "enum": ["body", "muscles", "skeleton"] },
          "sex": { "enum": ["male", "female", "neutral"] },
          "files": {
            "type": "object",
            "properties": {
              "high": { "type": "string" },
              "medium": { "type": "string" },
              "low": { "type": "string" }
            }
          },
          "metadata": {
            "type": "object",
            "properties": {
              "triangleCount": { "type": "object" },
              "rigged": { "type": "boolean" },
              "boneCount": { "type": "integer" },
              "meshCount": { "type": "integer" },
              "meshNames": { "type": "array", "items": { "type": "string" } },
              "textures": { "type": "array", "items": { "type": "string" } }
            }
          },
          "license": {
            "type": "object",
            "required": ["spdxId"],
            "properties": {
              "spdxId": { "type": "string" },
              "name": { "type": "string" },
              "url": { "type": "string" },
              "attribution": { "type": "string" },
              "attributionRequired": { "type": "boolean" }
            }
          },
          "source": {
            "type": "object",
            "properties": {
              "url": { "type": "string", "format": "uri" },
              "author": { "type": "string" },
              "authorUrl": { "type": "string", "format": "uri" }
            }
          },
          "validationStatus": { "enum": ["PASS", "WARN", "FAIL", "PENDING"] }
        }
      }
    },
    "defaults": {
      "type": "object",
      "properties": {
        "maleBody": { "type": "string" },
        "femaleBody": { "type": "string" },
        "maleMuscles": { "type": "string" },
        "femaleMuscles": { "type": "string" }
      }
    }
  }
}
```

### Task 1.4: Create Empty Manifest

**Create file:** `assets/anatomy/manifests/anatomy-assets.manifest.json`

```json
{
  "$schema": "./anatomy-assets.schema.json",
  "version": "1.0.0",
  "generated_at": "",
  "assets": {},
  "defaults": {
    "maleBody": null,
    "femaleBody": null,
    "maleMuscles": null,
    "femaleMuscles": null
  }
}
```

### Task 1.5: Create Manual Queue Template

**Create file:** `assets/anatomy/manual-queue/manual-queue.json`

```json
{
  "generated_at": "",
  "items": []
}
```

---

## ⏸️ STOP POINT 1: Setup Complete

Print the following summary:

```
═══════════════════════════════════════════════════════════════
PHASE 1 COMPLETE: Setup & Configuration
═══════════════════════════════════════════════════════════════

Directory Structure Created:
  ✓ assets/anatomy/discovery/
  ✓ assets/anatomy/sources/
  ✓ assets/anatomy/processed/male/{body,muscles}/
  ✓ assets/anatomy/processed/female/{body,muscles}/
  ✓ assets/anatomy/manifests/
  ✓ assets/anatomy/manual-queue/
  ✓ assets/anatomy/config/
  ✓ assets/anatomy/scripts/
  ✓ assets/anatomy/validation/
  ✓ public/models/anatomy/{bodies,muscles,textures}/
  ✓ src/lib/anatomy/
  ✓ src/pages/dev/
  ✓ src/components/anatomy/

Configuration Files Created:
  ✓ assets/anatomy/config/anatomy-config.json
  ✓ assets/anatomy/manifests/anatomy-assets.schema.json
  ✓ assets/anatomy/manifests/anatomy-assets.manifest.json
  ✓ assets/anatomy/manual-queue/manual-queue.json

Ready to proceed to Phase 2: Discovery
═══════════════════════════════════════════════════════════════
```

---

## PHASE 2: WEB DISCOVERY

### Task 2.1: Search for 3D Anatomy Assets

Use web search to find 3D anatomy assets. Search for each of these queries and compile results:

**Search Queries to Execute:**

1. `site:sketchfab.com "human anatomy" "CC0" OR "CC-BY" downloadable`
2. `site:sketchfab.com "muscle anatomy" 3D model free download`
3. `site:sketchfab.com "male body" anatomy 3D rigged`
4. `site:sketchfab.com "female body" anatomy 3D rigged`
5. `site:sketchfab.com "muscular system" separate muscles 3D`
6. `site:turbosquid.com human anatomy 3D model muscles`
7. `site:cgtrader.com anatomical model muscles individual`
8. `site:github.com 3D anatomy model GLB GLTF CC0`
9. `"3D human body" "individual muscles" "separate meshes" free`
10. `site:poly.pizza human body anatomy CC0`
11. `site:quaternius.com human body`
12. `"Zygote body" 3D model license`
13. `"visible human project" 3D model download license`
14. `site:free3d.com human anatomy muscles`
15. `"anatomography" 3D download`

For each promising result found, record:
- Source site
- Asset name
- URL
- License (verify on the page)
- Cost (Free / $X)
- Formats available
- Rigged (Y/N/Unknown)
- UV mapped (Y/N/Unknown)
- Separate muscles (Y/N/Partial/Unknown)
- Sex (Male/Female/Both)
- Notes
- Acquisition method (auto/manual-login/manual-purchase)
- Priority (1=must-have, 2=good, 3=backup)

### Task 2.2: Compile Discovery Results

**Create file:** `assets/anatomy/discovery/curated-sources.csv`

Format as CSV with headers:
```csv
source_site,asset_name,url,license,license_url,cost,formats,rigged,uv_mapped,separate_muscles,sex,triangle_count,texture_resolution,acquisition_method,notes,priority
```

### Task 2.3: Create Search Log

**Create file:** `assets/anatomy/discovery/search-log.md`

Document:
- Each search query executed
- Number of results reviewed
- Date/time of search
- Key findings and observations
- Challenges encountered (e.g., license ambiguity)

---

## ⏸️ STOP POINT 2: Discovery Complete

Print the following summary table:

```
═══════════════════════════════════════════════════════════════
PHASE 2 COMPLETE: Web Discovery
═══════════════════════════════════════════════════════════════

DISCOVERED ASSETS SUMMARY:

┌─────────────────────────────────────────────────────────────┐
│ MALE BODY CANDIDATES                                        │
├─────────────────────────────────────────────────────────────┤
│ # │ Asset Name          │ License  │ Rigged │ Cost   │ Pri │
├───┼─────────────────────┼──────────┼────────┼────────┼─────┤
│ 1 │ [name]              │ [lic]    │ Y/N    │ Free/$ │ 1-3 │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ FEMALE BODY CANDIDATES                                      │
├─────────────────────────────────────────────────────────────┤
│ # │ Asset Name          │ License  │ Rigged │ Cost   │ Pri │
├───┼─────────────────────┼──────────┼────────┼────────┼─────┤
│ 1 │ [name]              │ [lic]    │ Y/N    │ Free/$ │ 1-3 │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ MUSCLE SYSTEM CANDIDATES (Separate Meshes)                  │
├─────────────────────────────────────────────────────────────┤
│ # │ Asset Name          │ License  │ Meshes │ Cost   │ Pri │
├───┼─────────────────────┼──────────┼────────┼────────┼─────┤
│ 1 │ [name]              │ [lic]    │ #      │ Free/$ │ 1-3 │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘

ACQUISITION BREAKDOWN:
  Auto-downloadable: X assets
  Manual (login required): X assets
  Manual (purchase required): X assets

MINIMUM VIABLE SET STATUS:
  ☑/☐ Male body: [status]
  ☑/☐ Female body: [status]
  ☑/☐ Muscle system: [status]

Full results saved to: assets/anatomy/discovery/curated-sources.csv
Search log saved to: assets/anatomy/discovery/search-log.md

Ready to proceed to Phase 3: Acquisition
═══════════════════════════════════════════════════════════════
```

---

## PHASE 3: ASSET ACQUISITION

### Task 3.1: Create Download Script

**Create file:** `assets/anatomy/scripts/download-asset.sh`

```bash
#!/bin/bash
# Download and verify a single asset
# Usage: ./download-asset.sh <url> <vendor> <asset_id> <expected_checksum>

set -e

URL="$1"
VENDOR="$2"
ASSET_ID="$3"
EXPECTED_CHECKSUM="$4"

BASE_DIR="assets/anatomy/sources/${VENDOR}/${ASSET_ID}"
RAW_DIR="${BASE_DIR}/raw"
LICENSE_DIR="${BASE_DIR}/license"

mkdir -p "$RAW_DIR" "$LICENSE_DIR"

echo "Downloading: $URL"
echo "Destination: $RAW_DIR"

# Download with retry
for i in 1 2 3; do
  if curl -L -o "${RAW_DIR}/download.zip" "$URL"; then
    break
  fi
  echo "Retry $i..."
  sleep 5
done

# Calculate checksum
ACTUAL_CHECKSUM=$(sha256sum "${RAW_DIR}/download.zip" | cut -d' ' -f1)
echo "SHA256: $ACTUAL_CHECKSUM"

# Extract if zip
if file "${RAW_DIR}/download.zip" | grep -q "Zip archive"; then
  unzip -o "${RAW_DIR}/download.zip" -d "$RAW_DIR"
  rm "${RAW_DIR}/download.zip"
fi

# Create provenance stub
cat > "${LICENSE_DIR}/provenance.json" << EOF
{
  "asset_id": "${ASSET_ID}",
  "source_url": "${URL}",
  "download_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "checksums": {
    "sha256": "${ACTUAL_CHECKSUM}"
  },
  "license": {
    "spdx_id": "PENDING",
    "attribution_required": null
  }
}
EOF

echo "Download complete: $BASE_DIR"
```

Make executable: `chmod +x assets/anatomy/scripts/download-asset.sh`

### Task 3.2: Download Auto-Acquirable Assets

For each asset in `curated-sources.csv` where `acquisition_method=auto`:

1. Execute download script
2. Verify download completed
3. Update provenance.json with correct license info from the source page
4. Copy license text to LICENSE.txt
5. Create original-filenames.json mapping

### Task 3.3: Generate Manual Queue

For assets requiring manual intervention:

**Update file:** `assets/anatomy/manual-queue/manual-queue.json`

```json
{
  "generated_at": "[timestamp]",
  "items": [
    {
      "asset_id": "[vendor]_[slug]_[sex]_[type]_v1",
      "source_url": "[url]",
      "reason": "requires_purchase|requires_login|requires_account",
      "cost": "Free|$X.XX",
      "license": "[license name]",
      "formats_to_download": ["FBX", "GLB"],
      "instructions": [
        "1. Visit [url]",
        "2. [Create account / Log in / Purchase]",
        "3. Download [format] format",
        "4. Extract to assets/anatomy/sources/[vendor]/[asset_id]/raw/",
        "5. Save license/receipt to assets/anatomy/sources/[vendor]/[asset_id]/license/",
        "6. Run: pnpm anatomy:register-manual [asset_id]"
      ],
      "priority": 1,
      "notes": "[why this asset is important]"
    }
  ]
}
```

---

## ⏸️ STOP POINT 3: Acquisition Complete

Print the following summary:

```
═══════════════════════════════════════════════════════════════
PHASE 3 COMPLETE: Asset Acquisition
═══════════════════════════════════════════════════════════════

DOWNLOADED ASSETS:
┌─────────────────────────────────────────────────────────────┐
│ Asset ID                    │ Size    │ Format │ Checksum  │
├─────────────────────────────┼─────────┼────────┼───────────┤
│ [asset_id]                  │ XX MB   │ FBX    │ abc123... │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘

PROVENANCE RECORDED:
  ✓ [asset_id]: [license] by [author]
  ✓ ...

MANUAL QUEUE ([X] items):
  ⚠ [asset_id]: [reason] - [instructions summary]
  ⚠ ...

FILES CREATED:
  assets/anatomy/sources/[vendor]/[asset_id]/raw/
  assets/anatomy/sources/[vendor]/[asset_id]/license/provenance.json
  assets/anatomy/sources/[vendor]/[asset_id]/license/LICENSE.txt
  assets/anatomy/manual-queue/manual-queue.json

Ready to proceed to Phase 4: Conversion
═══════════════════════════════════════════════════════════════
```

---

## PHASE 4: CONVERSION & NORMALIZATION

### Task 4.1: Create Blender Conversion Script

**Create file:** `assets/anatomy/scripts/convert-to-glb.py`

```python
#!/usr/bin/env python3
"""
Blender headless script to convert FBX/OBJ/BLEND to GLB
Usage: blender --background --python convert-to-glb.py -- <input_path> <output_path> [options]
"""

import bpy
import sys
import os
import json
import mathutils

def clear_scene():
    """Remove all objects from scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def import_model(filepath):
    """Import model based on file extension"""
    ext = os.path.splitext(filepath)[1].lower()

    if ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath=filepath)
    elif ext == '.obj':
        bpy.ops.wm.obj_import(filepath=filepath)
    elif ext in ['.gltf', '.glb']:
        bpy.ops.import_scene.gltf(filepath=filepath)
    elif ext == '.blend':
        with bpy.data.libraries.load(filepath) as (data_from, data_to):
            data_to.objects = data_from.objects
        for obj in data_to.objects:
            bpy.context.collection.objects.link(obj)
    else:
        raise ValueError(f"Unsupported format: {ext}")

def normalize_transforms():
    """Apply all transforms and normalize"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def fix_normals():
    """Recalculate normals for all meshes"""
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.mesh.normals_make_consistent(inside=False)
            bpy.ops.object.mode_set(mode='OBJECT')

def get_mesh_info():
    """Collect mesh information for validation"""
    info = {
        'mesh_count': 0,
        'mesh_names': [],
        'total_triangles': 0,
        'has_uvs': True,
        'has_armature': False,
        'bone_count': 0
    }

    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            info['mesh_count'] += 1
            info['mesh_names'].append(obj.name)

            # Count triangles
            mesh = obj.data
            mesh.calc_loop_triangles()
            info['total_triangles'] += len(mesh.loop_triangles)

            # Check UVs
            if not mesh.uv_layers:
                info['has_uvs'] = False

        elif obj.type == 'ARMATURE':
            info['has_armature'] = True
            info['bone_count'] = len(obj.data.bones)

    return info

def export_glb(output_path, use_draco=False):
    """Export scene to GLB"""
    export_settings = {
        'filepath': output_path,
        'export_format': 'GLB',
        'export_texcoords': True,
        'export_normals': True,
        'export_materials': 'EXPORT',
        'export_colors': True,
        'export_cameras': False,
        'export_lights': False,
        'export_animations': True,
        'export_skins': True,
    }

    if use_draco:
        export_settings['export_draco_mesh_compression_enable'] = True
        export_settings['export_draco_mesh_compression_level'] = 6

    bpy.ops.export_scene.gltf(**export_settings)

def main():
    # Parse arguments after '--'
    argv = sys.argv
    if '--' in argv:
        argv = argv[argv.index('--') + 1:]
    else:
        argv = []

    if len(argv) < 2:
        print("Usage: blender --background --python convert-to-glb.py -- <input> <output> [--draco]")
        sys.exit(1)

    input_path = argv[0]
    output_path = argv[1]
    use_draco = '--draco' in argv

    print(f"Converting: {input_path}")
    print(f"Output: {output_path}")

    clear_scene()
    import_model(input_path)
    normalize_transforms()
    fix_normals()

    info = get_mesh_info()
    print(f"Mesh info: {json.dumps(info, indent=2)}")

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    export_glb(output_path, use_draco)

    # Write info file
    info_path = output_path.replace('.glb', '.info.json')
    with open(info_path, 'w') as f:
        json.dump(info, f, indent=2)

    print(f"Conversion complete: {output_path}")

if __name__ == '__main__':
    main()
```

### Task 4.2: Create Conversion Runner Script

**Create file:** `assets/anatomy/scripts/run-conversions.sh`

```bash
#!/bin/bash
# Run all pending conversions
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCES_DIR="assets/anatomy/sources"
PROCESSED_DIR="assets/anatomy/processed"

# Find Blender
BLENDER=$(which blender || echo "/Applications/Blender.app/Contents/MacOS/Blender")

if [ ! -x "$BLENDER" ]; then
  echo "Error: Blender not found. Please install Blender or update path."
  exit 1
fi

echo "Using Blender: $BLENDER"

# Process each source asset
for vendor_dir in "$SOURCES_DIR"/*/; do
  vendor=$(basename "$vendor_dir")

  for asset_dir in "$vendor_dir"/*/; do
    asset_id=$(basename "$asset_dir")
    raw_dir="${asset_dir}raw"

    # Find input file
    input_file=$(find "$raw_dir" -type f \( -name "*.fbx" -o -name "*.obj" -o -name "*.blend" -o -name "*.gltf" -o -name "*.glb" \) | head -1)

    if [ -z "$input_file" ]; then
      echo "Warning: No convertible file found in $raw_dir"
      continue
    fi

    # Determine output path based on asset_id naming convention
    # Expected format: vendor_name_sex_type_v1
    sex=$(echo "$asset_id" | grep -oE '(male|female)' | head -1 || echo "neutral")
    type=$(echo "$asset_id" | grep -oE '(body|muscles|skeleton)' | head -1 || echo "body")

    output_dir="${PROCESSED_DIR}/${sex}/${type}/${asset_id}"
    mkdir -p "$output_dir"

    output_file="${output_dir}/model-high.glb"

    echo "Converting: $input_file -> $output_file"

    "$BLENDER" --background --python "${SCRIPT_DIR}/convert-to-glb.py" -- "$input_file" "$output_file"

    echo "✓ Converted: $asset_id"
  done
done

echo "All conversions complete!"
```

Make executable: `chmod +x assets/anatomy/scripts/run-conversions.sh`

### Task 4.3: Run Conversions

Execute: `./assets/anatomy/scripts/run-conversions.sh`

### Task 4.4: Verify Conversions

For each converted GLB:
1. Check file exists and has reasonable size
2. Verify .info.json was created
3. Log any conversion warnings/errors

---

## ⏸️ STOP POINT 4: Conversion Complete

Print the following summary:

```
═══════════════════════════════════════════════════════════════
PHASE 4 COMPLETE: Conversion & Normalization
═══════════════════════════════════════════════════════════════

CONVERSION RESULTS:
┌─────────────────────────────────────────────────────────────┐
│ Asset ID              │ Status │ Triangles │ Meshes │ Rigged│
├───────────────────────┼────────┼───────────┼────────┼───────┤
│ [asset_id]            │ ✓/✗    │ XXXXX     │ XX     │ Y/N   │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘

OUTPUT FILES:
  assets/anatomy/processed/male/body/[asset_id]/model-high.glb
  assets/anatomy/processed/male/body/[asset_id]/model-high.info.json
  ...

CONVERSION WARNINGS:
  ⚠ [asset_id]: [warning message]
  ...

CONVERSION ERRORS:
  ✗ [asset_id]: [error message]
  ...

Ready to proceed to Phase 5: Optimization
═══════════════════════════════════════════════════════════════
```

---

## PHASE 5: OPTIMIZATION

### Task 5.1: Install Optimization Tools

```bash
# Install gltf-transform CLI
npm install -g @gltf-transform/cli

# Install texture tools (if not present)
# For KTX2: npm install -g toktx (or use basisu)
```

### Task 5.2: Create LOD Generation Script

**Create file:** `assets/anatomy/scripts/generate-lods.sh`

```bash
#!/bin/bash
# Generate LOD variants for all high-poly models
set -e

PROCESSED_DIR="assets/anatomy/processed"

# LOD ratios
MED_RATIO=0.30
LOW_RATIO=0.10

for high_model in $(find "$PROCESSED_DIR" -name "model-high.glb"); do
  dir=$(dirname "$high_model")
  asset_id=$(basename "$dir")

  echo "Generating LODs for: $asset_id"

  # Medium LOD
  gltf-transform simplify "$high_model" "${dir}/model-med.glb" \
    --ratio "$MED_RATIO" \
    --error 0.001

  # Low LOD
  gltf-transform simplify "$high_model" "${dir}/model-low.glb" \
    --ratio "$LOW_RATIO" \
    --error 0.01

  echo "✓ LODs generated for: $asset_id"
done

echo "LOD generation complete!"
```

Make executable: `chmod +x assets/anatomy/scripts/generate-lods.sh`

### Task 5.3: Create Texture Compression Script

**Create file:** `assets/anatomy/scripts/compress-textures.sh`

```bash
#!/bin/bash
# Compress textures to KTX2 format
set -e

PROCESSED_DIR="assets/anatomy/processed"

for model_dir in $(find "$PROCESSED_DIR" -type d -name "*_v*"); do
  echo "Processing textures in: $model_dir"

  # Extract and compress textures using gltf-transform
  for glb in "$model_dir"/*.glb; do
    if [ -f "$glb" ]; then
      echo "Compressing textures in: $glb"

      # Resize textures to max 2048 and convert to KTX2
      gltf-transform resize "$glb" "$glb" --width 2048 --height 2048

      # Apply texture compression (basis universal)
      gltf-transform ktx "$glb" "$glb" \
        --slots "baseColor,normal,metallicRoughness,occlusion,emissive" \
        --compression uastc
    fi
  done
done

echo "Texture compression complete!"
```

Make executable: `chmod +x assets/anatomy/scripts/compress-textures.sh`

### Task 5.4: Create Draco Compression Script

**Create file:** `assets/anatomy/scripts/apply-draco.sh`

```bash
#!/bin/bash
# Apply Draco mesh compression to all GLB files
set -e

PROCESSED_DIR="assets/anatomy/processed"
PUBLIC_DIR="public/models/anatomy"

mkdir -p "$PUBLIC_DIR/bodies" "$PUBLIC_DIR/muscles"

for model in $(find "$PROCESSED_DIR" -name "*.glb"); do
  dir=$(dirname "$model")
  filename=$(basename "$model")
  asset_id=$(basename "$dir")

  # Determine output subdirectory
  if echo "$dir" | grep -q "/body/"; then
    output_subdir="bodies"
  else
    output_subdir="muscles"
  fi

  output_path="${PUBLIC_DIR}/${output_subdir}/${asset_id}-${filename}"

  echo "Compressing: $model -> $output_path"

  gltf-transform draco "$model" "$output_path" \
    --quantize-position 14 \
    --quantize-normal 10 \
    --quantize-texcoord 12

  echo "✓ Draco applied: $output_path"
done

echo "Draco compression complete!"
```

Make executable: `chmod +x assets/anatomy/scripts/apply-draco.sh`

### Task 5.5: Run Optimization Pipeline

```bash
./assets/anatomy/scripts/generate-lods.sh
./assets/anatomy/scripts/compress-textures.sh
./assets/anatomy/scripts/apply-draco.sh
```

---

## ⏸️ STOP POINT 5: Optimization Complete

Print the following summary:

```
═══════════════════════════════════════════════════════════════
PHASE 5 COMPLETE: Optimization
═══════════════════════════════════════════════════════════════

LOD GENERATION RESULTS:
┌─────────────────────────────────────────────────────────────┐
│ Asset ID              │ High     │ Medium   │ Low      │
├───────────────────────┼──────────┼──────────┼──────────┤
│ [asset_id]            │ XXX KB   │ XXX KB   │ XXX KB   │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘

TEXTURE COMPRESSION:
  Original total: XX MB
  Compressed total: XX MB
  Savings: XX%

DRACO COMPRESSION:
  Pre-Draco total: XX MB
  Post-Draco total: XX MB
  Savings: XX%

PUBLIC MODEL FILES:
  public/models/anatomy/bodies/
    [asset_id]-model-high.glb (XXX KB)
    [asset_id]-model-med.glb (XXX KB)
    [asset_id]-model-low.glb (XXX KB)
  public/models/anatomy/muscles/
    ...

PERFORMANCE BUDGET CHECK:
  ☑/☐ High LOD ≤100K triangles: [status]
  ☑/☐ Medium LOD ≤30K triangles: [status]
  ☑/☐ Low LOD ≤10K triangles: [status]
  ☑/☐ High LOD file ≤20MB: [status]

Ready to proceed to Phase 6: Validation
═══════════════════════════════════════════════════════════════
```

---

## PHASE 6: VALIDATION

### Task 6.1: Create Validation Script

**Create file:** `assets/anatomy/scripts/validate-assets.ts`

```typescript
#!/usr/bin/env npx tsx
/**
 * Validate all processed anatomy assets
 * Run: npx tsx assets/anatomy/scripts/validate-assets.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  asset_id: string;
  validated_at: string;
  lods_validated: string[];
  results: Record<string, LODValidation>;
  overall_status: 'PASS' | 'WARN' | 'FAIL';
  manual_review_required: boolean;
}

interface LODValidation {
  gltf_valid: boolean;
  file_size_bytes: number;
  triangle_count: number;
  triangle_budget_met: boolean;
  mesh_count: number;
  mesh_names: string[];
  has_uvs: boolean;
  has_armature: boolean;
  bone_count: number;
  texture_count: number;
  errors: string[];
  warnings: string[];
}

const TRIANGLE_BUDGETS = {
  high: 100000,
  med: 30000,
  low: 10000,
};

const PROCESSED_DIR = 'assets/anatomy/processed';
const VALIDATION_DIR = 'assets/anatomy/validation';

function validateGLTF(filepath: string): { valid: boolean; errors: string[] } {
  try {
    const result = execSync(`gltf-transform validate "${filepath}" 2>&1`, {
      encoding: 'utf-8',
    });
    return { valid: !result.includes('ERROR'), errors: [] };
  } catch (e: any) {
    return { valid: false, errors: [e.message] };
  }
}

function inspectGLTF(filepath: string): any {
  try {
    const result = execSync(`gltf-transform inspect "${filepath}" --format json 2>&1`, {
      encoding: 'utf-8',
    });
    return JSON.parse(result);
  } catch {
    return null;
  }
}

function validateAsset(assetDir: string): ValidationResult {
  const asset_id = path.basename(assetDir);
  const result: ValidationResult = {
    asset_id,
    validated_at: new Date().toISOString(),
    lods_validated: [],
    results: {},
    overall_status: 'PASS',
    manual_review_required: false,
  };

  const lods = ['high', 'med', 'low'];

  for (const lod of lods) {
    const glbPath = path.join(assetDir, `model-${lod}.glb`);

    if (!fs.existsSync(glbPath)) {
      console.log(`  Skipping ${lod} LOD (not found)`);
      continue;
    }

    result.lods_validated.push(lod);

    const stats = fs.statSync(glbPath);
    const gltfValidation = validateGLTF(glbPath);
    const inspection = inspectGLTF(glbPath);

    // Read info.json if available
    const infoPath = glbPath.replace('.glb', '.info.json');
    let info: any = {};
    if (fs.existsSync(infoPath)) {
      info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
    }

    const lodResult: LODValidation = {
      gltf_valid: gltfValidation.valid,
      file_size_bytes: stats.size,
      triangle_count: info.total_triangles || inspection?.meshes?.primitives?.triangles || 0,
      triangle_budget_met: (info.total_triangles || 0) <= TRIANGLE_BUDGETS[lod as keyof typeof TRIANGLE_BUDGETS],
      mesh_count: info.mesh_count || inspection?.meshes?.count || 0,
      mesh_names: info.mesh_names || [],
      has_uvs: info.has_uvs ?? true,
      has_armature: info.has_armature ?? false,
      bone_count: info.bone_count || 0,
      texture_count: inspection?.textures?.count || 0,
      errors: gltfValidation.errors,
      warnings: [],
    };

    // Check warnings
    if (!lodResult.triangle_budget_met) {
      lodResult.warnings.push(`Triangle count ${lodResult.triangle_count} exceeds budget ${TRIANGLE_BUDGETS[lod as keyof typeof TRIANGLE_BUDGETS]}`);
    }
    if (!lodResult.has_uvs) {
      lodResult.warnings.push('Missing UV coordinates');
    }
    if (lodResult.mesh_count < 30 && assetDir.includes('muscles')) {
      lodResult.warnings.push(`Only ${lodResult.mesh_count} meshes (expected 30+ for muscle model)`);
    }

    result.results[lod] = lodResult;

    // Update overall status
    if (!lodResult.gltf_valid) {
      result.overall_status = 'FAIL';
    } else if (lodResult.warnings.length > 0 && result.overall_status !== 'FAIL') {
      result.overall_status = 'WARN';
      result.manual_review_required = true;
    }
  }

  return result;
}

async function main() {
  console.log('Validating anatomy assets...\n');

  fs.mkdirSync(VALIDATION_DIR, { recursive: true });

  const allResults: ValidationResult[] = [];

  // Find all asset directories
  for (const sex of ['male', 'female']) {
    for (const type of ['body', 'muscles']) {
      const typeDir = path.join(PROCESSED_DIR, sex, type);
      if (!fs.existsSync(typeDir)) continue;

      for (const assetDir of fs.readdirSync(typeDir)) {
        const fullPath = path.join(typeDir, assetDir);
        if (!fs.statSync(fullPath).isDirectory()) continue;

        console.log(`Validating: ${assetDir}`);
        const result = validateAsset(fullPath);
        allResults.push(result);

        // Write individual report
        const reportPath = path.join(fullPath, 'validation-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
        console.log(`  Status: ${result.overall_status}`);
      }
    }
  }

  // Write summary report
  const summaryPath = path.join(VALIDATION_DIR, 'validation-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    total_assets: allResults.length,
    passed: allResults.filter(r => r.overall_status === 'PASS').length,
    warnings: allResults.filter(r => r.overall_status === 'WARN').length,
    failed: allResults.filter(r => r.overall_status === 'FAIL').length,
    results: allResults,
  }, null, 2));

  console.log(`\nValidation complete. Summary: ${summaryPath}`);
}

main().catch(console.error);
```

### Task 6.2: Run Validation

```bash
npx tsx assets/anatomy/scripts/validate-assets.ts
```

---

## ⏸️ STOP POINT 6: Validation Complete

Print the following summary:

```
═══════════════════════════════════════════════════════════════
PHASE 6 COMPLETE: Validation
═══════════════════════════════════════════════════════════════

VALIDATION RESULTS:
┌─────────────────────────────────────────────────────────────┐
│ Asset ID              │ Status │ Triangles │ Meshes │ Issues│
├───────────────────────┼────────┼───────────┼────────┼───────┤
│ [asset_id]            │ PASS   │ XXXXX     │ XX     │ 0     │
│ [asset_id]            │ WARN   │ XXXXX     │ XX     │ 2     │
│ [asset_id]            │ FAIL   │ -         │ -      │ 1     │
└─────────────────────────────────────────────────────────────┘

SUMMARY:
  Total assets: X
  Passed: X
  Warnings: X
  Failed: X

ISSUES REQUIRING ATTENTION:
  ⚠ [asset_id]: [warning/error message]
  ...

VALIDATION REPORTS:
  assets/anatomy/processed/[sex]/[type]/[asset_id]/validation-report.json
  assets/anatomy/validation/validation-summary.json

Ready to proceed to Phase 7: Manifest Generation
═══════════════════════════════════════════════════════════════
```

---

## PHASE 7: MANIFEST GENERATION

### Task 7.1: Create Manifest Generator Script

**Create file:** `assets/anatomy/scripts/generate-manifest.ts`

```typescript
#!/usr/bin/env npx tsx
/**
 * Generate the anatomy assets manifest
 * Run: npx tsx assets/anatomy/scripts/generate-manifest.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const PROCESSED_DIR = 'assets/anatomy/processed';
const SOURCES_DIR = 'assets/anatomy/sources';
const MANIFEST_PATH = 'assets/anatomy/manifests/anatomy-assets.manifest.json';
const PUBLIC_MODELS_PATH = 'public/models/anatomy';

interface AssetEntry {
  id: string;
  type: 'body' | 'muscles' | 'skeleton';
  sex: 'male' | 'female' | 'neutral';
  files: {
    high?: string;
    medium?: string;
    low?: string;
  };
  metadata: {
    triangleCount: Record<string, number>;
    rigged: boolean;
    boneCount: number;
    meshCount: number;
    meshNames: string[];
    textures: string[];
  };
  license: {
    spdxId: string;
    name?: string;
    url?: string;
    attribution?: string;
    attributionRequired: boolean;
  };
  source: {
    url: string;
    author?: string;
    authorUrl?: string;
  };
  validationStatus: 'PASS' | 'WARN' | 'FAIL' | 'PENDING';
}

function getPublicPath(assetId: string, lod: string, type: string): string {
  const subdir = type === 'body' ? 'bodies' : 'muscles';
  return `/models/anatomy/${subdir}/${assetId}-model-${lod}.glb`;
}

function loadProvenance(vendor: string, assetId: string): any {
  const provenancePath = path.join(SOURCES_DIR, vendor, assetId, 'license', 'provenance.json');
  if (fs.existsSync(provenancePath)) {
    return JSON.parse(fs.readFileSync(provenancePath, 'utf-8'));
  }
  return null;
}

function loadValidationReport(assetDir: string): any {
  const reportPath = path.join(assetDir, 'validation-report.json');
  if (fs.existsSync(reportPath)) {
    return JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  }
  return null;
}

function loadInfo(assetDir: string, lod: string): any {
  const infoPath = path.join(assetDir, `model-${lod}.info.json`);
  if (fs.existsSync(infoPath)) {
    return JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
  }
  return null;
}

async function main() {
  const manifest = {
    $schema: './anatomy-assets.schema.json',
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    assets: {} as Record<string, AssetEntry>,
    defaults: {
      maleBody: null as string | null,
      femaleBody: null as string | null,
      maleMuscles: null as string | null,
      femaleMuscles: null as string | null,
    },
  };

  // Scan processed directory
  for (const sex of ['male', 'female'] as const) {
    for (const type of ['body', 'muscles'] as const) {
      const typeDir = path.join(PROCESSED_DIR, sex, type);
      if (!fs.existsSync(typeDir)) continue;

      for (const assetId of fs.readdirSync(typeDir)) {
        const assetDir = path.join(typeDir, assetId);
        if (!fs.statSync(assetDir).isDirectory()) continue;

        // Extract vendor from asset_id (first part before underscore)
        const vendor = assetId.split('_')[0];
        const provenance = loadProvenance(vendor, assetId);
        const validation = loadValidationReport(assetDir);
        const highInfo = loadInfo(assetDir, 'high');
        const medInfo = loadInfo(assetDir, 'med');
        const lowInfo = loadInfo(assetDir, 'low');

        // Build files object
        const files: AssetEntry['files'] = {};
        for (const lod of ['high', 'med', 'low']) {
          const glbPath = path.join(PUBLIC_MODELS_PATH, type === 'body' ? 'bodies' : 'muscles', `${assetId}-model-${lod}.glb`);
          if (fs.existsSync(glbPath)) {
            files[lod as keyof typeof files] = getPublicPath(assetId, lod, type);
          }
        }

        const entry: AssetEntry = {
          id: assetId,
          type,
          sex,
          files,
          metadata: {
            triangleCount: {
              high: highInfo?.total_triangles || 0,
              medium: medInfo?.total_triangles || 0,
              low: lowInfo?.total_triangles || 0,
            },
            rigged: highInfo?.has_armature || false,
            boneCount: highInfo?.bone_count || 0,
            meshCount: highInfo?.mesh_count || 0,
            meshNames: highInfo?.mesh_names || [],
            textures: [], // Would need to extract from GLB
          },
          license: {
            spdxId: provenance?.license?.spdx_id || 'UNKNOWN',
            name: provenance?.license?.name,
            url: provenance?.license?.url,
            attribution: provenance?.license?.attribution_text,
            attributionRequired: provenance?.license?.attribution_required || false,
          },
          source: {
            url: provenance?.source_url || '',
            author: provenance?.author?.name,
            authorUrl: provenance?.author?.profile_url,
          },
          validationStatus: validation?.overall_status || 'PENDING',
        };

        // Generate a readable key
        const key = `${sex}_${type}_${assetId.split('_').slice(1, -2).join('_')}`;
        manifest.assets[key] = entry;

        // Set defaults (first passing asset of each type)
        const defaultKey = `${sex}${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof manifest.defaults;
        if (!manifest.defaults[defaultKey] && entry.validationStatus !== 'FAIL') {
          manifest.defaults[defaultKey] = key;
        }
      }
    }
  }

  // Write manifest
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(`Manifest generated: ${MANIFEST_PATH}`);
  console.log(`Total assets: ${Object.keys(manifest.assets).length}`);
  console.log(`Defaults set: ${JSON.stringify(manifest.defaults, null, 2)}`);
}

main().catch(console.error);
```

### Task 7.2: Generate Manifest

```bash
npx tsx assets/anatomy/scripts/generate-manifest.ts
```

---

## ⏸️ STOP POINT 7: Manifest Generated

Print manifest excerpt:

```
═══════════════════════════════════════════════════════════════
PHASE 7 COMPLETE: Manifest Generation
═══════════════════════════════════════════════════════════════

MANIFEST EXCERPT:
{
  "version": "1.0.0",
  "generated_at": "[timestamp]",
  "assets": {
    "male_body_[name]": {
      "id": "[full_asset_id]",
      "type": "body",
      "sex": "male",
      "files": {
        "high": "/models/anatomy/bodies/[id]-model-high.glb",
        "medium": "/models/anatomy/bodies/[id]-model-med.glb",
        "low": "/models/anatomy/bodies/[id]-model-low.glb"
      },
      "metadata": { ... },
      "license": {
        "spdxId": "CC-BY-4.0",
        "attribution": "[attribution text]"
      },
      "validationStatus": "PASS"
    },
    ...
  },
  "defaults": {
    "maleBody": "male_body_[name]",
    "femaleBody": "female_body_[name]",
    "maleMuscles": "male_muscles_[name]",
    "femaleMuscles": null
  }
}

Full manifest: assets/anatomy/manifests/anatomy-assets.manifest.json

Ready to proceed to Phase 8: Code Integration
═══════════════════════════════════════════════════════════════
```

---

## PHASE 8: CODEBASE INTEGRATION

### Task 8.1: Create Type Definitions

**Create file:** `src/lib/anatomy/types.ts`

```typescript
/**
 * Type definitions for anatomy asset system
 */

export type LODLevel = 'high' | 'medium' | 'low';
export type AnatomyType = 'body' | 'muscles' | 'skeleton';
export type Sex = 'male' | 'female' | 'neutral';

export interface AnatomyAssetFiles {
  high?: string;
  medium?: string;
  low?: string;
}

export interface AnatomyAssetMetadata {
  triangleCount: Record<LODLevel, number>;
  rigged: boolean;
  boneCount: number;
  meshCount: number;
  meshNames: string[];
  textures: string[];
}

export interface AnatomyAssetLicense {
  spdxId: string;
  name?: string;
  url?: string;
  attribution?: string;
  attributionRequired: boolean;
}

export interface AnatomyAssetSource {
  url: string;
  author?: string;
  authorUrl?: string;
}

export interface AnatomyAsset {
  id: string;
  type: AnatomyType;
  sex: Sex;
  files: AnatomyAssetFiles;
  metadata: AnatomyAssetMetadata;
  license: AnatomyAssetLicense;
  source: AnatomyAssetSource;
  validationStatus: 'PASS' | 'WARN' | 'FAIL' | 'PENDING';
}

export interface AnatomyManifest {
  version: string;
  generated_at: string;
  assets: Record<string, AnatomyAsset>;
  defaults: {
    maleBody: string | null;
    femaleBody: string | null;
    maleMuscles: string | null;
    femaleMuscles: string | null;
  };
}

export interface LoadedAnatomyModel {
  asset: AnatomyAsset;
  lod: LODLevel;
  scene: THREE.Group;
  meshes: Map<string, THREE.Mesh>;
  skeleton?: THREE.Skeleton;
}
```

### Task 8.2: Create Asset Registry

**Create file:** `src/lib/anatomy/registry.ts`

```typescript
/**
 * Anatomy Asset Registry
 * Single source of truth for anatomy asset metadata and loading
 */

import type { AnatomyManifest, AnatomyAsset, LODLevel, AnatomyType, Sex } from './types';

// Import manifest at build time
import manifest from '../../../assets/anatomy/manifests/anatomy-assets.manifest.json';

class AnatomyAssetRegistry {
  private manifest: AnatomyManifest;
  private loadedAssets: Map<string, any> = new Map();

  constructor() {
    this.manifest = manifest as AnatomyManifest;
  }

  /**
   * Get all available assets
   */
  getAllAssets(): Record<string, AnatomyAsset> {
    return this.manifest.assets;
  }

  /**
   * Get asset by key
   */
  getAsset(key: string): AnatomyAsset | undefined {
    return this.manifest.assets[key];
  }

  /**
   * Get assets by type
   */
  getAssetsByType(type: AnatomyType): AnatomyAsset[] {
    return Object.values(this.manifest.assets).filter(a => a.type === type);
  }

  /**
   * Get assets by sex
   */
  getAssetsBySex(sex: Sex): AnatomyAsset[] {
    return Object.values(this.manifest.assets).filter(a => a.sex === sex);
  }

  /**
   * Get default asset for a category
   */
  getDefault(category: 'maleBody' | 'femaleBody' | 'maleMuscles' | 'femaleMuscles'): AnatomyAsset | undefined {
    const key = this.manifest.defaults[category];
    return key ? this.manifest.assets[key] : undefined;
  }

  /**
   * Get file path for specific LOD
   */
  getFilePath(asset: AnatomyAsset, lod: LODLevel): string | undefined {
    return asset.files[lod];
  }

  /**
   * Get best available LOD for given quality preference
   */
  getBestAvailableLOD(asset: AnatomyAsset, preferredLod: LODLevel): LODLevel {
    const priority: LODLevel[] =
      preferredLod === 'high' ? ['high', 'medium', 'low'] :
      preferredLod === 'medium' ? ['medium', 'high', 'low'] :
      ['low', 'medium', 'high'];

    for (const lod of priority) {
      if (asset.files[lod]) return lod;
    }

    throw new Error(`No LOD available for asset ${asset.id}`);
  }

  /**
   * Get mesh names for a muscle model
   */
  getMuscleNames(asset: AnatomyAsset): string[] {
    if (asset.type !== 'muscles') return [];
    return asset.metadata.meshNames;
  }

  /**
   * Check if attribution is required
   */
  requiresAttribution(asset: AnatomyAsset): boolean {
    return asset.license.attributionRequired;
  }

  /**
   * Get attribution text for an asset
   */
  getAttribution(asset: AnatomyAsset): string | null {
    if (!asset.license.attributionRequired) return null;
    return asset.license.attribution ||
      `Model by ${asset.source.author || 'Unknown'} (${asset.license.spdxId})`;
  }

  /**
   * Get manifest version
   */
  getVersion(): string {
    return this.manifest.version;
  }
}

// Export singleton instance
export const anatomyRegistry = new AnatomyAssetRegistry();
export default anatomyRegistry;
```

### Task 8.3: Create Model Loader

**Create file:** `src/lib/anatomy/loader.ts`

```typescript
/**
 * Anatomy Model Loader
 * Handles loading and caching of 3D anatomy models
 */

import { useGLTF, useAnimations } from '@react-three/drei';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { anatomyRegistry } from './registry';
import type { AnatomyAsset, LODLevel, LoadedAnatomyModel } from './types';
import { useMuscleVisualizationStore } from '@/store/muscleVisualizationStore';

// Model cache to prevent duplicate loads
const modelCache = new Map<string, THREE.Group>();

/**
 * Preload a model (call during idle time or on hover)
 */
export function preloadAnatomyModel(assetKey: string, lod: LODLevel = 'medium'): void {
  const asset = anatomyRegistry.getAsset(assetKey);
  if (!asset) return;

  const filePath = anatomyRegistry.getFilePath(asset, lod);
  if (filePath) {
    useGLTF.preload(filePath);
  }
}

/**
 * Hook to load an anatomy model
 */
export function useAnatomyModel(
  assetKey: string | null,
  options: {
    lod?: LODLevel;
    autoSelectLOD?: boolean;
  } = {}
): {
  model: LoadedAnatomyModel | null;
  loading: boolean;
  error: Error | null;
  meshes: Map<string, THREE.Mesh>;
} {
  const { lod = 'medium', autoSelectLOD = true } = options;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Get asset from registry
  const asset = useMemo(() => {
    if (!assetKey) return null;
    return anatomyRegistry.getAsset(assetKey);
  }, [assetKey]);

  // Determine actual LOD to use
  const actualLod = useMemo(() => {
    if (!asset) return lod;
    return autoSelectLOD ? anatomyRegistry.getBestAvailableLOD(asset, lod) : lod;
  }, [asset, lod, autoSelectLOD]);

  // Get file path
  const filePath = useMemo(() => {
    if (!asset) return null;
    return anatomyRegistry.getFilePath(asset, actualLod);
  }, [asset, actualLod]);

  // Load the model
  const { scene, animations } = useGLTF(filePath || '/placeholder.glb', true);

  // Extract meshes
  useEffect(() => {
    if (!scene) return;

    meshesRef.current.clear();
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshesRef.current.set(child.name, child);
      }
    });

    setLoading(false);
  }, [scene]);

  // Build loaded model object
  const model = useMemo((): LoadedAnatomyModel | null => {
    if (!asset || !scene) return null;

    return {
      asset,
      lod: actualLod,
      scene: scene.clone(),
      meshes: meshesRef.current,
      skeleton: undefined, // Extract if needed
    };
  }, [asset, scene, actualLod]);

  return {
    model,
    loading,
    error,
    meshes: meshesRef.current,
  };
}

/**
 * Hook to apply muscle visualization to a loaded model
 */
export function useMuscleVisualization(meshes: Map<string, THREE.Mesh>) {
  const {
    highlightedMuscles,
    muscleIntensity,
    colorScheme,
    getMuscleColor
  } = useMuscleVisualizationStore();

  useEffect(() => {
    meshes.forEach((mesh, name) => {
      const intensity = muscleIntensity[name] || 0;
      const isHighlighted = highlightedMuscles.includes(name);

      const color = getMuscleColor(name);

      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.color.setRGB(color.r, color.g, color.b);
        mesh.material.emissive.setRGB(color.r * 0.3, color.g * 0.3, color.b * 0.3);
        mesh.material.opacity = color.a;
        mesh.material.transparent = color.a < 1;
        mesh.material.needsUpdate = true;
      }
    });
  }, [meshes, highlightedMuscles, muscleIntensity, colorScheme, getMuscleColor]);
}

/**
 * Get loading stats for debugging
 */
export function getModelCacheStats(): { count: number; keys: string[] } {
  return {
    count: modelCache.size,
    keys: Array.from(modelCache.keys()),
  };
}
```

### Task 8.4: Create React Component

**Create file:** `src/components/anatomy/AnatomyModel.tsx`

```tsx
/**
 * AnatomyModel Component
 * Renders a 3D anatomy model with muscle visualization support
 */

import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useAnatomyModel, useMuscleVisualization } from '@/lib/anatomy/loader';
import { useMuscleVisualizationStore } from '@/store/muscleVisualizationStore';
import { Managed3DContainer } from '@/components/virtual/Managed3DContainer';
import type { LODLevel } from '@/lib/anatomy/types';

interface AnatomyModelProps {
  assetKey: string;
  lod?: LODLevel;
  autoRotate?: boolean;
  showControls?: boolean;
  onMeshClick?: (meshName: string) => void;
  onMeshHover?: (meshName: string | null) => void;
  className?: string;
}

function ModelScene({
  assetKey,
  lod,
  autoRotate,
  onMeshClick,
  onMeshHover
}: Omit<AnatomyModelProps, 'className' | 'showControls'>) {
  const groupRef = useRef<THREE.Group>(null);
  const { model, loading, meshes } = useAnatomyModel(assetKey, { lod });
  const { cameraPosition } = useMuscleVisualizationStore();

  // Apply muscle visualization colors
  useMuscleVisualization(meshes);

  // Auto-rotation
  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  // Camera position from store
  useEffect(() => {
    // Update camera based on cameraPosition preset
    // This would integrate with OrbitControls
  }, [cameraPosition]);

  if (loading || !model) {
    return null;
  }

  return (
    <group ref={groupRef}>
      <primitive
        object={model.scene}
        onClick={(e: THREE.Event) => {
          e.stopPropagation();
          const mesh = e.object as THREE.Mesh;
          onMeshClick?.(mesh.name);
        }}
        onPointerOver={(e: THREE.Event) => {
          e.stopPropagation();
          const mesh = e.object as THREE.Mesh;
          onMeshHover?.(mesh.name);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onMeshHover?.(null);
          document.body.style.cursor = 'auto';
        }}
      />
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 2, 0.5]} />
      <meshStandardMaterial color="#333" wireframe />
    </mesh>
  );
}

export function AnatomyModel({
  assetKey,
  lod = 'medium',
  autoRotate = false,
  showControls = true,
  onMeshClick,
  onMeshHover,
  className = '',
}: AnatomyModelProps) {
  return (
    <Managed3DContainer
      fallback={<div className="w-full h-full bg-gray-900 animate-pulse" />}
      unloadWhenHidden
      showMemoryWarning
    >
      <div className={`w-full h-full ${className}`}>
        <Canvas
          camera={{ position: [0, 1, 3], fov: 45 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
          <directionalLight position={[-5, 5, -5]} intensity={0.4} />

          <Suspense fallback={<LoadingFallback />}>
            <ModelScene
              assetKey={assetKey}
              lod={lod}
              autoRotate={autoRotate}
              onMeshClick={onMeshClick}
              onMeshHover={onMeshHover}
            />
            <Environment preset="studio" />
            <ContactShadows
              position={[0, -1.5, 0]}
              opacity={0.5}
              scale={10}
              blur={2}
            />
          </Suspense>

          {showControls && (
            <OrbitControls
              enablePan={false}
              minDistance={1.5}
              maxDistance={6}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI * 3 / 4}
            />
          )}
        </Canvas>
      </div>
    </Managed3DContainer>
  );
}

export default AnatomyModel;
```

### Task 8.5: Create Dev Viewer Page

**Create file:** `src/pages/dev/AnatomyViewer.tsx`

```tsx
/**
 * Development-only Anatomy Asset Viewer
 * For testing and previewing anatomy models
 */

import React, { useState, useMemo } from 'react';
import { AnatomyModel } from '@/components/anatomy/AnatomyModel';
import { anatomyRegistry } from '@/lib/anatomy/registry';
import type { LODLevel } from '@/lib/anatomy/types';

export function AnatomyViewer() {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [lod, setLod] = useState<LODLevel>('medium');
  const [autoRotate, setAutoRotate] = useState(true);
  const [hoveredMesh, setHoveredMesh] = useState<string | null>(null);
  const [selectedMesh, setSelectedMesh] = useState<string | null>(null);

  const assets = useMemo(() => anatomyRegistry.getAllAssets(), []);
  const assetKeys = Object.keys(assets);

  const currentAsset = selectedAsset ? assets[selectedAsset] : null;

  // Set default on mount
  React.useEffect(() => {
    const defaultMale = anatomyRegistry.getDefault('maleBody');
    if (defaultMale && !selectedAsset) {
      const key = Object.entries(assets).find(([_, a]) => a.id === defaultMale.id)?.[0];
      if (key) setSelectedAsset(key);
    }
  }, [assets, selectedAsset]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-blue-400">Anatomy Asset Viewer</h1>
          <p className="text-gray-400">Development tool for previewing anatomy models</p>
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* Controls Panel */}
          <div className="col-span-3 space-y-4">
            {/* Asset Selector */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-gray-300 mb-2">Asset</h2>
              <select
                value={selectedAsset || ''}
                onChange={(e) => setSelectedAsset(e.target.value || null)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
              >
                <option value="">Select an asset...</option>
                {assetKeys.map((key) => (
                  <option key={key} value={key}>
                    {key} ({assets[key].type})
                  </option>
                ))}
              </select>
            </div>

            {/* LOD Selector */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-gray-300 mb-2">Level of Detail</h2>
              <div className="flex gap-2">
                {(['high', 'medium', 'low'] as LODLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setLod(level)}
                    className={`flex-1 px-3 py-1 rounded text-sm ${
                      lod === level
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-gray-300 mb-2">Options</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRotate}
                  onChange={(e) => setAutoRotate(e.target.checked)}
                  className="rounded"
                />
                Auto-rotate
              </label>
            </div>

            {/* Asset Info */}
            {currentAsset && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h2 className="text-sm font-semibold text-gray-300 mb-2">Asset Info</h2>
                <dl className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Type:</dt>
                    <dd>{currentAsset.type}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Sex:</dt>
                    <dd>{currentAsset.sex}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Rigged:</dt>
                    <dd>{currentAsset.metadata.rigged ? 'Yes' : 'No'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Meshes:</dt>
                    <dd>{currentAsset.metadata.meshCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Triangles ({lod}):</dt>
                    <dd>{currentAsset.metadata.triangleCount[lod]?.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">License:</dt>
                    <dd>{currentAsset.license.spdxId}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Status:</dt>
                    <dd className={
                      currentAsset.validationStatus === 'PASS' ? 'text-green-400' :
                      currentAsset.validationStatus === 'WARN' ? 'text-yellow-400' :
                      'text-red-400'
                    }>
                      {currentAsset.validationStatus}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Mesh List (for muscle models) */}
            {currentAsset?.type === 'muscles' && (
              <div className="bg-gray-800 rounded-lg p-4 max-h-64 overflow-auto">
                <h2 className="text-sm font-semibold text-gray-300 mb-2">
                  Meshes ({currentAsset.metadata.meshNames.length})
                </h2>
                <ul className="text-xs space-y-1">
                  {currentAsset.metadata.meshNames.map((name) => (
                    <li
                      key={name}
                      className={`px-2 py-1 rounded cursor-pointer ${
                        selectedMesh === name
                          ? 'bg-blue-600'
                          : hoveredMesh === name
                          ? 'bg-gray-600'
                          : 'hover:bg-gray-700'
                      }`}
                      onClick={() => setSelectedMesh(name)}
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Viewer */}
          <div className="col-span-9">
            <div className="bg-gray-800 rounded-lg overflow-hidden aspect-[4/3]">
              {selectedAsset ? (
                <AnatomyModel
                  assetKey={selectedAsset}
                  lod={lod}
                  autoRotate={autoRotate}
                  onMeshHover={setHoveredMesh}
                  onMeshClick={setSelectedMesh}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  Select an asset to preview
                </div>
              )}
            </div>

            {/* Hovered/Selected Mesh Info */}
            {(hoveredMesh || selectedMesh) && (
              <div className="mt-4 bg-gray-800 rounded-lg p-4">
                <p className="text-sm">
                  <span className="text-gray-400">
                    {hoveredMesh ? 'Hovered' : 'Selected'}:
                  </span>{' '}
                  <span className="text-blue-400 font-mono">
                    {hoveredMesh || selectedMesh}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Attribution */}
        {currentAsset && anatomyRegistry.requiresAttribution(currentAsset) && (
          <div className="mt-6 text-xs text-gray-500 text-center">
            {anatomyRegistry.getAttribution(currentAsset)}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnatomyViewer;
```

### Task 8.6: Add Route (if using React Router)

Add to your routes configuration:

```typescript
// In src/routes.tsx or equivalent
import { lazy } from 'react';

const AnatomyViewer = lazy(() => import('./pages/dev/AnatomyViewer'));

// Add to routes array (dev only)
{
  path: '/dev/anatomy-viewer',
  element: import.meta.env.DEV ? <AnatomyViewer /> : <Navigate to="/" />,
}
```

### Task 8.7: Export from index files

**Update/create:** `src/lib/anatomy/index.ts`

```typescript
export * from './types';
export { anatomyRegistry, default as registry } from './registry';
export {
  useAnatomyModel,
  useMuscleVisualization,
  preloadAnatomyModel,
  getModelCacheStats
} from './loader';
```

**Update/create:** `src/components/anatomy/index.ts`

```typescript
export { AnatomyModel, default } from './AnatomyModel';
```

---

## ⏸️ STOP POINT 8: Integration Complete

Print the following summary:

```
═══════════════════════════════════════════════════════════════
PHASE 8 COMPLETE: Codebase Integration
═══════════════════════════════════════════════════════════════

FILES CREATED:
  src/lib/anatomy/types.ts        - TypeScript type definitions
  src/lib/anatomy/registry.ts     - Asset registry singleton
  src/lib/anatomy/loader.ts       - Model loading hooks
  src/lib/anatomy/index.ts        - Module exports
  src/components/anatomy/AnatomyModel.tsx  - React component
  src/components/anatomy/index.ts - Component exports
  src/pages/dev/AnatomyViewer.tsx - Dev viewer page

INTEGRATION POINTS:
  ✓ Registry reads from: assets/anatomy/manifests/anatomy-assets.manifest.json
  ✓ Models served from: public/models/anatomy/
  ✓ Connects to: muscleVisualizationStore
  ✓ Uses: Managed3DContainer for memory management
  ✓ Dev viewer at: /dev/anatomy-viewer

CODE DIFF SUMMARY:
  +X files created
  ~X files modified (routes)

NEXT: Run typecheck and test
═══════════════════════════════════════════════════════════════
```

---

## PHASE 9: TESTING & VERIFICATION

### Task 9.1: TypeScript Check

```bash
pnpm typecheck
```

Fix any type errors before proceeding.

### Task 9.2: Build Test

```bash
pnpm build:all
```

Ensure build completes without errors.

### Task 9.3: Start Dev Server

```bash
pnpm dev
```

### Task 9.4: Manual Verification

1. Navigate to `/dev/anatomy-viewer`
2. Verify asset selector populates with discovered assets
3. Select a male body asset → verify it renders
4. Select a female body asset → verify it renders
5. Select a muscle model → verify individual meshes list appears
6. Test LOD switching (high/medium/low)
7. Test auto-rotate toggle
8. Hover over muscle meshes → verify highlight
9. Click muscle mesh → verify selection
10. Check browser console for any errors/warnings

### Task 9.5: Performance Check

In browser dev tools:
1. Check Network tab for model file sizes
2. Check Performance tab for load times
3. Check Memory tab for heap usage after loading models

---

## ⏸️ FINAL STOP POINT: All Phases Complete

Print the following comprehensive summary:

```
═══════════════════════════════════════════════════════════════
ANATOMY ASSET INTEGRATION COMPLETE
═══════════════════════════════════════════════════════════════

PHASE SUMMARY:
  ✓ Phase 1: Setup & Configuration
  ✓ Phase 2: Web Discovery
  ✓ Phase 3: Asset Acquisition
  ✓ Phase 4: Conversion & Normalization
  ✓ Phase 5: Optimization
  ✓ Phase 6: Validation
  ✓ Phase 7: Manifest Generation
  ✓ Phase 8: Codebase Integration
  ✓ Phase 9: Testing & Verification

ASSETS INTEGRATED:
┌─────────────────────────────────────────────────────────────┐
│ Category        │ Asset              │ Status  │ LODs      │
├─────────────────┼────────────────────┼─────────┼───────────┤
│ Male Body       │ [asset_id]         │ ✓ PASS  │ H/M/L     │
│ Female Body     │ [asset_id]         │ ✓ PASS  │ H/M/L     │
│ Male Muscles    │ [asset_id]         │ ✓ PASS  │ H/M/L     │
│ Female Muscles  │ [pending/none]     │ -       │ -         │
└─────────────────────────────────────────────────────────────┘

FILE STRUCTURE:
  assets/anatomy/
  ├── discovery/curated-sources.csv
  ├── sources/[vendor]/[asset_id]/...
  ├── processed/[sex]/[type]/[asset_id]/...
  ├── manifests/anatomy-assets.manifest.json
  ├── manual-queue/manual-queue.json
  └── scripts/...

  public/models/anatomy/
  ├── bodies/[asset_id]-model-{high,med,low}.glb
  └── muscles/[asset_id]-model-{high,med,low}.glb

  src/lib/anatomy/
  ├── types.ts
  ├── registry.ts
  ├── loader.ts
  └── index.ts

  src/components/anatomy/
  ├── AnatomyModel.tsx
  └── index.ts

  src/pages/dev/
  └── AnatomyViewer.tsx

MANUAL QUEUE (items requiring owner action):
  [List any items in manual-queue.json]

LICENSE ATTRIBUTIONS REQUIRED:
  [List any assets requiring attribution display]

RECOMMENDATIONS:
  1. Add attribution component to app footer/about page
  2. Consider commissioning custom muscle model if separate meshes not found
  3. Set up CDN for model files if > 5MB total
  4. Add loading progress indicator for slow connections

VERIFICATION CHECKLIST:
  ☐ /dev/anatomy-viewer loads correctly
  ☐ Male body renders
  ☐ Female body renders
  ☐ Muscle model renders with separate meshes
  ☐ LOD switching works
  ☐ Muscle highlight/selection works
  ☐ No console errors
  ☐ Build succeeds
  ☐ TypeScript passes

═══════════════════════════════════════════════════════════════
```

---

## APPENDIX: Troubleshooting

### Common Issues

**"Blender not found"**
- Install Blender from blender.org
- On macOS, Blender is at `/Applications/Blender.app/Contents/MacOS/Blender`
- Update path in conversion scripts

**"gltf-transform not found"**
- Run: `npm install -g @gltf-transform/cli`

**"Cannot find module '../../../assets/anatomy/manifests/anatomy-assets.manifest.json'"**
- Ensure manifest file exists
- Check Vite config allows JSON imports from assets/

**"Model not rendering"**
- Check browser console for CORS errors
- Verify GLB file exists at public path
- Check Draco decoder is available

**"Meshes not separated"**
- Model may need manual separation in Blender
- Check .info.json for mesh_count
- Re-export with "Apply Modifiers" disabled

### Useful Debug Commands

```bash
# Inspect GLB file
gltf-transform inspect public/models/anatomy/bodies/[asset].glb

# Validate GLB
gltf-transform validate public/models/anatomy/bodies/[asset].glb

# List mesh names in GLB
gltf-transform inspect public/models/anatomy/muscles/[asset].glb --format json | jq '.meshes'

# Check file sizes
du -sh public/models/anatomy/**/*.glb
```

---

## END OF PROMPT

Execute phases sequentially. Stop at each STOP POINT to print summaries and allow review before proceeding. If any phase fails, document the error and propose remediation before continuing.
