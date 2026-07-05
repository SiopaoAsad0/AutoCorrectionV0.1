import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const G = {
  green:      '#00703c',
  greenLight: '#e8f5ee',
  greenMid:   '#c8e6d6',
  gold:       '#ffcc00',
  goldLight:  '#fff8d6',
  red:        '#dc3545',
  redLight:   '#fdf0f1',
  text:       '#1a2e24',
  textMid:    '#4a5c52',
  textMuted:  '#8a9e94',
  border:     '#e0ebe4',
  bg:         '#f5f7f6',
  white:      '#ffffff',
};

function InfoRow({ label, value, icon }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px',
      background: G.bg, borderRadius: 10,
      border: `1px solid ${G.border}`,
    }}>
      {icon && (
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: G.greenLight, border: `1px solid ${G.greenMid}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0,
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: G.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || '—'}
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const studentId = localStorage.getItem('pnc_user');
    const savedData = localStorage.getItem('student_' + studentId);
    if (savedData) {
      try { setUserData(JSON.parse(savedData)); }
      catch { localStorage.removeItem('student_' + studentId); navigate('/login'); }
    } else { navigate('/login'); }
  }, [navigate]);

  if (!userData) return null;

  const initials = (userData.name || '?')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px',
      fontFamily: "'Inter','Segoe UI',Roboto,sans-serif",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 440 }}
      >
        {/* Card */}
        <div style={{
          background: G.white,
          borderRadius: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
          overflow: 'hidden',
        }}>

          {/* Header band */}
          <div style={{
            background: `linear-gradient(135deg, ${G.green} 0%, #005a30 100%)`,
            padding: '28px 28px 20px',
            position: 'relative',
          }}>
            {/* Gold accent line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: G.gold }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Avatar */}
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: G.gold,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 800, color: G.green,
                border: '3px solid rgba(255,255,255,0.3)',
                flexShrink: 0,
              }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
                  Student Profile
                </div>
                <div style={{ fontSize: 19, fontWeight: 800, color: G.white, lineHeight: 1.2 }}>
                  {userData.name}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                  PNC Taglish Spell Checker
                </div>
              </div>
            </div>

            {/* Tests run badge */}
            <div style={{
              position: 'absolute', top: 20, right: 20,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 10, padding: '6px 12px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: G.white, lineHeight: 1 }}>
                {userData.totalChecks || 0}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                Tests run
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '22px 24px 28px' }}>

            {/* Info rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              <InfoRow label="Student ID"    value={userData.id}      icon="🪪" />
              <InfoRow label="Year & Section" value={userData.section} icon="🏫" />
              <InfoRow label="Email"         value={userData.email}   icon="✉" />
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: G.border, marginBottom: 20 }} />

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/checker')}
                style={{
                  width: '100%', height: 46, fontSize: 14, fontWeight: 700,
                  background: G.green, color: G.white,
                  border: 'none', borderRadius: 10, cursor: 'pointer',
                  minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <span>✎</span> Go to Spell Checker
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/messages')}
                style={{
                  width: '100%', height: 46, fontSize: 14, fontWeight: 700,
                  background: G.greenLight, color: G.green,
                  border: `1.5px solid ${G.greenMid}`, borderRadius: 10, cursor: 'pointer',
                  minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <span>✉</span> Contact Admin
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  localStorage.removeItem('isLoggedIn');
                  localStorage.removeItem('pnc_user');
                  navigate('/login');
                }}
                style={{
                  width: '100%', height: 40, fontSize: 13, fontWeight: 600,
                  background: 'transparent', color: G.textMuted,
                  border: `1px solid ${G.border}`, borderRadius: 10, cursor: 'pointer',
                  minWidth: 'auto',
                }}
              >
                Log out
              </motion.button>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: G.textMuted }}>
          Pamantasan ng Cabuyao · Taglish Spell Checker System
        </div>
      </motion.div>
    </div>
  );
}
