import { Link, useLocation } from 'react-router-dom';

const G = {
  green:      '#00703c',
  greenLight: '#e8f5ee',
  greenMid:   '#c8e6d6',
  gold:       '#ffcc00',
  text:       '#1a2e24',
  textMuted:  '#8a9e94',
  border:     '#e0ebe4',
  white:      '#ffffff',
};

const NAV_LINKS = [
  { to: '/checker',  label: 'Spell Checker', icon: '✎' },
  { to: '/profile',  label: 'My Profile',    icon: '👤' },
  { to: '/messages', label: 'Contact Us',    icon: '✉' },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav style={{
      background: G.white,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      fontFamily: "'Inter','Segoe UI',Roboto,sans-serif",
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 60,
      }}>

        {/* Brand */}
        <Link to="/checker" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: G.green,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 16, color: G.white, fontWeight: 800, lineHeight: 1 }}>P</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: G.text, lineHeight: 1.1 }}>PNC</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1 }}>
              Taglish Spell Checker
            </div>
          </div>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {NAV_LINKS.map(({ to, label, icon }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  textDecoration: 'none',
                  padding: '7px 14px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? G.green : G.textMuted,
                  background: isActive ? G.greenLight : 'transparent',
                  border: `1px solid ${isActive ? G.greenMid : 'transparent'}`,
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: 14 }}>{icon}</span>
                {label}
                {isActive && (
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: G.green, display: 'inline-block', marginLeft: 2,
                  }} />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom accent */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${G.green} 60%, ${G.gold} 100%)` }} />
    </nav>
  );
}
