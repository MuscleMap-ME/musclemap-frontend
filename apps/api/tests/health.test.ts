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

describe('health', () => {
  it('GET /api/health returns 200', async () => {
    const res = await request(getRequestTarget(app)).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body?.status).toBe('ok');
  });
});
