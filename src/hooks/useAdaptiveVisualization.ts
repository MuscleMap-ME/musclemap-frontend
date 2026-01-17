/**
 * Adaptive Visualization Hook
 *
 * Determines whether to use 3D or 2D muscle visualization based on:
 * 1. User preference (stored in localStorage and synced to settings)
 * 2. Device capability (WebGL support, memory, GPU)
 * 3. Network conditions (bandwidth, connection type)
 *
 * @module useAdaptiveVisualization
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { LODLevel } from '../lib/anatomy/types';
import type { VisualizationPreference, VisualizationSettings } from '../components/muscle-viewer/types';

// Storage key for user preference
const STORAGE_KEY = 'musclemap:visualization-preference';

/**
 * Check if WebGL2 is supported
 */
function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!gl;
  } catch {
    return false;
  }
}

/**
 * Get GPU info for capability assessment
 */
function getGPUInfo(): { renderer: string; vendor: string } | null {
  if (typeof window === 'undefined') return null;

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return null;

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return { renderer: 'unknown', vendor: 'unknown' };

    return {
      renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown',
      vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown',
    };
  } catch {
    return null;
  }
}

/**
 * Assess GPU capability tier
 */
function getGPUTier(gpuInfo: { renderer: string; vendor: string } | null): 'high' | 'medium' | 'low' {
  if (!gpuInfo) return 'low';

  const renderer = gpuInfo.renderer.toLowerCase();

  // High-end GPUs
  if (
    renderer.includes('nvidia') ||
    renderer.includes('radeon') ||
    renderer.includes('apple m') ||
    renderer.includes('apple gpu')
  ) {
    return 'high';
  }

  // Medium - integrated graphics
  if (
    renderer.includes('intel') ||
    renderer.includes('adreno') ||
    renderer.includes('mali')
  ) {
    return 'medium';
  }

  // Software rendering or unknown
  if (
    renderer.includes('swiftshader') ||
    renderer.includes('llvmpipe') ||
    renderer.includes('software')
  ) {
    return 'low';
  }

  return 'medium';
}

/**
 * Get LOD level based on device capabilities
 */
function determineLOD(
  gpuTier: 'high' | 'medium' | 'low',
  deviceMemory: number,
  connectionType: string | undefined
): LODLevel {
  // Low GPU tier always gets low LOD
  if (gpuTier === 'low') return 'low';

  // Low memory gets low LOD
  if (deviceMemory < 4) return 'low';

  // Slow connection gets lower LOD
  if (connectionType === '2g' || connectionType === 'slow-2g') return 'low';
  if (connectionType === '3g') return 'medium';

  // High tier with good memory gets best available
  if (gpuTier === 'high' && deviceMemory >= 8) return 'high';

  // Default to medium
  return 'medium';
}

/**
 * Main hook for adaptive visualization settings
 */
export function useAdaptiveVisualization(): VisualizationSettings & {
  setPreference: (pref: VisualizationPreference) => void;
} {
  // User preference from localStorage
  const [preference, setPreferenceState] = useState<VisualizationPreference>(() => {
    if (typeof window === 'undefined') return 'auto';
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'always-3d' || stored === 'always-2d' || stored === 'auto') {
      return stored;
    }
    return 'auto';
  });

  // Device capabilities (computed once)
  const [capabilities] = useState(() => {
    const supportsWebGL = checkWebGLSupport();
    const gpuInfo = getGPUInfo();
    const gpuTier = getGPUTier(gpuInfo);
    const deviceMemory = typeof navigator !== 'undefined'
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4
      : 4;

    return { supportsWebGL, gpuInfo, gpuTier, deviceMemory };
  });

  // Network conditions
  const [connectionType, setConnectionType] = useState<string | undefined>(() => {
    if (typeof navigator === 'undefined') return undefined;
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
    return connection?.effectiveType;
  });

  // Listen for network changes
  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const connection = (navigator as Navigator & {
      connection?: EventTarget & { effectiveType?: string }
    }).connection;

    if (!connection) return;

    const handleChange = () => {
      setConnectionType((connection as { effectiveType?: string }).effectiveType);
    };

    connection.addEventListener('change', handleChange);
    return () => connection.removeEventListener('change', handleChange);
  }, []);

  // Save preference to localStorage
  const setPreference = useCallback((pref: VisualizationPreference) => {
    setPreferenceState(pref);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, pref);
    }
  }, []);

  // Compute final settings
  const settings = useMemo((): VisualizationSettings => {
    const { supportsWebGL, gpuTier, deviceMemory } = capabilities;

    // User explicitly wants 2D
    if (preference === 'always-2d') {
      return {
        use3D: false,
        lod: 'low',
        preference,
        supportsWebGL,
        reason: 'User preference set to 2D',
      };
    }

    // User explicitly wants 3D
    if (preference === 'always-3d') {
      if (!supportsWebGL) {
        return {
          use3D: false,
          lod: 'low',
          preference,
          supportsWebGL,
          reason: 'Device does not support WebGL',
        };
      }

      const lod = determineLOD(gpuTier, deviceMemory, connectionType);
      return {
        use3D: true,
        lod,
        preference,
        supportsWebGL,
        reason: 'User preference set to 3D',
      };
    }

    // Auto mode - determine based on device capabilities
    if (!supportsWebGL) {
      return {
        use3D: false,
        lod: 'low',
        preference,
        supportsWebGL,
        reason: 'WebGL not supported',
      };
    }

    // Low memory = use 2D
    if (deviceMemory < 4) {
      return {
        use3D: false,
        lod: 'low',
        preference,
        supportsWebGL,
        reason: 'Low device memory (<4GB)',
      };
    }

    // Very slow connection = use 2D
    if (connectionType === '2g' || connectionType === 'slow-2g') {
      return {
        use3D: false,
        lod: 'low',
        preference,
        supportsWebGL,
        reason: 'Slow network connection',
      };
    }

    // Low GPU tier = use 2D
    if (gpuTier === 'low') {
      return {
        use3D: false,
        lod: 'low',
        preference,
        supportsWebGL,
        reason: 'Low GPU capability',
      };
    }

    // All checks passed - use 3D with appropriate LOD
    const lod = determineLOD(gpuTier, deviceMemory, connectionType);
    return {
      use3D: true,
      lod,
      preference,
      supportsWebGL,
      reason: `Auto-detected ${gpuTier} GPU, ${deviceMemory}GB memory`,
    };
  }, [capabilities, preference, connectionType]);

  return {
    ...settings,
    setPreference,
  };
}

/**
 * Hook to check if device supports 3D visualization
 */
export function useSupports3D(): boolean {
  const [supports, setSupports] = useState(true);

  useEffect(() => {
    setSupports(checkWebGLSupport());
  }, []);

  return supports;
}

export default useAdaptiveVisualization;
