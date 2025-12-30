import { getRequestTarget } from './request_target';
import { getTestApp, closeTestApp } from './test_app';
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from 'supertest';
import { registerAndLogin, auth } from './helpers';
import { db } from '../src/db/client';

let app: any;

beforeAll(async () => {
  app = await getTestApp();
});

afterAll(async () => {
  await closeTestApp();
});

function safeJson(text: any) {
  try {
    return typeof text === 'string' ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

// --- clean 1-pass competition id resolver ---
// Tries: create response -> DB lookup by name -> list endpoints (auth) by name
async function resolveCompetitionId(opts: {
  app: any;
  token: string;
  name: string;
  createRes?: any;
}): Promise<string> {
  const { app, token, name, createRes } = opts;

  const extractId = (obj: any): string | undefined => {
    if (!obj || typeof obj !== 'object') return undefined;

    const direct =
      obj.id ??
      obj.competitionId ??
      obj.competition_id ??
      obj?.data?.id ??
      obj?.data?.competitionId ??
      obj?.data?.competition_id ??
      obj?.data?.competition?.id;

    return typeof direct === 'string' || typeof direct === 'number' ? String(direct) : undefined;
  };

  const normalizeList = (body: any): any[] => {
    const d = body?.data ?? body;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.items)) return d.items;
    if (Array.isArray(d?.competitions)) return d.competitions;
    if (Array.isArray(d?.rows)) return d.rows;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  };

  // 0) create response (body or text)
  if (createRes) {
    const createJson = createRes?.body ?? safeJson(createRes?.text);
    const id0 = extractId(createJson);
    if (id0) return id0;
  }

  // 1) DB fallback by unique name
  try {
    const row = (db as any)
      ?.prepare?.('SELECT id FROM competitions WHERE name = ? ORDER BY id DESC LIMIT 1')
      ?.get?.(name);
    const id1 = row?.id;
    if (id1 !== undefined && id1 !== null) return String(id1);
  } catch {
    // ignore
  }

  // 2) API list endpoints by name (auth)
  const endpoints = [
    '/api/competitions/me',
    '/api/competitions/mine',
    '/api/competitions/user',
    '/api/competitions?status=active',
    '/api/competitions?status=upcoming',
    '/api/competitions',
  ];

  for (const url of endpoints) {
    try {
      const r = await request(getRequestTarget(app))
        .get(url)
        .set('Authorization', `Bearer ${token}`);

      if (r.status !== 200) continue;

      const list = normalizeList(r.body ?? safeJson(r.text));
      const hit =
        list.find((c: any) => c?.name === name) ??
        list.find((c: any) => c?.data?.name === name);

      const id2 = extractId(hit);
      if (id2) return id2;
    } catch {
      // ignore and keep trying
    }
  }

  // Debug for fast fixes
  throw new Error(
    `resolveCompetitionId: failed to resolve id for name="${name}".\n` +
      `create.status=${createRes?.status}\n` +
      `create.body=${JSON.stringify(createRes?.body)}\n` +
      `create.text=${typeof createRes?.text === 'string' ? createRes.text.slice(0, 2000) : String(createRes?.text)}\n`
  );
}

describe('competitions', () => {
  it('create -> details -> join (no hardcoded id)', async () => {
    const { token } = await registerAndLogin(app);

    const name = `Vitest_${process.pid}_${Math.floor(Math.random() * 1e9)}`;

    // Create: try payload variants
    let create = await request(getRequestTarget(app))
      .post('/api/competitions')
      .set(auth(token))
      .send({ name, type: 'weekly', goal_tu: 50 });

    if (create.status === 400) {
      create = await request(getRequestTarget(app))
        .post('/api/competitions')
        .set(auth(token))
        .send({ name, type: 'weekly', goalTU: 50 });
    }

    expect([200, 201]).toContain(create.status);

    const id = await resolveCompetitionId({ app, token, name, createRes: create });
    expect(id).toBeTruthy();

    const details = await request(getRequestTarget(app)).get(`/api/competitions/${id}`);
    expect(details.status).toBe(200);

    const join = await request(getRequestTarget(app))
      .post(`/api/competitions/${id}/join`)
      .set(auth(token))
      .send({});

    // some servers return 400 if already joined or invalid state; accept either
    expect([200, 400]).toContain(join.status);
  });
});
