/**
 * Apollo Client Configuration
 *
 * Sets up Apollo Client with authentication, error handling, and caching.
 */

import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

/**
 * HTTP Link - connects to our GraphQL endpoint
 */
const httpLink = createHttpLink({
  uri: '/api/graphql',
  credentials: 'include',
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
 */
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Merge paginated workout lists
        myWorkouts: {
          keyArgs: false,
          merge(existing = [], incoming) {
            return [...existing, ...incoming];
          },
        },
        // Cache user by ID
        me: {
          keyArgs: false,
        },
      },
    },
    User: {
      keyFields: ['id'],
    },
    Workout: {
      keyFields: ['id'],
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
  },
});

/**
 * Create Apollo Client instance
 */
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
  connectToDevTools: process.env.NODE_ENV !== 'production',
});

export default apolloClient;
