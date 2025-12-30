import type { FastifyInstance } from 'fastify';
import { createServer } from '../src/http/server';

export async function makeTestApp(): Promise<FastifyInstance> {
  const app = await createServer();
  await app.ready();
  return app;
}
