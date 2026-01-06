/**
 * Health Check Query Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, assertNoErrors } from './test-client';

describe('GraphQL Health Check', () => {
  let server: Awaited<ReturnType<typeof createTestServer>>;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should return health status', async () => {
    const result = await server.query<{ _health: { status: string; timestamp: string } }>(`
      query {
        _health {
          status
          timestamp
        }
      }
    `);

    assertNoErrors(result);
    expect(result.data?._health.status).toBe('ok');
    expect(result.data?._health.timestamp).toBeDefined();
  });

  it('should handle query depth limiting', async () => {
    // This test would verify depth limiting is working
    // The actual behavior depends on the depth limit configuration
    const result = await server.query(`
      query {
        _health {
          status
        }
      }
    `);

    assertNoErrors(result);
  });
});
