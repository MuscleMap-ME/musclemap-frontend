export const getToken = () => localStorage.getItem('musclemap_token');
export const getUser = () => JSON.parse(localStorage.getItem('musclemap_user') || '{}');
export const setAuth = (token, user) => {
  localStorage.setItem('musclemap_token', token);
  localStorage.setItem('musclemap_user', JSON.stringify(user));
};
export const clearAuth = () => {
  localStorage.removeItem('musclemap_token');
  localStorage.removeItem('musclemap_user');
};
export const authHeaders = () => ({ Authorization: 'Bearer ' + getToken() });
export const authFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: { ...options.headers, ...authHeaders(), 'Content-Type': 'application/json' }
  });
  if (res.status === 401) { clearAuth(); window.location.href = '/login'; }
  return res;
};
