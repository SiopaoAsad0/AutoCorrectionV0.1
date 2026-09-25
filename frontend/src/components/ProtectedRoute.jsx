import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isAdminAuthenticated, isStudentAuthenticated } from '../utils/auth';

/**
 * Wraps a page that requires an active session.
 *
 * IMPORTANT: only the very first check (on mount) is allowed to show the
 * blank "checking" state. Background re-checks (tab refocus, bfcache
 * restore) re-verify quietly WITHOUT blanking already-rendered content --
 * an earlier version set status back to 'checking' on every recheck,
 * which unmounted the wrapped page (and wiped all its local state, e.g.
 * typed text and analysis results in the checker) every single time the
 * user switched tabs and came back, even though they were still logged
 * in the whole time. Now a background recheck only ever escalates to
 * 'guest' if the session turns out to actually be gone; it never
 * re-triggers the blank/remount cycle for a session that's still valid.
 *
 * Re-checks on:
 * - mount (blocking -- shows nothing until this resolves)
 * - `pageshow` with `persisted: true` (bfcache restore)
 * - `visibilitychange` (session expired/invalidated in another tab while
 *   this one was backgrounded)
 *
 * `type` is 'admin' or 'student', selecting which session to check.
 */
export default function ProtectedRoute({ type, children, redirectTo }) {
  const check = type === 'admin' ? isAdminAuthenticated : isStudentAuthenticated;
  const [status, setStatus] = useState('checking'); // 'checking' | 'authed' | 'guest'

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const ok = await check();
      if (!cancelled) setStatus(ok ? 'authed' : 'guest');
    })();

    const recheckQuietly = async () => {
      const ok = await check();
      if (!cancelled && !ok) setStatus('guest');
      // Deliberately no `else setStatus('authed')` -- if we're already
      // rendering the page, a still-valid session changes nothing, and
      // touching status here is exactly what caused the remount bug.
    };

    const onPageShow = (event) => { if (event.persisted) recheckQuietly(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') recheckQuietly(); };

    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [check]);

  if (status === 'checking') return null;
  if (status === 'guest') {
    return <Navigate to={redirectTo || (type === 'admin' ? '/admin/login' : '/login')} replace />;
  }
  return children;
}
