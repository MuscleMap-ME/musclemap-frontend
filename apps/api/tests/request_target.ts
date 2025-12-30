function isThenable(x: any): boolean {
  return !!x && (typeof x === 'object' || typeof x === 'function') && typeof x.then === 'function';
}

function isNodeServer(x: any): boolean {
  return !!x && typeof x === 'object' && typeof x.listen === 'function' && typeof x.address === 'function';
}

function isFastifyLike(x: any): boolean {
  return !!x && typeof x === 'object' && typeof x.inject === 'function' && typeof x.ready === 'function';
}

export function getRequestTarget(u: any): any {
  if (!u) throw new Error('getRequestTarget: got null/undefined');

  // classic “forgot await”
  if (isThenable(u)) {
    throw new Error('getRequestTarget: received a Promise/thenable. Did you forget to await getTestApp()?');
  }

  // Fastify instance: use underlying Node server (supertest expects a server/function)
  if (isFastifyLike(u)) {
    if (isNodeServer(u.server)) return u.server;
    if (isNodeServer(u.listener)) return u.listener;
    throw new Error('getRequestTarget: Fastify instance missing a Node server (.server/.listener)');
  }

  // Node http.Server
  if (isNodeServer(u)) return u;

  // Express-style handler
  if (typeof u === 'function') return u;

  // Wrapped server
  if (u && typeof u === 'object' && isNodeServer(u.server)) return u.server;

  const keys = u && typeof u === 'object' ? Object.getOwnPropertyNames(u) : [];
  throw new Error(`getRequestTarget: could not resolve target. typeof=${typeof u} keys=${JSON.stringify(keys)}`);
}
