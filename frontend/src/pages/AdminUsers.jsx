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

const G = {
  green:      '#00703c',
  greenLight: '#e8f5ee',
  greenMid:   '#c8e6d6',
  red:        '#dc3545',
  redLight:   '#fdf0f1',
  blue:       '#0277bd',
  blueLight:  '#e3f2fd',
  purple:     '#6f42c1',
  purpleLight:'#f3f0fb',
  text:       '#1a2e24',
  textMid:    '#4a5c52',
  textMuted:  '#8a9e94',
  border:     '#e0ebe4',
  bg:         '#f5f7f6',
  white:      '#ffffff',
};

const btn = (bg, color, border) => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  height: 36, padding: '0 16px', fontSize: 13, fontWeight: 600,
  background: bg, color, border: `1px solid ${border || bg}`,
  borderRadius: 8, cursor: 'pointer', minWidth: 'auto',
  textDecoration: 'none', whiteSpace: 'nowrap',
});

function RoleBadge({ role }) {
  const isAdmin = role === 'Admin';
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 700,
      background: isAdmin ? G.purpleLight : G.greenLight,
      color: isAdmin ? G.purple : G.green,
      border: `1px solid ${isAdmin ? '#d5c8f5' : G.greenMid}`,
    }}>
      {role}
    </span>
  );
}

function SourceBadge({ source }) {
  const isLocal = source === 'Local signup';
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 700,
      background: isLocal ? '#fff8d6' : G.blueLight,
      color: isLocal ? '#b8860b' : G.blue,
      border: `1px solid ${isLocal ? '#ffe58a' : '#b3d9f5'}`,
    }}>
      {source}
    </span>
  );
}

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
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 64px', fontFamily: "'Inter','Segoe UI',Roboto,sans-serif" }}>

      {/* ── Header ── */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 12,
        borderBottom: `4px solid ${G.green}`,
        paddingBottom: 16, marginBottom: 28,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: G.green, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            Admin Panel
          </div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: G.text }}>Users</h1>
          <p style={{ margin: '5px 0 0', fontSize: 14, color: G.textMuted }}>Registered accounts in the system</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/admin/messages"      style={btn(G.greenLight, G.green, G.greenMid)}>Messages</Link>
          <Link to="/admin/dictionary/add" style={btn(G.greenLight, G.green, G.greenMid)}>Dictionary</Link>
          <Link to="/admin/reports"        style={btn(G.greenLight, G.green, G.greenMid)}>Reports</Link>
          <Link to="/"                     style={btn(G.greenLight, G.green, G.greenMid)}>Home</Link>
          <button onClick={load} disabled={loading}
            style={{ ...btn(G.greenLight, G.green, G.greenMid), border: `1px solid ${G.greenMid}` }}>
            ↻ Refresh
          </button>
        </div>
      </header>

      {/* ── Summary cards ── */}
      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total users',  value: items.length, color: G.green },
            { label: 'Admins',       value: admins,        color: G.purple },
            { label: 'Students',     value: students,      color: G.blue },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, minWidth: 120,
              background: G.white, borderRadius: 12, padding: '14px 18px',
              borderTop: `3px solid ${s.color}`,
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              border: `1px solid ${G.border}`, borderTopColor: s.color,
            }}>
              <div style={{ fontSize: 11, color: G.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: G.text }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Search ── */}
      {!loading && items.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or role…"
            style={{ maxWidth: 360, marginBottom: 0, fontSize: 14 }}
          />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ padding: 14, background: G.redLight, color: G.red, borderRadius: 10, marginBottom: 20, fontSize: 14, border: '1px solid #f5c6cb' }}>
          {error}
        </div>
      )}

      {/* ── States ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: G.textMuted }}>
          <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 10 }}>⏳</div>
          Loading users…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: G.textMuted }}>
          <div style={{ fontSize: 36, opacity: 0.25, marginBottom: 10 }}>👤</div>
          {search ? 'No users match your search.' : 'No users found.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: G.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${G.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 0 }}>
            <thead>
              <tr style={{ background: G.bg }}>
                {['#', 'Name', 'Email / Username', 'Role', 'Source', 'Created'].map((h, i) => (
                  <th key={i} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: 12, fontWeight: 700, color: G.green,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    whiteSpace: 'nowrap', borderBottom: `2px solid ${G.border}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  style={{ borderTop: `1px solid ${G.border}` }}
                >
                  <td style={{ padding: '12px 16px', color: G.textMuted, fontSize: 13 }}>{i + 1}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: G.greenLight, border: `2px solid ${G.greenMid}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 13, color: G.green,
                      }}>
                        {(u.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, color: G.text, fontSize: 14 }}>{u.name || '—'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: G.textMid }}>{u.account}</td>
                  <td style={{ padding: '12px 16px' }}><RoleBadge role={u.role} /></td>
                  <td style={{ padding: '12px 16px' }}><SourceBadge source={u.source} /></td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: G.textMuted, whiteSpace: 'nowrap' }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${G.border}`, fontSize: 12, color: G.textMuted }}>
            Showing {filtered.length} of {items.length} users
          </div>
        </div>
      )}
    </div>
  );
}
