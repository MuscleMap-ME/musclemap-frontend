/**
 * Memory Debug Tools
 *
 * Developer tools for investigating memory issues.
 * These functions are exposed on window.__MUSCLEMAP_DEBUG__ in development.
 *
 * Usage in browser console:
 * ```js
 * __MUSCLEMAP_DEBUG__.memory.getReport()
 * __MUSCLEMAP_DEBUG__.memory.clearAll()
 * __MUSCLEMAP_DEBUG__.memory.trackLeaks()
 * ```
 */

import { memoryMonitor } from './memory-monitor';
import {
  garbageCollectCache,
  getCacheStats,
  clearApolloCache,
  resetCache,
  evictQuery,
  CACHE_LIMITS,
} from '../graphql/client';
import { getCacheStats as getApolloPersistStats } from './apollo-persist';
import { cache as appCache } from './cache';

// ============================================
// TYPES
// ============================================

interface MemoryReport {
  timestamp: string;
  browser: {
    supported: boolean;
    memory: ReturnType<typeof memoryMonitor.getMemoryInfo>;
    trend: string;
  };
  apollo: {
    cacheStats: ReturnType<typeof getCacheStats>;
    cacheLimits: typeof CACHE_LIMITS;
  };
  localStorage: {
    totalKeys: number;
    cacheKeys: number;
    estimatedSizeKB: number;
  };
  indexedDB: {
    apolloPersist: Awaited<ReturnType<typeof getApolloPersistStats>> | null;
  };
  appCache: {
    memoryKeys: string[];
    localStorageKeys: string[];
  };
  recommendations: string[];
}

// ============================================
// MEMORY REPORT
// ============================================

/**
 * Generate a comprehensive memory report
 */
async function getMemoryReport(): Promise<MemoryReport> {
  const summary = memoryMonitor.getSummary();
  const apolloStats = getCacheStats();
  const apolloPersistStats = await getApolloPersistStats();
  const appCacheStats = appCache.getStats();

  // Analyze localStorage
  let localStorageCacheKeys = 0;
  let localStorageSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key) || '';
      localStorageSize += key.length + value.length;
      if (key.startsWith('mm_cache_') || key.startsWith('cache:') || key.startsWith('musclemap')) {
        localStorageCacheKeys++;
      }
    }
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (summary.current && summary.current.percentUsed > 0.7) {
    recommendations.push('Memory usage is high. Consider refreshing the page.');
  }

  if (apolloStats.estimatedSizeKB > 5000) {
    recommendations.push('Apollo cache is large (>5MB). Consider clearing with clearApolloCache().');
  }

  if (apolloStats.totalEntries > 1000) {
    recommendations.push('Apollo cache has many entries. Run garbageCollectCache().');
  }

  if (localStorageCacheKeys > 50) {
    recommendations.push('Many localStorage cache entries. Consider clearing old entries.');
  }

  if (summary.trend === 'increasing') {
    recommendations.push('Memory usage is trending up. Possible memory leak.');
  }

  if (apolloPersistStats && parseFloat(apolloPersistStats.percentUsed) > 80) {
    recommendations.push('IndexedDB cache is nearly full. Clear with clearPersistedCache().');
  }

  return {
    timestamp: new Date().toISOString(),
    browser: {
      supported: memoryMonitor.supported,
      memory: summary.current,
      trend: summary.trend,
    },
    apollo: {
      cacheStats: apolloStats,
      cacheLimits: CACHE_LIMITS,
    },
    localStorage: {
      totalKeys: localStorage.length,
      cacheKeys: localStorageCacheKeys,
      estimatedSizeKB: Math.round(localStorageSize / 1024),
    },
    indexedDB: {
      apolloPersist: apolloPersistStats,
    },
    appCache: {
      memoryKeys: appCacheStats.memory.keys,
      localStorageKeys: appCacheStats.localStorage.keys,
    },
    recommendations,
  };
}

/**
 * Print a formatted memory report to console
 */
async function printMemoryReport(): Promise<void> {
  const report = await getMemoryReport();

  console.group('%c🧠 MuscleMap Memory Report', 'font-size: 16px; font-weight: bold; color: #0066FF;');
  console.log('%cTimestamp:', 'font-weight: bold;', report.timestamp);

  console.group('%cBrowser Memory', 'font-weight: bold; color: #10B981;');
  if (report.browser.supported && report.browser.memory) {
    console.log(`Used: ${report.browser.memory.usedMB}MB / ${report.browser.memory.limitMB}MB`);
    console.log(`Percent: ${Math.round(report.browser.memory.percentUsed * 100)}%`);
    console.log(`Trend: ${report.browser.trend}`);
  } else {
    console.log('Memory API not supported in this browser');
  }
  console.groupEnd();

  console.group('%cApollo Cache', 'font-weight: bold; color: #8B5CF6;');
  console.log(`Root Query Fields: ${report.apollo.cacheStats.rootQueryCount}`);
  console.log(`Total Entries: ${report.apollo.cacheStats.totalEntries}`);
  console.log(`Estimated Size: ${report.apollo.cacheStats.estimatedSizeKB}KB`);
  console.log('Cache Limits:', report.apollo.cacheLimits);
  console.groupEnd();

  console.group('%cLocalStorage', 'font-weight: bold; color: #F59E0B;');
  console.log(`Total Keys: ${report.localStorage.totalKeys}`);
  console.log(`Cache Keys: ${report.localStorage.cacheKeys}`);
  console.log(`Estimated Size: ${report.localStorage.estimatedSizeKB}KB`);
  console.groupEnd();

  console.group('%cIndexedDB', 'font-weight: bold; color: #EC4899;');
  if (report.indexedDB.apolloPersist) {
    console.log(`Entries: ${report.indexedDB.apolloPersist.entries}`);
    console.log(`Size: ${report.indexedDB.apolloPersist.sizeMB}MB / ${report.indexedDB.apolloPersist.maxSizeMB}MB`);
    console.log(`Used: ${report.indexedDB.apolloPersist.percentUsed}%`);
  } else {
    console.log('No IndexedDB data available');
  }
  console.groupEnd();

  console.group('%cApp Cache', 'font-weight: bold; color: #06B6D4;');
  console.log(`Memory Cache Keys: ${report.appCache.memoryKeys.length}`);
  console.log(`LocalStorage Cache Keys: ${report.appCache.localStorageKeys.length}`);
  console.groupEnd();

  if (report.recommendations.length > 0) {
    console.group('%c⚠️ Recommendations', 'font-weight: bold; color: #EF4444;');
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
    console.groupEnd();
  }

  console.groupEnd();
}

// ============================================
// CLEANUP FUNCTIONS
// ============================================

/**
 * Clear all caches
 */
async function clearAll(): Promise<void> {
  console.log('%c🧹 Clearing all caches...', 'color: #F59E0B; font-weight: bold;');

  // 1. Clear Apollo cache
  console.log('Clearing Apollo cache...');
  await clearApolloCache();

  // 2. Clear app cache
  console.log('Clearing app cache...');
  await appCache.clear();

  // 3. Clear localStorage cache entries
  console.log('Clearing localStorage cache entries...');
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('mm_cache_') || key?.startsWith('cache:')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  console.log(`Removed ${keysToRemove.length} localStorage entries`);

  // 4. Run GC
  console.log('Running garbage collection...');
  garbageCollectCache();

  console.log('%c✅ All caches cleared!', 'color: #10B981; font-weight: bold;');
  await printMemoryReport();
}

/**
 * Clear only Apollo-related caches
 */
async function clearApollo(): Promise<void> {
  console.log('%c🧹 Clearing Apollo cache...', 'color: #8B5CF6; font-weight: bold;');
  await resetCache();
  console.log('%c✅ Apollo cache cleared!', 'color: #10B981; font-weight: bold;');
}

// ============================================
// LEAK DETECTION
// ============================================

let leakTrackingInterval: ReturnType<typeof setInterval> | null = null;
const leakHistory: Array<{ timestamp: Date; memoryMB: number; cacheEntries: number }> = [];

/**
 * Start tracking for memory leaks
 * Logs memory usage every 10 seconds
 */
function trackLeaks(durationSeconds: number = 300): void {
  if (leakTrackingInterval) {
    console.log('Leak tracking already running. Call stopTrackingLeaks() first.');
    return;
  }

  console.log(
    `%c🔍 Starting leak tracking for ${durationSeconds} seconds...`,
    'color: #F59E0B; font-weight: bold;'
  );

  leakHistory.length = 0;

  const track = () => {
    const memInfo = memoryMonitor.getMemoryInfo();
    const cacheStats = getCacheStats();

    if (memInfo) {
      leakHistory.push({
        timestamp: new Date(),
        memoryMB: parseFloat(memInfo.usedMB),
        cacheEntries: cacheStats.totalEntries,
      });

      console.log(
        `[Leak Track] Memory: ${memInfo.usedMB}MB | Cache: ${cacheStats.totalEntries} entries`
      );
    }
  };

  track(); // Initial
  leakTrackingInterval = setInterval(track, 10000);

  // Auto-stop after duration
  setTimeout(() => {
    stopTrackingLeaks();
  }, durationSeconds * 1000);
}

/**
 * Stop tracking for memory leaks and show results
 */
function stopTrackingLeaks(): void {
  if (!leakTrackingInterval) {
    console.log('No leak tracking running.');
    return;
  }

  clearInterval(leakTrackingInterval);
  leakTrackingInterval = null;

  console.log('%c📊 Leak Tracking Results', 'font-size: 14px; font-weight: bold; color: #0066FF;');

  if (leakHistory.length < 2) {
    console.log('Not enough data points collected.');
    return;
  }

  const first = leakHistory[0];
  const last = leakHistory[leakHistory.length - 1];

  const memoryChange = last.memoryMB - first.memoryMB;
  const cacheChange = last.cacheEntries - first.cacheEntries;
  const durationMinutes = (last.timestamp.getTime() - first.timestamp.getTime()) / 60000;

  console.log(`Duration: ${durationMinutes.toFixed(1)} minutes`);
  console.log(`Memory change: ${memoryChange > 0 ? '+' : ''}${memoryChange.toFixed(1)}MB`);
  console.log(`Cache entries change: ${cacheChange > 0 ? '+' : ''}${cacheChange}`);
  console.log(`Memory growth rate: ${(memoryChange / durationMinutes).toFixed(2)}MB/min`);

  if (memoryChange > 50) {
    console.log(
      '%c⚠️ Significant memory growth detected! Possible memory leak.',
      'color: #EF4444; font-weight: bold;'
    );
  } else if (memoryChange > 20) {
    console.log(
      '%c⚠️ Moderate memory growth. Monitor closely.',
      'color: #F59E0B; font-weight: bold;'
    );
  } else {
    console.log('%c✅ Memory usage appears stable.', 'color: #10B981; font-weight: bold;');
  }

  console.table(leakHistory);
}

// ============================================
// QUERY INSPECTION
// ============================================

/**
 * Inspect Apollo cache for a specific query
 */
function inspectQuery(queryName: string): void {
  const cacheData = (window as Window & { __APOLLO_CLIENT__?: { cache: { extract: () => Record<string, unknown> } } }).__APOLLO_CLIENT__?.cache?.extract();

  if (!cacheData) {
    console.log('Apollo cache not accessible');
    return;
  }

  const rootQuery = cacheData['ROOT_QUERY'] as Record<string, unknown> | undefined;
  if (!rootQuery) {
    console.log('ROOT_QUERY not found');
    return;
  }

  const matchingKeys = Object.keys(rootQuery).filter((key) =>
    key.toLowerCase().includes(queryName.toLowerCase())
  );

  console.group(`%c🔍 Query: ${queryName}`, 'font-weight: bold; color: #8B5CF6;');
  console.log(`Found ${matchingKeys.length} matching cache entries:`);

  matchingKeys.forEach((key) => {
    const value = rootQuery[key];
    const size = JSON.stringify(value).length;
    console.log(`  ${key}: ${size} bytes`);
    if (Array.isArray(value)) {
      console.log(`    Array length: ${value.length}`);
    }
  });

  console.groupEnd();
}

/**
 * Evict a specific query from cache
 */
function evict(queryName: string): void {
  const result = evictQuery(queryName);
  if (result) {
    console.log(`%c✅ Evicted query: ${queryName}`, 'color: #10B981;');
  } else {
    console.log(`%c❌ Failed to evict query: ${queryName}`, 'color: #EF4444;');
  }
}

// ============================================
// EXPORT DEBUG OBJECT
// ============================================

export const memoryDebug = {
  // Reports
  getReport: getMemoryReport,
  printReport: printMemoryReport,

  // Cleanup
  clearAll,
  clearApollo,
  gc: garbageCollectCache,
  forceGC: () => memoryMonitor.forceGC(),

  // Leak detection
  trackLeaks,
  stopTrackingLeaks,

  // Query inspection
  inspectQuery,
  evict,

  // Direct access
  monitor: memoryMonitor,
  getCacheStats,
  CACHE_LIMITS,
};

// ============================================
// EXPOSE ON WINDOW IN DEVELOPMENT
// ============================================

if (typeof window !== 'undefined') {
  const debugWindow = window as Window & {
    __MUSCLEMAP_DEBUG__?: {
      memory: typeof memoryDebug;
    };
  };

  if (!debugWindow.__MUSCLEMAP_DEBUG__) {
    debugWindow.__MUSCLEMAP_DEBUG__ = { memory: memoryDebug };
  } else {
    debugWindow.__MUSCLEMAP_DEBUG__.memory = memoryDebug;
  }

  // Log helpful message in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      '%c🧠 MuscleMap Memory Debug Tools Available',
      'color: #0066FF; font-weight: bold;'
    );
    console.log('Use __MUSCLEMAP_DEBUG__.memory.printReport() to see memory stats');
    console.log('Use __MUSCLEMAP_DEBUG__.memory.clearAll() to clear all caches');
    console.log('Use __MUSCLEMAP_DEBUG__.memory.trackLeaks() to monitor for leaks');
  }
}

export default memoryDebug;
