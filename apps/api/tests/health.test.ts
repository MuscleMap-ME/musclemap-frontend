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
    console.log('Skipping health tests: database not available');
  }
});

afterAll(async () => {
  await closeTestApp();
});

describe('health', () => {
  it('GET /api/health returns 200', async () => {
    if (skipTests) return;
    const res = await request(getRequestTarget(app)).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body?.status).toBe('ok');
  });
});
