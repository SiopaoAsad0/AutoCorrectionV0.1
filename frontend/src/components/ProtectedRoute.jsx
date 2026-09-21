import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isAdminAuthenticated, isStudentAuthenticated } from '../utils/auth';

/**
 * Wraps a page that requires an active session. Two things make this more
 * than a simple mount-time check:
 *
 * 1. `pageshow` with `event.persisted === true` fires when a browser
 *    restores a page from the back/forward cache (bfcache) instead of
 *    re-running React from scratch — this is exactly the "hit back after
 *    logout and see the old authenticated page" scenario, since a plain
 *    mount-time check never re-runs for a bfcache-restored page.
 * 2. `visibilitychange` catches the case where a session was invalidated
 *    in another tab, or expired, while this tab was in the background.
 *
 * `type` is 'admin' or 'student', selecting which session check to use.
 */
export default function ProtectedRoute({ type, children, redirectTo }) {
  const check = type === 'admin' ? isAdminAuthenticated : isStudentAuthenticated;
  const [authed, setAuthed] = useState(check());

  useEffect(() => {
    const recheck = () => setAuthed(check());

    const onPageShow = (event) => {
      if (event.persisted) recheck();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') recheck();
    };

    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [check]);

  if (!authed) {
    return <Navigate to={redirectTo || (type === 'admin' ? '/admin/login' : '/login')} replace />;
  }

  return children;
}
