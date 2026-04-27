import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

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
      setError('Please enter both Student ID and password.');
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
        setError('Access denied: Student ID not recognized.');
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
        setError('Access denied: Incorrect password.');
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
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="page-wrapper"
    >
      <div className="login-card">
        <motion.h2 initial={{ y: -20 }} animate={{ y: 0 }}>PNC Login</motion.h2>
        
        {/* Container ensures vertical stack and internal alignment */}
        <div className="form-container" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <input 
            type="text" 
            placeholder="Enter Student ID" 
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
          <div className="password-input-wrap">
            <input 
              type={showPassword ? 'text' : 'password'} 
              placeholder="Enter password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Login to Checker'}
          </motion.button>
          {error && (
            <div style={{ color: '#c00', fontSize: 13, marginTop: 10 }}>{error}</div>
          )}
        </div>
        
        <p style={{ marginTop: '20px' }}>
          New participant? <Link to="/signup" style={{ color: '#00703c', fontWeight: 'bold' }}>Register here</Link>
        </p>
        <p style={{ marginTop: '8px' }}>
          <Link to="/" style={{ color: '#00703c', fontWeight: 'bold' }}>
            ← Back to home
          </Link>
        </p>
      </div>
    </motion.div>
  );
}