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
    console.log('Skipping trace_frontend_log tests: database not available');
  }
});

afterAll(async () => {
  await closeTestApp();
});

describe('trace/frontend-log', () => {
  it('POST /api/trace/frontend-log exists and returns 204/200 (not 404)', async () => {
    if (skipTests) return;
    const res = await request(getRequestTarget(app))
      .post('/api/trace/frontend-log')
      .send({ entries: [{ level: 'info', type: 'test', data: { ok: true } }] });

    expect([200, 204]).toContain(res.status);
    expect(res.status).not.toBe(404);
  });
});
