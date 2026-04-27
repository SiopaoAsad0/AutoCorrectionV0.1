import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE = '';

function authHeaders() {
  const token = localStorage.getItem('admin_token');
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function AdminDictionaryAdd() {
  const [word, setWord] = useState('');
  const [language, setLanguage] = useState('english');
  const [pos, setPos] = useState('');
  const [frequency, setFrequency] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const saveWord = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem('admin_token');
    if (!token) {
      navigate('/admin/login', { replace: true });
      return;
    }

    if (!word.trim()) {
      setError('Word is required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/dictionary`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          word: word.trim(),
          language,
          pos: pos.trim() || null,
          frequency: Number(frequency) || 1,
        }),
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login', { replace: true });
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data.message ||
          (data.errors && Object.values(data.errors).flat().join(' ')) ||
          `Could not save (${res.status})`;
        throw new Error(msg);
      }
      setSuccess(`Added word: ${data.word}`);
      setWord('');
      setPos('');
      setFrequency(1);
    } catch (e2) {
      setError(e2.message || 'Failed to add word.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: '0 20px 48px' }}>
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
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#122018' }}>Add dictionary word</h1>
          <p style={{ margin: '6px 0 0', color: '#666', fontSize: 14 }}>Create a new lexeme entry from this page.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/admin/messages" style={{ color: '#00703c', fontWeight: 700 }}>
            Messages
          </Link>
          <Link to="/admin/users" style={{ color: '#00703c', fontWeight: 700 }}>
            Users
          </Link>
          <Link to="/" style={{ color: '#00703c', fontWeight: 700 }}>
            Home
          </Link>
        </div>
      </header>

      <form
        onSubmit={saveWord}
        style={{
          background: '#fff',
          borderRadius: 14,
          padding: 18,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          display: 'grid',
          gap: 12,
        }}
      >
        <label style={{ display: 'grid', gap: 6 }}>
          Word
          <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="Enter word or phrase" maxLength={255} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          Language
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="english">English</option>
            <option value="tagalog">Tagalog</option>
            <option value="taglish">Taglish</option>
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          Part of speech (optional)
          <input value={pos} onChange={(e) => setPos(e.target.value)} placeholder="e.g., Noun, Verb" maxLength={50} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          Frequency
          <input type="number" min={1} max={1000000} value={frequency} onChange={(e) => setFrequency(e.target.value)} />
        </label>

        {error && <div style={{ color: '#c00', background: '#fee', padding: 10, borderRadius: 8 }}>{error}</div>}
        {success && <div style={{ color: '#075', background: '#ecfff2', padding: 10, borderRadius: 8 }}>{success}</div>}

        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Add word'}
        </button>
      </form>
    </div>
  );
}
