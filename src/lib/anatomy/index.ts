/**
 * Anatomy Library - Central exports
 * Provides 3D anatomy model loading, registry, and utilities
 */

// Types
export type {
  LODLevel,
  AnatomyType,
  Sex,
  AnatomyAssetFiles,
  AnatomyAssetMetadata,
  AnatomyAssetLicense,
  AnatomyAssetSource,
  AnatomyAsset,
  AnatomyManifest,
  AnatomyDefaults,
} from './types';

// Registry
export { anatomyRegistry, AnatomyRegistry } from './registry';

// Loader hooks
export {
  useAnatomyModel,
  useMuscleHighlight,
  preloadAnatomyModel,
} from './loader';
