import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { tryGetTestApp, closeTestApp } from './test_app';
import { getRequestTarget } from './request_target';

let app: any;
let skipTests = false;

beforeAll(async () => {
  app = await tryGetTestApp();
  if (!app) {
    skipTests = true;
    console.log('Skipping trace tests: database not available');
  }
});

afterAll(async () => {
  await closeTestApp();
});

describe('trace', () => {
  it('POST /api/trace/frontend-log returns 204', async () => {
    if (skipTests) return;
    const res = await request(getRequestTarget(app))
      .post('/api/trace/frontend-log')
      .send({ entries: [{ level: 'info', type: 'test', data: { ok: true }, sessionId: 's1', url: '/login' }] });

    expect([200, 204]).toContain(res.status);
  });
});
