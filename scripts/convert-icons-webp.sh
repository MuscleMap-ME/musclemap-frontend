#!/bin/bash

# Convert PNG icons to WebP format
# WebP provides ~30% better compression than PNG
# Requires sharp (already installed as devDependency)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PUBLIC_DIR="$PROJECT_ROOT/public"

echo "Converting PNG icons to WebP..."
echo "================================"

# Check if sharp is available
if ! node -e "require('sharp')" 2>/dev/null; then
    echo "Error: sharp is not installed. Run 'pnpm add -D sharp'"
    exit 1
fi

# Create WebP versions of all PNG files in public/
node << 'NODEJS'
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = process.argv[1] || './public';

async function convertToWebP() {
    const files = fs.readdirSync(publicDir);
    let converted = 0;
    let skipped = 0;

    for (const file of files) {
        if (!file.endsWith('.png') && !file.endsWith('.jpg') && !file.endsWith('.jpeg')) {
            continue;
        }

        const inputPath = path.join(publicDir, file);
        const outputPath = inputPath.replace(/\.(png|jpe?g)$/i, '.webp');

        // Skip if WebP already exists and is newer
        if (fs.existsSync(outputPath)) {
            const inputStat = fs.statSync(inputPath);
            const outputStat = fs.statSync(outputPath);
            if (outputStat.mtime > inputStat.mtime) {
                skipped++;
                continue;
            }
        }

        try {
            const originalSize = fs.statSync(inputPath).size;
            await sharp(inputPath)
                .webp({ quality: 85, effort: 6 })
                .toFile(outputPath);

            const newSize = fs.statSync(outputPath).size;
            const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
            console.log(`✓ ${file} → ${path.basename(outputPath)} (${savings}% smaller)`);
            converted++;
        } catch (err) {
            console.error(`✗ ${file}: ${err.message}`);
        }
    }

    console.log(`\nConverted: ${converted}, Skipped: ${skipped}`);
}

convertToWebP().catch(console.error);
NODEJS "$PUBLIC_DIR"

echo ""
echo "Done! WebP versions created alongside original files."
echo "Update your HTML/JSX to use <picture> elements or srcset for automatic format selection."
