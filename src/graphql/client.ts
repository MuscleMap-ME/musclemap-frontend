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
 */

import { ApolloClient, InMemoryCache, from } from '@apollo/client/core';
import { BatchHttpLink } from '@apollo/client/link/batch-http';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { initializeCachePersistence, clearPersistedCache } from '../lib/apollo-persist';
import { storage } from '../lib/storage';

// Network configuration
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const SLOW_NETWORK_TIMEOUT = 60000; // 60 seconds for slow connections

/**
 * Detect connection quality and return appropriate batch interval
 * Slower connections get longer intervals to batch more requests
 */
function getAdaptiveBatchInterval(): number {
  const connection = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
  if (!connection?.effectiveType) return 20;

  switch (connection.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 500; // Wait longer to batch more requests on slow connections
    case '3g':
      return 100;
    case '4g':
    default:
      return 20;
  }
}

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
 * Batch HTTP Link - batches multiple GraphQL requests into one HTTP request
 * This reduces round trips which is critical for high-latency connections
 */
const httpLink = new BatchHttpLink({
  uri: '/api/graphql',
  credentials: 'include',
  batchMax: 10, // Max 10 queries per batch
  batchInterval: getAdaptiveBatchInterval(),
  batchDebounce: true, // Debounce batches for even better grouping
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
        // Merge paginated workout lists
        myWorkouts: {
          keyArgs: ['filter', 'sortBy'],
          merge(existing = [], incoming, { args }) {
            // Reset on new search/filter
            if (args?.offset === 0 || !args?.offset) {
              return incoming;
            }
            // Append for pagination
            return [...existing, ...incoming];
          },
        },
        // Cache exercises by filter
        exercises: {
          keyArgs: ['filter', 'muscleGroup', 'category'],
          merge(existing = [], incoming, { args }) {
            if (args?.offset === 0 || !args?.offset) {
              return incoming;
            }
            return [...existing, ...incoming];
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
        // Goals listing
        goals: {
          keyArgs: ['userId', 'status'],
          merge(existing = [], incoming, { args }) {
            if (args?.offset === 0 || !args?.offset) {
              return incoming;
            }
            return [...existing, ...incoming];
          },
        },
        // Messages with cursor pagination
        // CACHE-001 FIX: Handle message merge properly to avoid stale/duplicate messages
        messages: {
          keyArgs: ['conversationId'],
          merge(existing, incoming, { args }) {
            // If no existing cache or refreshing (no cursor), replace entirely
            if (!existing || (!args?.before && !args?.after)) {
              return incoming;
            }

            // Safety check for incoming data structure
            if (!incoming?.messages) return existing;

            // Deduplicate messages by id to prevent duplicates
            const existingIds = new Set(existing.messages?.map((m: { id: string }) => m.id) || []);
            const uniqueIncoming = incoming.messages.filter((m: { id: string }) => !existingIds.has(m.id));

            // Prepend new messages (when loading newer via 'before' cursor)
            if (args?.before) {
              return {
                ...incoming,
                messages: [...uniqueIncoming, ...(existing.messages || [])],
              };
            }

            // Append old messages (when paginating via 'after' cursor)
            return {
              ...existing,
              messages: [...(existing.messages || []), ...uniqueIncoming],
            };
          },
        },
        // Notifications
        notifications: {
          keyArgs: ['unreadOnly'],
          merge(existing = [], incoming, { args }) {
            if (args?.offset === 0 || !args?.offset) {
              return incoming;
            }
            return [...existing, ...incoming];
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

// Export cache for direct access if needed
export { cache };

export default apolloClient;
