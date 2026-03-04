import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Signup() {
  const [formData, setFormData] = useState({ name: '', id: '', section: '' });
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const handleSignUp = () => {
    if (!formData.name || !formData.id || !formData.section) {
      alert("Please fill in all fields for our research records.");
      return;
    }
    const studentData = { ...formData, totalChecks: 0 };
    localStorage.setItem('student_' + formData.id, JSON.stringify(studentData));
    alert("Registration Successful!");
    navigate('/login');
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
              placeholder="Full Name" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})} 
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

          <motion.button 
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSignUp}
          >
            Create Account
          </motion.button>
        </div>

        <p style={{ marginTop: '15px' }}>
          Already registered? <Link to="/login" style={{ color: '#00703c', fontWeight: 'bold' }}>Login here</Link>
        </p>
      </div>
    </motion.div>
  );
}