import type { ApiResponse, ApiError, User } from '@musclemap/core';
import { storage, STORAGE_KEYS } from '../storage';

export interface ApiClientConfig {
  baseUrl: string;
  onAuthError?: () => void;
}

export interface AuthTokens {
  token: string;
  refreshToken?: string;
}

/**
 * HTTP client for MuscleMap API with automatic token management.
 */
export class ApiClient {
  private baseUrl: string;
  private onAuthError?: () => void;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.onAuthError = config.onAuthError;
  }

  /**
   * Get the current auth token from storage.
   */
  async getToken(): Promise<string | null> {
    return storage.getItem(STORAGE_KEYS.TOKEN);
  }

  /**
   * Set auth tokens in storage.
   */
  async setTokens(tokens: AuthTokens): Promise<void> {
    await storage.setItem(STORAGE_KEYS.TOKEN, tokens.token);
    if (tokens.refreshToken) {
      await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    }
  }

  /**
   * Clear auth tokens from storage.
   */
  async clearTokens(): Promise<void> {
    await Promise.all([
      storage.removeItem(STORAGE_KEYS.TOKEN),
      storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
    ]);
  }

  /**
   * Make an authenticated API request.
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = await this.getToken();
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        // Token expired or invalid
        await this.clearTokens();
        this.onAuthError?.();
        return {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Session expired' } as ApiError,
        };
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || { code: 'UNKNOWN', message: 'Request failed' },
        };
      }

      return {
        success: true,
        data: data as T,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        } as ApiError,
      };
    }
  }

  /**
   * GET request.
   */
  get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request.
   */
  post<T>(endpoint: string, body?: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request.
   */
  put<T>(endpoint: string, body?: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request.
   */
  delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Singleton instance - configure with createApiClient
let apiClientInstance: ApiClient | null = null;

/**
 * Create and configure the API client singleton.
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  apiClientInstance = new ApiClient(config);
  return apiClientInstance;
}

/**
 * Get the API client instance.
 * @throws If createApiClient hasn't been called.
 */
export function getApiClient(): ApiClient {
  if (!apiClientInstance) {
    throw new Error('API client not initialized. Call createApiClient first.');
  }
  return apiClientInstance;
}
