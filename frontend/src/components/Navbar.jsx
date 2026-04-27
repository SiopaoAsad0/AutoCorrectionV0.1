import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      gap: '40px', 
      padding: '20px', 
      background: 'white', 
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
      marginBottom: '20px',
      borderBottom: '4px solid #00703c' /* Official PNC Green */
    }}>
      <Link to="/checker" style={{ textDecoration: 'none', color: '#00703c', fontWeight: 'bold' }}>
        SPELL CHECKER
      </Link>
      <Link to="/profile" style={{ textDecoration: 'none', color: '#00703c', fontWeight: 'bold' }}>
        MY PROFILE
      </Link>
      <Link to="/messages" style={{ textDecoration: 'none', color: '#00703c', fontWeight: 'bold' }}>
        CONTACT US
      </Link>
    </nav>
  );
}