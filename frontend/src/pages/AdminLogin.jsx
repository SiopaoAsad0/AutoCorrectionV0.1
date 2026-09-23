import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isAdminAuthenticated, isStudentAuthenticated } from '../utils/auth';

/**
 * Wraps a page that requires an active session. Since auth now lives in an
 * httpOnly cookie this code can't read directly, checking "is the user
 * logged in" means actually asking the server -- there's no synchronous
 * shortcut anymore, which is the point: nothing client-side can be trusted
 * or spoofed to bypass this.
 *
 * Re-checks on:
 * - mount
 * - `pageshow` with `persisted: true` (bfcache restore -- the classic
 *   "hit back after logout and see the old page" case, since a
 *   bfcache-restored page never re-runs this effect's initial mount logic
 *   on its own)
 * - `visibilitychange` (session expired or was invalidated in another tab
 *   while this tab was backgrounded)
 *
 * `type` is 'admin' or 'student', selecting which session to check.
 */
export default function ProtectedRoute({ type, children, redirectTo }) {
  const check = type === 'admin' ? isAdminAuthenticated : isStudentAuthenticated;
  const [status, setStatus] = useState('checking'); // 'checking' | 'authed' | 'guest'

  useEffect(() => {
    let cancelled = false;
    const recheck = async () => {
      setStatus('checking');
      const ok = await check();
      if (!cancelled) setStatus(ok ? 'authed' : 'guest');
    };
    recheck();

    const onPageShow = (event) => { if (event.persisted) recheck(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') recheck(); };

    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [check]);

  if (status === 'checking') {
    // Deliberately blank/minimal rather than flashing protected content
    // before the session check resolves.
    return null;
  }

  if (status === 'guest') {
    return <Navigate to={redirectTo || (type === 'admin' ? '/admin/login' : '/login')} replace />;
  }

  return children;
}
