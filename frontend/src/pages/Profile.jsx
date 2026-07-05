import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

/* Same tokens as Landing / Checker / Navbar / StudentMessages. */
const T = {
  paper:      '#f2f3ec',
  ink:        '#16241d',
  inkSoft:    '#4b584f',
  inkFaint:   '#8b9489',
  forest:     '#1f5c42',
  forestDeep: '#123a29',
  forestTint: '#e6ede8',
  gold:       '#c9a227',
  red:        '#b3402f',
  redTint:    '#f7e9e5',
  hairline:   '#d7d9cd',
  white:      '#fffdf8',
};

const FONTS_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
  .pnc-profile *:focus-visible { outline: 2px solid ${T.forestTint}; outline-offset: 2px; }
  .pnc-profile-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .pnc-profile-btn:hover { transform: translateY(-1px); }
`;

/* Marks in place of emoji, matching the mark set used elsewhere. */
function InfoRow({ label, value, mark }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px',
      background: T.paper, borderRadius: 6,
      border: `1px solid ${T.hairline}`,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 4,
        border: `1.5px solid ${T.forest}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Source Serif 4', serif", fontSize: 15, fontWeight: 700, color: T.forestDeep,
        flexShrink: 0,
      }}>
        {mark}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, color: T.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
    <div className="pnc-profile" style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px',
      fontFamily: "'Inter', system-ui, sans-serif",
      background: T.paper,
    }}>
      <style>{FONTS_IMPORT}</style>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 440 }}
      >
        {/* Card */}
        <div style={{
          background: T.white,
          borderRadius: 10,
          border: `1px solid ${T.hairline}`,
          boxShadow: '0 4px 24px rgba(18,58,41,0.08)',
          overflow: 'hidden',
        }}>

          {/* Header band */}
          <div style={{
            background: T.forestDeep,
            padding: '28px 28px 20px',
            position: 'relative',
            borderBottom: `3px solid ${T.gold}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Avatar */}
              <div style={{
                width: 58, height: 58, borderRadius: '50%',
                background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Source Serif 4', serif", fontSize: 21, fontWeight: 700, color: T.white,
                border: `2px solid rgba(255,253,248,0.4)`,
                flexShrink: 0,
              }}>
                {initials}
              </div>
              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 500, color: 'rgba(255,253,248,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  Student profile
                </div>
                <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 19, fontWeight: 700, color: T.white, lineHeight: 1.2 }}>
                  {userData.name}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,253,248,0.6)', marginTop: 3 }}>
                  PNC Taglish Spell Checker
                </div>
              </div>
            </div>

            {/* Tests run badge */}
            <div style={{
              position: 'absolute', top: 20, right: 20,
              border: '1px solid rgba(255,253,248,0.25)',
              borderRadius: 6, padding: '6px 14px',
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 19, fontWeight: 700, color: T.white, lineHeight: 1 }}>
                {userData.totalChecks || 0}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'rgba(255,253,248,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 3 }}>
                Tests run
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '22px 24px 28px' }}>

            {/* Info rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              <InfoRow label="Student ID"     value={userData.id}      mark="№" />
              <InfoRow label="Year & section" value={userData.section} mark="§" />
              <InfoRow label="Email"          value={userData.email}   mark="‡" />
            </div>

            <div style={{ height: 1, background: T.hairline, marginBottom: 20 }} />

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="pnc-profile-btn"
                onClick={() => navigate('/checker')}
                style={{
                  width: '100%', height: 46, fontSize: 14, fontWeight: 700,
                  background: T.forestDeep, color: T.white,
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                  minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                Go to spell checker
              </button>

              <button
                className="pnc-profile-btn"
                onClick={() => navigate('/messages')}
                style={{
                  width: '100%', height: 46, fontSize: 14, fontWeight: 700,
                  background: T.forestTint, color: T.forestDeep,
                  border: `1.5px solid ${T.forest}33`, borderRadius: 6, cursor: 'pointer',
                  minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                Contact admin
              </button>

              <button
                onClick={() => {
                  localStorage.removeItem('isLoggedIn');
                  localStorage.removeItem('pnc_user');
                  navigate('/login');
                }}
                style={{
                  width: '100%', height: 40, fontSize: 13, fontWeight: 600,
                  background: 'transparent', color: T.inkFaint,
                  border: `1px solid ${T.hairline}`, borderRadius: 6, cursor: 'pointer',
                  minWidth: 'auto',
                }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: T.inkFaint }}>
          Pamantasan ng Cabuyao · Taglish Spell Checker System
        </div>
      </motion.div>
    </div>
  );
}
