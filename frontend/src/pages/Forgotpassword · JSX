import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  .pnc-forgot input {
    width: 100%; height: 46px; padding: 0 14px; font-size: 14px;
    border-radius: 6px; border: 1.5px solid ${T.hairline};
    background: ${T.paper}; color: ${T.ink}; font-family: 'Inter', sans-serif;
    transition: border-color 0.15s ease;
  }
  .pnc-forgot input:focus { outline: none; border-color: ${T.forest}; }
`;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always show the same confirmation regardless of outcome, so this
      // page can't be used to check which emails are registered.
      if (res.ok || res.status === 422) setSent(true);
      else setError('Something went wrong. Please try again.');
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pnc-forgot" style={{
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
              Reset your password
            </h1>
          </div>

          {sent ? (
            <div>
              <p style={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.6 }}>
                If that email is registered, a password reset link has been sent. Please check your inbox (and spam folder).
              </p>
              <p style={{ marginTop: 20, fontSize: 13, textAlign: 'center' }}>
                <Link to="/login" style={{ color: T.forestDeep, fontWeight: 700, textDecoration: 'none' }}>
                  Back to login
                </Link>
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ margin: 0, fontSize: 13, color: T.inkSoft }}>
                Enter the email you registered with. We'll send you a link to reset your password.
              </p>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
              <p style={{ marginTop: 6, fontSize: 13, textAlign: 'center' }}>
                <Link to="/login" style={{ color: T.inkSoft, fontWeight: 500, textDecoration: 'none' }}>
                  ← Back to login
                </Link>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
