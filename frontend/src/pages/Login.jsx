import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

const FONTS_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
  .pnc-login input {
    width: 100%; height: 46px; padding: 0 14px; font-size: 14px;
    border-radius: 6px; border: 1.5px solid ${T.hairline};
    background: ${T.paper}; color: ${T.ink}; font-family: 'Inter', sans-serif;
    transition: border-color 0.15s ease;
  }
  .pnc-login input:focus { outline: none; border-color: ${T.forest}; }
  .pnc-login button:focus-visible, .pnc-login a:focus-visible, .pnc-login input:focus-visible, .pnc-login select:focus-visible {
    outline: 2px solid ${T.forest}; outline-offset: 2px;
  }
  .pnc-login select {
    height: 46px; padding: 0 12px; font-size: 13px; font-weight: 600;
    border-radius: 6px; border: 1.5px solid ${T.hairline};
    background: ${T.paper}; color: ${T.inkSoft}; font-family: 'Inter', sans-serif;
    cursor: pointer; transition: border-color 0.15s ease;
  }
  .pnc-login select:focus { outline: none; border-color: ${T.forest}; }
  .pnc-password-select {
    position: absolute; right: 6px; top: 0; bottom: 0; margin: auto 0;
    height: 32px !important; width: 88px;
    padding: 0 10px !important; font-size: 12px !important; font-weight: 600;
    box-sizing: border-box;
  }
  .pnc-password-select:hover { border-color: ${T.forest}; }
`;

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function Login() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError(null);

    if (!studentId || !password) {
      setError('Please enter both student ID and password.');
      return;
    }

    // Admin credentials are authenticated via the dedicated admin endpoint/page.
    if (studentId.trim().toLowerCase() === 'admin') {
      setError('Admin account must sign in on the admin login page.');
      navigate('/admin/login');
      return;
    }

    setLoading(true);
    try {
      const savedData = localStorage.getItem('student_' + studentId);
      if (!savedData) {
        setError('Access denied: student ID not recognized.');
        return;
      }
      let student;
      try {
        student = JSON.parse(savedData);
      } catch (parseError) {
        setError('Invalid account data. Please register again.');
        return;
      }
      if (!student.passwordHash) {
        setError('This account was created before password login. Please register again to set a password.');
        return;
      }
      const passwordHash = await hashPassword(password);
      if (student.passwordHash !== passwordHash) {
        setError('Access denied: incorrect password.');
        return;
      }
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('pnc_user', studentId);
      navigate('/checker');
    } catch (loginError) {
      setError('Login failed unexpectedly. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pnc-login" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', background: T.paper, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{FONTS_IMPORT}</style>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
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
              Log in
            </h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="text"
              placeholder="Student ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                style={{ paddingRight: 100 }}
              />
              <select
                className="pnc-password-select"
                value={showPassword ? 'visible' : 'hidden'}
                onChange={(e) => setShowPassword(e.target.value === 'visible')}
                aria-label="Toggle password visibility"
              >
                <option value="hidden">Show</option>
                <option value="visible">Hide</option>
              </select>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: '10px 14px', background: T.redTint, color: T.red, borderRadius: 6, fontSize: 13, border: `1px solid ${T.red}33` }}
              >
                {error}
              </motion.div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                height: 46, fontSize: 14, fontWeight: 700, marginTop: 4,
                background: loading ? T.inkFaint : T.forestDeep, color: T.white,
                border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Signing in…' : 'Log in to checker'}
            </button>
          </div>

          <p style={{ marginTop: 20, fontSize: 13, color: T.inkSoft, textAlign: 'center' }}>
            New participant?{' '}
            <Link to="/signup" style={{ color: T.forestDeep, fontWeight: 700, textDecoration: 'none' }}>
              Register here
            </Link>
          </p>
          <p style={{ marginTop: 8, fontSize: 13, textAlign: 'center' }}>
            <Link to="/" style={{ color: T.inkSoft, fontWeight: 500, textDecoration: 'none' }}>
              ← Back to home
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
