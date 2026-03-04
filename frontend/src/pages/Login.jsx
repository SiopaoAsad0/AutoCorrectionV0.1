import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Login() {
  const [studentId, setStudentId] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    const savedData = localStorage.getItem('student_' + studentId);
    if (savedData) {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('pnc_user', studentId);
      navigate('/checker');
    } else {
      alert("Access Denied: Student ID not recognized.");
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
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
          >
            Login to Checker
          </motion.button>
        </div>
        
        <p style={{ marginTop: '20px' }}>
          New participant? <Link to="/signup" style={{ color: '#00703c', fontWeight: 'bold' }}>Register here</Link>
        </p>
      </div>
    </motion.div>
  );
}