import { getRequestTarget } from './request_target';
import { getTestApp, closeTestApp } from './test_app';
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from 'supertest';
import { registerAndLogin, auth } from './helpers';

let app: any;


beforeAll(async () => {
  app = await getTestApp();
});

afterAll(async () => {
  await closeTestApp();
});

describe('auth + profile', () => {

  it('rejects profile without token', async () => {
    const res = await request(getRequestTarget(app)).get('/api/profile');
    expect([401,403]).toContain(res.status);
  });

  it('can get + update profile with token', async () => {
    const { token } = await registerAndLogin(app);

    const p1 = await request(getRequestTarget(app)).get('/api/profile').set(auth(token));
    expect(p1.status).toBe(200);

    const p2 = await request(getRequestTarget(app)).put('/api/profile').set(auth(token)).send({ age: 25 });
    expect(p2.status).toBe(200);
  });
});
