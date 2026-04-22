import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const API_BASE = '';

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
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="page-wrapper"
    >
      <div className="login-card" style={{ maxWidth: 420 }}>
        <motion.h2 initial={{ y: -20 }} animate={{ y: 0 }}>
          Admin sign in
        </motion.h2>
        <p style={{ color: '#666', fontSize: 14, marginTop: -8 }}>
          Dictionary admins can view contact messages and replies.
        </p>
        <div className="form-container" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <input
            type="text"
            autoComplete="username"
            placeholder="Admin email (from .env ADMIN_EMAIL)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="password-input-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {error && (
            <div style={{ color: '#c00', fontSize: 13, marginBottom: 8 }}>{error}</div>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </motion.button>
        </div>
        <p style={{ marginTop: '20px' }}>
          <Link to="/" style={{ color: '#00703c', fontWeight: 'bold' }}>
            ← Back to home
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
