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

describe('auth/login contract', () => {
  it('401 error includes a string message (never an object)', async () => {
    const res = await request(getRequestTarget(app))
      .post('/api/auth/login')
      .send({ email: 'nope@test.local', password: 'wrong' });

    expect(res.status).toBe(401);

    const msg =
      res.body?.error?.message ??
      res.body?.error?.error ??
      res.body?.error ??
      res.body?.message;

    expect(typeof msg).toBe('string');
    expect((msg as string).length).toBeGreaterThan(0);
  });
});
