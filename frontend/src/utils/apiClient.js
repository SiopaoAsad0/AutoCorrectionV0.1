export const API_BASE = import.meta.env.VITE_API_URL || '';

const TOKEN_STORAGE_KEY = 'auth_token';

// Auth now works via a Sanctum bearer token instead of a session cookie.
// A session cookie can't be shared between the frontend (Vercel) and
// backend (Render) domains -- the browser never exposes one domain's
// cookie to JS running on another -- so the CSRF-cookie flow this file
// used to do (GET /sanctum/csrf-cookie, read XSRF-TOKEN, echo it back as
// a header) can never succeed across that split. A token sent explicitly
// in the Authorization header has no such restriction.
//
// The token is kept in memory + localStorage. localStorage is readable by
// any script on the page, so this is only as safe as your app's XSS
// surface -- keep user-generated content escaped (React does this by
// default) and avoid dangerouslySetInnerHTML with untrusted input.
let authToken = localStorage.getItem(TOKEN_STORAGE_KEY);

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getAuthToken() {
  return authToken;
}

/**
 * Drop-in replacement for fetch() that attaches the bearer token
 * automatically. Use this for every API call instead of raw fetch().
 */
export async function apiFetch(path, options = {}) {
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  const isFormData = options.body instanceof FormData;
  if (options.body && !isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
}
