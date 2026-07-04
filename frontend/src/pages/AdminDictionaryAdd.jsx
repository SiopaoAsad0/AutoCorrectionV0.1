import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  red:        '#dc3545',
  redLight:   '#fdf0f1',
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

const POS_OPTIONS = [
  '', 'Noun', 'Verb', 'Adjective', 'Adverb', 'Pronoun',
  'Preposition', 'Conjunction', 'Determiner', 'Interjection', 'Particle',
];

const LANG_INFO = {
  english: { label: 'English', color: '#0277bd', bg: '#e3f2fd', border: '#b3d9f5' },
  tagalog: { label: 'Tagalog', color: G.green,   bg: G.greenLight, border: G.greenMid },
  taglish: { label: 'Taglish', color: '#7b1fa2', bg: '#f3f0fb', border: '#d5c8f5' },
};

function FieldLabel({ children, hint }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: G.textMid, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {children}
      </label>
      {hint && <span style={{ fontSize: 12, color: G.textMuted, marginLeft: 6 }}>{hint}</span>}
    </div>
  );
}

export default function AdminDictionaryAdd() {
  const [word,     setWord]     = useState('');
  const [language, setLanguage] = useState('english');
  const [pos,      setPos]      = useState('');
  const [frequency,setFrequency]= useState(1);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);
  const [success,  setSuccess]  = useState(null);
  const [history,  setHistory]  = useState([]);
  const navigate = useNavigate();

  const saveWord = async (e) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    const token = localStorage.getItem('admin_token');
    if (!token) { navigate('/admin/login', { replace: true }); return; }
    if (!word.trim()) { setError('Word is required.'); return; }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/dictionary`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          word: word.trim(), language,
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
        const msg = data.message ||
          (data.errors && Object.values(data.errors).flat().join(' ')) ||
          `Could not save (${res.status})`;
        throw new Error(msg);
      }
      const added = { word: data.word, language, pos: pos || '—', frequency: Number(frequency) || 1, time: new Date() };
      setSuccess(`"${data.word}" added to the ${language} dictionary.`);
      setHistory(h => [added, ...h].slice(0, 10));
      setWord(''); setPos(''); setFrequency(1);
      setTimeout(() => setSuccess(null), 4000);
    } catch (e2) {
      setError(e2.message || 'Failed to add word.');
    } finally {
      setSaving(false);
    }
  };

  const langInfo = LANG_INFO[language] || LANG_INFO.english;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px 64px', fontFamily: "'Inter','Segoe UI',Roboto,sans-serif" }}>

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
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: G.text }}>Dictionary</h1>
          <p style={{ margin: '5px 0 0', fontSize: 14, color: G.textMuted }}>Add new lexeme entries to the spell-check dictionary</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/admin/users"    style={btn(G.greenLight, G.green, G.greenMid)}>Users</Link>
          <Link to="/admin/messages" style={btn(G.greenLight, G.green, G.greenMid)}>Messages</Link>
          <Link to="/admin/reports"  style={btn(G.greenLight, G.green, G.greenMid)}>Reports</Link>
          <Link to="/"               style={btn(G.greenLight, G.green, G.greenMid)}>Home</Link>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>

        {/* ── Form ── */}
        <div style={{ background: G.white, borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${G.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${G.border}` }}>
            <div style={{ width: 4, height: 18, background: G.green, borderRadius: 2 }} />
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: G.green, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              New word entry
            </h2>
          </div>

          <form onSubmit={saveWord} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Word input */}
            <div>
              <FieldLabel>Word or phrase</FieldLabel>
              <input
                value={word}
                onChange={e => setWord(e.target.value)}
                placeholder="e.g. kumusta, algorithm, mag-aral"
                maxLength={255}
                style={{ marginBottom: 0, fontSize: 15, fontWeight: word ? 600 : 400 }}
              />
            </div>

            {/* Language */}
            <div>
              <FieldLabel>Language</FieldLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                {Object.entries(LANG_INFO).map(([val, info]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setLanguage(val)}
                    style={{
                      flex: 1, height: 38, fontSize: 13, fontWeight: 700,
                      background: language === val ? info.color : G.bg,
                      color: language === val ? G.white : G.textMid,
                      border: `1.5px solid ${language === val ? info.color : G.border}`,
                      borderRadius: 8, cursor: 'pointer', minWidth: 'auto',
                      transition: 'all 0.15s',
                    }}
                  >
                    {info.label}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: langInfo.bg, border: `1px solid ${langInfo.border}`, fontSize: 12, color: langInfo.color, fontWeight: 600 }}>
                {language === 'english' && '🇺🇸 Will be checked against English spelling rules'}
                {language === 'tagalog' && '🇵🇭 Will be checked against Filipino/Tagalog spelling rules'}
                {language === 'taglish' && '🔀 Hybrid — valid in both English and Tagalog contexts'}
              </div>
            </div>

            {/* POS */}
            <div>
              <FieldLabel hint="optional">Part of speech</FieldLabel>
              <select value={pos} onChange={e => setPos(e.target.value)} style={{ marginBottom: 0 }}>
                {POS_OPTIONS.map(o => (
                  <option key={o} value={o}>{o || '— Not specified —'}</option>
                ))}
              </select>
            </div>

            {/* Frequency */}
            <div>
              <FieldLabel hint="higher = suggested more often">Frequency weight</FieldLabel>
              <input
                type="number" min={1} max={1000000}
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                style={{ marginBottom: 0 }}
              />
              <div style={{ marginTop: 6, fontSize: 12, color: G.textMuted }}>
                Common words: 1,000–10,000 · Rare words: 1–100 · Slang/new: 1–10
              </div>
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ padding: '10px 14px', background: G.redLight, color: G.red, borderRadius: 8, fontSize: 14, border: '1px solid #f5c6cb' }}>
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ padding: '10px 14px', background: G.greenLight, color: G.green, borderRadius: 8, fontSize: 14, border: `1px solid ${G.greenMid}`, fontWeight: 600 }}>
                  ✓ {success}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving || !word.trim()}
              style={{
                height: 46, fontSize: 15, fontWeight: 700,
                background: saving || !word.trim() ? '#b0c4ba' : G.green,
                color: G.white, border: 'none', borderRadius: 10,
                cursor: saving || !word.trim() ? 'not-allowed' : 'pointer',
                minWidth: 'auto', transition: 'background 0.2s',
              }}
            >
              {saving ? 'Adding…' : '+ Add word to dictionary'}
            </button>
          </form>
        </div>

        {/* ── Right panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Preview card */}
          <div style={{ background: G.white, borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${G.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${G.border}` }}>
              <div style={{ width: 4, height: 18, background: G.green, borderRadius: 2 }} />
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: G.green, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Preview
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Word', value: word || <span style={{ color: G.textMuted, fontStyle: 'italic' }}>not entered yet</span>, large: true },
                { label: 'Language', value: <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: langInfo.bg, color: langInfo.color, border: `1px solid ${langInfo.border}` }}>{langInfo.label}</span> },
                { label: 'Part of speech', value: pos || <span style={{ color: G.textMuted, fontStyle: 'italic' }}>not specified</span> },
                { label: 'Frequency', value: Number(frequency).toLocaleString() },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: G.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontSize: row.large ? 18 : 14, fontWeight: row.large ? 800 : 600, color: G.text, textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recently added */}
          {history.length > 0 && (
            <div style={{ background: G.white, borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${G.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${G.border}` }}>
                <div style={{ width: 4, height: 18, background: G.green, borderRadius: 2 }} />
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: G.green, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Recently added
                </h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <AnimatePresence>
                  {history.map((h, i) => {
                    const info = LANG_INFO[h.language] || LANG_INFO.english;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 12px', borderRadius: 8,
                          background: G.bg, border: `1px solid ${G.border}`,
                          gap: 8,
                        }}
                      >
                        <span style={{ fontWeight: 700, color: G.text, fontSize: 14 }}>{h.word}</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                          <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: info.bg, color: info.color }}>{info.label}</span>
                          {h.pos && h.pos !== '—' && (
                            <span style={{ fontSize: 11, color: G.textMuted }}>{h.pos}</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Tips */}
          <div style={{ background: G.greenLight, borderRadius: 14, padding: 20, border: `1px solid ${G.greenMid}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: G.green, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Tips
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: G.textMid, lineHeight: 1.9 }}>
              <li>Enter words in <strong>lowercase</strong> — the system normalizes automatically</li>
              <li>For Tagalog verbs with affixes (e.g. <em>nag-aral</em>), add both the root and the full form</li>
              <li>Set frequency higher for very common words so they rank first in suggestions</li>
              <li>Taglish entries appear in suggestions for both English and Tagalog contexts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
