// Centralized session helpers. Nothing here clears storage except the
// explicit logout functions — session state should only ever be cleared
// when the user intentionally logs out, never as a side effect of
// navigating to another page (e.g. clicking Home).

export function isAdminAuthenticated() {
  return !!localStorage.getItem('admin_token');
}

export function isStudentAuthenticated() {
  return localStorage.getItem('isLoggedIn') === 'true' && !!localStorage.getItem('pnc_token');
}

export function adminLogout() {
  localStorage.removeItem('admin_token');
}

export function studentLogout() {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('pnc_user');
  localStorage.removeItem('pnc_token');
}
