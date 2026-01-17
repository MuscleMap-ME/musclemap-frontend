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
