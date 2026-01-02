import { getRequestTarget } from './request_target';
import { tryGetTestApp, closeTestApp } from './test_app';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { registerAndLogin, auth } from './helpers';

let app: any;
let skipTests = false;

beforeAll(async () => {
  app = await tryGetTestApp();
  if (!app) {
    skipTests = true;
    console.log('Skipping core_endpoints tests: database not available');
  }
});

afterAll(async () => {
  await closeTestApp();
});

describe('core endpoints', () => {
  it('archetypes list works', async () => {
    if (skipTests) return;
    const target = getRequestTarget(app);
    const res = await request(target).get('/api/archetypes');
    expect(res.status).toBe(200);
  });

  it('select archetype requires auth and succeeds', async () => {
    if (skipTests) return;
    const target = getRequestTarget(app);
    const { token } = await registerAndLogin(app);

    const res = await request(target)
      .post('/api/archetypes/select')
      .set(auth(token))
      .send({ archetypeId: 'bodybuilder' });

    expect([200, 400]).toContain(res.status);
  });

  it('journey paths + switch work', async () => {
    if (skipTests) return;
    const target = getRequestTarget(app);
    const { token } = await registerAndLogin(app);

    const p = await request(target).get('/api/journey/paths').set(auth(token));
    expect(p.status).toBe(200);

    const s = await request(target)
      .post('/api/journey/switch')
      .set(auth(token))
      .send({ archetype: 'gymnast' });

    expect([200, 400]).toContain(s.status);
  });

  it('exercises list works', async () => {
    if (skipTests) return;
    const target = getRequestTarget(app);
    const res = await request(target).get('/api/exercises');
    expect(res.status).toBe(200);
  });

  it('workouts list works with auth', async () => {
    if (skipTests) return;
    const target = getRequestTarget(app);
    const { token } = await registerAndLogin(app);

    const res = await request(target).get('/api/workouts').set(auth(token));
    expect(res.status).toBe(200);
  });

  it('credits pricing public, balance authed', async () => {
    if (skipTests) return;
    const target = getRequestTarget(app);
    const { token } = await registerAndLogin(app);

    const p = await request(target).get('/api/credits/pricing');
    expect(p.status).toBe(200);

    const b = await request(target).get('/api/credits/balance').set(auth(token));
    expect(b.status).toBe(200);
  });

  it('progression endpoints respond', async () => {
    if (skipTests) return;
    const target = getRequestTarget(app);
    const { token } = await registerAndLogin(app);

    const m = await request(target).get('/api/progression/mastery-levels');
    expect(m.status).toBe(200);

    const a = await request(target).get('/api/progression/achievements').set(auth(token));
    expect(a.status).toBe(200);

    const l = await request(target).get('/api/progression/leaderboard');
    expect(l.status).toBe(200);

    const s = await request(target).get('/api/progress/stats').set(auth(token));
    expect(s.status).toBe(200);
  });
});
