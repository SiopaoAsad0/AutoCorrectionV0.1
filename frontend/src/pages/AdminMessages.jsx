import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  const token = localStorage.getItem('admin_token');
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const G = {
  green:      '#00703c',
  greenLight: '#e8f5ee',
  greenMid:   '#c8e6d6',
  gold:       '#ffcc00',
  red:        '#dc3545',
  redLight:   '#fdf0f1',
  text:       '#1a2e24',
  textMid:    '#4a5c52',
  textMuted:  '#8a9e94',
  border:     '#e0ebe4',
  bg:         '#f5f7f6',
  white:      '#ffffff',
};

function NavLink({ to, children }) {
  return (
    <Link to={to} style={{ color: G.green, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
      {children}
    </Link>
  );
}

function StatusBadge({ replied }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 99,
      fontSize: 11,
      fontWeight: 700,
      background: replied ? G.greenLight : '#fff8d6',
      color: replied ? G.green : '#b8860b',
      border: `1px solid ${replied ? G.greenMid : '#ffe58a'}`,
    }}>
      {replied ? '✓ Replied' : '⏳ Pending'}
    </span>
  );
}

export default function AdminMessages() {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [savingId,    setSavingId]    = useState(null);
  const [successId,   setSuccessId]   = useState(null);
  const [expanded,    setExpanded]    = useState({});
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) { navigate('/admin/login', { replace: true }); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/contact-messages`, { headers: authHeaders() });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login', { replace: true });
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Failed to load (${res.status})`);
      }
      const data = await res.json();
      const list = data.data || [];
      setItems(list);
      const drafts = {};
      list.forEach((m) => { drafts[m.id] = m.admin_reply || ''; });
      setReplyDrafts(drafts);
      const exp = {};
      list.forEach((m) => { exp[m.id] = !m.admin_reply; });
      setExpanded(exp);
    } catch (e) {
      setError(e.message || 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const saveReply = async (id) => {
    const body = (replyDrafts[id] || '').trim();
    if (!body) { setError('Enter a reply before saving.'); return; }
    setSavingId(id); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/contact-messages/${id}/reply`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ admin_reply: body }),
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login', { replace: true });
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Save failed (${res.status})`);
      }
      setSuccessId(id);
      setTimeout(() => setSuccessId(null), 2500);
      await load();
    } catch (e) {
      setError(e.message || 'Could not save reply.');
    } finally {
      setSavingId(null);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/admin/logout`, { method: 'POST', headers: authHeaders() });
    } catch { /* ignore */ }
    localStorage.removeItem('admin_token');
    navigate('/admin/login', { replace: true });
  };

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const pending  = items.filter(m => !m.admin_reply).length;
  const replied  = items.filter(m =>  m.admin_reply).length;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 64px', fontFamily: "'Inter','Segoe UI',Roboto,sans-serif" }}>

      {/* ── Page header ── */}
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
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: G.text }}>Contact Messages</h1>
          <p style={{ margin: '5px 0 0', fontSize: 14, color: G.textMuted }}>
            Submissions from the landing page contact form
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <NavLink to="/admin/users">Users</NavLink>
          <NavLink to="/admin/dictionary/add">Dictionary</NavLink>
          <NavLink to="/admin/reports">Reports</NavLink>
          <NavLink to="/">Home</NavLink>
          <button
            onClick={load}
            disabled={loading}
            style={{ minWidth: 'auto', height: 36, padding: '0 16px', fontSize: 13, background: G.greenLight, color: G.green, border: `1px solid ${G.greenMid}` }}
          >
            ↻ Refresh
          </button>
          <button
            onClick={logout}
            style={{ minWidth: 'auto', height: 36, padding: '0 16px', fontSize: 13, background: G.redLight, color: G.red, border: `1px solid #f5c6cb` }}
          >
            Log out
          </button>
        </div>
      </header>

      {/* ── Summary row ── */}
      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total messages', value: items.length, color: G.green },
            { label: 'Pending reply',  value: pending,      color: '#b8860b' },
            { label: 'Replied',        value: replied,       color: G.green },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, minWidth: 120,
              background: G.white, borderRadius: 12, padding: '14px 18px',
              borderTop: `3px solid ${s.color}`,
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              border: `1px solid ${G.border}`,
              borderTopColor: s.color,
            }}>
              <div style={{ fontSize: 11, color: G.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: G.text }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div style={{ padding: 14, background: G.redLight, color: G.red, borderRadius: 10, marginBottom: 20, fontSize: 14, border: '1px solid #f5c6cb' }}>
          {error}
        </div>
      )}

      {/* ── States ── */}
      {loading && items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: G.textMuted }}>
          <div style={{ fontSize: 28, opacity: 0.3, marginBottom: 10 }}>⏳</div>
          Loading messages…
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: G.textMuted }}>
          <div style={{ fontSize: 36, opacity: 0.25, marginBottom: 10 }}>📭</div>
          No messages yet.
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map((m, idx) => {
            const isExpanded = expanded[m.id] ?? true;
            const isSaving   = savingId === m.id;
            const isSuccess  = successId === m.id;

            return (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                style={{
                  background: G.white,
                  borderRadius: 14,
                  border: `1px solid ${G.border}`,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                }}
              >
                {/* Card header — always visible */}
                <div
                  onClick={() => toggleExpand(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: 10,
                    padding: '16px 20px',
                    cursor: 'pointer',
                    background: isExpanded ? G.white : G.bg,
                    borderBottom: isExpanded ? `1px solid ${G.border}` : 'none',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: G.greenLight, border: `2px solid ${G.greenMid}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 15, color: G.green, flexShrink: 0,
                    }}>
                      {(m.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: G.text, fontSize: 15 }}>{m.name}</div>
                      <a
                        href={`mailto:${m.email}`}
                        onClick={e => e.stopPropagation()}
                        style={{ color: G.green, fontSize: 13, textDecoration: 'none' }}
                      >
                        {m.email}
                      </a>
                    </div>
                    <StatusBadge replied={!!m.admin_reply} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: G.textMuted }}>
                      {m.created_at ? new Date(m.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    </span>
                    <span style={{ fontSize: 14, color: G.textMuted, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                  </div>
                </div>

                {/* Card body — collapsible */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '20px 20px 24px' }}>

                        {/* Message body */}
                        <div style={{
                          background: G.bg, borderRadius: 10,
                          padding: '14px 16px', marginBottom: 20,
                          fontSize: 14, lineHeight: 1.7,
                          color: G.textMid, whiteSpace: 'pre-wrap',
                          border: `1px solid ${G.border}`,
                        }}>
                          {m.message}
                        </div>

                        {/* Previous reply */}
                        {m.admin_reply && m.replied_at && (
                          <div style={{
                            background: G.greenLight, borderRadius: 10,
                            padding: '14px 16px', marginBottom: 20,
                            border: `1px solid ${G.greenMid}`,
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: G.green, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                              Previous reply
                            </div>
                            <div style={{ fontSize: 14, color: G.textMid, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{m.admin_reply}</div>
                            <div style={{ fontSize: 11, color: G.textMuted, marginTop: 8 }}>
                              Sent {new Date(m.replied_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        )}

                        {/* Reply textarea */}
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: G.textMid, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                            {m.admin_reply ? 'Update reply' : 'Write a reply'}
                          </label>
                          <textarea
                            rows={4}
                            value={replyDrafts[m.id] ?? ''}
                            onChange={e => setReplyDrafts(d => ({ ...d, [m.id]: e.target.value }))}
                            placeholder="Type your reply here… (admin-side only unless you email the user separately)"
                            style={{
                              width: '100%', boxSizing: 'border-box',
                              padding: '12px 14px', borderRadius: 10,
                              border: `1.5px solid ${G.border}`,
                              fontFamily: 'inherit', fontSize: 14,
                              lineHeight: 1.6, resize: 'vertical',
                              minHeight: 100, marginBottom: 0,
                              transition: 'border-color 0.2s',
                            }}
                          />
                        </div>

                        {/* Action row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => saveReply(m.id)}
                            disabled={isSaving}
                            style={{ minWidth: 'auto', height: 40, padding: '0 20px', fontSize: 13, fontWeight: 700 }}
                          >
                            {isSaving ? 'Saving…' : m.admin_reply ? 'Update reply' : 'Save reply'}
                          </button>
                          <AnimatePresence>
                            {isSuccess && (
                              <motion.span
                                initial={{ opacity: 0, x: -4 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                style={{ fontSize: 13, color: G.green, fontWeight: 600 }}
                              >
                                ✓ Reply saved
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
