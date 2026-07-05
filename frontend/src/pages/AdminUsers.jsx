import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  const token = localStorage.getItem('admin_token');
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* Same manuscript tokens as AdminReports / Landing / Profile. */
const T = {
  paper:      '#f2f3ec',
  paperDim:   '#ebede3',
  ink:        '#16241d',
  inkSoft:    '#4b584f',
  inkFaint:   '#8b9489',
  forest:     '#1f5c42',
  forestDeep: '#123a29',
  forestTint: '#e6ede8',
  gold:       '#a8842f',
  goldTint:   '#f5eed9',
  red:        '#b3402f',
  redTint:    '#f7e9e5',
  plum:       '#5c4a6e',
  plumTint:   '#eeeaf1',
  slate:      '#33546b',
  slateTint:  '#e8eef2',
  hairline:   '#d7d9cd',
  white:      '#fffdf8',
};

const FONTS_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
  .pnc-admin * { box-sizing: border-box; }
  .pnc-admin *:focus-visible { outline: 2px solid ${T.forest}; outline-offset: 2px; }
  .pnc-admin table { width: 100%; border-collapse: collapse; }
  .pnc-nav-pill { transition: color 0.15s ease; }
  .pnc-nav-pill:hover { color: ${T.forestDeep} !important; }
  .pnc-refresh-btn { transition: transform 0.15s ease; }
  .pnc-refresh-btn:hover { transform: translateY(-1px); }
  .pnc-field-admin { transition: border-color 0.15s ease; }
  .pnc-field-admin:focus { border-color: ${T.forest} !important; }
  .pnc-row-hover:hover { background: ${T.paperDim}; }
  @media (prefers-reduced-motion: reduce) {
    .pnc-admin * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
  }
`;

const navPill = {
  fontSize: 13, fontWeight: 600, color: T.inkSoft, textDecoration: 'none',
};

function RoleBadge({ role }) {
  const isAdmin = role === 'Admin';
  const color = isAdmin ? T.plum : T.forestDeep;
  const bg = isAdmin ? T.plumTint : T.forestTint;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 3,
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
      background: bg, color, letterSpacing: '0.01em',
    }}>
      {role}
    </span>
  );
}

function SourceBadge({ source }) {
  const isLocal = source === 'Local signup';
  const color = isLocal ? T.gold : T.slate;
  const bg = isLocal ? T.goldTint : T.slateTint;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 3,
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
      background: bg, color, letterSpacing: '0.01em',
    }}>
      {source}
    </span>
  );
}

function SummaryCard({ label, value, color, mark }) {
  return (
    <div style={{
      flex: 1, minWidth: 140, background: T.white, borderRadius: 8,
      border: `1px solid ${T.hairline}`, borderTop: `3px solid ${color}`,
      padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, fontWeight: 600, color: T.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </div>
        {mark && <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 15, fontWeight: 700, color, opacity: 0.55 }}>{mark}</span>}
      </div>
      <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 24, fontWeight: 700, color: T.ink }}>{value}</div>
    </div>
  );
}

const thStyle = (align = 'left') => ({
  color: T.forestDeep, padding: '11px 16px', textAlign: align,
  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
});
const tdStyle = (align = 'left') => ({ padding: '12px 16px', textAlign: align, fontSize: 13.5 });

export default function AdminUsers() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) { navigate('/admin/login', { replace: true }); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users?per_page=100`, { headers: authHeaders() });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login', { replace: true });
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Could not load users (${res.status})`);

      const apiUsers = (data.data || []).map((u) => ({
        id: `db-${u.id}`, displayId: u.id,
        name: u.name || '', account: u.email || '',
        role: u.is_admin ? 'Admin' : 'Student',
        createdAt: u.created_at || null, source: 'Database',
      }));

      const localUsers = [];
      for (const key of Object.keys(localStorage)) {
        if (!key.startsWith('student_')) continue;
        const studentId = key.slice('student_'.length);
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const student = JSON.parse(raw);
          localUsers.push({
            id: `local-${studentId}`, displayId: studentId,
            name: student?.name || `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'Unnamed student',
            account: studentId, role: 'Student',
            createdAt: null, source: 'Local signup',
          });
        } catch { /* skip malformed */ }
      }

      const merged = [...apiUsers, ...localUsers];
      merged.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      setItems(merged);
    } catch (e) {
      setError(e.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(u =>
    !search.trim() ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.account.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const admins   = items.filter(u => u.role === 'Admin').length;
  const students = items.filter(u => u.role === 'Student').length;

  return (
    <div className="pnc-admin" style={{ minHeight: '100vh', background: T.paper, fontFamily: "'Inter', system-ui, sans-serif", color: T.ink }}>
      <style>{FONTS_IMPORT}</style>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px 72px' }}>

        {/* ── Header ── */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          flexWrap: 'wrap', gap: 16, borderBottom: `3px solid ${T.gold}`, paddingBottom: 20, marginBottom: 32,
        }}>
          <div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: T.forestDeep,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 18, height: 1, background: T.forestDeep, display: 'inline-block' }} />
              Admin panel
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Source Serif 4', serif", fontSize: '1.8rem', fontWeight: 700, color: T.ink }}>Users</h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: T.inkSoft }}>Registered accounts in the system</p>
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/admin/messages" className="pnc-nav-pill" style={navPill}>Messages</Link>
            <Link to="/admin/dictionary/add" className="pnc-nav-pill" style={navPill}>Dictionary</Link>
            <Link to="/admin/reports" className="pnc-nav-pill" style={navPill}>Reports</Link>
            <Link to="/" className="pnc-nav-pill" style={navPill}>Home</Link>
            <button
              onClick={load}
              disabled={loading}
              className="pnc-refresh-btn"
              style={{
                minWidth: 'auto', height: 38, padding: '0 16px', fontSize: 12.5, fontWeight: 700,
                background: T.forestTint, color: T.forestDeep, border: `1.5px solid ${T.forest}33`,
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>
        </header>

        {/* ── Summary cards ── */}
        {!loading && items.length > 0 && (
          <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
            <SummaryCard label="Total users" value={items.length} color={T.forestDeep} mark="№" />
            <SummaryCard label="Admins"      value={admins}       color={T.plum}       mark="§" />
            <SummaryCard label="Students"    value={students}     color={T.slate}      mark="○" />
          </div>
        )}

        {/* ── Search ── */}
        {!loading && items.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or role…"
              className="pnc-field-admin"
              style={{
                maxWidth: 360, width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 5,
                border: `1.5px solid ${T.hairline}`, background: T.white, color: T.ink, fontFamily: 'inherit',
              }}
            />
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{ padding: '14px 16px', background: T.redTint, color: T.red, borderRadius: 6, marginBottom: 24, fontSize: 14, border: `1px solid ${T.red}33` }}>
            {error}
          </div>
        )}

        {/* ── States ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: T.inkFaint }}>
            <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 22, marginBottom: 10 }}>···</div>
            Loading users…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: T.white, borderRadius: 8, border: `1px solid ${T.hairline}`, textAlign: 'center', padding: '60px 20px', color: T.inkFaint }}>
            <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 28, marginBottom: 10, color: T.hairline }}>—</div>
            {search ? 'No users match your search.' : 'No users found.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: T.white, borderRadius: 8, border: `1px solid ${T.hairline}` }}>
            <table>
              <thead>
                <tr style={{ background: T.paperDim }}>
                  {['#', 'Name', 'Email / username', 'Role', 'Source', 'Created'].map((h, i) => (
                    <th key={i} style={thStyle('left')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    className="pnc-row-hover"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    style={{ borderTop: `1px solid ${T.hairline}` }}
                  >
                    <td style={{ ...tdStyle('left'), color: T.inkFaint, fontSize: 12.5 }}>{i + 1}</td>
                    <td style={tdStyle('left')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          border: `1.5px solid ${T.forest}`, background: T.forestTint,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: "'Source Serif 4', serif", fontWeight: 700, fontSize: 13, color: T.forestDeep,
                        }}>
                          {(u.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: T.ink, fontSize: 14 }}>{u.name || '—'}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle('left'), color: T.inkSoft }}>{u.account}</td>
                    <td style={tdStyle('left')}><RoleBadge role={u.role} /></td>
                    <td style={tdStyle('left')}><SourceBadge source={u.source} /></td>
                    <td style={{ ...tdStyle('left'), fontSize: 12, color: T.inkFaint, whiteSpace: 'nowrap' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '11px 16px', borderTop: `1px solid ${T.hairline}`, fontSize: 12, color: T.inkFaint }}>
              Showing {filtered.length} of {items.length} users
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
