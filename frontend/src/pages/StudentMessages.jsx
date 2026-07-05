import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || '';

/* Same tokens as Landing / Checker / Navbar — lift to src/theme.js. */
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
  goldTint:   '#f7f1e2',
  red:        '#b3402f',
  redTint:    '#f7e9e5',
  hairline:   '#d7d9cd',
  white:      '#fffdf8',
};

const FONTS_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
  .pnc-messages *:focus-visible { outline: 2px solid ${T.forest}; outline-offset: 2px; }
  .pnc-messages textarea, .pnc-messages input { font-family: inherit; }
  .pnc-btn-primary { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .pnc-btn-primary:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(18,58,41,0.22); }
  .pnc-btn-ghost { transition: border-color 0.15s ease, background 0.15s ease; }
  .pnc-btn-ghost:not(:disabled):hover { border-color: ${T.forest} !important; }
`;

function formatDate(v) {
  if (!v) return '';
  return new Date(v).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function StudentMessages() {
  const [student,     setStudent]     = useState(null);
  const [email,       setEmail]       = useState('');
  const [message,     setMessage]     = useState('');
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [error,       setError]       = useState(null);
  const [success,     setSuccess]     = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const studentId = localStorage.getItem('pnc_user');
    if (!studentId || localStorage.getItem('isLoggedIn') !== 'true') {
      navigate('/login', { replace: true }); return;
    }
    const savedData = localStorage.getItem(`student_${studentId}`);
    if (!savedData) { navigate('/login', { replace: true }); return; }
    try {
      const parsed = JSON.parse(savedData);
      setStudent(parsed);
      setEmail(parsed.email || '');
    } catch { navigate('/login', { replace: true }); }
  }, [navigate]);

  const canFetch = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);

  const loadMessages = useCallback(async () => {
    if (!canFetch) { setItems([]); setLoading(false); return; }
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/contact/messages?email=${encodeURIComponent(email.trim())}`,
        { headers: { Accept: 'application/json' } }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Could not load messages (${res.status})`);
      setItems(data.data || []);
    } catch (e) {
      setError(e.message || 'Failed to load conversation.');
    } finally {
      setLoading(false);
    }
  }, [canFetch, email]);

  useEffect(() => {
    if (!student) return;
    setLoading(true);
    loadMessages();
    const id = setInterval(loadMessages, 5000);
    return () => clearInterval(id);
  }, [student, loadMessages]);

  const saveEmail = () => {
    if (!student) return;
    const normalized = email.trim();
    if (!/\S+@\S+\.\S+/.test(normalized)) {
      setError('Please enter a valid email before saving.'); return;
    }
    const studentId = localStorage.getItem('pnc_user');
    if (!studentId) return;
    setSavingEmail(true); setError(null);
    try {
      const next = { ...student, email: normalized };
      localStorage.setItem(`student_${studentId}`, JSON.stringify(next));
      setStudent(next);
      setSuccess('Email saved — your inbox now syncs with admin replies.');
      setTimeout(() => setSuccess(null), 3500);
    } catch { setError('Could not save email locally.'); }
    finally { setSavingEmail(false); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!student) return;
    const body = message.trim();
    const normalizedEmail = email.trim();
    if (!body) { setError('Type a message first.'); return; }
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      setError('Enter and save a valid email first.'); return;
    }
    setError(null); setSuccess(null); setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: student.name || student.id || 'Student',
          email: normalizedEmail,
          message: body,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.message ||
          (data.errors && Object.values(data.errors).flat().join(' ')) ||
          `Could not send (${res.status})`;
        throw new Error(msg);
      }
      setMessage('');
      setSuccess('Message sent — admin reply will appear here automatically.');
      setTimeout(() => setSuccess(null), 4000);
      await loadMessages();
    } catch (e2) {
      setError(e2.message || 'Failed to send message.');
    } finally { setSending(false); }
  };

  const repliedCount  = items.filter(m => m.admin_reply).length;
  const pendingCount  = items.filter(m => !m.admin_reply).length;

  return (
    <div className="pnc-messages" style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 64px', fontFamily: "'Inter', system-ui, sans-serif", color: T.ink, background: T.paper }}>
      <style>{FONTS_IMPORT}</style>

      {/* ── Page header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 12,
        borderBottom: `1px solid ${T.hairline}`,
        paddingBottom: 16, marginBottom: 24,
      }}>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 500, color: T.forestDeep, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
            Support
          </div>
          <h1 style={{ margin: 0, fontFamily: "'Source Serif 4', serif", fontSize: '1.45rem', fontWeight: 700, color: T.ink }}>Contact support</h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: T.inkSoft }}>
            Send messages and receive admin replies — refreshes automatically every 5 seconds.
          </p>
        </div>
        <button
          onClick={() => navigate('/checker')}
          className="pnc-btn-ghost"
          style={{
            minWidth: 'auto', height: 34, padding: '0 14px', fontSize: 13, fontWeight: 500,
            background: T.white, color: T.forestDeep,
            border: `1.5px solid ${T.hairline}`, borderRadius: 6, cursor: 'pointer',
          }}
        >
          ← Back to checker
        </button>
      </div>

      {/* ── Email setup card ── */}
      <div style={{
        background: T.white, borderRadius: 8, padding: '18px 20px',
        border: `1px solid ${T.hairline}`,
        marginBottom: 16,
      }}>
        <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${T.hairline}` }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: T.forestDeep, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Your inbox email
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveEmail()}
            style={{ flex: '1 1 220px', height: 46, padding: '0 14px', fontSize: 14, borderRadius: 6, border: `1.5px solid ${T.hairline}`, background: T.paper, color: T.ink }}
          />
          <button
            type="button"
            onClick={saveEmail}
            disabled={savingEmail}
            className="pnc-btn-primary"
            style={{
              minWidth: 'auto', height: 46, padding: '0 18px', fontSize: 13, fontWeight: 700,
              background: T.forestDeep, color: T.white, border: 'none', borderRadius: 6, cursor: 'pointer',
            }}
          >
            {savingEmail ? 'Saving…' : 'Save email'}
          </button>
        </div>
        {!canFetch && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: T.inkFaint }}>
            Save a valid email to load your conversation history.
          </p>
        )}
      </div>

      {/* ── Compose card ── */}
      <div style={{
        background: T.white, borderRadius: 8, padding: '18px 20px',
        border: `1px solid ${T.hairline}`,
        marginBottom: 16,
      }}>
        <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${T.hairline}` }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: T.forestDeep, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            New message
          </span>
        </div>
        <textarea
          rows={4}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type your message to admin here…"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '12px 14px', borderRadius: 6,
            border: `1.5px solid ${T.hairline}`,
            background: T.paper, color: T.ink,
            fontSize: 14, lineHeight: 1.6, resize: 'vertical',
            marginBottom: 12,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: T.inkFaint }}>
            {message.length > 0 ? `${message.length} characters` : 'Keep it clear and concise'}
          </span>
          <button
            onClick={sendMessage}
            disabled={sending || !message.trim()}
            className="pnc-btn-primary"
            style={{
              minWidth: 'auto', height: 40, padding: '0 22px', fontSize: 14, fontWeight: 700,
              background: sending || !message.trim() ? T.inkFaint : T.forestDeep,
              color: T.white, border: 'none', borderRadius: 6,
              cursor: sending || !message.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {sending ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </div>

      {/* ── Feedback banners ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ padding: '12px 16px', background: T.redTint, color: T.red, borderRadius: 6, marginBottom: 14, fontSize: 14, border: `1px solid ${T.red}33` }}
          >
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ padding: '12px 16px', background: T.forestTint, color: T.forestDeep, borderRadius: 6, marginBottom: 14, fontSize: 14, border: `1px solid ${T.forest}33`, fontWeight: 600 }}
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Conversation ── */}
      <div style={{
        background: T.white, borderRadius: 8,
        border: `1px solid ${T.hairline}`,
        overflow: 'hidden',
      }}>
        {/* Conversation header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', borderBottom: `1px solid ${T.hairline}`,
          background: T.paperDim,
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: T.forestDeep, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Conversation
          </span>
          {items.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: T.forestTint, color: T.forestDeep, border: `1px solid ${T.forest}33` }}>
                {repliedCount} replied
              </span>
              {pendingCount > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: T.goldTint, color: T.gold, border: `1px solid ${T.gold}44` }}>
                  {pendingCount} pending
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: T.inkFaint }}>
              <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 22, marginBottom: 8 }}>…</div>
              Loading messages…
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: T.inkFaint }}>
              <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 32, marginBottom: 10, color: T.hairline }}>‡</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.inkSoft }}>No messages yet</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Send one above and we'll get back to you soon.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {items.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  style={{
                    borderRadius: 6,
                    border: `1px solid ${T.hairline}`,
                    overflow: 'hidden',
                  }}
                >
                  {/* Message header */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: T.paperDim,
                    borderBottom: `1px solid ${T.hairline}`,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.inkSoft }}>Your message</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.inkFaint }}>{formatDate(m.created_at)}</span>
                  </div>

                  {/* Message body */}
                  <div style={{
                    padding: '12px 14px',
                    fontSize: 14, lineHeight: 1.7,
                    color: T.ink, whiteSpace: 'pre-wrap',
                  }}>
                    {m.message}
                  </div>

                  {/* Admin reply */}
                  {m.admin_reply ? (
                    <div style={{ borderTop: `1px solid ${T.hairline}`, background: T.forestTint }}>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', borderBottom: `1px solid ${T.forest}22`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 4,
                            border: `1.5px solid ${T.forestDeep}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: "'Source Serif 4', serif", fontSize: 11, color: T.forestDeep, fontWeight: 700,
                          }}>A</div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.forestDeep }}>Admin reply</span>
                        </div>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.inkFaint }}>{formatDate(m.replied_at)}</span>
                      </div>
                      <div style={{
                        padding: '12px 14px',
                        fontSize: 14, lineHeight: 1.7,
                        color: T.inkSoft, whiteSpace: 'pre-wrap',
                      }}>
                        {m.admin_reply}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      borderTop: `1px solid ${T.hairline}`,
                      padding: '10px 14px',
                      background: T.goldTint,
                    }}>
                      <span style={{ fontSize: 12, color: T.gold, fontWeight: 600 }}>Waiting for admin reply…</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
