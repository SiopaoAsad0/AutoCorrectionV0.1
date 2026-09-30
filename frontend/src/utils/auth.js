import { apiFetch } from './apiClient';

// Auth state lives in an httpOnly session cookie the browser manages, so
// every check is a real request to the server asking "is this session
// valid?".
//
// Because each protected page runs this check when it mounts, moving
// between pages used to wait for a full round-trip to the backend every
// time. To keep navigation fast, a *successful* check is remembered for
// a short time and shared between concurrent callers. Failed checks are
// never cached, so logging in right after a failed check still works.

const CACHE_MS = 60 * 1000;

function makeCheck(path) {
  let okUntil = 0;   // timestamp until which a positive result is trusted
  let pending = null; // in-flight request shared by concurrent callers

  const check = async () => {
    if (Date.now() < okUntil) return true;
    if (pending) return pending;

    pending = apiFetch(path)
      .then((res) => {
        if (res.ok) okUntil = Date.now() + CACHE_MS;
        return res.ok;
      })
      .catch(() => false)
      .finally(() => { pending = null; });

    return pending;
  };

  check.clear = () => { okUntil = 0; pending = null; };
  return check;
}

const checkStudent = makeCheck('/api/me');
const checkAdmin = makeCheck('/api/admin/me');

export function isStudentAuthenticated() {
  return checkStudent();
}

export function isAdminAuthenticated() {
  return checkAdmin();
}

export async function studentLogout() {
  checkStudent.clear();
  await apiFetch('/api/logout', { method: 'POST' });
  // Clear the checker's in-progress draft so it can't leak to whoever
  // logs in next on a shared browser.
  try { sessionStorage.removeItem('pnc_checker_draft'); } catch { /* ignore */ }
}

export async function adminLogout() {
  checkAdmin.clear();
  await apiFetch('/api/admin/logout', { method: 'POST' });
}
