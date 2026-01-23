import { apiClient, request } from '@musclemap/client';

/**
 * API client re-exported from @musclemap/client.
 *
 * This provides the full typed API client with all endpoints:
 * - api.characterStats.me() - Get user's D&D-style character stats
 * - api.progress.stats() - Get user's progress stats
 * - api.wallet.balance() - Get user's wallet balance
 * - etc.
 *
 * For legacy code compatibility, also provides get/post/put/delete methods.
 */
export const api = {
  // Re-export full apiClient properties
  ...apiClient,

  /**
   * Make a GET request (legacy compatibility)
   * @param {string} path - API path
   * @returns {Promise<{data: any}>} Response with data property
   */
  async get(path) {
    const response = await request(path, { method: 'GET' });
    return { data: response };
  },

  /**
   * Make a POST request (legacy compatibility)
   * @param {string} path - API path
   * @param {object} body - Request body
   * @returns {Promise<{data: any}>} Response with data property
   */
  async post(path, body) {
    console.log('[api.post] path:', path);
    console.log('[api.post] body:', body);
    console.log('[api.post] body type:', typeof body);
    console.log('[api.post] body is null:', body === null);
    console.log('[api.post] body is undefined:', body === undefined);
    const response = await request(path, { method: 'POST', body });
    return { data: response };
  },

  /**
   * Make a PUT request (legacy compatibility)
   * @param {string} path - API path
   * @param {object} body - Request body
   * @returns {Promise<{data: any}>} Response with data property
   */
  async put(path, body) {
    const response = await request(path, { method: 'PUT', body });
    return { data: response };
  },

  /**
   * Make a DELETE request (legacy compatibility)
   * @param {string} path - API path
   * @returns {Promise<{data: any}>} Response with data property
   */
  async delete(path) {
    const response = await request(path, { method: 'DELETE' });
    return { data: response };
  },
};

export default api;
