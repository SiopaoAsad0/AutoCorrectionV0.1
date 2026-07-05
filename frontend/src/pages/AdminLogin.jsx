import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || '';

/* Same manuscript tokens as Landing / Checker / Profile / AdminReports. */
const T = {
  paper:      '#f2f3ec',
  ink:        '#16241d',
  inkSoft:    '#4b584f',
  inkFaint:   '#8b9489',
  forest:     '#1f5c42',
  forestDeep: '#123a29',
  forestTint: '#e6ede8',
  gold:       '#c9a227',
  red:        '#b3402f',
  redTint:    '#f7e9e5',
  hairline:   '#d7d9cd',
  white:      '#fffdf8',
};

const FONTS_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
  .pnc-admin-login *:focus-visible { outline: 2px solid ${T.forestTint}; outline-offset: 2px; }
  .pnc-admin-login-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .pnc-admin-login-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(18,58,41,0.22); }
  .pnc-admin-field { transition: border-color 0.15s ease; }
  .pnc-admin-field:focus { border-color: ${T.forest} !important; }
  .pnc-admin-toggle { transition: color 0.15s ease; }
  .pnc-admin-toggle:hover { color: ${T.forestDeep} !important; }
  .pnc-admin-back:hover { color: ${T.forestDeep} !important; }
`;

const fieldStyle = {
  width: '100%', padding: '13px 14px', fontSize: 14.5, borderRadius: 5,
  border: `1.5px solid ${T.hairline}`, background: T.paper, color: T.ink, fontFamily: 'inherit',
};

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Enter email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data.message ||
          (data.errors && Object.values(data.errors).flat().join(' ')) ||
          `Login failed (${res.status})`;
        throw new Error(msg);
      }
      if (data.token) {
        localStorage.setItem('admin_token', data.token);
        navigate('/admin/messages', { replace: true });
      }
    } catch (e) {
      setError(e.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pnc-admin-login" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px', fontFamily: "'Inter', system-ui, sans-serif", background: T.paper,
    }}>
      <style>{FONTS_IMPORT}</style>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 420 }}
      >
        <div style={{
          background: T.white, borderRadius: 10, border: `1px solid ${T.hairline}`,
          boxShadow: '0 4px 24px rgba(18,58,41,0.08)', overflow: 'hidden',
        }}>

          {/* Header band */}
          <div style={{ background: T.forestDeep, padding: '28px 28px 20px', borderBottom: `3px solid ${T.gold}` }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, fontWeight: 500,
              color: 'rgba(255,253,248,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 16, height: 1, background: 'rgba(255,253,248,0.5)', display: 'inline-block' }} />
              Admin panel
            </div>
            <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 21, fontWeight: 700, color: T.white, lineHeight: 1.2 }}>
              Admin sign in
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(255,253,248,0.65)', marginTop: 6 }}>
              Dictionary admins can view contact messages and replies.
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '24px 28px 28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{
                  display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
                  color: T.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7,
                }}>
                  Email
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="Admin email or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pnc-admin-field"
                  style={fieldStyle}
                />
              </div>

              <div>
                <label style={{
                  display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
                  color: T.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7,
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    className="pnc-admin-field"
                    style={{ ...fieldStyle, paddingRight: 56 }}
                  />
                  <button
                    type="button"
                    className="pnc-admin-toggle"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                      height: 32, minWidth: 'auto', padding: '0 10px', fontSize: 12, fontWeight: 600,
                      color: T.inkSoft, background: 'transparent', border: 'none', cursor: 'pointer',
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: T.redTint, color: T.red, borderRadius: 5, fontSize: 13, border: `1px solid ${T.red}33` }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="pnc-admin-login-btn"
                style={{
                  height: 46, fontSize: 14, fontWeight: 700, marginTop: 4,
                  background: loading ? T.inkFaint : T.forestDeep, color: T.white,
                  border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
                  minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </div>

            <div style={{ marginTop: 20 }}>
              <Link
                to="/"
                className="pnc-admin-back"
                style={{ fontSize: 13, fontWeight: 600, color: T.inkSoft, textDecoration: 'none' }}
              >
                ← Back to home
              </Link>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: T.inkFaint }}>
          Pamantasan ng Cabuyao · Taglish Spell Checker System
        </div>
      </motion.div>
    </div>
  );
}
