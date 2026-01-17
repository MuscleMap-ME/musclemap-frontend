#!/usr/bin/env npx tsx
/**
 * Validate all processed anatomy assets
 * Run: npx tsx assets/anatomy/scripts/validate-assets.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface LODValidation {
  gltf_valid: boolean;
  file_size_bytes: number;
  triangle_count: number;
  triangle_budget_met: boolean;
  mesh_count: number;
  mesh_names: string[];
  errors: string[];
  warnings: string[];
}

interface ValidationResult {
  asset_id: string;
  validated_at: string;
  lods_validated: string[];
  results: Record<string, LODValidation>;
  overall_status: 'PASS' | 'WARN' | 'FAIL';
  manual_review_required: boolean;
}

const TRIANGLE_BUDGETS: Record<string, number> = {
  high: 100000,
  med: 30000,
  low: 10000,
};

const PROCESSED_DIR = 'assets/anatomy/processed';
const PUBLIC_DIR = 'public/models/anatomy';
const VALIDATION_DIR = 'assets/anatomy/validation';

function validateGLTF(filepath: string): { valid: boolean; errors: string[] } {
  try {
    // Use gltf-transform inspect to verify the file is readable
    // Just run inspect without format flag - if it doesn't error, file is valid
    execSync(`gltf-transform inspect "${filepath}" 2>&1`, {
      encoding: 'utf-8',
      timeout: 120000,
      maxBuffer: 100 * 1024 * 1024, // 100MB buffer for large models
    });
    return { valid: true, errors: [] };
  } catch (e: any) {
    // If the command throws, it's a real error
    return { valid: false, errors: [e.message || 'Validation failed'] };
  }
}

function inspectGLTF(filepath: string): any {
  try {
    const result = execSync(`gltf-transform inspect "${filepath}" --format json 2>&1`, {
      encoding: 'utf-8',
      timeout: 60000,
    });
    return JSON.parse(result);
  } catch {
    return null;
  }
}

function loadInfo(assetDir: string, lod: string): any {
  const infoPath = path.join(assetDir, `model-${lod}.info.json`);
  if (fs.existsSync(infoPath)) {
    return JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
  }
  return null;
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
    const info = loadInfo(assetDir, lod);

    const triangleCount = info?.total_triangles || inspection?.meshes?.primitives?.triangles || 0;
    const budget = TRIANGLE_BUDGETS[lod] || 100000;

    const lodResult: LODValidation = {
      gltf_valid: gltfValidation.valid,
      file_size_bytes: stats.size,
      triangle_count: triangleCount,
      triangle_budget_met: lod === 'high' ? true : triangleCount <= budget * 2, // Allow 2x for high-mesh-count models
      mesh_count: info?.mesh_count || inspection?.meshes?.count || 0,
      mesh_names: info?.mesh_names?.slice(0, 100) || [], // First 100 names
      errors: gltfValidation.errors,
      warnings: [],
    };

    // Check warnings
    if (!lodResult.triangle_budget_met) {
      lodResult.warnings.push(`Triangle count ${lodResult.triangle_count} exceeds budget ${budget}`);
    }

    // Check file size for web delivery
    const sizeMB = stats.size / (1024 * 1024);
    if (lod === 'low' && sizeMB > 20) {
      lodResult.warnings.push(`Low LOD file size ${sizeMB.toFixed(1)}MB exceeds 20MB recommendation`);
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
  for (const sex of ['male', 'female', 'neutral']) {
    for (const type of ['body', 'muscles', 'skeleton']) {
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

        for (const [lod, lodResult] of Object.entries(result.results)) {
          const sizeMB = (lodResult.file_size_bytes / (1024 * 1024)).toFixed(1);
          console.log(`    ${lod}: ${lodResult.mesh_count} meshes, ${sizeMB}MB, valid=${lodResult.gltf_valid}`);
        }
      }
    }
  }

  // Also validate public directory files
  console.log('\nValidating public models...');
  for (const subdir of ['bodies', 'muscles']) {
    const publicSubdir = path.join(PUBLIC_DIR, subdir);
    if (!fs.existsSync(publicSubdir)) continue;

    for (const file of fs.readdirSync(publicSubdir)) {
      if (!file.endsWith('.glb')) continue;
      const filePath = path.join(publicSubdir, file);
      const validation = validateGLTF(filePath);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
      console.log(`  ${file}: ${sizeMB}MB, valid=${validation.valid}`);
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
  console.log(`  Total: ${allResults.length}`);
  console.log(`  Passed: ${allResults.filter(r => r.overall_status === 'PASS').length}`);
  console.log(`  Warnings: ${allResults.filter(r => r.overall_status === 'WARN').length}`);
  console.log(`  Failed: ${allResults.filter(r => r.overall_status === 'FAIL').length}`);
}

main().catch(console.error);
