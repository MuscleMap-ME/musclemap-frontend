#!/usr/bin/env node
/**
 * App Icon Generator for MuscleMap Mobile App
 *
 * Generates all required app icons for iOS and Android from a source image.
 * Uses sharp for image processing (cross-platform, fast).
 *
 * Usage:
 *   pnpm generate:icons [source-image]
 *
 * If no source image is provided, uses apps/mobile/assets/icon-source.png
 * or falls back to apps/mobile/assets/icon.png
 *
 * Requirements:
 *   - Source image should be at least 1024x1024 pixels
 *   - PNG format recommended for best quality
 */

const fs = require('fs');
const path = require('path');

// Check for sharp, provide helpful error if not installed
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Error: sharp is not installed.');
  console.error('Install it with: pnpm add -D sharp');
  process.exit(1);
}

const MOBILE_ASSETS_DIR = path.resolve(__dirname, '../apps/mobile/assets');

// Icon configurations for Expo/React Native
const ICON_CONFIGS = [
  // Main app icon (iOS and Android)
  { name: 'icon.png', size: 1024 },
  // Adaptive icon foreground (Android)
  { name: 'adaptive-icon.png', size: 1024 },
  // Splash screen icon
  { name: 'splash-icon.png', size: 1024 },
  // Favicon for web
  { name: 'favicon.png', size: 48 },
];

async function generateIcons(sourcePath) {
  // Resolve source image
  const sourceFile =
    sourcePath ||
    (fs.existsSync(path.join(MOBILE_ASSETS_DIR, 'icon-source.png'))
      ? path.join(MOBILE_ASSETS_DIR, 'icon-source.png')
      : path.join(MOBILE_ASSETS_DIR, 'icon.png'));

  if (!fs.existsSync(sourceFile)) {
    console.error(`Error: Source image not found: ${sourceFile}`);
    console.error('');
    console.error('Please provide a source image:');
    console.error('  1. Place icon-source.png (1024x1024) in apps/mobile/assets/');
    console.error('  2. Or run: pnpm generate:icons /path/to/your/icon.png');
    process.exit(1);
  }

  console.log(`Source: ${sourceFile}`);
  console.log(`Output: ${MOBILE_ASSETS_DIR}`);
  console.log('');

  // Validate source image
  const metadata = await sharp(sourceFile).metadata();
  if (metadata.width < 1024 || metadata.height < 1024) {
    console.warn(
      `Warning: Source image is ${metadata.width}x${metadata.height}. ` +
        'Recommended size is at least 1024x1024 for best quality.'
    );
  }

  // Load source image into buffer to avoid same-file issues
  const sourceBuffer = await sharp(sourceFile).toBuffer();

  // Generate each icon
  for (const config of ICON_CONFIGS) {
    const outputPath = path.join(MOBILE_ASSETS_DIR, config.name);

    try {
      await sharp(sourceBuffer)
        .resize(config.size, config.size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated ${config.name} (${config.size}x${config.size})`);
    } catch (err) {
      console.error(`✗ Failed to generate ${config.name}: ${err.message}`);
    }
  }

  console.log('');
  console.log('Icon generation complete!');
  console.log('');
  console.log('Note: For Android adaptive icons, you may want to customize');
  console.log('the background color in apps/mobile/app.json under:');
  console.log('  expo.android.adaptiveIcon.backgroundColor');
}

// Parse CLI arguments
const args = process.argv.slice(2);
const sourcePath = args[0];

generateIcons(sourcePath).catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
