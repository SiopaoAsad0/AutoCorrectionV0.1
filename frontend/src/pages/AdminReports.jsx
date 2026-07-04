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

/* ── Design tokens ─────────────────────────────────────────────────────────── */
const G = {
  green:      '#00703c',
  greenLight: '#e8f5ee',
  greenMid:   '#c8e6d6',
  gold:       '#ffcc00',
  goldLight:  '#fff8d6',
  red:        '#dc3545',
  redLight:   '#fdf0f1',
  purple:     '#6f42c1',
  purpleLight:'#f1ecfc',
  blue:       '#0277bd',
  blueLight:  '#e3f2fd',
  orange:     '#e65100',
  orangeLight:'#fff3e0',
  text:       '#1a2e24',
  textMid:    '#4a5c52',
  textMuted:  '#8a9e94',
  border:     '#e0ebe4',
  bg:         '#f5f7f6',
  white:      '#ffffff',
};

/* ── Shared components ─────────────────────────────────────────────────────── */
function KPI({ label, value, sub, color = G.green, icon }) {
  return (
    <div style={{
      background: G.white,
      borderRadius: 14,
      padding: '20px 22px',
      borderTop: `4px solid ${color}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      flex: 1,
      minWidth: 150,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 12, color: G.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          {label}
        </div>
        {icon && <span style={{ fontSize: 18, opacity: 0.35 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: G.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: G.textMuted, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function SectionHead({ children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      margin: '32px 0 16px', paddingBottom: 10,
      borderBottom: `2px solid ${G.border}`,
    }}>
      <div style={{ width: 4, height: 18, background: G.green, borderRadius: 2 }} />
      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: G.green, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {children}
      </h3>
    </div>
  );
}

function Bar({ label, value, max, color = G.green, suffix = '' }) {
  const pctVal = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5, color: G.text }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color: G.textMuted, fontWeight: 700 }}>{num(value)}{suffix}</span>
      </div>
      <div style={{ background: G.bg, borderRadius: 99, height: 7, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pctVal}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          style={{ background: color, height: '100%', borderRadius: 99 }}
        />
      </div>
    </div>
  );
}

function Chip({ children, color = G.green, bg }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 11px',
      borderRadius: 99,
      fontSize: 12,
      fontWeight: 700,
      background: bg || `${color}18`,
      color,
    }}>
      {children}
    </span>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: G.textMuted, fontSize: 14 }}>
      <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.3 }}>📭</div>
      {message}
    </div>
  );
}

/* ── Algorithm Compare Tool ────────────────────────────────────────────────── */
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
    ['recieve','receive'],['seperate','separate'],['definately','definitely'],
    ['kumosta','kumusta'],['salamats','salamat'],['beleive','believe'],
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <input
          value={source}
          onChange={e => setSource(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && compare()}
          placeholder="Misspelled word (e.g. recieve)"
          style={{ flex: 1, minWidth: 160, marginBottom: 0 }}
        />
        <input
          value={target}
          onChange={e => setTarget(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && compare()}
          placeholder="Correct word (e.g. receive)"
          style={{ flex: 1, minWidth: 160, marginBottom: 0 }}
        />
        <button
          onClick={compare}
          disabled={loading || !source.trim() || !target.trim()}
          style={{ minWidth: 120, height: 50 }}
        >
          {loading ? 'Comparing…' : 'Compare ↗'}
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {samples.map(([a, b], i) => (
          <button
            key={i}
            onClick={() => { setSource(a); setTarget(b); setResult(null); }}
            style={{ background: G.bg, color: G.textMid, fontSize: 12, padding: '5px 12px', minWidth: 'auto', height: 'auto', border: `1px solid ${G.border}` }}
          >
            {a} → {b}
          </button>
        ))}
      </div>

      {error && <p style={{ color: G.red, fontSize: 13, margin: '8px 0' }}>{error}</p>}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              {/* Levenshtein */}
              <div style={{ background: G.greenLight, borderRadius: 12, padding: 18, border: `1px solid ${G.greenMid}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: G.green, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Adapted Levenshtein</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: G.text }}>{dec(result.levenshtein_distance, 2)}</div>
                <div style={{ fontSize: 12, color: G.textMuted, marginBottom: 10 }}>edit distance</div>
                <div style={{ fontSize: 13, color: G.textMid }}>Normalized: <strong>{dec(result.levenshtein_normalized, 4)}</strong></div>
                {result.edit_breakdown && (
                  <div style={{ marginTop: 10, fontSize: 12, color: G.textMid, lineHeight: 1.7 }}>
                    <div>Sub: <strong>{result.edit_breakdown.substitutions}</strong> &nbsp; Ins: <strong>{result.edit_breakdown.insertions}</strong> &nbsp; Del: <strong>{result.edit_breakdown.deletions}</strong></div>
                  </div>
                )}
                <div style={{ marginTop: 10 }}>
                  <Chip color={result.lev_accepts ? G.green : G.orange} bg={result.lev_accepts ? G.greenLight : G.orangeLight}>
                    {result.lev_accepts ? '✓ Accepts' : '✗ Rejects'}
                  </Chip>
                </div>
              </div>

              {/* Jaro-Winkler */}
              <div style={{ background: G.purpleLight, borderRadius: 12, padding: 18, border: '1px solid #e1d5f5' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: G.purple, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Jaro-Winkler</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: G.text }}>{dec(result.jaro_winkler_similarity, 4)}</div>
                <div style={{ fontSize: 12, color: G.textMuted, marginBottom: 10 }}>similarity score</div>
                <div style={{ fontSize: 13, color: G.textMid }}>Jaro: <strong>{dec(result.jaro_similarity, 4)}</strong></div>
                <div style={{ fontSize: 13, color: G.textMid }}>Distance: <strong>{dec(result.jaro_winkler_distance, 4)}</strong></div>
                <div style={{ marginTop: 10 }}>
                  <Chip color={result.jw_accepts ? G.purple : G.orange} bg={result.jw_accepts ? G.purpleLight : G.orangeLight}>
                    {result.jw_accepts ? '✓ Accepts' : '✗ Rejects'}
                  </Chip>
                </div>
              </div>

              {/* Verdict */}
              <div style={{
                background: result.agreement ? G.greenLight : G.goldLight,
                borderRadius: 12, padding: 18,
                border: `1px solid ${result.agreement ? G.greenMid : '#ffe58a'}`,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Verdict</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: result.agreement ? G.green : G.orange, marginBottom: 12 }}>
                  {result.agreement ? '✓ Algorithms agree' : '⚠ Algorithms disagree'}
                </div>
                <div style={{ fontSize: 12, color: G.textMid, marginBottom: 8 }}>Preferred algorithm:</div>
                <Chip color={G.white} bg={G.green}>{result.preferred_algorithm}</Chip>
                <div style={{ marginTop: 10, fontSize: 12, color: G.textMuted, lineHeight: 1.6 }}>
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

/* ── Main page ─────────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'overview',   label: 'Overview' },
  { id: 'algorithm',  label: 'Algorithm' },
  { id: 'users',      label: 'Users' },
  { id: 'misspelled', label: 'Top Errors' },
  { id: 'compare',    label: 'Live Compare' },
];

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
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 20px 64px', fontFamily: "'Inter','Segoe UI',Roboto,sans-serif" }}>

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
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: G.text }}>Data Reports</h1>
          <p style={{ margin: '5px 0 0', fontSize: 14, color: G.textMuted }}>
            System-wide spell check statistics and algorithm comparison
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/admin/users"        style={{ color: G.green, fontWeight: 600, fontSize: 14 }}>Users</Link>
          <Link to="/admin/messages"     style={{ color: G.green, fontWeight: 600, fontSize: 14 }}>Messages</Link>
          <Link to="/admin/dictionary/add" style={{ color: G.green, fontWeight: 600, fontSize: 14 }}>Dictionary</Link>
          <button
            onClick={fetchData}
            style={{ minWidth: 'auto', height: 36, padding: '0 16px', fontSize: 13, background: G.greenLight, color: G.green, border: `1px solid ${G.greenMid}` }}
          >
            ↻ Refresh
          </button>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex', gap: 4, flexWrap: 'wrap',
        background: G.bg, borderRadius: 12, padding: 4,
        marginBottom: 28, border: `1px solid ${G.border}`,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, minWidth: 80,
              height: 38, padding: '0 14px', fontSize: 13, fontWeight: 600,
              background: tab === t.id ? G.white : 'transparent',
              color: tab === t.id ? G.green : G.textMuted,
              border: tab === t.id ? `1px solid ${G.border}` : '1px solid transparent',
              borderRadius: 9,
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Error state ── */}
      {error && (
        <div style={{ padding: 14, background: G.redLight, color: G.red, borderRadius: 10, marginBottom: 20, fontSize: 14, border: `1px solid #f5c6cb` }}>
          {error}
        </div>
      )}

      {/* ── Loading state ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: G.textMuted }}>
          <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.3 }}>⏳</div>
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

            {/* ══ OVERVIEW ══════════════════════════════════════════════════ */}
            {tab === 'overview' && (
              <div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
                  <KPI label="Registered Users"   value={num(regUsers)}           sub="total accounts"          color={G.blue}   icon="👤" />
                  <KPI label="Spell Check Sessions" value={num(ov.total_checks)}  sub="times checker was run"   color={G.green}  icon="✔" />
                  <KPI label="Words Analyzed"     value={num(ov.total_words)}     sub="total words processed"   color={G.purple} icon="📝" />
                  <KPI label="Unique Users"        value={num(ov.unique_users)}   sub="users with logged checks" color={G.orange} icon="🧑" />
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
                  <KPI label="Errors Found"        value={num(ov.total_misspelled)} sub="misspelled words"         color={G.red}    icon="✗" />
                  <KPI label="Suggestions Given"   value={num(ov.total_suggested)}  sub="words with suggestions"   color={G.green}  icon="💡" />
                  <KPI label="Avg Correction Rate" value={pct(ov.avg_correction_rate)} sub="words needing correction" color={G.orange} icon="%" />
                  <KPI label="Avg Word Error Rate" value={pct(ov.avg_wer)}          sub="WER across all sessions"  color={G.red}    icon="📉" />
                </div>

                {/* Word classification bar chart */}
                <SectionHead>Word classification breakdown</SectionHead>
                <div style={{ background: G.white, borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${G.border}`, marginBottom: 24 }}>
                  {(ov.total_words ?? 0) === 0 ? (
                    <EmptyState message="Run some spell checks to generate breakdown data." />
                  ) : (
                    <>
                      <Bar label="Correct words"    value={ov.total_correct}    max={ov.total_words} color={G.green} />
                      <Bar label="Suggested words"  value={ov.total_suggested}  max={ov.total_words} color={G.orange} />
                      <Bar label="Misspelled words" value={ov.total_misspelled} max={ov.total_words} color={G.red} />
                      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${G.border}`, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: G.textMuted }}>
                        <span><span style={{ color: G.green, fontWeight: 700 }}>■</span> Correct: {pct((ov.total_correct ?? 0) / (ov.total_words ?? 1))}</span>
                        <span><span style={{ color: G.orange, fontWeight: 700 }}>■</span> Suggested: {pct((ov.total_suggested ?? 0) / (ov.total_words ?? 1))}</span>
                        <span><span style={{ color: G.red, fontWeight: 700 }}>■</span> Misspelled: {pct((ov.total_misspelled ?? 0) / (ov.total_words ?? 1))}</span>
                      </div>
                    </>
                  )}
                </div>

                <SectionHead>Daily activity — last 30 days</SectionHead>
                {dailyTrend.length === 0 ? (
                  <EmptyState message="No daily activity yet. Run the spell checker to generate trend data." />
                ) : (
                  <div style={{ overflowX: 'auto', background: G.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${G.border}` }}>
                    <table style={{ marginTop: 0 }}>
                      <thead>
                        <tr style={{ background: G.bg }}>
                          <th style={{ color: G.green, padding: '12px 16px', textAlign: 'left', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                          <th style={{ color: G.green, padding: '12px 16px', textAlign: 'right', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Checks</th>
                          <th style={{ color: G.green, padding: '12px 16px', textAlign: 'right', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Errors</th>
                          <th style={{ color: G.green, padding: '12px 16px', textAlign: 'right', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Correction Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyTrend.map((row, i) => (
                          <tr key={i} style={{ borderTop: `1px solid ${G.border}` }}>
                            <td style={{ padding: '11px 16px', fontWeight: 600, color: G.text, fontSize: 14 }}>{row.date}</td>
                            <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: 14 }}>{num(row.checks)}</td>
                            <td style={{ padding: '11px 16px', textAlign: 'right', color: G.red, fontWeight: 700, fontSize: 14 }}>{num(row.misspelled)}</td>
                            <td style={{ padding: '11px 16px', textAlign: 'right', fontSize: 14 }}>
                              <Chip color={G.green}>{pct(row.avg_correction_rate)}</Chip>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ══ ALGORITHM ═════════════════════════════════════════════════ */}
            {tab === 'algorithm' && (
              <div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
                  <KPI label="Avg Levenshtein Distance"    value={dec(algo.avg_lev_distance, 3)}  sub="lower = closer match"      color={G.green}  icon="📐" />
                  <KPI label="Avg Jaro-Winkler Similarity" value={dec(algo.avg_jw_similarity, 4)} sub="higher = more similar"     color={G.purple} icon="🔗" />
                  <KPI label="Algorithm Agreements"        value={num(algo.agreements)}           sub={`of ${num(algo.total)} word pairs`} color={G.blue} icon="✓" />
                  <KPI label="Lev Preferred Rate"          value={pct(algo.lev_preferred_rate)}   sub="when algorithms disagree"  color={G.orange} icon="🏆" />
                </div>

                <SectionHead>Agreement rate</SectionHead>
                <div style={{ background: G.white, borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${G.border}`, marginBottom: 28 }}>
                  {(algo.total ?? 0) === 0 ? (
                    <EmptyState message="No algorithm data yet. Use the spell checker to generate comparison data." />
                  ) : (
                    <>
                      <Bar label="Both algorithms agree"     value={algo.agreements}              max={algo.total} color={G.green} />
                      <Bar label="Algorithms disagree"       value={(algo.total - algo.agreements)} max={algo.total} color={G.red} />
                      <div style={{ marginTop: 14, fontSize: 13, color: G.textMuted }}>
                        Agreement rate: <strong style={{ color: G.green }}>{pct(algo.agreements / algo.total)}</strong> across {num(algo.total)} word pairs
                      </div>
                    </>
                  )}
                </div>

                <SectionHead>Algorithm guide</SectionHead>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
                  {[
                    {
                      title: 'Adapted Levenshtein',
                      color: G.green, bg: G.greenLight, border: G.greenMid,
                      points: [
                        'Counts minimum edits: insert, delete, substitute',
                        'Distance 0 = identical; higher = more different',
                        'Accepts candidates with distance ≤ 3',
                        'Best for longer words (6+ characters)',
                        'Weighted for Filipino phonetic patterns',
                      ],
                    },
                    {
                      title: 'Jaro-Winkler',
                      color: G.purple, bg: G.purpleLight, border: '#e1d5f5',
                      points: [
                        'Measures character overlap and transpositions',
                        'Score 1.0 = identical; 0.0 = completely different',
                        'Accepts candidates with similarity ≥ 0.75',
                        'Best for short words (≤ 5 characters)',
                        'Bonus weight for matching prefixes',
                      ],
                    },
                    {
                      title: 'When they disagree',
                      color: G.orange, bg: G.orangeLight, border: '#ffcc80',
                      points: [
                        'Short words → prefer Jaro-Winkler',
                        'Long words → prefer Levenshtein',
                        'Transpositions → Jaro-Winkler handles better',
                        'Missing/extra letters → Levenshtein handles better',
                        'Using both together raises overall accuracy',
                      ],
                    },
                  ].map((card, i) => (
                    <div key={i} style={{ background: card.bg, borderRadius: 14, padding: 20, border: `1px solid ${card.border}` }}>
                      <div style={{ fontWeight: 800, color: card.color, marginBottom: 12, fontSize: 14 }}>{card.title}</div>
                      <ul style={{ margin: 0, paddingLeft: 16, color: G.textMid, fontSize: 13, lineHeight: 1.8 }}>
                        {card.points.map((p, j) => <li key={j}>{p}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ USERS ═════════════════════════════════════════════════════ */}
            {tab === 'users' && (
              <div>
                <SectionHead>Registered user activity</SectionHead>
                {users.length === 0 ? (
                  <EmptyState message="No user activity logged yet. Users must run the spell checker for records to appear here." />
                ) : (
                  <div style={{ overflowX: 'auto', background: G.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${G.border}` }}>
                    <table style={{ marginTop: 0 }}>
                      <thead>
                        <tr style={{ background: G.bg }}>
                          {['#', 'Email', 'Sessions', 'Words', 'Errors', 'Avg Correction', 'Avg WER', 'Last active'].map((h, i) => (
                            <th key={i} style={{ color: G.green, padding: '12px 14px', textAlign: i > 1 ? 'right' : 'left', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u, i) => (
                          <motion.tr
                            key={i}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            style={{ borderTop: `1px solid ${G.border}` }}
                          >
                            <td style={{ padding: '11px 14px', color: G.textMuted, fontSize: 13 }}>{i + 1}</td>
                            <td style={{ padding: '11px 14px', fontWeight: 600, color: G.text, fontSize: 14 }}>{u.user_email}</td>
                            <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 14 }}>{num(u.total_checks)}</td>
                            <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 14 }}>{num(u.total_words)}</td>
                            <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, color: G.red, fontSize: 14 }}>{num(u.total_misspelled)}</td>
                            <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 14 }}><Chip color={G.green}>{pct(u.avg_correction_rate)}</Chip></td>
                            <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 14 }}><Chip color={G.red} bg={G.redLight}>{pct(u.avg_wer)}</Chip></td>
                            <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 12, color: G.textMuted, whiteSpace: 'nowrap' }}>{date(u.last_active)}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ══ TOP ERRORS ════════════════════════════════════════════════ */}
            {tab === 'misspelled' && (
              <div>
                <SectionHead>Most frequently misspelled words</SectionHead>
                {topMisspelled.length === 0 ? (
                  <EmptyState message="No misspelled word data yet." />
                ) : (
                  <>
                    {/* Bar chart of top 10 */}
                    <div style={{ background: G.white, borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${G.border}`, marginBottom: 20 }}>
                      <div style={{ fontSize: 12, color: G.textMuted, marginBottom: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Frequency — top {Math.min(topMisspelled.length, 10)} words
                      </div>
                      {topMisspelled.slice(0, 10).map((row, i) => (
                        <Bar
                          key={i}
                          label={row.misspelled_word}
                          value={row.frequency}
                          max={topMisspelled[0]?.frequency ?? 1}
                          color={i === 0 ? G.red : i < 3 ? G.orange : G.green}
                        />
                      ))}
                    </div>

                    {/* Full table */}
                    <div style={{ overflowX: 'auto', background: G.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${G.border}` }}>
                      <table style={{ marginTop: 0 }}>
                        <thead>
                          <tr style={{ background: G.bg }}>
                            {['#', 'Misspelled word', 'Times found', 'Avg Levenshtein dist.', 'Avg Jaro-Winkler sim.', 'Avg confidence'].map((h, i) => (
                              <th key={i} style={{ color: G.green, padding: '12px 14px', textAlign: i > 1 ? 'right' : 'left', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {topMisspelled.map((row, i) => (
                            <motion.tr
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.03 }}
                              style={{ borderTop: `1px solid ${G.border}` }}
                            >
                              <td style={{ padding: '11px 14px', color: G.textMuted, fontSize: 13 }}>{i + 1}</td>
                              <td style={{ padding: '11px 14px', fontWeight: 800, color: G.red, fontSize: 14 }}>{row.misspelled_word}</td>
                              <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, fontSize: 14 }}>{num(row.frequency)}</td>
                              <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 14 }}>
                                <Chip color={G.green}>{dec(row.avg_lev_distance, 3)}</Chip>
                              </td>
                              <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 14 }}>
                                <Chip
                                  color={Number(row.avg_jw_similarity) >= 0.75 ? G.green : G.orange}
                                  bg={Number(row.avg_jw_similarity) >= 0.75 ? G.greenLight : G.orangeLight}
                                >
                                  {dec(row.avg_jw_similarity, 4)}
                                </Chip>
                              </td>
                              <td style={{ padding: '11px 14px', textAlign: 'right', fontSize: 14 }}>
                                {row.avg_confidence != null
                                  ? <Chip color={G.blue} bg={G.blueLight}>{dec(row.avg_confidence, 3)}</Chip>
                                  : <span style={{ color: G.textMuted }}>—</span>}
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

            {/* ══ LIVE COMPARE ══════════════════════════════════════════════ */}
            {tab === 'compare' && (
              <div>
                <SectionHead>Live algorithm comparison</SectionHead>
                <p style={{ fontSize: 14, color: G.textMuted, margin: '0 0 20px' }}>
                  Enter any word pair to compare Adapted Levenshtein vs Jaro-Winkler side by side. Press Enter or click Compare.
                </p>
                <div style={{ background: G.white, borderRadius: 14, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: `1px solid ${G.border}` }}>
                  <CompareTool />
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
