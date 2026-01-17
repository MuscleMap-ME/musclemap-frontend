/**
 * Type definitions for anatomy asset system
 */

import type * as THREE from 'three';

export type LODLevel = 'high' | 'medium' | 'low';
export type AnatomyType = 'body' | 'muscles' | 'skeleton';
export type Sex = 'male' | 'female' | 'neutral';

export interface AnatomyAssetFiles {
  high?: string;
  medium?: string;
  low?: string;
}

export interface AnatomyAssetMetadata {
  triangleCount: Record<string, number>;
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

export interface MuscleHighlightConfig {
  color: { r: number; g: number; b: number; a: number };
  emissiveIntensity: number;
  pulse: boolean;
}
