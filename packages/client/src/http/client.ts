/**
 * HTTP Client
 *
 * Platform-agnostic HTTP client with retry logic, caching, and schema validation.
 */
import { getStorageAdapter, STORAGE_KEYS } from '../storage/types';
import { applySchema, type AnyValidationSchema } from './schema';

const DEFAULT_API_BASE = '/api';
const DEFAULT_RETRY_DELAY = 200;
const DEFAULT_RETRIES = 2;
const DEFAULT_CACHE_TTL = 30_000;

// Request cache
interface CacheEntry<T> {
  data: T;
  expires: number;
}
const cache = new Map<string, CacheEntry<unknown>>();

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

function buildCacheKey(url: string, method: string, body?: unknown): string {
  return `${method.toUpperCase()}:${url}:${body ? JSON.stringify(body) : ''}`;
}

/**
 * Clear the request cache
 */
export function clearRequestCache(): void {
  cache.clear();
}

export interface RequestOptions<T = unknown> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown> | FormData;
  headers?: Record<string, string>;
  schema?: AnyValidationSchema;
  auth?: boolean;
  retries?: number;
  retryDelay?: number;
  cacheTtl?: number;
  cacheKey?: string;
  baseUrl?: string;
  onUnauthorized?: () => void | Promise<void>;
}

export interface HttpClientConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  onUnauthorized?: () => void | Promise<void>;
}

let clientConfig: HttpClientConfig = {};

/**
 * Configure the HTTP client globally
 */
export function configureHttpClient(config: HttpClientConfig): void {
  clientConfig = { ...clientConfig, ...config };
}

/**
 * Get the current auth token from storage
 */
async function getToken(): Promise<string | null> {
  try {
    const storage = getStorageAdapter();
    return await storage.getItem(STORAGE_KEYS.TOKEN);
  } catch {
    return null;
  }
}

/**
 * Clear auth data from storage
 */
async function clearAuth(): Promise<void> {
  try {
    const storage = getStorageAdapter();
    await Promise.all([
      storage.removeItem(STORAGE_KEYS.TOKEN),
      storage.removeItem(STORAGE_KEYS.USER),
    ]);
  } catch {
    // Ignore storage errors during clear
  }
}

/**
 * Make an HTTP request with retry logic, caching, and schema validation
 */
export async function request<T = unknown>(
  path: string,
  options: RequestOptions<T> = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    schema,
    auth = true,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    cacheTtl,
    cacheKey: customCacheKey,
    baseUrl,
    onUnauthorized,
  } = options;

  const base = baseUrl ?? clientConfig.baseUrl ?? DEFAULT_API_BASE;
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const normalizedMethod = method.toUpperCase();

  // Determine caching behavior
  const shouldCache = cacheTtl === undefined ? normalizedMethod === 'GET' : cacheTtl > 0;
  const ttl = cacheTtl === undefined ? (normalizedMethod === 'GET' ? DEFAULT_CACHE_TTL : 0) : cacheTtl;
  const key = customCacheKey || buildCacheKey(url, normalizedMethod, body);

  // Check cache
  if (shouldCache && cache.has(key)) {
    const entry = cache.get(key)!;
    if (entry.expires > Date.now()) {
      return entry.data as T;
    }
    cache.delete(key);
  }

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= retries) {
    try {
      // Check if body is FormData
      const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

      // Build headers
      const requestHeaders: Record<string, string> = {
        ...clientConfig.defaultHeaders,
        // Don't set Content-Type for FormData - browser will set it with boundary
        ...(body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      };

      // Add auth header if needed
      if (auth) {
        const token = await getToken();
        if (token) {
          requestHeaders['Authorization'] = `Bearer ${token}`;
        }
      }

      const response = await fetch(url, {
        method: normalizedMethod,
        headers: requestHeaders,
        body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
      });

      // Handle unauthorized
      if (response.status === 401 && auth) {
        await clearAuth();
        const handler = onUnauthorized ?? clientConfig.onUnauthorized;
        if (handler) {
          await handler();
        }
        throw new Error('Unauthorized');
      }

      // Retry on server errors
      if (response.status >= 500 && attempt < retries) {
        attempt++;
        await sleep(retryDelay * attempt);
        continue;
      }

      // Handle non-OK responses
      if (!response.ok) {
        const errorBody = await safeJson<{ error?: string | { message?: string; code?: string }; message?: string }>(response);
        let errorMessage = `Request failed with status ${response.status}`;
        if (errorBody) {
          if (typeof errorBody.error === 'object' && errorBody.error?.message) {
            errorMessage = errorBody.error.message;
          } else if (typeof errorBody.error === 'string') {
            errorMessage = errorBody.error;
          } else if (errorBody.message) {
            errorMessage = errorBody.message;
          }
        }
        throw new Error(errorMessage);
      }

      // Parse and validate response
      const data = await safeJson<T>(response);
      const parsed = applySchema<T>(schema, data);

      // Store in cache
      if (shouldCache && ttl > 0) {
        cache.set(key, { data: parsed, expires: Date.now() + ttl });
      }

      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt >= retries) break;
      attempt++;
      await sleep(retryDelay * attempt);
    }
  }

  throw lastError || new Error('Request failed');
}

/**
 * API helpers for building request options
 */
export const apiHelpers = {
  withSchema: <T>(schema: AnyValidationSchema): Partial<RequestOptions<T>> => ({ schema }),
};
