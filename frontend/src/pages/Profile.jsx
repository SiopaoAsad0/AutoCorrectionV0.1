import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Retrieves student ID from local session
    const studentId = localStorage.getItem('pnc_user');
    const savedData = localStorage.getItem('student_' + studentId);
    
    if (savedData) {
      try {
        setUserData(JSON.parse(savedData));
      } catch {
        localStorage.removeItem('student_' + studentId);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  if (!userData) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="page-wrapper"
    >
      <div className="profile-card">
        <h2>Student Profile</h2>
        
        <div className="profile-details-container">
          <div className="profile-row">
            <label>Name:</label>
            <div className="info-box-display">{userData.name}</div>
          </div>

          <div className="profile-row">
            <label>Student ID:</label>
            <div className="info-box-display">{userData.id}</div>
          </div>

          <div className="profile-row">
            <label>Year & Section:</label>
            <div className="info-box-display">{userData.section}</div>
          </div>

          <div className="profile-row">
            <label>Tests Run:</label>
            <div className="info-box-display">{userData.totalChecks || 0} Records</div>
          </div>
        </div>

        <div className="main-actions" style={{ flexDirection: 'column', gap: '10px' }}>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/checker')}
          >
            Return to Checker
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/messages')}
          >
            Contact Admin
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-secondary"
            onClick={() => { localStorage.clear(); navigate('/login'); }}
          >
            Logout System
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}