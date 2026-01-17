/**
 * Anatomy Asset Registry
 * Single source of truth for anatomy asset metadata and loading
 */

import type { AnatomyManifest, AnatomyAsset, LODLevel, AnatomyType, Sex } from './types';

// Import manifest at build time
import manifest from './anatomy-manifest.json';

class AnatomyAssetRegistry {
  private manifest: AnatomyManifest;

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
    return Object.values(this.manifest.assets).filter((a) => a.type === type);
  }

  /**
   * Get assets by sex
   */
  getAssetsBySex(sex: Sex): AnatomyAsset[] {
    return Object.values(this.manifest.assets).filter((a) => a.sex === sex);
  }

  /**
   * Get default asset for a category
   */
  getDefault(
    category: 'maleBody' | 'femaleBody' | 'maleMuscles' | 'femaleMuscles'
  ): AnatomyAsset | undefined {
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
      preferredLod === 'high'
        ? ['high', 'medium', 'low']
        : preferredLod === 'medium'
          ? ['medium', 'high', 'low']
          : ['low', 'medium', 'high'];

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
   * Get all muscle-related mesh names (filter out bones, joints, etc.)
   */
  getFilteredMuscleNames(asset: AnatomyAsset): string[] {
    if (asset.type !== 'muscles') return [];

    return asset.metadata.meshNames.filter((name) => {
      // Filter to only include actual muscle meshes
      const lowerName = name.toLowerCase();
      return (
        lowerName.includes('muscle') ||
        lowerName.includes('muscl') ||
        // Common muscle names
        lowerName.includes('deltoid') ||
        lowerName.includes('bicep') ||
        lowerName.includes('tricep') ||
        lowerName.includes('pectoral') ||
        lowerName.includes('abdomin') ||
        lowerName.includes('gluteu') ||
        lowerName.includes('quadricep') ||
        lowerName.includes('hamstring') ||
        lowerName.includes('gastrocnem') ||
        lowerName.includes('soleus') ||
        lowerName.includes('trapezius') ||
        lowerName.includes('latissimus') ||
        lowerName.includes('abductor') ||
        lowerName.includes('adductor') ||
        lowerName.includes('flexor') ||
        lowerName.includes('extensor')
      );
    });
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
    return (
      asset.license.attribution ||
      `Model by ${asset.source.author || 'Unknown'} (${asset.license.spdxId})`
    );
  }

  /**
   * Get manifest version
   */
  getVersion(): string {
    return this.manifest.version;
  }

  /**
   * Get asset keys
   */
  getAssetKeys(): string[] {
    return Object.keys(this.manifest.assets);
  }
}

// Export singleton instance
export const anatomyRegistry = new AnatomyAssetRegistry();
export default anatomyRegistry;
