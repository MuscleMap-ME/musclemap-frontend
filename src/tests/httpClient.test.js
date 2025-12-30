import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Type } from '@sinclair/typebox';
import { request, clearRequestCache } from '../utils/httpClient';

const createResponse = (data, ok = true, status = 200) => ({
  ok,
  status,
  text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
});

describe('httpClient request', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
    clearRequestCache();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('retries on server errors before succeeding', async () => {
    const schema = Type.Object({ ok: Type.Boolean() });
    fetch
      .mockResolvedValueOnce(createResponse({ message: 'boom' }, false, 500))
      .mockResolvedValueOnce(createResponse({ ok: true }));

    const promise = request('/retry', { schema, auth: false, retries: 1, retryDelay: 5, cacheTtl: 0 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('caches GET responses within the TTL', async () => {
    const schema = Type.Object({ value: Type.Number() });
    fetch.mockResolvedValue(createResponse({ value: 10 }));

    const first = await request('/cached', { schema, auth: false, cacheTtl: 50 });
    const second = await request('/cached', { schema, auth: false, cacheTtl: 50 });

    expect(first.value).toBe(10);
    expect(second.value).toBe(10);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('throws when validation fails', async () => {
    const schema = { parse: () => { throw new Error('Response validation failed'); } };
    fetch.mockResolvedValue(createResponse({ value: 123 }));

    await expect(request('/invalid', { schema, auth: false, cacheTtl: 0, retries: 0 })).rejects.toThrow('Response validation failed');
  });
});
