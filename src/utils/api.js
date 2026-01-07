import { request } from '@musclemap/client';

/**
 * Axios-style API wrapper using the @musclemap/client request function.
 * Provides get, post, put, delete methods for legacy code compatibility.
 */
export const api = {
  /**
   * Make a GET request
   * @param {string} path - API path
   * @returns {Promise<{data: any}>} Response with data property
   */
  async get(path) {
    const response = await request(path, { method: 'GET' });
    return { data: response };
  },

  /**
   * Make a POST request
   * @param {string} path - API path
   * @param {object} body - Request body
   * @returns {Promise<{data: any}>} Response with data property
   */
  async post(path, body) {
    const response = await request(path, { method: 'POST', body });
    return { data: response };
  },

  /**
   * Make a PUT request
   * @param {string} path - API path
   * @param {object} body - Request body
   * @returns {Promise<{data: any}>} Response with data property
   */
  async put(path, body) {
    const response = await request(path, { method: 'PUT', body });
    return { data: response };
  },

  /**
   * Make a DELETE request
   * @param {string} path - API path
   * @returns {Promise<{data: any}>} Response with data property
   */
  async delete(path) {
    const response = await request(path, { method: 'DELETE' });
    return { data: response };
  },
};

export default api;
