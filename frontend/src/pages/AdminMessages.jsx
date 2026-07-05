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
  hairline:   '#d7d9cd',
  white:      '#fffdf8',
};

const FONTS_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
  .pnc-admin * { box-sizing: border-box; }
  .pnc-admin *:focus-visible { outline: 2px solid ${T.forest}; outline-offset: 2px; }
  .pnc-nav-pill { transition: color 0.15s ease; }
  .pnc-nav-pill:hover { color: ${T.forestDeep} !important; }
  .pnc-refresh-btn, .pnc-logout-btn { transition: transform 0.15s ease; }
  .pnc-refresh-btn:hover, .pnc-logout-btn:hover { transform: translateY(-1px); }
  .pnc-field-admin { transition: border-color 0.15s ease; }
  .pnc-field-admin:focus { border-color: ${T.forest} !important; }
  .pnc-msg-header:hover { background: ${T.paperDim} !important; }
  .pnc-cta-primary-admin { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .pnc-cta-primary-admin:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(18,58,41,0.22); }
  @media (prefers-reduced-motion: reduce) {
    .pnc-admin * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
  }
`;

const navPill = { fontSize: 13, fontWeight: 600, color: T.inkSoft, textDecoration: 'none' };

function StatusBadge({ replied }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 3,
      fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
      background: replied ? T.forestTint : T.goldTint,
      color: replied ? T.forestDeep : T.gold,
      letterSpacing: '0.01em',
    }}>
      {replied ? '✓ Replied' : 'Pending'}
    </span>
  );
}

function SummaryCard({ label, value, color, mark }) {
  return (
    <div style={{
      flex: 1, minWidth: 140, background: T.white, borderRadius: 8,
      border: `1px solid ${T.hairline}`, borderTop: `3px solid ${color}`, padding: '16px 18px',
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

  const pending = items.filter(m => !m.admin_reply).length;
  const replied = items.filter(m =>  m.admin_reply).length;

  return (
    <div className="pnc-admin" style={{ minHeight: '100vh', background: T.paper, fontFamily: "'Inter', system-ui, sans-serif", color: T.ink }}>
      <style>{FONTS_IMPORT}</style>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 72px' }}>

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
            <h1 style={{ margin: 0, fontFamily: "'Source Serif 4', serif", fontSize: '1.8rem', fontWeight: 700, color: T.ink }}>Contact messages</h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: T.inkSoft }}>Submissions from the landing page contact form</p>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/admin/users" className="pnc-nav-pill" style={navPill}>Users</Link>
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
            <button
              onClick={logout}
              className="pnc-logout-btn"
              style={{
                minWidth: 'auto', height: 38, padding: '0 16px', fontSize: 12.5, fontWeight: 700,
                background: T.redTint, color: T.red, border: `1.5px solid ${T.red}33`,
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              Log out
            </button>
          </div>
        </header>

        {/* ── Summary row ── */}
        {!loading && items.length > 0 && (
          <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
            <SummaryCard label="Total messages" value={items.length} color={T.forestDeep} mark="‡" />
            <SummaryCard label="Pending reply"  value={pending}      color={T.gold}       mark="⏳" />
            <SummaryCard label="Replied"        value={replied}      color={T.forest}     mark="✓" />
          </div>
        )}

        {/* ── Error banner ── */}
        {error && (
          <div style={{ padding: '14px 16px', background: T.redTint, color: T.red, borderRadius: 6, marginBottom: 24, fontSize: 14, border: `1px solid ${T.red}33` }}>
            {error}
          </div>
        )}

        {/* ── States ── */}
        {loading && items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: T.inkFaint }}>
            <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 22, marginBottom: 10 }}>···</div>
            Loading messages…
          </div>
        ) : items.length === 0 ? (
          <div style={{ background: T.white, borderRadius: 8, border: `1px solid ${T.hairline}`, textAlign: 'center', padding: '60px 20px', color: T.inkFaint }}>
            <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 28, marginBottom: 10, color: T.hairline }}>—</div>
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
                    background: T.white, borderRadius: 8, border: `1px solid ${T.hairline}`, overflow: 'hidden',
                  }}
                >
                  {/* Card header — always visible */}
                  <div
                    className="pnc-msg-header"
                    onClick={() => toggleExpand(m.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      flexWrap: 'wrap', gap: 10, padding: '16px 20px', cursor: 'pointer',
                      background: isExpanded ? T.white : T.paperDim,
                      borderBottom: isExpanded ? `1px solid ${T.hairline}` : 'none',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        border: `1.5px solid ${T.forest}`, background: T.forestTint,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'Source Serif 4', serif", fontWeight: 700, fontSize: 14, color: T.forestDeep, flexShrink: 0,
                      }}>
                        {(m.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: T.ink, fontSize: 15 }}>{m.name}</div>
                        <a
                          href={`mailto:${m.email}`}
                          onClick={e => e.stopPropagation()}
                          style={{ color: T.forestDeep, fontSize: 13, textDecoration: 'none' }}
                        >
                          {m.email}
                        </a>
                      </div>
                      <StatusBadge replied={!!m.admin_reply} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: T.inkFaint }}>
                        {m.created_at ? new Date(m.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </span>
                      <span style={{ fontSize: 13, color: T.inkFaint, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
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
                            background: T.paper, borderRadius: 6, padding: '14px 16px', marginBottom: 20,
                            fontSize: 14, lineHeight: 1.7, color: T.inkSoft, whiteSpace: 'pre-wrap',
                            border: `1px solid ${T.hairline}`,
                          }}>
                            {m.message}
                          </div>

                          {/* Previous reply */}
                          {m.admin_reply && m.replied_at && (
                            <div style={{ background: T.forestTint, borderRadius: 6, padding: '14px 16px', marginBottom: 20, border: `1px solid ${T.forest}26` }}>
                              <div style={{
                                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, fontWeight: 600, color: T.forestDeep,
                                textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
                              }}>
                                Previous reply
                              </div>
                              <div style={{ fontSize: 14, color: T.inkSoft, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{m.admin_reply}</div>
                              <div style={{ fontSize: 11, color: T.inkFaint, marginTop: 8 }}>
                                Sent {new Date(m.replied_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          )}

                          {/* Reply textarea */}
                          <div style={{ marginBottom: 14 }}>
                            <label style={{
                              display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
                              fontWeight: 600, color: T.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
                            }}>
                              {m.admin_reply ? 'Update reply' : 'Write a reply'}
                            </label>
                            <textarea
                              rows={4}
                              value={replyDrafts[m.id] ?? ''}
                              onChange={e => setReplyDrafts(d => ({ ...d, [m.id]: e.target.value }))}
                              placeholder="Type your reply here… (admin-side only unless you email the user separately)"
                              className="pnc-field-admin"
                              style={{
                                width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 5,
                                border: `1.5px solid ${T.hairline}`, background: T.paper, color: T.ink,
                                fontFamily: 'inherit', fontSize: 14, lineHeight: 1.6, resize: 'vertical', minHeight: 100,
                              }}
                            />
                          </div>

                          {/* Action row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => saveReply(m.id)}
                              disabled={isSaving}
                              className="pnc-cta-primary-admin"
                              style={{
                                minWidth: 'auto', height: 42, padding: '0 20px', fontSize: 13.5, fontWeight: 700,
                                background: isSaving ? T.inkFaint : T.forestDeep, color: T.white,
                                border: 'none', borderRadius: 5, cursor: isSaving ? 'not-allowed' : 'pointer',
                              }}
                            >
                              {isSaving ? 'Saving…' : m.admin_reply ? 'Update reply' : 'Save reply'}
                            </button>
                            <AnimatePresence>
                              {isSuccess && (
                                <motion.span
                                  initial={{ opacity: 0, x: -4 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0 }}
                                  style={{ fontSize: 13, color: T.forestDeep, fontWeight: 600 }}
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
    </div>
  );
}
