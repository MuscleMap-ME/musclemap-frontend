import { Value } from '@sinclair/typebox/value';
import { getToken, clearAuth } from './auth';

const API_BASE = '/api';
const cache = new Map();
const defaultRetryDelay = 200;
const defaultRetries = 2;
const defaultCacheTtl = 30_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const safeJson = async (response) => {
  try {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

const buildCacheKey = (url, method, body) => `${method.toUpperCase()}:${url}:${body ? JSON.stringify(body) : ''}`;

const applySchema = (schema, data) => {
  if (!schema) return data;
  if (typeof schema.parse === 'function') return schema.parse(data);
  if (typeof schema.safeParse === 'function') {
    const result = schema.safeParse(data);
    if (result.success) return result.data;
    throw new Error('Response validation failed');
  }
  try {
    const casted = Value.Cast(schema, data);
    if (Value.Check(schema, casted)) return casted;
  } catch (err) {
    throw new Error('Response validation failed');
  }
  throw new Error('Response validation failed');
};

export const clearRequestCache = () => cache.clear();

export async function request(path, {
  method = 'GET',
  body,
  headers = {},
  schema,
  auth = true,
  retries = defaultRetries,
  retryDelay = defaultRetryDelay,
  cacheTtl,
  cacheKey,
} = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const normalizedMethod = method.toUpperCase();
  const shouldCache = cacheTtl === undefined ? normalizedMethod === 'GET' : cacheTtl > 0;
  const ttl = cacheTtl === undefined ? (normalizedMethod === 'GET' ? defaultCacheTtl : 0) : cacheTtl;
  const key = cacheKey || buildCacheKey(url, normalizedMethod, body);

  if (shouldCache && cache.has(key)) {
    const entry = cache.get(key);
    if (entry.expires > Date.now()) {
      return entry.data;
    }
    cache.delete(key);
  }

  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      const response = await fetch(url, {
        method: normalizedMethod,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(auth ? { Authorization: `Bearer ${getToken()}` } : {}),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.status === 401 && auth) {
        clearAuth();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Unauthorized');
      }

      if (response.status >= 500 && attempt < retries) {
        attempt++;
        await sleep(retryDelay * attempt);
        continue;
      }

      if (!response.ok) {
        const errorBody = await safeJson(response);
        throw new Error(errorBody?.error || errorBody?.message || `Request failed with status ${response.status}`);
      }

      const data = await safeJson(response);
      const parsed = applySchema(schema, data);

      if (shouldCache && ttl > 0) {
        cache.set(key, { data: parsed, expires: Date.now() + ttl });
      }

      return parsed;
    } catch (err) {
      lastError = err;
      if (attempt >= retries) break;
      attempt++;
      await sleep(retryDelay * attempt);
    }
  }

  throw lastError || new Error('Request failed');
}

export const apiHelpers = {
  withSchema: (schema) => ({ schema }),
};
