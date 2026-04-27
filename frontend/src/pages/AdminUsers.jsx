import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE = '';

function authHeaders() {
  const token = localStorage.getItem('admin_token');
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function AdminUsers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users?per_page=100`, {
        headers: authHeaders(),
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login', { replace: true });
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || `Could not load users (${res.status})`);
      }

      const apiUsers = (data.data || []).map((u) => ({
        id: `db-${u.id}`,
        displayId: u.id,
        name: u.name || '',
        account: u.email || '',
        role: u.is_admin ? 'Admin' : 'Student',
        createdAt: u.created_at || null,
        source: 'Database',
      }));

      const localUsers = [];
      for (const key of Object.keys(localStorage)) {
        if (!key.startsWith('student_')) {
          continue;
        }
        const studentId = key.slice('student_'.length);
        try {
          const raw = localStorage.getItem(key);
          if (!raw) {
            continue;
          }
          const student = JSON.parse(raw);
          localUsers.push({
            id: `local-${studentId}`,
            displayId: studentId,
            name: student?.name || `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'Unnamed student',
            account: studentId,
            role: 'Student',
            createdAt: null,
            source: 'Local signup',
          });
        } catch {
          // Ignore malformed local records and keep rendering valid users.
        }
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

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ maxWidth: 880, margin: '24px auto', padding: '0 20px 48px' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          borderBottom: '4px solid #00703c',
          paddingBottom: 14,
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#122018' }}>Users list</h1>
          <p style={{ margin: '6px 0 0', color: '#666', fontSize: 14 }}>Registered accounts in the system.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/admin/messages" style={{ color: '#00703c', fontWeight: 700 }}>
            Messages
          </Link>
          <Link to="/admin/dictionary/add" style={{ color: '#00703c', fontWeight: 700 }}>
            Add Word
          </Link>
          <Link to="/" style={{ color: '#00703c', fontWeight: 700 }}>
            Home
          </Link>
        </div>
      </header>

      {error && <div style={{ padding: 12, background: '#fee', color: '#c00', borderRadius: 8 }}>{error}</div>}
      {loading ? (
        <p style={{ color: '#666' }}>Loading users…</p>
      ) : items.length === 0 ? (
        <p style={{ color: '#666' }}>No users found.</p>
      ) : (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 12, boxShadow: '0 6px 20px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f4f8f5' }}>
                <th style={{ textAlign: 'left', padding: 12 }}>ID</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Name</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Email / Username</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Role</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Source</th>
                <th style={{ textAlign: 'left', padding: 12 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid #ececec' }}>
                  <td style={{ padding: 12 }}>{u.displayId}</td>
                  <td style={{ padding: 12 }}>{u.name}</td>
                  <td style={{ padding: 12 }}>{u.account}</td>
                  <td style={{ padding: 12 }}>{u.role}</td>
                  <td style={{ padding: 12 }}>{u.source}</td>
                  <td style={{ padding: 12 }}>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
