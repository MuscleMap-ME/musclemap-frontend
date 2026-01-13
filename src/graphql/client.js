/**
 * Apollo Client Configuration
 *
 * Sets up Apollo Client with authentication, error handling, and caching.
 */

import { ApolloClient, InMemoryCache, from } from '@apollo/client/core';
import { BatchHttpLink } from '@apollo/client/link/batch-http';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';

/**
 * Batch HTTP Link - batches multiple GraphQL requests into one HTTP request
 * This reduces round trips which is critical for high-latency connections
 */
const httpLink = new BatchHttpLink({
  uri: '/api/graphql',
  credentials: 'include',
  batchMax: 10, // Max 10 queries per batch
  batchInterval: 20, // Wait 20ms to collect queries before sending
  batchDebounce: true, // Debounce batches for even better grouping
});

/**
 * Auth Link - adds JWT token to requests
 */
const authLink = setContext((_, { headers }) => {
  // Get token from Zustand storage
  try {
    const authData = localStorage.getItem('musclemap-auth');
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
  } catch (e) {
    console.error('Error reading auth token:', e);
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
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      const { message, locations, path, extensions } = err;

      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );

      // Handle authentication errors
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Clear auth and redirect to login
        localStorage.removeItem('musclemap-auth');
        window.location.href = '/login';
      }
    }
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
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
          read(existing, { canRead, toReference }) {
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
        messages: {
          keyArgs: ['conversationId'],
          merge(existing, incoming, { args }) {
            if (!existing) return incoming;
            // Prepend new messages (newer first)
            if (args?.before) {
              return { ...incoming, messages: [...incoming.messages, ...existing.messages] };
            }
            // Append old messages (pagination)
            return { ...existing, messages: [...existing.messages, ...incoming.messages] };
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

export default apolloClient;
