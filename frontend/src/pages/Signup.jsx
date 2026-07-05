import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

/* Same tokens as the rest of the app. */
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

const FONTS_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
  .pnc-signup input, .pnc-signup select {
    width: 100%; height: 46px; padding: 0 14px; font-size: 14px;
    border-radius: 6px; border: 1.5px solid ${T.hairline};
    background: ${T.paper}; color: ${T.ink}; font-family: 'Inter', sans-serif;
    transition: border-color 0.15s ease;
  }
  .pnc-signup input:focus, .pnc-signup select:focus {
    outline: none; border-color: ${T.forest};
  }
  .pnc-signup button:focus-visible, .pnc-signup a:focus-visible, .pnc-signup input:focus-visible {
    outline: 2px solid ${T.forest}; outline-offset: 2px;
  }
  .pnc-password-toggle {
    position: absolute; right: 6px; top: 6px; bottom: 6px;
    padding: 0 12px; font-size: 12px; font-weight: 600;
    background: ${T.paper}; color: ${T.inkSoft};
    border: 1px solid ${T.hairline}; border-radius: 4px; cursor: pointer;
  }
`;

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

const fieldVariants = {
  hidden: { y: 8, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export default function Signup() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    id: '',
    email: '',
    section: '',
    password: '',
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };

  const handleSignUp = async () => {
    setFormError(null);
    if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.id || !formData.email || !formData.section || !formData.password) {
      setFormError('Please fill in all required fields (first name, last name, student ID, email, section, password).');
      return;
    }
    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    if (!agreeToTerms) {
      setFormError('You must accept the Terms and Agreement to create an account.');
      return;
    }
    setLoading(true);
    try {
      const passwordHash = await hashPassword(formData.password);
      const fullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ');
      const studentData = {
        name: fullName,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        middleName: formData.middleName.trim(),
        id: formData.id,
        email: formData.email.trim(),
        section: formData.section,
        totalChecks: 0,
        passwordHash,
      };
      localStorage.setItem('student_' + formData.id, JSON.stringify(studentData));
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pnc-signup" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', background: T.paper, fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{FONTS_IMPORT}</style>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ width: '100%', maxWidth: 440 }}
      >
        <div style={{
          background: T.white, borderRadius: 10, border: `1px solid ${T.hairline}`,
          boxShadow: '0 4px 24px rgba(18,58,41,0.08)', padding: '32px 30px',
        }}>
          <motion.div variants={fieldVariants} style={{ marginBottom: 22 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 500, color: T.forestDeep, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              PNC · Taglish Spell Checker
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Source Serif 4', serif", fontSize: '1.5rem', fontWeight: 700, color: T.ink }}>
              Student registration
            </h1>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <motion.div variants={fieldVariants}>
              <input
                type="text"
                placeholder="Last name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </motion.div>
            <motion.div variants={fieldVariants}>
              <input
                type="text"
                placeholder="First name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </motion.div>
            <motion.div variants={fieldVariants}>
              <input
                type="text"
                placeholder="Middle name (optional)"
                value={formData.middleName}
                onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
              />
            </motion.div>
            <motion.div variants={fieldVariants}>
              <input
                type="text"
                placeholder="Student ID (e.g., 2023-12345)"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              />
            </motion.div>
            <motion.div variants={fieldVariants}>
              <input
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </motion.div>
            <motion.div variants={fieldVariants}>
              <select
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              >
                <option value="">Select year &amp; section</option>
                <option value="BSCS 1-1">BSCS 1-1</option>
                <option value="BSCS 2-1">BSCS 2-1</option>
                <option value="BSCS 3-1">BSCS 3-1</option>
                <option value="BSCS 4-1">BSCS 4-1</option>
              </select>
            </motion.div>

            <motion.div variants={fieldVariants} style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (min 6 characters)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{ paddingRight: 66 }}
              />
              <button
                type="button"
                className="pnc-password-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </motion.div>

            <motion.div variants={fieldVariants}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left', cursor: 'pointer', fontSize: 13, color: T.inkSoft, lineHeight: 1.6 }}>
                <input
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  style={{ width: 'auto', height: 'auto', marginTop: 3, flexShrink: 0 }}
                />
                <span>
                  I have read and agree to the <strong style={{ color: T.ink }}>Terms and Agreement</strong> (use of this system for research, data handling, and participation guidelines). I understand my data will be stored locally for this study.
                </span>
              </label>
            </motion.div>

            {formError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: '10px 14px', background: T.redTint, color: T.red, borderRadius: 6, fontSize: 13, border: `1px solid ${T.red}33` }}
              >
                {formError}
              </motion.div>
            )}

            <motion.button
              variants={fieldVariants}
              onClick={handleSignUp}
              disabled={loading}
              style={{
                height: 46, fontSize: 14, fontWeight: 700, marginTop: 4,
                background: loading ? T.inkFaint : T.forestDeep, color: T.white,
                border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </motion.button>
          </div>

          <p style={{ marginTop: 20, fontSize: 13, color: T.inkSoft, textAlign: 'center' }}>
            Already registered?{' '}
            <Link to="/login" style={{ color: T.forestDeep, fontWeight: 700, textDecoration: 'none' }}>
              Log in here
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
