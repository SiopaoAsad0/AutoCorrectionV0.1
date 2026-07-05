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
  .pnc-nav-pill { transition: color 0.15s ease; }
  .pnc-nav-pill:hover { color: ${T.forestDeep} !important; }
  .pnc-field-admin { transition: border-color 0.15s ease; }
  .pnc-field-admin:focus { border-color: ${T.forest} !important; }
  .pnc-lang-btn { transition: all 0.15s ease; }
  .pnc-cta-primary-admin { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .pnc-cta-primary-admin:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(18,58,41,0.22); }
  @media (prefers-reduced-motion: reduce) {
    .pnc-admin * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
  }
`;

const navPill = { fontSize: 13, fontWeight: 600, color: T.inkSoft, textDecoration: 'none' };

const POS_OPTIONS = [
  '', 'Noun', 'Verb', 'Adjective', 'Adverb', 'Pronoun',
  'Preposition', 'Conjunction', 'Determiner', 'Interjection', 'Particle',
];

/* Muted, editorial variants stand in for the flag emoji + saturated
   badge colors of the original — same three-language structure. */
const LANG_INFO = {
  english: { label: 'English', mark: 'EN',  color: T.slate,      bg: T.slateTint, note: 'Checked against English spelling rules.' },
  tagalog: { label: 'Tagalog', mark: 'FIL', color: T.forestDeep, bg: T.forestTint, note: 'Checked against Filipino/Tagalog spelling rules.' },
  taglish: { label: 'Taglish', mark: '⟷',   color: T.plum,       bg: T.plumTint,  note: 'Hybrid — valid in both English and Tagalog contexts.' },
};

function FieldLabel({ children, hint }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: T.inkSoft,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {children}
      </label>
      {hint && <span style={{ fontSize: 12, color: T.inkFaint, marginLeft: 8 }}>{hint}</span>}
    </div>
  );
}

const fieldStyle = {
  width: '100%', padding: '11px 13px', fontSize: 15, borderRadius: 5,
  border: `1.5px solid ${T.hairline}`, background: T.paper, color: T.ink, fontFamily: 'inherit',
};

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
            <h1 style={{ margin: 0, fontFamily: "'Source Serif 4', serif", fontSize: '1.8rem', fontWeight: 700, color: T.ink }}>Dictionary</h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: T.inkSoft }}>Add new lexeme entries to the spell-check dictionary</p>
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/admin/users" className="pnc-nav-pill" style={navPill}>Users</Link>
            <Link to="/admin/messages" className="pnc-nav-pill" style={navPill}>Messages</Link>
            <Link to="/admin/reports" className="pnc-nav-pill" style={navPill}>Reports</Link>
            <Link to="/" className="pnc-nav-pill" style={navPill}>Home</Link>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}>

          {/* ── Form ── */}
          <div style={{ background: T.white, borderRadius: 8, padding: 26, border: `1px solid ${T.hairline}` }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: T.forestDeep,
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 18, paddingBottom: 14,
              borderBottom: `1px solid ${T.hairline}`,
            }}>
              New word entry
            </div>

            <form onSubmit={saveWord} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Word input */}
              <div>
                <FieldLabel>Word or phrase</FieldLabel>
                <input
                  value={word}
                  onChange={e => setWord(e.target.value)}
                  placeholder="e.g. kumusta, algorithm, mag-aral"
                  maxLength={255}
                  className="pnc-field-admin"
                  style={{ ...fieldStyle, fontWeight: word ? 600 : 400 }}
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
                      className="pnc-lang-btn"
                      style={{
                        flex: 1, height: 40, fontSize: 13, fontWeight: 700,
                        background: language === val ? T.forestDeep : T.paper,
                        color: language === val ? T.white : T.inkSoft,
                        border: `1.5px solid ${language === val ? T.forestDeep : T.hairline}`,
                        borderRadius: 5, cursor: 'pointer', minWidth: 'auto',
                      }}
                    >
                      {info.label}
                    </button>
                  ))}
                </div>
                <div style={{
                  marginTop: 10, padding: '10px 13px', borderRadius: 5, background: langInfo.bg,
                  fontSize: 12.5, color: langInfo.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>{langInfo.mark}</span>
                  {langInfo.note}
                </div>
              </div>

              {/* POS */}
              <div>
                <FieldLabel hint="optional">Part of speech</FieldLabel>
                <select value={pos} onChange={e => setPos(e.target.value)} className="pnc-field-admin" style={fieldStyle}>
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
                  className="pnc-field-admin"
                  style={fieldStyle}
                />
                <div style={{ marginTop: 8, fontSize: 12, color: T.inkFaint }}>
                  Common words: 1,000–10,000 · Rare words: 1–100 · Slang/new: 1–10
                </div>
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ padding: '10px 14px', background: T.redTint, color: T.red, borderRadius: 5, fontSize: 13.5, border: `1px solid ${T.red}33` }}>
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{ padding: '10px 14px', background: T.forestTint, color: T.forestDeep, borderRadius: 5, fontSize: 13.5, border: `1px solid ${T.forest}33`, fontWeight: 600 }}>
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                type="submit"
                disabled={saving || !word.trim()}
                className="pnc-cta-primary-admin"
                style={{
                  height: 48, fontSize: 14.5, fontWeight: 700,
                  background: saving || !word.trim() ? T.inkFaint : T.forestDeep,
                  color: T.white, border: 'none', borderRadius: 6,
                  cursor: saving || !word.trim() ? 'not-allowed' : 'pointer', minWidth: 'auto',
                }}
              >
                {saving ? 'Adding…' : 'Add word to dictionary'}
              </button>
            </form>
          </div>

          {/* ── Right panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Preview card */}
            <div style={{ background: T.white, borderRadius: 8, padding: 22, border: `1px solid ${T.hairline}` }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: T.forestDeep,
                textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16, paddingBottom: 12,
                borderBottom: `1px solid ${T.hairline}`,
              }}>
                Preview
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.inkFaint, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Word</span>
                  <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 18, fontWeight: 700, color: T.ink, textAlign: 'right' }}>
                    {word || <span style={{ color: T.inkFaint, fontStyle: 'italic', fontFamily: 'inherit', fontWeight: 400, fontSize: 14 }}>not entered yet</span>}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.inkFaint, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Language</span>
                  <span style={{ padding: '2px 9px', borderRadius: 3, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, background: langInfo.bg, color: langInfo.color }}>
                    {langInfo.label}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.inkFaint, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Part of speech</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>
                    {pos || <span style={{ color: T.inkFaint, fontStyle: 'italic', fontWeight: 400 }}>not specified</span>}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.inkFaint, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Frequency</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{Number(frequency).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Recently added */}
            {history.length > 0 && (
              <div style={{ background: T.white, borderRadius: 8, padding: 22, border: `1px solid ${T.hairline}` }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: T.forestDeep,
                  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14, paddingBottom: 12,
                  borderBottom: `1px solid ${T.hairline}`,
                }}>
                  Recently added
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
                            padding: '9px 12px', borderRadius: 5, background: T.paper, border: `1px solid ${T.hairline}`, gap: 8,
                          }}
                        >
                          <span style={{ fontWeight: 700, color: T.ink, fontSize: 14 }}>{h.word}</span>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                            <span style={{ padding: '2px 8px', borderRadius: 3, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, fontWeight: 600, background: info.bg, color: info.color }}>{info.label}</span>
                            {h.pos && h.pos !== '—' && (
                              <span style={{ fontSize: 11.5, color: T.inkFaint }}>{h.pos}</span>
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
            <div style={{ background: T.forestTint, borderRadius: 8, padding: 22, border: `1px solid ${T.forest}26` }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: T.forestDeep,
                textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12,
              }}>
                Tips
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: T.inkSoft, lineHeight: 1.9 }}>
                <li>Enter words in <strong>lowercase</strong> — the system normalizes automatically</li>
                <li>For Tagalog verbs with affixes (e.g. <em>nag-aral</em>), add both the root and the full form</li>
                <li>Set frequency higher for very common words so they rank first in suggestions</li>
                <li>Taglish entries appear in suggestions for both English and Tagalog contexts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
