import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = '';

export default function StudentMessages() {
  const [student, setStudent] = useState(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const studentId = localStorage.getItem('pnc_user');
    if (!studentId || localStorage.getItem('isLoggedIn') !== 'true') {
      navigate('/login', { replace: true });
      return;
    }
    const savedData = localStorage.getItem(`student_${studentId}`);
    if (!savedData) {
      navigate('/login', { replace: true });
      return;
    }
    try {
      const parsed = JSON.parse(savedData);
      setStudent(parsed);
      setEmail(parsed.email || '');
    } catch {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const canFetch = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()), [email]);

  const loadMessages = useCallback(async () => {
    if (!canFetch) {
      setItems([]);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/contact/messages?email=${encodeURIComponent(email.trim())}`, {
        headers: { Accept: 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Could not load messages (${res.status})`);
      }
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
    const intervalId = setInterval(() => {
      loadMessages();
    }, 5000);
    return () => clearInterval(intervalId);
  }, [student, loadMessages]);

  const saveEmail = () => {
    if (!student) return;
    const normalized = email.trim();
    if (!/\S+@\S+\.\S+/.test(normalized)) {
      setError('Please enter a valid email before saving.');
      return;
    }
    const studentId = localStorage.getItem('pnc_user');
    if (!studentId) return;

    setSavingEmail(true);
    setError(null);
    try {
      const next = { ...student, email: normalized };
      localStorage.setItem(`student_${studentId}`, JSON.stringify(next));
      setStudent(next);
      setSuccess('Email saved. Your inbox now syncs with admin replies.');
    } catch {
      setError('Could not save email locally.');
    } finally {
      setSavingEmail(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!student) return;
    const body = message.trim();
    const normalizedEmail = email.trim();
    if (!body) {
      setError('Type a message first.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      setError('Enter and save a valid email first.');
      return;
    }

    setError(null);
    setSuccess(null);
    setSending(true);
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
        const msg =
          data.message ||
          (data.errors && Object.values(data.errors).flat().join(' ')) ||
          `Could not send (${res.status})`;
        throw new Error(msg);
      }
      setMessage('');
      setSuccess('Message sent. Admin reply will appear here automatically.');
      await loadMessages();
    } catch (e2) {
      setError(e2.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '24px auto', padding: '0 20px 40px' }}>
      <header style={{ borderBottom: '4px solid #00703c', marginBottom: 16, paddingBottom: 12 }}>
        <h1 style={{ margin: 0, color: '#122018', fontSize: '1.5rem' }}>Contact support</h1>
        <p style={{ margin: '6px 0 0', color: '#666' }}>Send messages and receive admin replies here (auto-refresh every 5s).</p>
      </header>

      <div style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 14, boxShadow: '0 6px 20px rgba(0,0,0,0.06)' }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6 }}>
          Your inbox email
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ flex: '1 1 260px' }}
          />
          <button type="button" onClick={saveEmail} disabled={savingEmail} style={{ width: 'auto' }}>
            {savingEmail ? 'Saving…' : 'Save email'}
          </button>
          <button type="button" onClick={() => navigate('/checker')} style={{ width: 'auto', background: '#6c757d' }}>
            Back to checker
          </button>
        </div>
      </div>

      <form onSubmit={sendMessage} style={{ background: '#fff', borderRadius: 12, padding: 14, marginBottom: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.06)' }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6 }}>Message</label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message to admin..."
          style={{ width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 10, border: '1px solid #ddd' }}
        />
        <button type="submit" disabled={sending} style={{ marginTop: 10, width: 'auto' }}>
          {sending ? 'Sending…' : 'Send message'}
        </button>
      </form>

      {error && <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: '#fee', color: '#c00' }}>{error}</div>}
      {success && <div style={{ marginBottom: 12, padding: 10, borderRadius: 8, background: '#ecfff2', color: '#075' }}>{success}</div>}

      <div style={{ background: '#fff', borderRadius: 12, padding: 14, boxShadow: '0 6px 20px rgba(0,0,0,0.06)' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>Conversation</h2>
        {loading ? (
          <p style={{ color: '#666' }}>Loading messages…</p>
        ) : items.length === 0 ? (
          <p style={{ color: '#666' }}>No messages yet. Send one above.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
            {items.map((m) => (
              <li key={m.id} style={{ border: '1px solid #e6ece8', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</div>
                <div style={{ whiteSpace: 'pre-wrap', marginBottom: 10 }}>{m.message}</div>
                {m.admin_reply ? (
                  <div style={{ background: '#f0fcf4', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontWeight: 700, color: '#00703c', marginBottom: 4 }}>Admin reply</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.admin_reply}</div>
                    {m.replied_at && (
                      <div style={{ fontSize: 11, color: '#777', marginTop: 6 }}>{new Date(m.replied_at).toLocaleString()}</div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#999' }}>Waiting for admin reply…</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
