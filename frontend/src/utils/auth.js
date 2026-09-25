import { apiFetch } from './apiClient';

// Auth state now lives entirely in an httpOnly session cookie the browser
// manages -- there is nothing for this code to read directly, so every
// check is a real request to the server asking "is this session valid?"

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
  // Clear the checker's in-progress draft so it can't leak to whoever
  // logs in next on a shared browser.
  try { sessionStorage.removeItem('pnc_checker_draft'); } catch { /* ignore */ }
}

export async function adminLogout() {
  await apiFetch('/api/admin/logout', { method: 'POST' });
}
