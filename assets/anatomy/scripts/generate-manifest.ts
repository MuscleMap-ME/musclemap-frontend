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

type LODLevel = 'high' | 'medium' | 'low';
type AnatomyType = 'body' | 'muscles' | 'skeleton';
type Sex = 'male' | 'female' | 'neutral';

interface AssetEntry {
  id: string;
  type: AnatomyType;
  sex: Sex;
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

function loadProvenance(assetId: string): any {
  // Search all vendor directories for the asset
  if (!fs.existsSync(SOURCES_DIR)) return null;

  for (const vendor of fs.readdirSync(SOURCES_DIR)) {
    const vendorDir = path.join(SOURCES_DIR, vendor);
    if (!fs.statSync(vendorDir).isDirectory()) continue;

    for (const asset of fs.readdirSync(vendorDir)) {
      if (asset === assetId || asset.includes(assetId.split('_').slice(-2, -1)[0])) {
        const provenancePath = path.join(vendorDir, asset, 'license', 'provenance.json');
        if (fs.existsSync(provenancePath)) {
          return JSON.parse(fs.readFileSync(provenancePath, 'utf-8'));
        }
      }
    }
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
  for (const sex of ['male', 'female', 'neutral'] as Sex[]) {
    for (const type of ['body', 'muscles', 'skeleton'] as AnatomyType[]) {
      const typeDir = path.join(PROCESSED_DIR, sex, type);
      if (!fs.existsSync(typeDir)) continue;

      for (const assetId of fs.readdirSync(typeDir)) {
        const assetDir = path.join(typeDir, assetId);
        if (!fs.statSync(assetDir).isDirectory()) continue;

        console.log(`Processing: ${assetId}`);

        const provenance = loadProvenance(assetId);
        const validation = loadValidationReport(assetDir);
        const highInfo = loadInfo(assetDir, 'high');

        // Build files object - check what exists in public directory
        const files: AssetEntry['files'] = {};
        const subdir = type === 'body' ? 'bodies' : 'muscles';

        for (const lod of ['high', 'med', 'low']) {
          const publicPath = path.join(PUBLIC_MODELS_PATH, subdir, `${assetId}-model-${lod}.glb`);
          if (fs.existsSync(publicPath)) {
            const lodKey = lod === 'med' ? 'medium' : lod as keyof typeof files;
            files[lodKey] = getPublicPath(assetId, lod, type);
          }
        }

        // Get mesh names (limit to 100 for manifest size)
        let meshNames = highInfo?.mesh_names || [];
        const fullMeshCount = meshNames.length;
        if (meshNames.length > 100) {
          meshNames = meshNames.slice(0, 100);
        }

        const entry: AssetEntry = {
          id: assetId,
          type,
          sex,
          files,
          metadata: {
            triangleCount: {
              high: highInfo?.total_triangles || 0,
              medium: 0, // Simplified models
              low: 0,
            },
            rigged: highInfo?.has_armature || false,
            boneCount: highInfo?.bone_count || 0,
            meshCount: fullMeshCount,
            meshNames,
            textures: [],
          },
          license: {
            spdxId: provenance?.license?.spdx_id || 'UNKNOWN',
            name: provenance?.license?.name,
            url: provenance?.license?.url,
            attribution: provenance?.license?.attribution_text,
            attributionRequired: provenance?.license?.attribution_required ?? true,
          },
          source: {
            url: provenance?.source_url || '',
            author: provenance?.author?.name,
            authorUrl: provenance?.author?.profile_url,
          },
          validationStatus: validation?.overall_status || 'PENDING',
        };

        // Generate manifest key
        const key = `${sex}_${type}`;
        manifest.assets[key] = entry;

        // Set defaults (first passing asset of each type)
        const defaultKey = `${sex}${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof manifest.defaults;
        if (defaultKey in manifest.defaults && !manifest.defaults[defaultKey] && entry.validationStatus !== 'FAIL') {
          manifest.defaults[defaultKey] = key;
        }
      }
    }
  }

  // Write manifest
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(`\nManifest generated: ${MANIFEST_PATH}`);
  console.log(`Total assets: ${Object.keys(manifest.assets).length}`);
  console.log(`Defaults: ${JSON.stringify(manifest.defaults, null, 2)}`);

  // Also copy manifest to src/lib/anatomy for import
  const srcManifestPath = 'src/lib/anatomy/anatomy-manifest.json';
  fs.mkdirSync(path.dirname(srcManifestPath), { recursive: true });
  fs.writeFileSync(srcManifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Also copied to: ${srcManifestPath}`);
}

main().catch(console.error);
