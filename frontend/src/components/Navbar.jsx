import { Link, useLocation } from 'react-router-dom';

/* Same tokens as Landing.jsx / Checker.jsx — worth lifting to a shared
   src/theme.js so all three stop drifting independently. */
const T = {
  paper:      '#f2f3ec',
  ink:        '#16241d',
  inkSoft:    '#4b584f',
  inkFaint:   '#8b9489',
  forest:     '#1f5c42',
  forestDeep: '#123a29',
  forestTint: '#e6ede8',
  hairline:   '#d7d9cd',
  white:      '#fffdf8',
};

const FONTS_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap');
  .pnc-navbar a:focus-visible { outline: 2px solid ${T.forest}; outline-offset: 2px; }
  .pnc-navbar .pnc-link { transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease; }
  .pnc-navbar .pnc-link:hover { color: ${T.forestDeep} !important; background: ${T.forestTint} !important; }
`;

/* Manuscript marks in place of icons — same mark set used for features
   on the landing page, so the visual language carries across the app. */
const NAV_LINKS = [
  { to: '/checker',  label: 'Spell Checker', mark: '¶' },
  { to: '/profile',  label: 'My Profile',    mark: '○' },
  { to: '/messages', label: 'Contact Us',    mark: '‡' },
];

export default function Navbar() {
  const location = useLocation();
  return (
    <nav className="pnc-navbar" style={{
      background: T.paper,
      borderBottom: `1px solid ${T.hairline}`,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <style>{FONTS_IMPORT}</style>

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
        <Link to="/checker" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 4,
            border: `1.5px solid ${T.ink}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 15, color: T.ink, fontWeight: 700, lineHeight: 1 }}>P</span>
          </div>
          <div>
            <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 14, fontWeight: 700, color: T.ink, lineHeight: 1.1 }}>
              Pamantasan ng Cabuyao
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 500, color: T.inkFaint, textTransform: 'uppercase', letterSpacing: '0.07em', lineHeight: 1.3 }}>
              Taglish Spell Checker
            </div>
          </div>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {NAV_LINKS.map(({ to, label, mark }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className="pnc-link"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  textDecoration: 'none',
                  padding: '7px 14px',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? T.forestDeep : T.inkSoft,
                  background: isActive ? T.forestTint : 'transparent',
                  border: `1px solid ${isActive ? T.forest + '33' : 'transparent'}`,
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 15, fontWeight: 700, lineHeight: 1 }}>{mark}</span>
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
