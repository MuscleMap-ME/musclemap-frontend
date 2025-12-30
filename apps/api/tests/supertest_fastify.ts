import type { IncomingMessage, ServerResponse } from 'node:http';

function unwrap(app: any) {
  if (!app) return app;
  if (typeof app.inject === 'function') return app;
  return app.app ?? app.fastify ?? app.instance ?? app;
}

export function makeListener(app: any) {
  const target = unwrap(app);
  if (!target || typeof target.inject !== 'function') {
    throw new Error('makeListener: expected Fastify instance with .inject()');
  }

  return (req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', async () => {
      const payload = chunks.length ? Buffer.concat(chunks) : undefined;

      try {
        const reply = await target.inject({
          method: req.method || 'GET',
          url: (req.url as any) || '/',
          headers: req.headers as any,
          payload,
        });

        res.statusCode = reply.statusCode;

        const headers = reply.headers || {};
        for (const [k, v] of Object.entries(headers)) {
          if (v === undefined) continue;
          try { res.setHeader(k, v as any); } catch {}
        }

        res.end(reply.rawPayload ?? reply.body ?? '');
      } catch (e: any) {
        res.statusCode = 500;
        res.end(e?.message || 'inject error');
      }
    });
  };
}
