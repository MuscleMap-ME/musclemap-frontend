#!/usr/bin/env node
/**
 * Critical CSS Extraction Script
 *
 * Uses critters to extract and inline critical CSS for faster initial render.
 * Run this after build to optimize the dist/index.html file.
 *
 * What it does:
 *   1. Analyzes the built HTML and CSS
 *   2. Identifies critical (above-the-fold) CSS
 *   3. Inlines critical CSS into <head>
 *   4. Lazy-loads non-critical CSS
 *
 * Usage:
 *   node scripts/extract-critical-css.mjs              # Process dist/index.html
 *   node scripts/extract-critical-css.mjs --dry-run   # Show what would change
 *
 * Benefits:
 *   - Faster First Contentful Paint (FCP)
 *   - Better Core Web Vitals scores
 *   - Reduced render-blocking CSS
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const DIST_DIR = 'dist';
const INDEX_HTML = join(DIST_DIR, 'index.html');

// Try to import critters
let Critters;
try {
  const crittersMod = await import('critters');
  Critters = crittersMod.default || crittersMod.Critters || crittersMod;
} catch (e) {
  console.error('❌ critters package not found');
  console.error('Install with: pnpm add -D critters');
  process.exit(1);
}

async function extractCriticalCSS(options = {}) {
  const { dryRun = false } = options;

  // Check if dist exists
  if (!existsSync(INDEX_HTML)) {
    console.error(`❌ ${INDEX_HTML} not found. Run build first.`);
    process.exit(1);
  }

  console.log('🎨 Extracting critical CSS...\n');

  // Read original HTML
  const originalHtml = await readFile(INDEX_HTML, 'utf-8');
  const originalSize = Buffer.byteLength(originalHtml, 'utf-8');

  // Configure critters
  const critters = new Critters({
    // Path to static assets
    path: DIST_DIR,
    // Inline critical CSS
    inlineThreshold: 0, // Inline all critical CSS regardless of size
    // Reduce the inlined CSS to critical rules
    pruneSource: false, // Keep original CSS files
    // Merge inlined styles
    mergeStylesheets: true,
    // Preload strategy for non-critical CSS
    preload: 'swap', // Use font-display: swap strategy
    // Noscript fallback
    noscriptFallback: true,
    // Additional critical selectors (always include)
    additionalStylesheets: [],
    // Reduce the font rules
    reduceInlineStyles: true,
    // Keep keyframes
    keyframes: 'critical',
    // Fonts strategy
    fonts: true,
    // Log level
    logLevel: 'info',
  });

  try {
    // Process HTML with critters
    const processedHtml = await critters.process(originalHtml);
    const processedSize = Buffer.byteLength(processedHtml, 'utf-8');

    // Calculate size difference
    const sizeDiff = processedSize - originalSize;
    const sizeChange = sizeDiff > 0 ? `+${sizeDiff}` : sizeDiff.toString();

    console.log('\n📊 Results:');
    console.log(`  Original size: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`  Processed size: ${(processedSize / 1024).toFixed(2)} KB`);
    console.log(`  Size change: ${sizeChange} bytes`);

    // Check if critical CSS was actually inlined
    const hasInlinedStyles = processedHtml.includes('<style') &&
      processedHtml.includes('</style>') &&
      !originalHtml.includes('<style');

    if (hasInlinedStyles) {
      console.log('\n✅ Critical CSS was extracted and inlined');
    } else {
      console.log('\n⚠️  No critical CSS changes detected');
      console.log('   This may happen if:');
      console.log('   - CSS is already optimized');
      console.log('   - No render-blocking CSS found');
    }

    if (dryRun) {
      console.log('\n⚠️  Dry run - no files modified');
      console.log('   Run without --dry-run to apply changes');
    } else {
      // Write processed HTML
      await writeFile(INDEX_HTML, processedHtml);
      console.log(`\n✅ Updated ${INDEX_HTML}`);
    }

    return { originalSize, processedSize, hasInlinedStyles };

  } catch (error) {
    console.error('\n❌ Error processing HTML:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Parse command line args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run extraction
extractCriticalCSS({ dryRun });
