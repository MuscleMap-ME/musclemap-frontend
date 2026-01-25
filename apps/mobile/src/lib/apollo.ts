/**
 * Apollo Client Configuration
 *
 * Configures Apollo Client with:
 * - Authentication via JWT token from secure storage
 * - Offline persistence via AsyncStorage
 * - Normalized caching with type policies
 * - Error handling and retry logic
 */
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import * as SecureStore from 'expo-secure-store';

// These imports will be available after pnpm install
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { persistCache, AsyncStorageWrapper } from 'apollo3-cache-persist';

const TOKEN_KEY = 'musclemap_token';

// Type policies for normalized caching
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Paginated exercise list with cursor-based pagination
        exercises: {
          keyArgs: ['muscleGroup', 'equipment', 'difficulty'],
          merge(existing = { edges: [], pageInfo: null }, incoming) {
            return {
              edges: [...existing.edges, ...incoming.edges],
              pageInfo: incoming.pageInfo,
            };
          },
        },
        // Leaderboard with keyset pagination
        leaderboard: {
          keyArgs: ['type', 'timeframe'],
          merge(existing = [], incoming) {
            return [...existing, ...incoming];
          },
        },
        // Workout history pagination
        workouts: {
          keyArgs: ['userId'],
          merge(existing = { edges: [], pageInfo: null }, incoming) {
            return {
              edges: [...existing.edges, ...incoming.edges],
              pageInfo: incoming.pageInfo,
            };
          },
        },
      },
    },
    User: {
      keyFields: ['id'],
      fields: {
        // Compute wealth tier locally from credits
        wealthTier: {
          read(_, { readField }) {
            const credits = readField<number>('creditBalance') ?? 0;
            if (credits >= 1000000) return 6; // Obsidian
            if (credits >= 100000) return 5; // Diamond
            if (credits >= 10000) return 4; // Platinum
            if (credits >= 1000) return 3; // Gold
            if (credits >= 100) return 2; // Silver
            if (credits >= 10) return 1; // Bronze
            return 0; // Broke
          },
        },
      },
    },
    Exercise: {
      keyFields: ['id'],
    },
    Workout: {
      keyFields: ['id'],
    },
    SpiritAnimal: {
      keyFields: ['userId'],
    },
  },
});

// HTTP link to GraphQL endpoint
const httpLink = createHttpLink({
  uri: `${process.env.EXPO_PUBLIC_API_URL || 'https://musclemap.me'}/api/graphql`,
});

// Auth link - adds JWT token to requests
const authLink = setContext(async (_, { headers }) => {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  } catch (error) {
    console.warn('[Apollo] Failed to get auth token:', error);
    return { headers };
  }
});

// Error handling link
const errorLink = onError((errorResponse) => {
  const { graphQLErrors, networkError } = errorResponse;

  if (graphQLErrors) {
    graphQLErrors.forEach((error) => {
      const { message, locations, path, extensions } = error;
      console.error(
        `[GraphQL Error] Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}`,
      );

      // Handle authentication errors
      if (extensions?.code === 'UNAUTHENTICATED') {
        // Token expired or invalid - clear stored token
        SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
        // The auth store will handle redirecting to login
      }
    });
  }

  if (networkError) {
    console.error(`[Network Error] ${networkError.message}`);
    // Network errors are handled by the retry link
  }
});

// Retry link for network failures
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 10000,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error, _operation) => {
      // Don't retry mutations (could cause duplicate actions)
      if (_operation.query.definitions.some(
        (def) => def.kind === 'OperationDefinition' && def.operation === 'mutation'
      )) {
        return false;
      }
      // Retry network errors
      return !!error;
    },
  },
});

// Type alias for Apollo Client
type ApolloClientType = ApolloClient<ReturnType<typeof cache.extract>>;

// Apollo Client instance (initialized async)
let apolloClient: ApolloClientType | null = null;

/**
 * Initialize Apollo Client with cache persistence
 *
 * Must be called before using the client. The root layout handles this.
 */
export async function initializeApollo(): Promise<ApolloClient<NormalizedCacheObject>> {
  if (apolloClient) {
    return apolloClient;
  }

  // Persist cache to AsyncStorage for offline support
  await persistCache({
    cache,
    storage: new AsyncStorageWrapper(AsyncStorage),
    maxSize: 10 * 1024 * 1024, // 10MB max cache size
    debug: __DEV__,
  });

  apolloClient = new ApolloClient({
    link: from([errorLink, retryLink, authLink, httpLink]),
    cache,
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true,
      },
      query: {
        fetchPolicy: 'cache-first',
        errorPolicy: 'all',
      },
      mutate: {
        errorPolicy: 'all',
      },
    },
  });

  return apolloClient;
}

/**
 * Get the Apollo Client instance
 *
 * @throws if called before initializeApollo()
 */
export function getApolloClient(): ApolloClient<NormalizedCacheObject> {
  if (!apolloClient) {
    throw new Error(
      'Apollo Client not initialized. Call initializeApollo() first.',
    );
  }
  return apolloClient;
}

/**
 * Reset Apollo Client (e.g., on logout)
 */
export async function resetApolloClient(): Promise<void> {
  if (apolloClient) {
    await apolloClient.clearStore();
  }
}
