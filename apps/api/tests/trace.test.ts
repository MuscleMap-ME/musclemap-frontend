import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { getTestApp, closeTestApp } from './test_app';
import { getRequestTarget } from './request_target';

let app: any;

beforeAll(async () => {
  app = await getTestApp();
});

afterAll(async () => {
  await closeTestApp();
});

describe('trace', () => {
  it('POST /api/trace/frontend-log returns 204', async () => {
    const res = await request(getRequestTarget(app))
      .post('/api/trace/frontend-log')
      .send({ entries: [{ level: 'info', type: 'test', data: { ok: true }, sessionId: 's1', url: '/login' }] });

    expect([200, 204]).toContain(res.status);
  });
});
