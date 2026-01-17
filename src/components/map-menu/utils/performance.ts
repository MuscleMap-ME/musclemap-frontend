/**
 * MapMenu Performance Utilities
 *
 * Device capability detection and quality level determination.
 * Ensures the MapMenu renders optimally on all devices.
 */

import type { DeviceCapabilities, QualityLevel } from '../types';

/**
 * Detect device capabilities for adaptive rendering
 */
export function detectCapabilities(): DeviceCapabilities {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: {
      effectiveType?: string;
    };
  };

  return {
    memory: nav.deviceMemory ?? null,
    cores: nav.hardwareConcurrency ?? 4,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    effectiveType: nav.connection?.effectiveType ?? null,
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    prefersHighContrast: window.matchMedia('(prefers-contrast: high)').matches,
    supportsWebGL2: checkWebGL2Support(),
    supportsOffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
  };
}

/**
 * Check if WebGL2 is supported
 */
function checkWebGL2Support(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    return !!context;
  } catch {
    return false;
  }
}

/**
 * Determine optimal quality level based on device capabilities
 */
export function determineQualityLevel(caps: DeviceCapabilities): QualityLevel {
  // Always use lite if user prefers reduced motion
  if (caps.prefersReducedMotion) {
    return 'lite';
  }

  // Use lite for slow connections
  if (caps.effectiveType === '2g' || caps.effectiveType === 'slow-2g') {
    return 'lite';
  }

  // Use lite for low memory devices
  if (caps.memory !== null && caps.memory < 4) {
    return 'lite';
  }

  // Use lite if no WebGL2 support
  if (!caps.supportsWebGL2) {
    return 'lite';
  }

  // Use high for powerful devices
  if (
    caps.memory !== null &&
    caps.memory >= 8 &&
    caps.cores >= 4 &&
    (caps.effectiveType === '4g' || caps.effectiveType === null)
  ) {
    return 'high';
  }

  // Default to medium
  return 'medium';
}

/**
 * Probe the current FPS to detect performance issues
 */
export function probeFPS(durationMs: number = 500): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    const startTime = performance.now();

    function count() {
      frames++;
      if (performance.now() - startTime < durationMs) {
        requestAnimationFrame(count);
      } else {
        const elapsed = performance.now() - startTime;
        resolve(Math.round((frames / elapsed) * 1000));
      }
    }

    requestAnimationFrame(count);
  });
}

/**
 * Performance metrics logger
 */
export class PerformanceLogger {
  private metrics: Map<string, number[]> = new Map();
  private enabled: boolean;

  constructor(enabled: boolean = import.meta.env.DEV) {
    this.enabled = enabled;
  }

  /**
   * Log a performance metric
   */
  log(metric: string, value: number): void {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    this.metrics.get(metric)!.push(value);

    if (this.enabled) {
      console.log(`[MapMenu Performance] ${metric}: ${value.toFixed(2)}ms`);
    }
  }

  /**
   * Start a timing measurement
   */
  start(metric: string): () => void {
    const startTime = performance.now();
    return () => {
      this.log(metric, performance.now() - startTime);
    };
  }

  /**
   * Get performance report
   */
  report(): Record<string, { avg: number; min: number; max: number; samples: number }> {
    const report: Record<string, { avg: number; min: number; max: number; samples: number }> = {};

    this.metrics.forEach((values, metric) => {
      if (values.length === 0) return;

      const sum = values.reduce((a, b) => a + b, 0);
      report[metric] = {
        avg: sum / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        samples: values.length,
      };
    });

    return report;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

// Singleton instance
export const perfLogger = new PerformanceLogger();

/**
 * Throttle function for performance-critical callbacks
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Debounce function for search and filter operations
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

/**
 * Get optimal pixel ratio for canvas rendering
 */
export function getOptimalPixelRatio(qualityLevel: QualityLevel): number {
  const baseRatio = window.devicePixelRatio || 1;

  switch (qualityLevel) {
    case 'lite':
      return 1;
    case 'medium':
      return Math.min(baseRatio, 1.5);
    case 'high':
      return Math.min(baseRatio, 2);
    default:
      return 1;
  }
}
