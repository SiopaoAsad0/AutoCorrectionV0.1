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

const pct  = (v) => (v == null ? '—' : `${(Number(v) * 100).toFixed(1)}%`);
const num  = (v) => (v == null ? '—' : Number(v).toLocaleString());
const dec  = (v, d = 3) => (v == null ? '—' : Number(v).toFixed(d));
const date = (v) => (v ? new Date(v).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

/* ────────────────────────────────────────────────────────────────────────
   Design tokens — same manuscript identity as Landing / Checker / Profile.
   Warm paper, forest ink, gold for emphasis, a single pencil-red for
   errors. Two muted, low-saturation extras (plum, slate) cover the
   additional data series this report needs without breaking the palette.
   ──────────────────────────────────────────────────────────────────── */
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
  .pnc-admin ::selection { background: ${T.forestTint}; color: ${T.forestDeep}; }
  .pnc-admin table { width: 100%; border-collapse: collapse; }
  .pnc-tab-btn { transition: color 0.15s ease, background 0.15s ease; }
  .pnc-refresh-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .pnc-refresh-btn:hover { transform: translateY(-1px); }
  .pnc-nav-pill { transition: color 0.15s ease, border-color 0.15s ease; }
  .pnc-field-admin { transition: border-color 0.15s ease; }
  .pnc-field-admin:focus { border-color: ${T.forest} !important; }
  .pnc-sample-chip { transition: border-color 0.15s ease, color 0.15s ease; }
  .pnc-sample-chip:hover { border-color: ${T.forest} !important; color: ${T.forestDeep} !important; }
  .pnc-cta-primary-admin { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .pnc-cta-primary-admin:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(18,58,41,0.22); }
  .pnc-row-hover:hover { background: ${T.paperDim}; }
  @media (prefers-reduced-motion: reduce) {
    .pnc-admin * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
  }
`;

/* ── Shared components ─────────────────────────────────────────────────── */

/* KPI card — mirrors InfoRow's mark-in-a-box motif from Profile, with the
   figure itself set in Source Serif so it reads like a printed statistic
   rather than a dashboard widget. */
function KPI({ label, value, sub, color = T.forestDeep, mark }) {
  return (
    <div style={{
      flex: 1, minWidth: 168,
      background: T.white,
      borderRadius: 8,
      border: `1px solid ${T.hairline}`,
      borderTop: `3px solid ${color}`,
      padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, fontWeight: 600,
          color: T.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.4,
        }}>
          {label}
        </div>
        {mark && (
          <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16, fontWeight: 700, color, opacity: 0.55, flexShrink: 0, marginLeft: 8 }}>
            {mark}
          </span>
        )}
      </div>
      <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 26, fontWeight: 700, color: T.ink, lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: T.inkFaint, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

/* Section header — the numbered-eyebrow-plus-rule pattern used across the
   Landing page sections. */
function SectionHead({ children, eyebrow }) {
  return (
    <div style={{ margin: '36px 0 16px' }}>
      {eyebrow && (
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, fontWeight: 600,
          color: T.forestDeep, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 6,
        }}>
          {eyebrow}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: `1px solid ${T.hairline}` }}>
        <h3 style={{ margin: 0, fontFamily: "'Source Serif 4', serif", fontSize: 17, fontWeight: 700, color: T.ink }}>
          {children}
        </h3>
      </div>
    </div>
  );
}

function Bar({ label, value, max, color = T.forest, suffix = '' }) {
  const pctVal = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 6, color: T.ink }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.inkFaint, fontWeight: 600, fontSize: 12.5 }}>{num(value)}{suffix}</span>
      </div>
      <div style={{ background: T.paperDim, borderRadius: 3, height: 6, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pctVal}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ background: color, height: '100%', borderRadius: 3 }}
        />
      </div>
    </div>
  );
}

/* Chip — small mono tag, the same family used for the EN / FIL language
   tags on the Landing correction log. */
function Chip({ children, color = T.forestDeep, bg }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 9px',
      borderRadius: 3,
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 11.5,
      fontWeight: 600,
      background: bg || `${color}14`,
      color,
      letterSpacing: '0.01em',
    }}>
      {children}
    </span>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '44px 20px', color: T.inkFaint }}>
      <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 28, marginBottom: 10, color: T.hairline }}>—</div>
      <div style={{ fontSize: 13.5 }}>{message}</div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '11px 13px', fontSize: 14, borderRadius: 5,
  border: `1.5px solid ${T.hairline}`, background: T.paper, color: T.ink,
  fontFamily: 'inherit',
};

/* ── Algorithm Compare Tool ────────────────────────────────────────────── */
function CompareTool() {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const compare = async () => {
    if (!source.trim() || !target.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/compare`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ source: source.trim(), target: target.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult(await res.json());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const samples = [
    ['recieve', 'receive'], ['seperate', 'separate'], ['definately', 'definitely'],
    ['kumosta', 'kumusta'], ['salamats', 'salamat'], ['beleive', 'believe'],
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <input
          value={source}
          onChange={e => setSource(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && compare()}
          placeholder="Misspelled word (e.g. recieve)"
          className="pnc-field-admin"
          style={{ ...inputStyle, flex: 1, minWidth: 180 }}
        />
        <input
          value={target}
          onChange={e => setTarget(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && compare()}
          placeholder="Correct word (e.g. receive)"
          className="pnc-field-admin"
          style={{ ...inputStyle, flex: 1, minWidth: 180 }}
        />
        <button
          onClick={compare}
          disabled={loading || !source.trim() || !target.trim()}
          className="pnc-cta-primary-admin"
          style={{
            minWidth: 130, height: 44, padding: '0 18px', fontSize: 13.5, fontWeight: 700,
            background: loading ? T.inkFaint : T.forestDeep, color: T.white,
            border: 'none', borderRadius: 5, cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Comparing…' : 'Compare'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {samples.map(([a, b], i) => (
          <button
            key={i}
            onClick={() => { setSource(a); setTarget(b); setResult(null); }}
            className="pnc-sample-chip"
            style={{
              fontFamily: "'IBM Plex Mono', monospace", background: 'transparent', color: T.inkSoft,
              fontSize: 12, padding: '5px 12px', minWidth: 'auto', height: 'auto',
              border: `1px solid ${T.hairline}`, borderRadius: 4, cursor: 'pointer',
            }}
          >
            {a} → {b}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: T.redTint, color: T.red, borderRadius: 5, fontSize: 13, border: `1px solid ${T.red}33`, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
              {/* Levenshtein */}
              <div style={{ background: T.forestTint, borderRadius: 7, padding: 18, border: `1px solid ${T.forest}26` }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, fontWeight: 700, color: T.forestDeep, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 9 }}>
                  Adapted Levenshtein
                </div>
                <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 26, fontWeight: 700, color: T.ink }}>{dec(result.levenshtein_distance, 2)}</div>
                <div style={{ fontSize: 12, color: T.inkFaint, marginBottom: 10 }}>edit distance</div>
                <div style={{ fontSize: 13, color: T.inkSoft }}>Normalized: <strong>{dec(result.levenshtein_normalized, 4)}</strong></div>
                {result.edit_breakdown && (
                  <div style={{ marginTop: 10, fontSize: 12, color: T.inkSoft, lineHeight: 1.7 }}>
                    Sub: <strong>{result.edit_breakdown.substitutions}</strong> &nbsp; Ins: <strong>{result.edit_breakdown.insertions}</strong> &nbsp; Del: <strong>{result.edit_breakdown.deletions}</strong>
                  </div>
                )}
                <div style={{ marginTop: 10 }}>
                  <Chip color={result.lev_accepts ? T.forestDeep : T.gold} bg={result.lev_accepts ? T.forestTint : T.goldTint}>
                    {result.lev_accepts ? '✓ Accepts' : '✗ Rejects'}
                  </Chip>
                </div>
              </div>

              {/* Jaro-Winkler */}
              <div style={{ background: T.plumTint, borderRadius: 7, padding: 18, border: `1px solid ${T.plum}26` }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, fontWeight: 700, color: T.plum, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 9 }}>
                  Jaro-Winkler
                </div>
                <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 26, fontWeight: 700, color: T.ink }}>{dec(result.jaro_winkler_similarity, 4)}</div>
                <div style={{ fontSize: 12, color: T.inkFaint, marginBottom: 10 }}>similarity score</div>
                <div style={{ fontSize: 13, color: T.inkSoft }}>Jaro: <strong>{dec(result.jaro_similarity, 4)}</strong></div>
                <div style={{ fontSize: 13, color: T.inkSoft }}>Distance: <strong>{dec(result.jaro_winkler_distance, 4)}</strong></div>
                <div style={{ marginTop: 10 }}>
                  <Chip color={result.jw_accepts ? T.plum : T.gold} bg={result.jw_accepts ? T.plumTint : T.goldTint}>
                    {result.jw_accepts ? '✓ Accepts' : '✗ Rejects'}
                  </Chip>
                </div>
              </div>

              {/* Verdict */}
              <div style={{
                background: result.agreement ? T.forestTint : T.goldTint,
                borderRadius: 7, padding: 18,
                border: `1px solid ${result.agreement ? T.forest : T.gold}26`,
              }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, fontWeight: 700, color: T.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 9 }}>
                  Verdict
                </div>
                <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 15.5, fontWeight: 700, color: result.agreement ? T.forestDeep : T.gold, marginBottom: 12 }}>
                  {result.agreement ? 'Algorithms agree' : 'Algorithms disagree'}
                </div>
                <div style={{ fontSize: 12, color: T.inkSoft, marginBottom: 8 }}>Preferred algorithm:</div>
                <Chip color={T.white} bg={T.forestDeep}>{result.preferred_algorithm}</Chip>
                <div style={{ marginTop: 10, fontSize: 12, color: T.inkFaint, lineHeight: 1.6 }}>
                  {result.preferred_algorithm === 'jaro-winkler'
                    ? 'Short word — prefix similarity is more meaningful here'
                    : 'Longer word — edit count gives a clearer signal'}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'overview',   label: 'Overview',    mark: '¶' },
  { id: 'algorithm',  label: 'Algorithm',   mark: '§' },
  { id: 'users',      label: 'Users',       mark: '○' },
  { id: 'misspelled', label: 'Top errors',  mark: '‡' },
  { id: 'compare',    label: 'Live compare', mark: '*' },
];

const thStyle = (align = 'left') => ({
  color: T.forestDeep, padding: '11px 15px', textAlign: align,
  fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
});
const tdStyle = (align = 'left') => ({ padding: '11px 15px', textAlign: align, fontSize: 13.5 });

export default function AdminReports() {
  const [overview, setOverview] = useState(null);
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [tab,      setTab]      = useState('overview');
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) { navigate('/admin/login', { replace: true }); return; }
    setLoading(true); setError(null);
    try {
      const [ovRes, usRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/reports/overview`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/admin/reports/users`,    { headers: authHeaders() }),
      ]);
      if (ovRes.status === 401 || ovRes.status === 403) {
        localStorage.removeItem('admin_token');
        navigate('/admin/login', { replace: true });
        return;
      }
      if (!ovRes.ok) throw new Error(`Overview: HTTP ${ovRes.status}`);
      const ovData = await ovRes.json();
      const usData = usRes.ok ? await usRes.json() : { users: [] };
      setOverview(ovData);
      setUsers(usData.users || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const ov            = overview?.overview             || {};
  const algo          = overview?.algorithm_comparison || {};
  const topMisspelled = overview?.top_misspelled       || [];
  const dailyTrend    = overview?.daily_trend          || [];
  const regUsers      = overview?.registered_users     ?? null;

  return (
    <div className="pnc-admin" style={{
      minHeight: '100vh', background: T.paper, fontFamily: "'Inter', system-ui, sans-serif", color: T.ink,
    }}>
      <style>{FONTS_IMPORT}</style>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 24px 72px' }}>

        {/* ── Page header ── */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          flexWrap: 'wrap', gap: 16,
          borderBottom: `3px solid ${T.gold}`,
          paddingBottom: 20, marginBottom: 32,
        }}>
          <div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
              color: T.forestDeep, textTransform: 'uppercase', letterSpacing: '0.1em',
              marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ width: 18, height: 1, background: T.forestDeep, display: 'inline-block' }} />
              Admin panel
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Source Serif 4', serif", fontSize: '1.8rem', fontWeight: 700, color: T.ink }}>
              Data reports
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: T.inkSoft }}>
              System-wide spell check statistics and algorithm comparison
            </p>
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/admin/users" className="pnc-nav-pill" style={{ fontSize: 13, fontWeight: 600, color: T.inkSoft, textDecoration: 'none', borderBottom: '1px solid transparent', paddingBottom: 2 }}>
              Users
            </Link>
            <Link to="/admin/messages" className="pnc-nav-pill" style={{ fontSize: 13, fontWeight: 600, color: T.inkSoft, textDecoration: 'none', borderBottom: '1px solid transparent', paddingBottom: 2 }}>
              Messages
            </Link>
            <Link to="/admin/dictionary/add" className="pnc-nav-pill" style={{ fontSize: 13, fontWeight: 600, color: T.inkSoft, textDecoration: 'none', borderBottom: '1px solid transparent', paddingBottom: 2 }}>
              Dictionary
            </Link>
            <button
              onClick={fetchData}
              className="pnc-refresh-btn"
              style={{
                minWidth: 'auto', height: 38, padding: '0 16px', fontSize: 12.5, fontWeight: 700,
                background: T.forestTint, color: T.forestDeep, border: `1.5px solid ${T.forest}33`,
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>
        </header>

        {/* ── Tab bar ── */}
        <div style={{
          display: 'flex', gap: 4, flexWrap: 'wrap',
          background: T.white, borderRadius: 8, padding: 4,
          marginBottom: 32, border: `1px solid ${T.hairline}`,
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="pnc-tab-btn"
              style={{
                flex: 1, minWidth: 96,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                height: 40, padding: '0 14px', fontSize: 13, fontWeight: 600,
                background: tab === t.id ? T.forestDeep : 'transparent',
                color: tab === t.id ? T.white : T.inkSoft,
                border: 'none', borderRadius: 5, cursor: 'pointer',
              }}
            >
              <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 14, opacity: tab === t.id ? 0.85 : 0.5 }}>{t.mark}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Error state ── */}
        {error && (
          <div style={{ padding: '14px 16px', background: T.redTint, color: T.red, borderRadius: 6, marginBottom: 24, fontSize: 14, border: `1px solid ${T.red}33` }}>
            {error}
          </div>
        )}

        {/* ── Loading state ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: T.inkFaint }}>
            <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 22, marginBottom: 10 }}>···</div>
            Loading report data…
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >

              {/* ══ OVERVIEW ══════════════════════════════════════════════ */}
              {tab === 'overview' && (
                <div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
                    <KPI label="Registered users"     value={num(regUsers)}            sub="total accounts"           color={T.slate}      mark="№" />
                    <KPI label="Spell check sessions" value={num(ov.total_checks)}     sub="times checker was run"    color={T.forestDeep} mark="✓" />
                    <KPI label="Words analyzed"       value={num(ov.total_words)}      sub="total words processed"    color={T.plum}       mark="¶" />
                    <KPI label="Unique users"         value={num(ov.unique_users)}     sub="users with logged checks" color={T.gold}       mark="○" />
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 8 }}>
                    <KPI label="Errors found"         value={num(ov.total_misspelled)}     sub="misspelled words"          color={T.red}        mark="✗" />
                    <KPI label="Suggestions given"     value={num(ov.total_suggested)}      sub="words with suggestions"    color={T.forestDeep} mark="†" />
                    <KPI label="Avg correction rate"  value={pct(ov.avg_correction_rate)}  sub="words needing correction"  color={T.gold}       mark="%" />
                    <KPI label="Avg word error rate"  value={pct(ov.avg_wer)}              sub="WER across all sessions"   color={T.red}        mark="‡" />
                  </div>

                  <SectionHead eyebrow="Distribution">Word classification breakdown</SectionHead>
                  <div style={{ background: T.white, borderRadius: 8, padding: '22px 24px', border: `1px solid ${T.hairline}`, marginBottom: 8 }}>
                    {(ov.total_words ?? 0) === 0 ? (
                      <EmptyState message="Run some spell checks to generate breakdown data." />
                    ) : (
                      <>
                        <Bar label="Correct words"    value={ov.total_correct}    max={ov.total_words} color={T.forest} />
                        <Bar label="Suggested words"  value={ov.total_suggested}  max={ov.total_words} color={T.gold} />
                        <Bar label="Misspelled words" value={ov.total_misspelled} max={ov.total_words} color={T.red} />
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.hairline}`, display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: T.inkFaint }}>
                          <span><span style={{ color: T.forest, fontWeight: 700 }}>▪</span> Correct: {pct((ov.total_correct ?? 0) / (ov.total_words ?? 1))}</span>
                          <span><span style={{ color: T.gold, fontWeight: 700 }}>▪</span> Suggested: {pct((ov.total_suggested ?? 0) / (ov.total_words ?? 1))}</span>
                          <span><span style={{ color: T.red, fontWeight: 700 }}>▪</span> Misspelled: {pct((ov.total_misspelled ?? 0) / (ov.total_words ?? 1))}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <SectionHead eyebrow="Timeline">Daily activity — last 30 days</SectionHead>
                  {dailyTrend.length === 0 ? (
                    <div style={{ background: T.white, borderRadius: 8, border: `1px solid ${T.hairline}` }}>
                      <EmptyState message="No daily activity yet. Run the spell checker to generate trend data." />
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', background: T.white, borderRadius: 8, border: `1px solid ${T.hairline}` }}>
                      <table>
                        <thead>
                          <tr style={{ background: T.paperDim }}>
                            <th style={thStyle('left')}>Date</th>
                            <th style={thStyle('right')}>Checks</th>
                            <th style={thStyle('right')}>Errors</th>
                            <th style={thStyle('right')}>Avg correction rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyTrend.map((row, i) => (
                            <tr key={i} className="pnc-row-hover" style={{ borderTop: `1px solid ${T.hairline}` }}>
                              <td style={{ ...tdStyle('left'), fontWeight: 600, color: T.ink }}>{row.date}</td>
                              <td style={tdStyle('right')}>{num(row.checks)}</td>
                              <td style={{ ...tdStyle('right'), color: T.red, fontWeight: 700 }}>{num(row.misspelled)}</td>
                              <td style={tdStyle('right')}><Chip>{pct(row.avg_correction_rate)}</Chip></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ══ ALGORITHM ═════════════════════════════════════════════ */}
              {tab === 'algorithm' && (
                <div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 8 }}>
                    <KPI label="Avg Levenshtein distance"    value={dec(algo.avg_lev_distance, 3)}  sub="lower = closer match"       color={T.forestDeep} mark="∆" />
                    <KPI label="Avg Jaro-Winkler similarity" value={dec(algo.avg_jw_similarity, 4)} sub="higher = more similar"      color={T.plum}       mark="≈" />
                    <KPI label="Algorithm agreements"        value={num(algo.agreements)}           sub={`of ${num(algo.total)} word pairs`} color={T.slate} mark="✓" />
                    <KPI label="Lev preferred rate"          value={pct(algo.lev_preferred_rate)}   sub="when algorithms disagree"   color={T.gold}       mark="†" />
                  </div>

                  <SectionHead eyebrow="Consensus">Agreement rate</SectionHead>
                  <div style={{ background: T.white, borderRadius: 8, padding: '22px 24px', border: `1px solid ${T.hairline}`, marginBottom: 8 }}>
                    {(algo.total ?? 0) === 0 ? (
                      <EmptyState message="No algorithm data yet. Use the spell checker to generate comparison data." />
                    ) : (
                      <>
                        <Bar label="Both algorithms agree" value={algo.agreements}                max={algo.total} color={T.forest} />
                        <Bar label="Algorithms disagree"   value={(algo.total - algo.agreements)} max={algo.total} color={T.red} />
                        <div style={{ marginTop: 14, fontSize: 13, color: T.inkSoft }}>
                          Agreement rate: <strong style={{ color: T.forestDeep }}>{pct(algo.agreements / algo.total)}</strong> across {num(algo.total)} word pairs
                        </div>
                      </>
                    )}
                  </div>

                  <SectionHead eyebrow="Reference">Algorithm guide</SectionHead>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                    {[
                      {
                        title: 'Adapted Levenshtein', mark: '§',
                        color: T.forestDeep, bg: T.forestTint, border: T.forest,
                        points: [
                          'Counts minimum edits: insert, delete, substitute',
                          'Distance 0 = identical; higher = more different',
                          'Accepts candidates with distance ≤ 3',
                          'Best for longer words (6+ characters)',
                          'Weighted for Filipino phonetic patterns',
                        ],
                      },
                      {
                        title: 'Jaro-Winkler', mark: '≈',
                        color: T.plum, bg: T.plumTint, border: T.plum,
                        points: [
                          'Measures character overlap and transpositions',
                          'Score 1.0 = identical; 0.0 = completely different',
                          'Accepts candidates with similarity ≥ 0.75',
                          'Best for short words (≤ 5 characters)',
                          'Bonus weight for matching prefixes',
                        ],
                      },
                      {
                        title: 'When they disagree', mark: '⁂',
                        color: T.gold, bg: T.goldTint, border: T.gold,
                        points: [
                          'Short words → prefer Jaro-Winkler',
                          'Long words → prefer Levenshtein',
                          'Transpositions → Jaro-Winkler handles better',
                          'Missing or extra letters → Levenshtein handles better',
                          'Using both together raises overall accuracy',
                        ],
                      },
                    ].map((card, i) => (
                      <div key={i} style={{ background: card.bg, borderRadius: 8, padding: 20, border: `1px solid ${card.border}26` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                          <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 17, fontWeight: 700, color: card.color }}>{card.mark}</span>
                          <span style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 700, color: card.color, fontSize: 15 }}>{card.title}</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 16, color: T.inkSoft, fontSize: 13, lineHeight: 1.8 }}>
                          {card.points.map((p, j) => <li key={j}>{p}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ══ USERS ═════════════════════════════════════════════════ */}
              {tab === 'users' && (
                <div>
                  <SectionHead eyebrow="Directory">Registered user activity</SectionHead>
                  {users.length === 0 ? (
                    <div style={{ background: T.white, borderRadius: 8, border: `1px solid ${T.hairline}` }}>
                      <EmptyState message="No user activity logged yet. Users must run the spell checker for records to appear here." />
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', background: T.white, borderRadius: 8, border: `1px solid ${T.hairline}` }}>
                      <table>
                        <thead>
                          <tr style={{ background: T.paperDim }}>
                            {['#', 'Email', 'Sessions', 'Words', 'Errors', 'Avg correction', 'Avg WER', 'Last active'].map((h, i) => (
                              <th key={i} style={thStyle(i > 1 ? 'right' : 'left')}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u, i) => (
                            <motion.tr
                              key={i}
                              className="pnc-row-hover"
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              style={{ borderTop: `1px solid ${T.hairline}` }}
                            >
                              <td style={{ ...tdStyle('left'), color: T.inkFaint, fontSize: 12.5 }}>{i + 1}</td>
                              <td style={{ ...tdStyle('left'), fontWeight: 600, color: T.ink }}>{u.user_email}</td>
                              <td style={tdStyle('right')}>{num(u.total_checks)}</td>
                              <td style={tdStyle('right')}>{num(u.total_words)}</td>
                              <td style={{ ...tdStyle('right'), fontWeight: 700, color: T.red }}>{num(u.total_misspelled)}</td>
                              <td style={tdStyle('right')}><Chip>{pct(u.avg_correction_rate)}</Chip></td>
                              <td style={tdStyle('right')}><Chip color={T.red} bg={T.redTint}>{pct(u.avg_wer)}</Chip></td>
                              <td style={{ ...tdStyle('right'), fontSize: 12, color: T.inkFaint, whiteSpace: 'nowrap' }}>{date(u.last_active)}</td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ══ TOP ERRORS ════════════════════════════════════════════ */}
              {tab === 'misspelled' && (
                <div>
                  <SectionHead eyebrow="Frequency">Most frequently misspelled words</SectionHead>
                  {topMisspelled.length === 0 ? (
                    <div style={{ background: T.white, borderRadius: 8, border: `1px solid ${T.hairline}` }}>
                      <EmptyState message="No misspelled word data yet." />
                    </div>
                  ) : (
                    <>
                      <div style={{ background: T.white, borderRadius: 8, padding: '22px 24px', border: `1px solid ${T.hairline}`, marginBottom: 20 }}>
                        <div style={{
                          fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: T.inkFaint, marginBottom: 16,
                          fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                          Frequency — top {Math.min(topMisspelled.length, 10)} words
                        </div>
                        {topMisspelled.slice(0, 10).map((row, i) => (
                          <Bar
                            key={i}
                            label={row.misspelled_word}
                            value={row.frequency}
                            max={topMisspelled[0]?.frequency ?? 1}
                            color={i === 0 ? T.red : i < 3 ? T.gold : T.forest}
                          />
                        ))}
                      </div>

                      <div style={{ overflowX: 'auto', background: T.white, borderRadius: 8, border: `1px solid ${T.hairline}` }}>
                        <table>
                          <thead>
                            <tr style={{ background: T.paperDim }}>
                              {['#', 'Misspelled word', 'Times found', 'Avg Levenshtein dist.', 'Avg Jaro-Winkler sim.', 'Avg confidence'].map((h, i) => (
                                <th key={i} style={thStyle(i > 1 ? 'right' : 'left')}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {topMisspelled.map((row, i) => (
                              <motion.tr
                                key={i}
                                className="pnc-row-hover"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.03 }}
                                style={{ borderTop: `1px solid ${T.hairline}` }}
                              >
                                <td style={{ ...tdStyle('left'), color: T.inkFaint, fontSize: 12.5 }}>{i + 1}</td>
                                <td style={{ ...tdStyle('left'), fontWeight: 700, color: T.red }}>{row.misspelled_word}</td>
                                <td style={{ ...tdStyle('right'), fontWeight: 700 }}>{num(row.frequency)}</td>
                                <td style={tdStyle('right')}><Chip>{dec(row.avg_lev_distance, 3)}</Chip></td>
                                <td style={tdStyle('right')}>
                                  <Chip
                                    color={Number(row.avg_jw_similarity) >= 0.75 ? T.forestDeep : T.gold}
                                    bg={Number(row.avg_jw_similarity) >= 0.75 ? T.forestTint : T.goldTint}
                                  >
                                    {dec(row.avg_jw_similarity, 4)}
                                  </Chip>
                                </td>
                                <td style={tdStyle('right')}>
                                  {row.avg_confidence != null
                                    ? <Chip color={T.slate} bg={T.slateTint}>{dec(row.avg_confidence, 3)}</Chip>
                                    : <span style={{ color: T.inkFaint }}>—</span>}
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ══ LIVE COMPARE ══════════════════════════════════════════ */}
              {tab === 'compare' && (
                <div>
                  <SectionHead eyebrow="Sandbox">Live algorithm comparison</SectionHead>
                  <p style={{ fontSize: 14, color: T.inkSoft, margin: '0 0 20px', lineHeight: 1.6 }}>
                    Enter any word pair to compare Adapted Levenshtein vs Jaro-Winkler side by side. Press Enter or click Compare.
                  </p>
                  <div style={{ background: T.white, borderRadius: 8, padding: 24, border: `1px solid ${T.hairline}` }}>
                    <CompareTool />
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
