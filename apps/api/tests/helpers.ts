import request from 'supertest';
import { getTestApp } from './test_app';
import { getRequestTarget } from './request_target';

export const auth = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

/**
 * Registers a new user and returns a token.
 * If register doesn't return a token, falls back to login.
 *
 * Accepts an optional Fastify instance so test files can reuse their suite app.
 */
export async function registerAndLogin(app?: any): Promise<{
  token: string;
  username: string;
  email: string;
  password: string;
}> {
  const a = app ?? (await getTestApp());
  const target = getRequestTarget(a);

  const username = `test_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const email = `${username}@test.local`;
  const password = 'Test123!';

  const r1 = await request(target)
    .post('/api/auth/register')
    .send({ username, email, password });

  const token1 = (r1.body as any)?.token ?? (r1.body as any)?.data?.token;
  if (token1) return { token: String(token1), username, email, password };

  const r2 = await request(target)
    .post('/api/auth/login')
    .send({ email, password });

  const token2 = (r2.body as any)?.token ?? (r2.body as any)?.data?.token;
  if (!token2) {
    throw new Error(
      `registerAndLogin: no token from register or login. ` +
        `register=${JSON.stringify(r1.body)} login=${JSON.stringify(r2.body)}`
    );
  }

  return { token: String(token2), username, email, password };
}
