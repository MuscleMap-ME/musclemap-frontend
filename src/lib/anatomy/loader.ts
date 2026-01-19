/**
 * Anatomy Model Loader
 * Handles loading and caching of 3D anatomy models
 */

import { useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { anatomyRegistry } from './registry';
import type { LODLevel, LoadedAnatomyModel } from './types';

// Preloaded models cache
const preloadedModels = new Set<string>();

/**
 * Preload a model (call during idle time or on hover)
 */
export function preloadAnatomyModel(assetKey: string, lod: LODLevel = 'medium'): void {
  const asset = anatomyRegistry.getAsset(assetKey);
  if (!asset) return;

  const filePath = anatomyRegistry.getFilePath(asset, lod);
  if (filePath && !preloadedModels.has(filePath)) {
    useGLTF.preload(filePath);
    preloadedModels.add(filePath);
  }
}

/**
 * Preload all LODs for an asset
 */
export function preloadAllLODs(assetKey: string): void {
  const asset = anatomyRegistry.getAsset(assetKey);
  if (!asset) return;

  for (const lod of ['low', 'medium', 'high'] as LODLevel[]) {
    const filePath = anatomyRegistry.getFilePath(asset, lod);
    if (filePath && !preloadedModels.has(filePath)) {
      useGLTF.preload(filePath);
      preloadedModels.add(filePath);
    }
  }
}

/**
 * Hook to load an anatomy model
 */
export function useAnatomyModel(
  assetKey: string | null,
  options: {
    lod?: LODLevel;
    autoSelectLOD?: boolean;
  } = {}
): {
  model: LoadedAnatomyModel | null;
  loading: boolean;
  error: Error | null;
  meshes: Map<string, THREE.Mesh>;
  meshNames: string[];
} {
  const { lod = 'medium', autoSelectLOD = true } = options;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const [meshNames, setMeshNames] = useState<string[]>([]);

  // Get asset from registry
  const asset = useMemo(() => {
    if (!assetKey) return null;
    return anatomyRegistry.getAsset(assetKey);
  }, [assetKey]);

  // Determine actual LOD to use
  const actualLod = useMemo(() => {
    if (!asset) return lod;
    return autoSelectLOD ? anatomyRegistry.getBestAvailableLOD(asset, lod) : lod;
  }, [asset, lod, autoSelectLOD]);

  // Get file path
  const filePath = useMemo(() => {
    if (!asset) return null;
    return anatomyRegistry.getFilePath(asset, actualLod);
  }, [asset, actualLod]);

  // Load the model using useGLTF
  const gltf = useGLTF(filePath || '');

  // Extract meshes when scene loads
  useEffect(() => {
    if (!gltf?.scene || !filePath) {
      setLoading(false);
      return;
    }

    try {
      meshesRef.current.clear();
      const names: string[] = [];

      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshesRef.current.set(child.name, child);
          names.push(child.name);

          // Ensure materials are ready for manipulation
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.transparent = true;
                }
              });
            } else if (child.material instanceof THREE.MeshStandardMaterial) {
              child.material.transparent = true;
            }
          }
        }
      });

      setMeshNames(names);
      setLoading(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to process model'));
      setLoading(false);
    }
  }, [gltf?.scene, filePath]);

  // Build loaded model object
  const model = useMemo((): LoadedAnatomyModel | null => {
    if (!asset || !gltf?.scene) return null;

    return {
      asset,
      lod: actualLod,
      scene: gltf.scene.clone(),
      meshes: meshesRef.current,
      skeleton: undefined, // Extract if needed
    };
  }, [asset, gltf?.scene, actualLod]);

  return {
    model,
    loading,
    error,
    meshes: meshesRef.current,
    meshNames,
  };
}

/**
 * Hook to highlight specific muscles
 */
export function useMuscleHighlight(
  meshes: Map<string, THREE.Mesh>,
  highlightedMuscles: string[],
  options: {
    highlightColor?: THREE.Color;
    baseColor?: THREE.Color;
    highlightOpacity?: number;
    baseOpacity?: number;
    emissiveIntensity?: number;
  } = {}
) {
  const {
    highlightColor = new THREE.Color(0x00ff00),
    baseColor = new THREE.Color(0xcc6666),
    highlightOpacity = 1.0,
    baseOpacity = 0.7,
    emissiveIntensity = 0.3,
  } = options;

  useEffect(() => {
    meshes.forEach((mesh, name) => {
      const isHighlighted = highlightedMuscles.some(
        (h) => name.toLowerCase().includes(h.toLowerCase()) || h.toLowerCase().includes(name.toLowerCase())
      );

      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        if (isHighlighted) {
          mesh.material.color.copy(highlightColor);
          mesh.material.emissive.copy(highlightColor);
          mesh.material.emissiveIntensity = emissiveIntensity;
          mesh.material.opacity = highlightOpacity;
        } else {
          mesh.material.color.copy(baseColor);
          mesh.material.emissive.setHex(0x000000);
          mesh.material.emissiveIntensity = 0;
          mesh.material.opacity = baseOpacity;
        }
        mesh.material.needsUpdate = true;
      }
    });
  }, [meshes, highlightedMuscles, highlightColor, baseColor, highlightOpacity, baseOpacity, emissiveIntensity]);
}

/**
 * Get loading stats for debugging
 */
export function getModelCacheStats(): { count: number; keys: string[] } {
  return {
    count: preloadedModels.size,
    keys: Array.from(preloadedModels),
  };
}
