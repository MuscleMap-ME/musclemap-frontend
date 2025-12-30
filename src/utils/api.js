import { authFetch } from './auth';

const API = '/api';

export const api = {
  login: (email, password) => fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).then(r => r.json()),
  register: (data) => fetch(API + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  getProfile: () => authFetch(API + '/auth/profile').then(r => r.json()),
  getPaths: () => authFetch(API + '/journey/paths').then(r => r.json()),
  switchPath: (archetype) => authFetch(API + '/journey/switch', { method: 'POST', body: JSON.stringify({ archetype, reason: 'user_choice' }) }).then(r => r.json()),
  getWorkout: () => authFetch(API + '/prescription/workout').then(r => r.json()),
  getStats: () => authFetch(API + '/progress/stats').then(r => r.json()),
  getEvolution: () => authFetch(API + '/evolution/status').then(r => r.json()),
  getCosmetics: () => authFetch(API + '/gamification/cosmetics').then(r => r.json())
};

export default api;