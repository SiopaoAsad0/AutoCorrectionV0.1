export const API_BASE = import.meta.env.VITE_API_URL || '';

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

// Sanctum's SPA (cookie/session) auth requires a CSRF cookie to be present
// before any state-changing request, and that cookie's value echoed back
// as the X-XSRF-TOKEN header. This fetches it once and caches the promise
// so concurrent calls don't trigger duplicate requests.
let csrfCookiePromise = null;
function ensureCsrfCookie(forceRefresh = false) {
  if (forceRefresh) csrfCookiePromise = null;
  if (!csrfCookiePromise) {
    csrfCookiePromise = fetch(`${API_BASE}/sanctum/csrf-cookie`, { credentials: 'include' })
      .catch((err) => { csrfCookiePromise = null; throw err; });
  }
  return csrfCookiePromise;
}

async function buildRequest(path, options) {
  const method = (options.method || 'GET').toUpperCase();
  const isStateChanging = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  if (isStateChanging) await ensureCsrfCookie();

  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  const isFormData = options.body instanceof FormData;
  if (options.body && !isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (isStateChanging) {
    const xsrf = getCookie('XSRF-TOKEN');
    if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;
  }

  return fetch(`${API_BASE}${path}`, { ...options, credentials: 'include', headers });
}

/**
 * Drop-in replacement for fetch() that handles session cookies and CSRF
 * automatically. Use this for every API call instead of raw fetch() --
 * auth now lives entirely in an httpOnly cookie the browser manages, not
 * in anything this code can read or store itself.
 *
 * The CSRF cookie used to be fetched once and cached for the rest of the
 * page's life. If the session became stale for any reason during that
 * time (expired, invalidated, server restart), every request after that
 * point kept sending the same now-mismatched token and failed forever --
 * including login itself, with no way to recover without a full page
 * reload. Now a 419 (CSRF token mismatch) triggers exactly one automatic
 * retry with a freshly-fetched token before giving up.
 */
export async function apiFetch(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isStateChanging = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  let res = await buildRequest(path, options);

  if (isStateChanging && res.status === 419) {
    await ensureCsrfCookie(true);
    res = await buildRequest(path, options);
  }

  return res;
}
