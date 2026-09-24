import { apiFetch, setAuthToken } from './apiClient';

// Auth state lives in a bearer token (see apiClient.js), not a cookie.
// isAuthenticated() still asks the server, since a locally-present token
// could be expired or revoked.

export async function isStudentAuthenticated() {
  const res = await apiFetch('/api/me');
  return res.ok;
}

export async function isAdminAuthenticated() {
  const res = await apiFetch('/api/admin/me');
  return res.ok;
}

export async function studentLogout() {
  await apiFetch('/api/logout', { method: 'POST' });
  setAuthToken(null);
}

export async function adminLogout() {
  await apiFetch('/api/admin/logout', { method: 'POST' });
  setAuthToken(null);
}
