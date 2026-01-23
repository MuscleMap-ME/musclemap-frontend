/**
 * Memory Monitor
 *
 * Monitors browser memory usage and provides warnings when memory is high.
 * Helps detect memory leaks and prevent browser crashes.
 *
 * Features:
 * - Real-time memory monitoring (Chrome only has full API)
 * - Warning thresholds with callbacks
 * - Automatic garbage collection triggers
 * - Memory usage logging for debugging
 * - Integration with Apollo cache GC
 */

import { garbageCollectCache, getCacheStats } from '../graphql/client';

// ============================================
// TYPES
// ============================================

export interface MemoryInfo {
  /** Used JS heap size in bytes */
  usedJSHeapSize: number;
  /** Total JS heap size in bytes */
  totalJSHeapSize: number;
  /** JS heap size limit in bytes */
  jsHeapSizeLimit: number;
  /** Percentage of heap used (0-1) */
  percentUsed: number;
  /** Human-readable used size */
  usedMB: string;
  /** Human-readable total size */
  totalMB: string;
  /** Human-readable limit */
  limitMB: string;
}

export interface MemoryWarning {
  level: 'warning' | 'critical' | 'emergency';
  message: string;
  memoryInfo: MemoryInfo;
  timestamp: Date;
  suggestions: string[];
}

export type MemoryWarningCallback = (warning: MemoryWarning) => void;

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Memory thresholds (percentage of heap limit)
  thresholds: {
    warning: 0.7,    // 70% - Start monitoring closely
    critical: 0.85,  // 85% - Trigger GC, show warning
    emergency: 0.95, // 95% - Aggressive cleanup, alert user
  },
  // Check interval in milliseconds
  checkInterval: 10000, // 10 seconds
  // Minimum time between warnings of same level
  warningCooldown: 60000, // 1 minute
  // Enable console logging
  enableLogging: process.env.NODE_ENV !== 'production',
};

// ============================================
// MEMORY MONITOR CLASS
// ============================================

class MemoryMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private callbacks: Set<MemoryWarningCallback> = new Set();
  private lastWarnings: Map<string, number> = new Map();
  private isSupported: boolean;
  private history: Array<{ timestamp: Date; info: MemoryInfo }> = [];
  private maxHistorySize = 100;

  constructor() {
    // Check if Performance.memory API is available (Chrome/Edge only)
    this.isSupported = typeof performance !== 'undefined' &&
      'memory' in performance &&
      typeof (performance as Performance & { memory?: unknown }).memory === 'object';
  }

  /**
   * Check if memory monitoring is supported in this browser
   */
  get supported(): boolean {
    return this.isSupported;
  }

  /**
   * Get current memory info
   * Returns null if API not supported
   */
  getMemoryInfo(): MemoryInfo | null {
    if (!this.isSupported) return null;

    const memory = (performance as Performance & {
      memory: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    }).memory;

    const info: MemoryInfo = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      percentUsed: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
      usedMB: (memory.usedJSHeapSize / (1024 * 1024)).toFixed(1),
      totalMB: (memory.totalJSHeapSize / (1024 * 1024)).toFixed(1),
      limitMB: (memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(1),
    };

    return info;
  }

  /**
   * Start monitoring memory usage
   */
  start(): void {
    if (this.intervalId) return;
    if (!this.isSupported) {
      if (CONFIG.enableLogging) {
        console.warn('[MemoryMonitor] Performance.memory API not supported in this browser');
      }
      return;
    }

    if (CONFIG.enableLogging) {
      console.log('[MemoryMonitor] Started monitoring memory usage');
    }

    this.check(); // Initial check
    this.intervalId = setInterval(() => this.check(), CONFIG.checkInterval);
  }

  /**
   * Stop monitoring memory usage
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      if (CONFIG.enableLogging) {
        console.log('[MemoryMonitor] Stopped monitoring memory usage');
      }
    }
  }

  /**
   * Register a callback for memory warnings
   */
  onWarning(callback: MemoryWarningCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Perform a memory check
   */
  check(): MemoryInfo | null {
    const info = this.getMemoryInfo();
    if (!info) return null;

    // Add to history
    this.history.push({ timestamp: new Date(), info });
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Check thresholds
    if (info.percentUsed >= CONFIG.thresholds.emergency) {
      this.handleEmergency(info);
    } else if (info.percentUsed >= CONFIG.thresholds.critical) {
      this.handleCritical(info);
    } else if (info.percentUsed >= CONFIG.thresholds.warning) {
      this.handleWarning(info);
    }

    return info;
  }

  /**
   * Handle warning level (70-85%)
   */
  private handleWarning(info: MemoryInfo): void {
    if (!this.shouldWarn('warning')) return;

    const warning: MemoryWarning = {
      level: 'warning',
      message: `Memory usage is elevated: ${info.usedMB}MB / ${info.limitMB}MB (${Math.round(info.percentUsed * 100)}%)`,
      memoryInfo: info,
      timestamp: new Date(),
      suggestions: [
        'Consider closing unused tabs',
        'Cache garbage collection will run automatically',
      ],
    };

    if (CONFIG.enableLogging) {
      console.warn(`[MemoryMonitor] ${warning.message}`);
    }

    this.notifyCallbacks(warning);
    this.lastWarnings.set('warning', Date.now());

    // Trigger light GC
    garbageCollectCache();
  }

  /**
   * Handle critical level (85-95%)
   */
  private handleCritical(info: MemoryInfo): void {
    if (!this.shouldWarn('critical')) return;

    const warning: MemoryWarning = {
      level: 'critical',
      message: `Memory usage is HIGH: ${info.usedMB}MB / ${info.limitMB}MB (${Math.round(info.percentUsed * 100)}%)`,
      memoryInfo: info,
      timestamp: new Date(),
      suggestions: [
        'Close other browser tabs',
        'Refresh the page if performance is degraded',
        'Clear application cache from Settings',
      ],
    };

    if (CONFIG.enableLogging) {
      console.error(`[MemoryMonitor] ${warning.message}`);
      console.log('[MemoryMonitor] Apollo cache stats:', getCacheStats());
    }

    this.notifyCallbacks(warning);
    this.lastWarnings.set('critical', Date.now());

    // Trigger aggressive GC
    garbageCollectCache();
  }

  /**
   * Handle emergency level (95%+)
   */
  private handleEmergency(info: MemoryInfo): void {
    // Always warn on emergency, no cooldown
    const warning: MemoryWarning = {
      level: 'emergency',
      message: `CRITICAL: Memory usage is dangerous: ${info.usedMB}MB / ${info.limitMB}MB (${Math.round(info.percentUsed * 100)}%)`,
      memoryInfo: info,
      timestamp: new Date(),
      suggestions: [
        'The page may crash soon - save any work',
        'Refresh the page immediately',
        'Close other browser tabs and applications',
      ],
    };

    console.error(`[MemoryMonitor] ${warning.message}`);
    console.error('[MemoryMonitor] Emergency! Attempting aggressive cleanup...');

    this.notifyCallbacks(warning);
    this.lastWarnings.set('emergency', Date.now());

    // Aggressive cleanup
    this.emergencyCleanup();
  }

  /**
   * Check if we should send a warning (respects cooldown)
   */
  private shouldWarn(level: string): boolean {
    const lastWarning = this.lastWarnings.get(level);
    if (!lastWarning) return true;
    return Date.now() - lastWarning >= CONFIG.warningCooldown;
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(warning: MemoryWarning): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(warning);
      } catch (error) {
        console.error('[MemoryMonitor] Callback error:', error);
      }
    });
  }

  /**
   * Emergency cleanup - aggressive memory freeing
   */
  private emergencyCleanup(): void {
    // 1. Clear Apollo cache
    garbageCollectCache();

    // 2. Clear browser caches if available
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          if (name.includes('musclemap')) {
            caches.delete(name);
          }
        });
      });
    }

    // 3. Clear localStorage cache entries
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('mm_cache_') || key?.startsWith('cache:')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignore localStorage errors
    }

    // 4. Request browser GC (non-standard, but works in some browsers)
    if (typeof (window as Window & { gc?: () => void }).gc === 'function') {
      (window as Window & { gc: () => void }).gc();
    }
  }

  /**
   * Get memory usage history
   */
  getHistory(): Array<{ timestamp: Date; info: MemoryInfo }> {
    return [...this.history];
  }

  /**
   * Get a summary of current memory state
   */
  getSummary(): {
    current: MemoryInfo | null;
    trend: 'increasing' | 'stable' | 'decreasing' | 'unknown';
    averageUsage: number;
    peakUsage: number;
    cacheStats: ReturnType<typeof getCacheStats>;
  } {
    const current = this.getMemoryInfo();
    const cacheStats = getCacheStats();

    if (this.history.length < 2) {
      return {
        current,
        trend: 'unknown',
        averageUsage: current?.percentUsed || 0,
        peakUsage: current?.percentUsed || 0,
        cacheStats,
      };
    }

    // Calculate trend from last 10 readings
    const recentHistory = this.history.slice(-10);
    const firstUsage = recentHistory[0].info.percentUsed;
    const lastUsage = recentHistory[recentHistory.length - 1].info.percentUsed;
    const diff = lastUsage - firstUsage;

    let trend: 'increasing' | 'stable' | 'decreasing';
    if (diff > 0.05) trend = 'increasing';
    else if (diff < -0.05) trend = 'decreasing';
    else trend = 'stable';

    // Calculate average and peak
    const usages = this.history.map((h) => h.info.percentUsed);
    const averageUsage = usages.reduce((a, b) => a + b, 0) / usages.length;
    const peakUsage = Math.max(...usages);

    return {
      current,
      trend,
      averageUsage,
      peakUsage,
      cacheStats,
    };
  }

  /**
   * Force a garbage collection cycle
   */
  forceGC(): { cacheCollected: number; memoryBefore: MemoryInfo | null; memoryAfter: MemoryInfo | null } {
    const memoryBefore = this.getMemoryInfo();
    const cacheResult = garbageCollectCache();

    // Give browser a moment to clean up
    const memoryAfter = this.getMemoryInfo();

    if (CONFIG.enableLogging) {
      console.log('[MemoryMonitor] Forced GC complete', {
        cacheCollected: cacheResult.collected,
        memoryBefore: memoryBefore?.usedMB,
        memoryAfter: memoryAfter?.usedMB,
      });
    }

    return {
      cacheCollected: cacheResult.collected,
      memoryBefore,
      memoryAfter,
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const memoryMonitor = new MemoryMonitor();

// ============================================
// REACT HOOK
// ============================================

import { useState, useEffect, useCallback } from 'react';

/**
 * React hook for memory monitoring
 *
 * @example
 * ```tsx
 * const { memoryInfo, warning, forceGC, summary } = useMemoryMonitor();
 *
 * if (warning?.level === 'critical') {
 *   showToast('Memory usage is high - consider refreshing the page');
 * }
 * ```
 */
export function useMemoryMonitor(options: { autoStart?: boolean } = {}) {
  const { autoStart = true } = options;

  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [warning, setWarning] = useState<MemoryWarning | null>(null);

  useEffect(() => {
    if (!memoryMonitor.supported) return;

    // Initial check
    setMemoryInfo(memoryMonitor.getMemoryInfo());

    // Start monitoring if requested
    if (autoStart) {
      memoryMonitor.start();
    }

    // Subscribe to warnings
    const unsubscribe = memoryMonitor.onWarning((w) => {
      setWarning(w);
      // Clear warning after 10 seconds for non-emergency
      if (w.level !== 'emergency') {
        setTimeout(() => setWarning(null), 10000);
      }
    });

    // Update memory info periodically
    const interval = setInterval(() => {
      setMemoryInfo(memoryMonitor.getMemoryInfo());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [autoStart]);

  const forceGC = useCallback(() => {
    return memoryMonitor.forceGC();
  }, []);

  const getSummary = useCallback(() => {
    return memoryMonitor.getSummary();
  }, []);

  const clearWarning = useCallback(() => {
    setWarning(null);
  }, []);

  return {
    supported: memoryMonitor.supported,
    memoryInfo,
    warning,
    forceGC,
    getSummary,
    clearWarning,
  };
}

// ============================================
// AUTO-START IN DEVELOPMENT
// ============================================

// Auto-start in development for debugging
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  // Delay start to not interfere with app initialization
  setTimeout(() => {
    memoryMonitor.start();
  }, 5000);
}

export default memoryMonitor;
