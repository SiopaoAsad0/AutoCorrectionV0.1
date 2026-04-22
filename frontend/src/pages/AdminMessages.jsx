import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const API_BASE = '';

function authHeaders() {
  const token = localStorage.getItem('admin_token');
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function AdminMessages() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/contact-messages`, {
        headers: authHeaders(),
      });
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
      list.forEach((m) => {
        drafts[m.id] = m.admin_reply || '';
      });
      setReplyDrafts(drafts);
    } catch (e) {
      setError(e.message || 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const saveReply = async (id) => {
    const body = (replyDrafts[id] || '').trim();
    if (!body) {
      setError('Enter a reply before sending.');
      return;
    }
    setSavingId(id);
    setError(null);
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
      await load();
    } catch (e) {
      setError(e.message || 'Could not save reply.');
    } finally {
      setSavingId(null);
    }
  };

  const logout = async () => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      try {
        await fetch(`${API_BASE}/api/admin/logout`, {
          method: 'POST',
          headers: authHeaders(),
        });
      } catch {
        /* ignore */
      }
    }
    localStorage.removeItem('admin_token');
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="admin-messages-page" style={{ maxWidth: 880, margin: '24px auto', padding: '0 20px 48px' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '4px solid #00703c',
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: '#122018', fontSize: '1.5rem' }}>Contact messages</h1>
          <p style={{ margin: '6px 0 0', color: '#666', fontSize: 14 }}>
            Submissions from the landing page &quot;Contact us&quot; form.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="button" onClick={() => load()} disabled={loading} style={{ background: '#6c757d', width: 'auto' }}>
            Refresh
          </button>
          <button type="button" onClick={logout} style={{ background: '#dc3545', width: 'auto' }}>
            Log out
          </button>
          <Link to="/" style={{ color: '#00703c', fontWeight: 700 }}>
            Home
          </Link>
        </div>
      </header>

      {error && (
        <div style={{ padding: 12, background: '#fee', color: '#c00', borderRadius: 8, marginBottom: 16 }}>{error}</div>
      )}

      {loading && items.length === 0 ? (
        <p style={{ color: '#666' }}>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ color: '#666' }}>No messages yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {items.map((m) => (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                border: '1px solid #e8eeea',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <strong style={{ color: '#122018' }}>{m.name}</strong>
                <a href={`mailto:${m.email}`} style={{ color: '#00703c' }}>
                  {m.email}
                </a>
                <span style={{ fontSize: 12, color: '#888' }}>
                  {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
                </span>
              </div>
              <p style={{ margin: '0 0 16px', whiteSpace: 'pre-wrap', lineHeight: 1.5, color: '#333' }}>{m.message}</p>
              {m.admin_reply && m.replied_at && (
                <div
                  style={{
                    marginBottom: 12,
                    padding: 12,
                    background: '#f0fcf4',
                    borderRadius: 10,
                    fontSize: 14,
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#00703c', marginBottom: 6 }}>Previous reply</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.admin_reply}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
                    {new Date(m.replied_at).toLocaleString()}
                  </div>
                </div>
              )}
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#666', marginBottom: 6 }}>
                {m.admin_reply ? 'Update reply' : 'Reply'}
              </label>
              <textarea
                rows={4}
                value={replyDrafts[m.id] ?? ''}
                onChange={(e) => setReplyDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
                placeholder="Write a reply to store with this message (visible in admin only unless you email the user separately)."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #ddd',
                  fontFamily: 'inherit',
                  fontSize: 14,
                }}
              />
              <button
                type="button"
                onClick={() => saveReply(m.id)}
                disabled={savingId === m.id}
                style={{ marginTop: 10, background: '#00703c', width: 'auto' }}
              >
                {savingId === m.id ? 'Saving…' : m.admin_reply ? 'Update reply' : 'Save reply'}
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
