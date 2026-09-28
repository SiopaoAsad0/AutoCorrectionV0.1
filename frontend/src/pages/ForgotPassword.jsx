import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiFetch } from '../utils/apiClient';

const T = {
  paper:      '#f2f3ec',
  ink:        '#16241d',
  inkSoft:    '#4b584f',
  inkFaint:   '#8b9489',
  forest:     '#1f5c42',
  forestDeep: '#123a29',
  forestTint: '#e6ede8',
  red:        '#b3402f',
  redTint:    '#f7e9e5',
  hairline:   '#d7d9cd',
  white:      '#fffdf8',
};

const RESEND_SECONDS = 60;

const FONTS_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
  .pnc-forgot input {
    width: 100%; height: 46px; padding: 0 14px; font-size: 14px;
    border-radius: 6px; border: 1.5px solid ${T.hairline};
    background: ${T.paper}; color: ${T.ink}; font-family: 'Inter', sans-serif;
    transition: border-color 0.15s ease;
  }
  .pnc-forgot input:focus { outline: none; border-color: ${T.forest}; }
  .pnc-forgot input.pnc-otp-input {
    text-align: center; letter-spacing: 0.5em; font-size: 20px;
    font-family: 'IBM Plex Mono', monospace; font-weight: 600; padding-left: 0.5em;
  }
`;

const STEP_LABELS = {
  email: 'Step 1 of 3 · Email',
  otp: 'Step 2 of 3 · Verify code',
  password: 'Step 3 of 3 · New password',
};

const TITLES = {
  email: 'Reset your password',
  otp: 'Enter your code',
  password: 'Choose a new password',
  done: 'Password changed',
};

// Laravel validation errors come back as { errors: { field: [msg] } };
// other failures as { message }.
function errorMessage(data, fallback) {
  if (data && data.errors) {
    const first = Object.values(data.errors).flat()[0];
    if (first) return first;
  }
  return (data && data.message) || fallback;
}

export default function ForgotPassword() {
  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'password' | 'done'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const post = async (path, body) => {
    const res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  };

  const offline = 'Could not reach the server. Please check your connection and try again.';

  /* Step 1 (and "Resend"): email the code */
  const sendOtp = async () => {
    setError(null); setInfo(null);
    const value = email.trim();
    if (!/\S+@\S+\.\S+/.test(value)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const { res, data } = await post('/api/password/otp/send', { email: value });
      if (!res.ok) {
        setError(errorMessage(data, 'Could not send the code. Please try again.'));
        return;
      }
      setEmail(value);
      setOtp('');
      setStep('otp');
      setCooldown(RESEND_SECONDS);
      setInfo(`We sent a 6-digit code to ${value}. It expires in 10 minutes.`);
    } catch {
      setError(offline);
    } finally {
      setLoading(false);
    }
  };

  /* Step 2: check the code */
  const verifyOtp = async () => {
    setError(null); setInfo(null);
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      const { res, data } = await post('/api/password/otp/verify', { email, otp });
      if (!res.ok) {
        setError(errorMessage(data, 'That code is not valid.'));
        return;
      }
      setStep('password');
    } catch {
      setError(offline);
    } finally {
      setLoading(false);
    }
  };

  /* Step 3: set the new password */
  const changePassword = async () => {
    setError(null); setInfo(null);
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
      const { res, data } = await post('/api/password/otp/reset', {
        email, otp, password, password_confirmation: confirm,
      });
      if (!res.ok) {
        setError(errorMessage(data, 'Could not change the password. Please try again.'));
        // The code itself was rejected (expired, or too many wrong tries):
        // it can't be reused, so start over with a fresh one.
        if (data && data.errors && data.errors.otp) {
          setOtp(''); setPassword(''); setConfirm('');
          setStep('email');
        }
        return;
      }
      setStep('done');
    } catch {
      setError(offline);
    } finally {
      setLoading(false);
    }
  };

  const primaryButton = (label, busyLabel, onClick) => (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        height: 46, fontSize: 14, fontWeight: 700, marginTop: 4,
        background: loading ? T.inkFaint : T.forestDeep, color: T.white,
        border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
      }}
    >
      {loading ? busyLabel : label}
    </button>
  );

  const linkButton = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, minWidth: 'auto' };

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
              {STEP_LABELS[step] || 'PNC · Taglish Spell Checker'}
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Source Serif 4', serif", fontSize: '1.5rem', fontWeight: 700, color: T.ink }}>
              {TITLES[step]}
            </h1>
          </div>

          {step === 'done' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ margin: 0, fontSize: 14, color: T.inkSoft, lineHeight: 1.6 }}>
                Your password has been changed. You can now log in with your new password.
              </p>
              <button
                onClick={() => navigate('/login', { replace: true })}
                style={{
                  height: 46, fontSize: 14, fontWeight: 700,
                  background: T.forestDeep, color: T.white,
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                }}
              >
                Go to login
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {step === 'email' && (
                <>
                  <p style={{ margin: 0, fontSize: 13, color: T.inkSoft }}>
                    Enter the email you registered with. We'll send you a 6-digit code.
                  </p>
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
                    autoFocus
                  />
                </>
              )}

              {step === 'otp' && (
                <>
                  {info && (
                    <div style={{ padding: '10px 14px', background: T.forestTint, color: T.forestDeep, borderRadius: 6, fontSize: 13, border: `1px solid ${T.forest}33` }}>
                      {info}
                    </div>
                  )}
                  <input
                    className="pnc-otp-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="------"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => e.key === 'Enter' && verifyOtp()}
                    autoFocus
                  />
                </>
              )}

              {step === 'password' && (
                <>
                  <p style={{ margin: 0, fontSize: 13, color: T.inkSoft }}>
                    Code verified. Choose a new password for {email}.
                  </p>
                  <input
                    type="password"
                    placeholder="New password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && changePassword()}
                  />
                </>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  style={{ padding: '10px 14px', background: T.redTint, color: T.red, borderRadius: 6, fontSize: 13, border: `1px solid ${T.red}33` }}
                >
                  {error}
                </motion.div>
              )}

              {step === 'email' && primaryButton('Send OTP', 'Sending…', sendOtp)}
              {step === 'otp' && primaryButton('Verify OTP', 'Verifying…', verifyOtp)}
              {step === 'password' && primaryButton('Change password', 'Saving…', changePassword)}

              {step === 'otp' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={() => { setError(null); setOtp(''); setStep('email'); }}
                    style={{ ...linkButton, color: T.inkSoft }}
                  >
                    ← Change email
                  </button>
                  <button
                    onClick={sendOtp}
                    disabled={loading || cooldown > 0}
                    style={{
                      ...linkButton,
                      color: cooldown > 0 ? T.inkFaint : T.forestDeep,
                      fontWeight: 600,
                      cursor: loading || cooldown > 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                  </button>
                </div>
              )}

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
