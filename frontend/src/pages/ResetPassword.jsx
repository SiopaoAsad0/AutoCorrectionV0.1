import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const T = {
  paper:      '#f2f3ec',
  ink:        '#16241d',
  inkSoft:    '#4b584f',
  inkFaint:   '#8b9489',
  forest:     '#1f5c42',
  forestDeep: '#123a29',
  red:        '#b3402f',
  redTint:    '#f7e9e5',
  hairline:   '#d7d9cd',
  white:      '#fffdf8',
};

const API_BASE = import.meta.env.VITE_API_URL || '';

const FONTS_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
  .pnc-reset input {
    width: 100%; height: 46px; padding: 0 14px; font-size: 14px;
    border-radius: 6px; border: 1.5px solid ${T.hairline};
    background: ${T.paper}; color: ${T.ink}; font-family: 'Inter', sans-serif;
    transition: border-color 0.15s ease;
  }
  .pnc-reset input:focus { outline: none; border-color: ${T.forest}; }
`;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError(null);
    if (!token || !email) {
      setError('This reset link is invalid or incomplete. Please request a new one.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          token, email, password, password_confirmation: confirm,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const firstError = data.errors ? Object.values(data.errors)[0]?.[0] : null;
        setError(firstError || data.message || 'This reset link is invalid or has expired.');
        return;
      }
      navigate('/login', { state: { justReset: true } });
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pnc-reset" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', background: T.paper, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{FONTS_IMPORT}</style>
      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 400 }}
      >
        <div style={{
          background: T.white, borderRadius: 10, border: `1px solid ${T.hairline}`,
          boxShadow: '0 4px 24px rgba(18,58,41,0.08)', padding: '32px 30px',
        }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 500, color: T.forestDeep, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              PNC · Taglish Spell Checker
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Source Serif 4', serif", fontSize: '1.5rem', fontWeight: 700, color: T.ink }}>
              Set a new password
            </h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="password"
              placeholder="New password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: '10px 14px', background: T.redTint, color: T.red, borderRadius: 6, fontSize: 13, border: `1px solid ${T.red}33` }}
              >
                {error}
              </motion.div>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                height: 46, fontSize: 14, fontWeight: 700, marginTop: 4,
                background: loading ? T.inkFaint : T.forestDeep, color: T.white,
                border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Resetting…' : 'Reset password'}
            </button>
            <p style={{ marginTop: 6, fontSize: 13, textAlign: 'center' }}>
              <Link to="/login" style={{ color: T.inkSoft, fontWeight: 500, textDecoration: 'none' }}>
                ← Back to login
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
