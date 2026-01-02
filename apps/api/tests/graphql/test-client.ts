/**
 * GraphQL Test Client
 *
 * Utilities for testing GraphQL resolvers, subscriptions, and the full request flow.
 */

import { ApolloServer } from '@apollo/server';
import type { GraphQLContext } from '../../src/graphql/server';
import { buildSchema, SchemaRegistry, resetSchemaRegistry } from '../../src/graphql/schema-builder';
import { makeExecutableSchema } from '@graphql-tools/schema';

// ============================================
// TYPES
// ============================================

export interface TestUser {
  id: string;
  email: string;
  username: string;
  roles: string[];
}

export interface TestContext extends Partial<GraphQLContext> {
  user?: TestUser;
}

export interface QueryResult<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: Record<string, any>;
  }>;
}

// ============================================
// TEST SERVER
// ============================================

/**
 * Create a test Apollo Server instance.
 */
export async function createTestServer(
  options: {
    typeDefs?: string;
    resolvers?: any;
    context?: TestContext;
  } = {}
): Promise<{
  server: ApolloServer<TestContext>;
  query: <T>(q: string, variables?: Record<string, any>) => Promise<QueryResult<T>>;
  mutate: <T>(m: string, variables?: Record<string, any>) => Promise<QueryResult<T>>;
  stop: () => Promise<void>;
}> {
  // Reset registry for clean test
  resetSchemaRegistry();

  // Build schema
  const registry = new SchemaRegistry();
  const { typeDefs: coreTypeDefs, resolvers: coreResolvers } = buildSchema(registry);

  const schema = makeExecutableSchema({
    typeDefs: options.typeDefs || coreTypeDefs,
    resolvers: options.resolvers || coreResolvers,
  });

  const server = new ApolloServer<TestContext>({
    schema,
    includeStacktraceInErrorResponses: true,
  });

  await server.start();

  const defaultContext: TestContext = {
    pluginId: 'test',
    config: {},
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    credits: {
      charge: async () => ({ success: true }),
      canCharge: async () => true,
      getBalance: async () => 1000,
    },
    db: {
      query: async () => [],
      execute: async () => ({ changes: 0 }),
      transaction: async (fn) => fn(),
    },
    ...options.context,
  };

  const executeOperation = async <T>(
    query: string,
    variables?: Record<string, any>
  ): Promise<QueryResult<T>> => {
    const response = await server.executeOperation(
      { query, variables },
      { contextValue: { ...defaultContext, ...options.context } }
    );

    if (response.body.kind === 'single') {
      return {
        data: response.body.singleResult.data as T,
        errors: response.body.singleResult.errors as any,
      };
    }

    throw new Error('Incremental delivery not supported in tests');
  };

  return {
    server,
    query: executeOperation,
    mutate: executeOperation,
    stop: () => server.stop(),
  };
}

// ============================================
// TEST HELPERS
// ============================================

/**
 * Create a mock user for testing.
 */
export function createMockUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: 'test-user-1',
    email: 'test@example.com',
    username: 'testuser',
    roles: ['user'],
    ...overrides,
  };
}

/**
 * Create a mock admin user.
 */
export function createMockAdmin(overrides: Partial<TestUser> = {}): TestUser {
  return createMockUser({
    id: 'admin-1',
    email: 'admin@example.com',
    username: 'admin',
    roles: ['user', 'admin'],
    ...overrides,
  });
}

/**
 * Create a mock database that returns predefined results.
 */
export function createMockDB(queryResults: Record<string, any[]> = {}) {
  return {
    query: async <T>(sql: string): Promise<T[]> => {
      // Match query pattern to results
      for (const [pattern, results] of Object.entries(queryResults)) {
        if (sql.includes(pattern)) {
          return results as T[];
        }
      }
      return [];
    },
    execute: async () => ({ changes: 1 }),
    transaction: async <T>(fn: () => Promise<T>) => fn(),
  };
}

/**
 * Assert that a GraphQL response has no errors.
 */
export function assertNoErrors(result: QueryResult): void {
  if (result.errors && result.errors.length > 0) {
    const messages = result.errors.map((e) => e.message).join(', ');
    throw new Error(`Expected no errors, but got: ${messages}`);
  }
}

/**
 * Assert that a GraphQL response has a specific error.
 */
export function assertHasError(
  result: QueryResult,
  expectedCode?: string,
  expectedMessage?: string
): void {
  if (!result.errors || result.errors.length === 0) {
    throw new Error('Expected errors, but got none');
  }

  if (expectedCode) {
    const hasCode = result.errors.some((e) => e.extensions?.code === expectedCode);
    if (!hasCode) {
      const codes = result.errors.map((e) => e.extensions?.code).join(', ');
      throw new Error(`Expected error code "${expectedCode}", but got: ${codes}`);
    }
  }

  if (expectedMessage) {
    const hasMessage = result.errors.some((e) => e.message.includes(expectedMessage));
    if (!hasMessage) {
      const messages = result.errors.map((e) => e.message).join(', ');
      throw new Error(`Expected error containing "${expectedMessage}", but got: ${messages}`);
    }
  }
}

// ============================================
// SUBSCRIPTION TESTING
// ============================================

/**
 * Test subscription helper.
 * Collects subscription events for testing.
 */
export class SubscriptionCollector<T> {
  private events: T[] = [];
  private resolve: ((events: T[]) => void) | null = null;
  private expectedCount: number = 0;

  /**
   * Add an event.
   */
  push(event: T): void {
    this.events.push(event);
    if (this.resolve && this.events.length >= this.expectedCount) {
      this.resolve(this.events);
    }
  }

  /**
   * Wait for a specific number of events.
   */
  waitFor(count: number, timeoutMs: number = 5000): Promise<T[]> {
    this.expectedCount = count;

    if (this.events.length >= count) {
      return Promise.resolve(this.events.slice(0, count));
    }

    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      setTimeout(() => {
        reject(new Error(`Timeout waiting for ${count} events. Got ${this.events.length}`));
      }, timeoutMs);
    });
  }

  /**
   * Get all collected events.
   */
  getEvents(): T[] {
    return [...this.events];
  }

  /**
   * Clear collected events.
   */
  clear(): void {
    this.events = [];
    this.resolve = null;
    this.expectedCount = 0;
  }
}

// ============================================
// DATALOADER TESTING
// ============================================

/**
 * Track DataLoader batch calls for testing.
 */
export class LoaderTracker {
  private batches: Array<{ loader: string; keys: any[] }> = [];

  /**
   * Wrap a loader to track batches.
   */
  wrap<K, V>(name: string, batchFn: (keys: readonly K[]) => Promise<V[]>) {
    return async (keys: readonly K[]): Promise<V[]> => {
      this.batches.push({ loader: name, keys: [...keys] });
      return batchFn(keys);
    };
  }

  /**
   * Get all batch calls.
   */
  getBatches(): Array<{ loader: string; keys: any[] }> {
    return [...this.batches];
  }

  /**
   * Assert that batching occurred (no N+1).
   */
  assertBatched(loaderName: string, expectedBatchCount: number): void {
    const loaderBatches = this.batches.filter((b) => b.loader === loaderName);
    if (loaderBatches.length !== expectedBatchCount) {
      throw new Error(
        `Expected ${expectedBatchCount} batch(es) for "${loaderName}", got ${loaderBatches.length}`
      );
    }
  }

  /**
   * Clear tracking data.
   */
  clear(): void {
    this.batches = [];
  }
}
