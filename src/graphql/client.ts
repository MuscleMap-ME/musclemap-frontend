/**
 * Apollo Client Configuration
 *
 * Sets up Apollo Client with authentication, error handling, and caching.
 * Includes IndexedDB persistence for instant loads on repeat visits.
 *
 * Cross-Platform Compatibility Features:
 * - Resilient storage (works with Brave Shields, private mode, etc.)
 * - Configurable timeouts (prevents hangs on slow connections)
 * - Adaptive batch intervals based on connection quality
 *
 * Memory Management Features:
 * - Cache size limits on paginated queries to prevent unbounded growth
 * - Automatic cache garbage collection
 * - Memory monitoring and warnings
 */

import { ApolloClient, InMemoryCache, from, HttpLink } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { initializeCachePersistence, clearPersistedCache } from '../lib/apollo-persist';
import { storage } from '../lib/storage';

// ============================================
// CACHE SIZE LIMITS
// Prevents unbounded memory growth from paginated queries
// ============================================
const CACHE_LIMITS = {
  workouts: 200,      // Max 200 workouts in cache
  exercises: 500,     // Max 500 exercises in cache
  goals: 100,         // Max 100 goals in cache
  messages: 500,      // Max 500 messages per conversation
  notifications: 200, // Max 200 notifications in cache
  feed: 100,          // Max 100 feed items
};

/**
 * Helper to limit array size in merge functions
 * Prevents unbounded cache growth that causes memory leaks
 */
function limitArraySize<T>(arr: T[], maxSize: number): T[] {
  if (arr.length <= maxSize) return arr;
  // Keep the most recent items (assuming newest are at end for append, start for prepend)
  return arr.slice(-maxSize);
}

// Network configuration
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const SLOW_NETWORK_TIMEOUT = 60000; // 60 seconds for slow connections

/**
 * Get timeout based on connection quality
 */
function getAdaptiveTimeout(): number {
  const connection = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
  if (!connection?.effectiveType) return DEFAULT_TIMEOUT;

  switch (connection.effectiveType) {
    case 'slow-2g':
    case '2g':
    case '3g':
      return SLOW_NETWORK_TIMEOUT;
    default:
      return DEFAULT_TIMEOUT;
  }
}

/**
 * Fetch with timeout - prevents hanging on slow/dead connections
 */
function fetchWithTimeout(uri: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = getAdaptiveTimeout();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return fetch(uri, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}

/**
 * HTTP Link - standard GraphQL HTTP transport
 * Note: Batching disabled because server doesn't support batch requests format
 */
const httpLink = new HttpLink({
  uri: '/api/graphql',
  credentials: 'include',
  fetch: fetchWithTimeout, // Use timeout-enabled fetch
});

/**
 * Auth Link - adds JWT token to requests
 * Uses resilient storage that works with Brave Shields, private mode, etc.
 */
const authLink = setContext((_, { headers }) => {
  // Get token from resilient storage (works even when localStorage blocked)
  try {
    const authData = storage.getItem('musclemap-auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      const token = parsed?.state?.token;
      if (token) {
        return {
          headers: {
            ...headers,
            authorization: `Bearer ${token}`,
          },
        };
      }
    }
  } catch {
    // Error reading auth token - continue without auth
  }
  return { headers };
});

/**
 * Retry Link - automatically retry failed requests
 * Useful for handling transient network errors
 */
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 5000,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      // Only retry on network errors, not GraphQL errors
      return !!error && !error.result;
    },
  },
});

/**
 * Error Link - handles GraphQL and network errors
 */
const errorLink = onError(({ graphQLErrors, networkError: _networkError, operation: _operation }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      const { extensions } = err;

      // Handle authentication errors
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Clear auth and redirect to login (using resilient storage)
        storage.removeItem('musclemap-auth');
        window.location.href = '/login';
      }
    }
  }
});

/**
 * Apollo Client Cache Configuration
 * Optimized for SPA performance with intelligent caching strategies
 */
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Merge paginated workout lists with size limit
        // PERF: Uses cursor-based logic (no offset support)
        myWorkouts: {
          keyArgs: ['filter', 'sortBy'],
          merge(existing = [], incoming, { args }) {
            // Reset when no cursor (first page / new search)
            if (!args?.cursor) {
              return limitArraySize(incoming, CACHE_LIMITS.workouts);
            }
            // Append for pagination with cursor and size limit
            const merged = [...existing, ...incoming];
            return limitArraySize(merged, CACHE_LIMITS.workouts);
          },
        },
        // Cache exercises by filter with size limit
        // PERF: Uses cursor-based logic for pagination
        exercises: {
          keyArgs: ['filter', 'muscleGroup', 'category'],
          merge(existing = [], incoming, { args }) {
            // Reset when no cursor (first page / new filter)
            if (!args?.cursor) {
              return limitArraySize(incoming, CACHE_LIMITS.exercises);
            }
            const merged = [...existing, ...incoming];
            return limitArraySize(merged, CACHE_LIMITS.exercises);
          },
        },
        // Leaderboard caching with time-based key
        leaderboard: {
          keyArgs: ['type', 'timeframe'],
        },
        // Stats caching
        stats: {
          keyArgs: ['userId', 'period'],
        },
        // Community stats
        communityStats: {
          keyArgs: false,
          // Keep for 5 minutes
          read(existing, { canRead: _canRead, toReference: _toReference }) {
            return existing;
          },
        },
        // Cache user profile by ID
        me: {
          keyArgs: false,
        },
        user: {
          keyArgs: ['id'],
        },
        // Goals listing with size limit
        // PERF: Uses cursor-based logic for pagination
        goals: {
          keyArgs: ['userId', 'status'],
          merge(existing = [], incoming, { args }) {
            // Reset when no cursor (first page / new filter)
            if (!args?.cursor) {
              return limitArraySize(incoming, CACHE_LIMITS.goals);
            }
            const merged = [...existing, ...incoming];
            return limitArraySize(merged, CACHE_LIMITS.goals);
          },
        },
        // Messages with cursor pagination and size limit
        // CACHE-001 FIX: Handle message merge properly to avoid stale/duplicate messages
        messages: {
          keyArgs: ['conversationId'],
          merge(existing, incoming, { args }) {
            // If no existing cache or refreshing (no cursor), replace entirely
            if (!existing || (!args?.before && !args?.after)) {
              if (incoming?.messages) {
                return {
                  ...incoming,
                  messages: limitArraySize(incoming.messages, CACHE_LIMITS.messages),
                };
              }
              return incoming;
            }

            // Safety check for incoming data structure
            if (!incoming?.messages) return existing;

            // Deduplicate messages by id to prevent duplicates
            const existingIds = new Set(existing.messages?.map((m: { id: string }) => m.id) || []);
            const uniqueIncoming = incoming.messages.filter((m: { id: string }) => !existingIds.has(m.id));

            // Prepend new messages (when loading newer via 'before' cursor)
            if (args?.before) {
              const merged = [...uniqueIncoming, ...(existing.messages || [])];
              return {
                ...incoming,
                messages: limitArraySize(merged, CACHE_LIMITS.messages),
              };
            }

            // Append old messages (when paginating via 'after' cursor)
            const merged = [...(existing.messages || []), ...uniqueIncoming];
            return {
              ...existing,
              messages: limitArraySize(merged, CACHE_LIMITS.messages),
            };
          },
        },
        // Notifications with size limit
        notifications: {
          keyArgs: ['unreadOnly'],
          merge(existing = [], incoming, { args }) {
            if (args?.offset === 0 || !args?.offset) {
              return limitArraySize(incoming, CACHE_LIMITS.notifications);
            }
            const merged = [...existing, ...incoming];
            return limitArraySize(merged, CACHE_LIMITS.notifications);
          },
        },
        // Activity feed with size limit
        activityFeed: {
          keyArgs: ['type'],
          merge(existing = [], incoming, { args }) {
            if (args?.offset === 0 || !args?.offset) {
              return limitArraySize(incoming, CACHE_LIMITS.feed);
            }
            const merged = [...existing, ...incoming];
            return limitArraySize(merged, CACHE_LIMITS.feed);
          },
        },
      },
    },
    User: {
      keyFields: ['id'],
      fields: {
        workouts: {
          merge: false, // Replace, don't merge
        },
      },
    },
    Workout: {
      keyFields: ['id'],
      fields: {
        exercises: {
          merge: false,
        },
      },
    },
    Exercise: {
      keyFields: ['id'],
    },
    Goal: {
      keyFields: ['id'],
    },
    CharacterStats: {
      keyFields: ['userId'],
    },
    Achievement: {
      keyFields: ['id'],
    },
    Notification: {
      keyFields: ['id'],
    },
    Message: {
      keyFields: ['id'],
    },
    Conversation: {
      keyFields: ['id'],
      fields: {
        messages: {
          merge: false,
        },
      },
    },
    Issue: {
      keyFields: ['id'],
    },
    Comment: {
      keyFields: ['id'],
    },
  },
});

/**
 * Create Apollo Client instance
 */
export const apolloClient = new ApolloClient({
  link: from([retryLink, errorLink, authLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first', // Use cache after initial network fetch
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true, // Show loading states on refetch
      returnPartialData: true, // Show cached data immediately while fetching
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
      returnPartialData: true, // Return what we have in cache immediately
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
  connectToDevTools: process.env.NODE_ENV !== 'production',
});

/**
 * Initialize cache persistence (called during app bootstrap)
 * Returns a promise that resolves when persistence is ready
 */
let persistenceInitialized = false;

export async function initializeApolloCache() {
  if (persistenceInitialized) return;

  try {
    await initializeCachePersistence(cache);
    persistenceInitialized = true;
  } catch {
    // Cache persistence failed - continuing without persistence
  }
}

/**
 * Clear all Apollo cache (persisted and in-memory)
 * Call this on user logout
 */
export async function clearApolloCache() {
  try {
    await apolloClient.clearStore();
    await clearPersistedCache();
  } catch {
    // Failed to clear cache
  }
}

/**
 * Garbage collect the Apollo cache
 * Removes unreachable objects from the cache to free memory
 * Call this periodically or when memory pressure is detected
 */
export function garbageCollectCache(): { collected: number } {
  try {
    // Apollo's gc() returns the number of unreachable objects removed
    const result = cache.gc();
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Apollo GC] Collected ${result.length} unreachable cache entries`);
    }
    return { collected: result.length };
  } catch (error) {
    console.warn('[Apollo GC] Failed to garbage collect:', error);
    return { collected: 0 };
  }
}

/**
 * Get Apollo cache statistics for debugging
 */
export function getCacheStats(): {
  rootQueryCount: number;
  totalEntries: number;
  estimatedSizeKB: number;
} {
  try {
    const cacheData = cache.extract();
    const entries = Object.keys(cacheData);
    const rootQueryFields = cacheData['ROOT_QUERY'] ? Object.keys(cacheData['ROOT_QUERY']) : [];

    // Estimate size by serializing (rough approximation)
    const serialized = JSON.stringify(cacheData);
    const sizeKB = Math.round(serialized.length / 1024);

    return {
      rootQueryCount: rootQueryFields.length,
      totalEntries: entries.length,
      estimatedSizeKB: sizeKB,
    };
  } catch (error) {
    console.warn('[Apollo] Failed to get cache stats:', error);
    return {
      rootQueryCount: 0,
      totalEntries: 0,
      estimatedSizeKB: 0,
    };
  }
}

/**
 * Evict specific query from cache
 * Useful for forcing fresh data on specific queries
 */
export function evictQuery(queryName: string): boolean {
  try {
    return cache.evict({ id: 'ROOT_QUERY', fieldName: queryName });
  } catch (error) {
    console.warn(`[Apollo] Failed to evict query ${queryName}:`, error);
    return false;
  }
}

/**
 * Reset cache to initial state
 * More aggressive than clearStore - also resets all reactive variables
 */
export async function resetCache(): Promise<void> {
  try {
    await apolloClient.resetStore();
    await clearPersistedCache();
    garbageCollectCache();
  } catch (error) {
    console.warn('[Apollo] Failed to reset cache:', error);
  }
}

// Export cache for direct access if needed
export { cache, CACHE_LIMITS };

export default apolloClient;
