#!/usr/bin/env node

/**
 * Bundle Size Report Generator
 *
 * Analyzes dist/assets and generates a report of bundle sizes.
 * Use this in CI to track bundle size regressions.
 *
 * Usage:
 *   node scripts/bundle-size-report.mjs              # Print report
 *   node scripts/bundle-size-report.mjs --json       # Output JSON
 *   node scripts/bundle-size-report.mjs --check 500  # Fail if any chunk > 500KB
 */

import { readdirSync, statSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, extname, basename } from 'path';

const DIST_ASSETS = './dist/assets';
const BASELINE_FILE = './.bundle-size-baseline.json';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function formatSizeChange(oldSize, newSize) {
  if (!oldSize) return colors.cyan + '(new)' + colors.reset;
  const diff = newSize - oldSize;
  const percent = ((diff / oldSize) * 100).toFixed(1);
  if (diff === 0) return colors.dim + '(same)' + colors.reset;
  if (diff > 0) return colors.red + `+${formatSize(diff)} (+${percent}%)` + colors.reset;
  return colors.green + `${formatSize(diff)} (${percent}%)` + colors.reset;
}

function getChunkCategory(filename) {
  if (filename.includes('react-vendor')) return 'react';
  if (filename.includes('apollo-vendor')) return 'apollo';
  if (filename.includes('three-')) return 'three';
  if (filename.includes('recharts-vendor')) return 'recharts';
  if (filename.includes('d3-vendor')) return 'd3';
  if (filename.includes('ui-vendor')) return 'ui';
  if (filename.includes('vendor')) return 'vendor';
  if (filename.includes('index-')) return 'app';
  return 'other';
}

function analyzeBundle() {
  if (!existsSync(DIST_ASSETS)) {
    console.error(`${colors.red}Error: ${DIST_ASSETS} not found. Run 'pnpm build' first.${colors.reset}`);
    process.exit(1);
  }

  const files = readdirSync(DIST_ASSETS);
  const report = {
    timestamp: new Date().toISOString(),
    files: {},
    totals: {
      js: 0,
      css: 0,
      images: 0,
      fonts: 0,
      other: 0,
      total: 0,
    },
    categories: {},
    largestChunks: [],
  };

  for (const file of files) {
    const filePath = join(DIST_ASSETS, file);
    const stat = statSync(filePath);
    const size = stat.size;
    const ext = extname(file).toLowerCase();

    report.files[file] = {
      size,
      ext,
      category: getChunkCategory(file),
    };

    // Categorize by extension
    if (['.js', '.mjs'].includes(ext)) {
      report.totals.js += size;
    } else if (ext === '.css') {
      report.totals.css += size;
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext)) {
      report.totals.images += size;
    } else if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) {
      report.totals.fonts += size;
    } else {
      report.totals.other += size;
    }

    report.totals.total += size;

    // Track by category
    const category = report.files[file].category;
    report.categories[category] = (report.categories[category] || 0) + size;
  }

  // Find largest JS chunks
  report.largestChunks = Object.entries(report.files)
    .filter(([name, data]) => ['.js', '.mjs'].includes(data.ext))
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 15)
    .map(([name, data]) => ({ name, size: data.size, category: data.category }));

  return report;
}

function loadBaseline() {
  if (existsSync(BASELINE_FILE)) {
    try {
      return JSON.parse(readFileSync(BASELINE_FILE, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

function saveBaseline(report) {
  writeFileSync(BASELINE_FILE, JSON.stringify(report, null, 2));
  console.log(`${colors.green}Baseline saved to ${BASELINE_FILE}${colors.reset}`);
}

function printReport(report, baseline) {
  console.log('\n' + colors.bold + '=== Bundle Size Report ===' + colors.reset + '\n');

  // Summary
  console.log(colors.cyan + 'Summary:' + colors.reset);
  console.log(`  Total:    ${formatSize(report.totals.total)}`);
  console.log(`  JS:       ${formatSize(report.totals.js)} ${baseline ? formatSizeChange(baseline.totals?.js, report.totals.js) : ''}`);
  console.log(`  CSS:      ${formatSize(report.totals.css)} ${baseline ? formatSizeChange(baseline.totals?.css, report.totals.css) : ''}`);
  console.log(`  Images:   ${formatSize(report.totals.images)}`);
  console.log(`  Fonts:    ${formatSize(report.totals.fonts)}`);

  // Categories
  console.log('\n' + colors.cyan + 'JS by Category:' + colors.reset);
  const sortedCategories = Object.entries(report.categories)
    .sort((a, b) => b[1] - a[1]);
  for (const [cat, size] of sortedCategories) {
    const baselineSize = baseline?.categories?.[cat];
    console.log(`  ${cat.padEnd(12)} ${formatSize(size).padStart(10)} ${baselineSize ? formatSizeChange(baselineSize, size) : ''}`);
  }

  // Largest chunks
  console.log('\n' + colors.cyan + 'Largest JS Chunks:' + colors.reset);
  for (const chunk of report.largestChunks) {
    const shortName = chunk.name.length > 45 ? chunk.name.slice(0, 42) + '...' : chunk.name;
    const baselineChunk = baseline?.files?.[chunk.name];
    const sizeStr = formatSize(chunk.size).padStart(10);
    const changeStr = baselineChunk ? formatSizeChange(baselineChunk.size, chunk.size) : '';

    // Color code by size
    let sizeColor = '';
    if (chunk.size > 500 * 1024) sizeColor = colors.red;
    else if (chunk.size > 300 * 1024) sizeColor = colors.yellow;

    console.log(`  ${shortName.padEnd(47)} ${sizeColor}${sizeStr}${colors.reset} ${changeStr}`);
  }

  // Budget warnings
  const overBudget = report.largestChunks.filter(c => c.size > 500 * 1024);
  if (overBudget.length > 0) {
    console.log('\n' + colors.yellow + 'Warning: Chunks over 500KB budget:' + colors.reset);
    for (const chunk of overBudget) {
      console.log(`  ${colors.red}${chunk.name}: ${formatSize(chunk.size)}${colors.reset}`);
    }
  }

  console.log('');
}

// Parse command line args
const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const saveBaselineFlag = args.includes('--save-baseline');
const checkIndex = args.indexOf('--check');
const budgetKB = checkIndex !== -1 ? parseInt(args[checkIndex + 1], 10) : null;

// Run analysis
const report = analyzeBundle();
const baseline = loadBaseline();

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report, baseline);
}

if (saveBaselineFlag) {
  saveBaseline(report);
}

// Budget check
if (budgetKB) {
  const budgetBytes = budgetKB * 1024;
  const overBudget = report.largestChunks.filter(c => c.size > budgetBytes);
  if (overBudget.length > 0) {
    console.error(`${colors.red}Error: ${overBudget.length} chunk(s) exceed ${budgetKB}KB budget${colors.reset}`);
    process.exit(1);
  }
  console.log(`${colors.green}All chunks within ${budgetKB}KB budget${colors.reset}`);
}
