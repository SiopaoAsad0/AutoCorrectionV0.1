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
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const handleSignUp = async () => {
    if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.id || !formData.email || !formData.section || !formData.password) {
      alert("Please fill in all required fields (First name, Last name, Student ID, Email, Section, Password).");
      return;
    }
    if (formData.password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    if (!agreeToTerms) {
      alert("You must accept the Terms and Agreement to create an account.");
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
      alert("Registration Successful!");
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="page-wrapper"
    >
      <div className="card">
        <motion.h2 variants={itemVariants}>Student Registration</motion.h2>
        
        <div className="form-container" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <motion.div variants={itemVariants}>
            <input 
              type="text" 
              placeholder="Last name" 
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <input 
              type="text" 
              placeholder="First name" 
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <input 
              type="text" 
              placeholder="Middle name (optional)" 
              value={formData.middleName}
              onChange={(e) => setFormData({...formData, middleName: e.target.value})} 
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <input 
              type="text" 
              placeholder="Student ID (e.g., 2023-12345)" 
              value={formData.id}
              onChange={(e) => setFormData({...formData, id: e.target.value})} 
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <input
              type="email"
              placeholder="Email address"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <select 
              value={formData.section}
              onChange={(e) => setFormData({...formData, section: e.target.value})}
            >
              <option value="">Select Year & Section</option>
              <option value="BSCS 1-1">BSCS 1-1</option>
              <option value="BSCS 2-1">BSCS 2-1</option>
              <option value="BSCS 3-1">BSCS 3-1</option>
              <option value="BSCS 4-1">BSCS 4-1</option>
            </select>
          </motion.div>

          <motion.div variants={itemVariants} className="password-input-wrap">
            <input 
              type={showPassword ? 'text' : 'password'} 
              placeholder="Password (min 6 characters)" 
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})} 
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
          </motion.div>

          <motion.div variants={itemVariants} className="terms-agreement">
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', textAlign: 'left', cursor: 'pointer', marginBottom: '15px' }}>
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                style={{ width: 'auto', marginTop: '4px', marginBottom: 0 }}
              />
              <span>
                I have read and agree to the{' '}
                <strong>Terms and Agreement</strong>
                {' '}(use of this system for research, data handling, and participation guidelines). I understand my data will be stored locally for this study.
              </span>
            </label>
          </motion.div>

          <motion.button 
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSignUp}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </motion.button>
        </div>

        <p style={{ marginTop: '15px' }}>
          Already registered? <Link to="/login" style={{ color: '#00703c', fontWeight: 'bold' }}>Login here</Link>
        </p>
      </div>
    </motion.div>
  );
}