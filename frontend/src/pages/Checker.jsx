import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || '';

const G = {
  green:      '#00703c',
  greenLight: '#e8f5ee',
  greenMid:   '#c8e6d6',
  red:        '#dc3545',
  redLight:   '#fdf0f1',
  orange:     '#e65100',
  orangeLight:'#fff3e0',
  purple:     '#6f42c1',
  purpleLight:'#f3f0fb',
  text:       '#1a2e24',
  textMid:    '#4a5c52',
  textMuted:  '#8a9e94',
  border:     '#e0ebe4',
  bg:         '#f5f7f6',
  white:      '#ffffff',
};

/* ── helpers ── */
function adjustCaseToMatchOriginal(suggestion, originalRaw) {
  if (!suggestion || !originalRaw) return suggestion;
  const s = String(suggestion), o = originalRaw;
  if (o === o.toUpperCase() && /[\p{L}]/u.test(o)) return s.toUpperCase();
  if (/^\p{Lu}/u.test(o)) return s.charAt(0).toUpperCase() + s.slice(1);
  return s;
}

function normalizeCandidateWord(candidate) {
  if (typeof candidate === 'string') {
    const w = candidate.trim();
    return /^\[object object\]$/i.test(w) ? '' : w;
  }
  if (candidate && typeof candidate === 'object') {
    for (const key of ['word', 'lexeme', 'replacement']) {
      if (typeof candidate[key] === 'string') {
        const w = candidate[key].trim();
        return /^\[object object\]$/i.test(w) ? '' : w;
      }
    }
  }
  return '';
}

function getWordChunkBounds(fullText, targetWordIndex) {
  const parts = fullText.split(/(\s+)/u);
  let wi = 0, pos = 0;
  for (const part of parts) {
    const len = part.length;
    if (part.trim() !== '') {
      if (wi === targetWordIndex) return { start: pos, end: pos + len, raw: part };
      wi++;
    }
    pos += len;
  }
  return null;
}

function grammarIssueForIndex(grammarIssues, idx) {
  if (!grammarIssues?.length) return null;
  return grammarIssues.find(g => idx >= g.start_word_index && idx <= g.end_word_index) ?? null;
}

function highlightStatus(res, idx, grammarIssues) {
  const g = grammarIssueForIndex(grammarIssues, idx);
  if (g && (res.status === 'correct' || res.status === 'suggested')) return 'grammar';
  return res.status || 'misspelled';
}

function statusColor(status) {
  if (status === 'correct')   return '#2e7d32';
  if (status === 'suggested') return G.orange;
  if (status === 'grammar')   return G.purple;
  return G.red;
}

function statusLabel(status) {
  if (!status) return 'Incorrect';
  const s = status.toLowerCase();
  if (s === 'correct')   return 'Correct';
  if (s === 'suggested') return 'Suggested';
  if (s === 'grammar')   return 'Grammar';
  return 'Incorrect';
}

function StatPill({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '10px 18px', borderRadius: 10,
      background: G.white, border: `1px solid ${G.border}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minWidth: 72,
    }}>
      <span style={{ fontSize: 20, fontWeight: 800, color: color || G.text }}>{value}</span>
      <span style={{ fontSize: 11, color: G.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{label}</span>
    </div>
  );
}

export default function Checker() {
  const MAX_INPUT_WORDS = 500;
  const [text,              setText]              = useState('');
  const [results,           setResults]           = useState([]);
  const [analytics,         setAnalytics]         = useState(null);
  const [language,          setLanguage]          = useState(null);
  const [latencyMs,         setLatencyMs]         = useState(null);
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState(null);
  const [selectedWordIndex, setSelectedWordIndex] = useState(null);
  const [activeSuggestion,  setActiveSuggestion]  = useState(null);
  const [grammarIssues,     setGrammarIssues]     = useState([]);
  const textareaRef = useRef(null);
  const mirrorRef   = useRef(null);
  const navigate    = useNavigate();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const pncUser    = localStorage.getItem('pnc_user');
    if (!isLoggedIn || !pncUser) navigate('/login', { replace: true });
  }, [navigate]);

  const syncScroll = () => {
    if (textareaRef.current && mirrorRef.current) {
      mirrorRef.current.scrollTop  = textareaRef.current.scrollTop;
      mirrorRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const chunks      = text.split(/(\s+)/u);
  const wordCount   = chunks.filter(c => c.trim() !== '').length;
  const isAtLimit   = wordCount >= MAX_INPUT_WORDS;
  const canHighlight = results.length > 0 && results.length === wordCount;

  let wordIndex = 0;
  const mirrorContent = canHighlight
    ? chunks.map((chunk, i) => {
        if (chunk.trim() === '') return chunk;
        const idx    = wordIndex++;
        const res    = results[idx];
        const status = highlightStatus(res || {}, idx, grammarIssues);
        return <span key={i} className={`word-status-inline status-${status}`}>{chunk}</span>;
      })
    : [text];

  const runAnalysis = async (textOverride) => {
    const source  = typeof textOverride === 'string' ? textOverride : text;
    const trimmed = String(source).trim();
    if (!trimmed) {
      setError('Please enter some text first.');
      setResults([]); setGrammarIssues([]); setAnalytics(null);
      setLanguage(null); setLatencyMs(null);
      return;
    }
    setError(null); setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Request failed: ${res.status}`);
      }
      const data = await res.json();
      setResults(data.words || []);
      setGrammarIssues(data.grammar_issues || []);
      setAnalytics(data.analytics || null);
      setLanguage(data.language || null);
      setLatencyMs(data.processing_time_ms ?? null);
    } catch (err) {
      setError(err.message || 'Analysis failed.');
      setResults([]); setGrammarIssues([]); setAnalytics(null);
      setLanguage(null); setLatencyMs(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTextareaClick = (e) => {
    if (results.length === 0) return;
    const cursor = e.target.selectionStart;
    const words  = text.split(/(\s+)/u);
    let currentPos = 0, wordIdx = 0;
    for (const w of words) {
      if (w.trim() === '') { currentPos += w.length; continue; }
      if (cursor >= currentPos && cursor < currentPos + w.length) {
        const wordResult = results[wordIdx];
        if (wordResult) {
          setSelectedWordIndex(wordIdx);
          const g         = grammarIssueForIndex(grammarIssues, wordIdx);
          const spellSugs = (wordResult.suggestions || [])
            .map(s => {
              const word = normalizeCandidateWord(s.word);
              if (!word) return null;
              return { word, dist: s.distance ?? s.dist, grammar: false };
            }).filter(Boolean);
          if (g) {
            const rw = normalizeCandidateWord(g.replacement);
            if (rw) spellSugs.unshift({ word: rw, dist: 0, grammar: true });
          }
          if (spellSugs.length > 0) {
            const rect = textareaRef.current.getBoundingClientRect();
            setActiveSuggestion({
              wordIndex: wordIdx,
              start: currentPos, end: currentPos + w.length, raw: w,
              phraseSpan: wordResult.phrase_span ?? 1,
              suggestions: spellSugs,
              x: Math.min(e.clientX - rect.left, rect.width - 220),
              y: e.clientY - rect.top + 14,
            });
          } else { setActiveSuggestion(null); }
          return;
        }
      }
      currentPos += w.length; wordIdx++;
    }
    setActiveSuggestion(null);
  };

  const applySuggestion = async (wordIdx, replacement, originalRaw, phraseSpan = 1) => {
    if (wordIdx == null || wordIdx < 0) return;
    const replacementText = normalizeCandidateWord(replacement);
    if (!replacementText) return;
    const span = Number(phraseSpan) > 1 ? Number(phraseSpan) : 1;
    let bounds;
    if (span > 1) {
      const first = getWordChunkBounds(text, wordIdx);
      const last  = getWordChunkBounds(text, wordIdx + span - 1);
      if (!first || !last) return;
      bounds = { start: first.start, end: last.end, raw: text.slice(first.start, last.end) };
    } else {
      bounds = getWordChunkBounds(text, wordIdx);
    }
    if (!bounds) return;
    const cased   = adjustCaseToMatchOriginal(replacementText, originalRaw ?? bounds.raw);
    const newText = text.slice(0, bounds.start) + cased + text.slice(bounds.end);
    setText(newText);
    setActiveSuggestion(null);
    setSelectedWordIndex(null);
    const lex = String(replacementText).toLowerCase().trim().slice(0, 191);
    if (lex.length >= 2) {
      void fetch(`${API_BASE}/api/vocabulary/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ lexeme: lex }),
      }).catch(() => {});
    }
    await runAnalysis(newText);
  };

  const clearAll = () => {
    setText(''); setResults([]); setGrammarIssues([]);
    setAnalytics(null); setLanguage(null); setError(null);
    setSelectedWordIndex(null); setActiveSuggestion(null); setLatencyMs(null);
  };

  const downloadCSV = () => {
    if (results.length === 0) { alert('Run analysis first.'); return; }
    let csv = 'Word,Status,Suggestions\n';
    results.forEach(r => {
      const sugs = (r.suggestions || [])
        .map(s => `${s.word}[d:${s.distance ?? s.dist ?? ''}]`).join(' | ');
      csv += `"${r.word}","${statusLabel(r.status)}","${sugs}"\n`;
    });
    const url  = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url; link.download = `Taglish_Analysis_${Date.now()}.csv`;
    document.body.appendChild(link); link.click();
    document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const sc = analytics?.status_counts || {};

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 64px', fontFamily: "'Inter','Segoe UI',Roboto,sans-serif" }}>

      {/* ── Page header ── */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 12,
        borderBottom: `4px solid ${G.green}`,
        paddingBottom: 16, marginBottom: 28,
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: G.green, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            PNC Spell Checker
          </div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: G.text }}>Taglish Spell Checker</h1>
          <p style={{ margin: '5px 0 0', fontSize: 14, color: G.textMuted }}>
            Levenshtein + Jaro-Winkler — English &amp; Filipino
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={downloadCSV}
            disabled={results.length === 0}
            style={{
              minWidth: 'auto', height: 36, padding: '0 16px', fontSize: 13,
              background: results.length > 0 ? G.greenLight : G.bg,
              color: results.length > 0 ? G.green : G.textMuted,
              border: `1px solid ${results.length > 0 ? G.greenMid : G.border}`,
              borderRadius: 8, cursor: results.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            ↓ Export CSV
          </button>
          <button
            onClick={() => { localStorage.removeItem('isLoggedIn'); localStorage.removeItem('pnc_user'); navigate('/login'); }}
            style={{ minWidth: 'auto', height: 36, padding: '0 16px', fontSize: 13, background: G.redLight, color: G.red, border: '1px solid #f5c6cb', borderRadius: 8, cursor: 'pointer' }}
          >
            Log out
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ── Left: input + results ── */}
        <div style={{ flex: '2', minWidth: 0 }}>

          {/* Input card */}
          <div style={{
            background: G.white, borderRadius: 14, padding: 24,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${G.border}`,
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${G.border}` }}>
              <div style={{ width: 4, height: 18, background: G.green, borderRadius: 2 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: G.green, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Input text
              </span>
            </div>

            {/* Highlight wrapper */}
            <div className={`textarea-highlight-wrap${canHighlight ? ' has-highlight' : ''}`} style={{ marginBottom: 12 }}>
              <div ref={mirrorRef} className="textarea-mirror" aria-hidden="true">
                {canHighlight ? mirrorContent : text || '\u00A0'}
              </div>
              <textarea
                ref={textareaRef}
                rows={7}
                value={text}
                onChange={e => {
                  const v     = e.target.value;
                  const words = v.trim() === '' ? [] : v.trim().split(/\s+/u);
                  if (words.length > MAX_INPUT_WORDS) return;
                  setText(v);
                  setActiveSuggestion(null);
                  setSelectedWordIndex(null);
                }}
                onScroll={syncScroll}
                onClick={handleTextareaClick}
                className="textarea-with-highlight"
                placeholder="Type or paste Taglish text here, then click Run Analysis…"
              />
            </div>

            {/* Legend + counter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {[
                  { dot: '#4caf50', label: 'Correct' },
                  { dot: G.orange,  label: 'Suggested' },
                  { dot: G.purple,  label: 'Grammar' },
                  { dot: G.red,     label: 'Error' },
                ].map((l, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: G.textMid }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: l.dot, display: 'inline-block' }} />
                    {l.label}
                  </span>
                ))}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: isAtLimit ? G.red : G.textMuted }}>
                {wordCount} / {MAX_INPUT_WORDS} words
              </span>
            </div>

            {/* Inline popup */}
            <div style={{ position: 'relative' }}>
              <AnimatePresence>
                {activeSuggestion && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 8 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    style={{
                      position: 'absolute',
                      left: activeSuggestion.x, top: -60,
                      background: G.white,
                      border: `1.5px solid ${G.greenMid}`,
                      borderRadius: 12, padding: 12,
                      zIndex: 1000,
                      boxShadow: '0 8px 28px rgba(0,0,0,0.14)',
                      minWidth: 220, maxWidth: 300,
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 800, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                      Suggestions
                    </div>
                    {activeSuggestion.suggestions.map((s, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ x: 4, backgroundColor: G.greenLight }}
                        onClick={() => void applySuggestion(activeSuggestion.wordIndex, s.word, activeSuggestion.raw, activeSuggestion.phraseSpan ?? 1)}
                        style={{
                          cursor: 'pointer', padding: '8px 10px',
                          borderRadius: 8, marginBottom: 4,
                          border: `1px solid ${G.border}`,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          transition: 'background 0.12s',
                        }}
                      >
                        <span style={{ fontWeight: 700, color: G.green, fontSize: 14 }}>{s.word}</span>
                        <span style={{ fontSize: 11, color: G.textMuted }}>
                          {s.grammar ? 'grammar fix' : `dist: ${s.dist}`}
                        </span>
                      </motion.div>
                    ))}
                    <button
                      onClick={() => setActiveSuggestion(null)}
                      style={{
                        width: '100%', marginTop: 8, height: 30, fontSize: 12,
                        background: G.bg, color: G.textMid,
                        border: `1px solid ${G.border}`, borderRadius: 7,
                        cursor: 'pointer', minWidth: 'auto',
                      }}
                    >
                      Close
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => void runAnalysis()}
                disabled={loading || !text.trim()}
                style={{
                  flex: 1, height: 46, fontSize: 15, fontWeight: 700,
                  background: loading || !text.trim() ? '#b0c4ba' : G.green,
                  color: G.white, border: 'none', borderRadius: 10,
                  cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
                  minWidth: 'auto',
                }}
              >
                {loading ? 'Analyzing…' : '▶ Run Analysis'}
              </motion.button>
              <button
                onClick={clearAll}
                style={{
                  height: 46, padding: '0 20px', fontSize: 14, fontWeight: 600,
                  background: G.bg, color: G.textMid,
                  border: `1px solid ${G.border}`, borderRadius: 10,
                  cursor: 'pointer', minWidth: 'auto',
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ padding: '12px 16px', background: G.redLight, color: G.red, borderRadius: 10, marginBottom: 16, fontSize: 14, border: '1px solid #f5c6cb' }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grammar hints */}
          <AnimatePresence>
            {grammarIssues.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ background: G.purpleLight, borderRadius: 12, padding: '14px 18px', marginBottom: 16, border: '1px solid #d5c8f5' }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: G.purple, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Grammar hints ({grammarIssues.length})
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: G.textMid, lineHeight: 1.9 }}>
                  {grammarIssues.map((g, i) => (
                    <li key={i}>
                      {g.message}{' '}
                      <code style={{ background: '#e8dcf7', padding: '1px 7px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>{g.replacement}</code>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analytics */}
          <AnimatePresence>
            {analytics && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{
                  background: G.white, borderRadius: 14, padding: '18px 20px',
                  border: `1px solid ${G.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                  marginBottom: 20,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: G.green, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                    Analysis summary
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                    <StatPill label="Total"     value={analytics.total_words} />
                    <StatPill label="Correct"   value={sc.correct    ?? 0} color="#2e7d32" />
                    <StatPill label="Suggested" value={sc.suggested  ?? 0} color={G.orange} />
                    <StatPill label="Error"     value={sc.misspelled ?? 0} color={G.red} />
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: G.textMid, paddingTop: 10, borderTop: `1px solid ${G.border}` }}>
                    <span>Language: <strong style={{ color: G.text }}>{language || analytics.language || '—'}</strong></span>
                    <span>Correction rate: <strong style={{ color: G.text }}>{(analytics.correction_rate * 100).toFixed(1)}%</strong></span>
                    {typeof analytics.word_error_rate === 'number' && (
                      <span>WER: <strong style={{ color: G.text }}>{(analytics.word_error_rate * 100).toFixed(1)}%</strong></span>
                    )}
                    {latencyMs != null && (
                      <span>Latency: <strong style={{ color: G.text }}>{latencyMs} ms</strong></span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results table */}
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div style={{ fontSize: 12, color: G.textMuted, marginBottom: 8 }}>
                  Click any word row to see its suggestions in the panel →
                </div>
                <div style={{
                  background: G.white, borderRadius: 14,
                  border: `1px solid ${G.border}`, boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                  overflowX: 'auto',
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 0 }}>
                    <thead>
                      <tr style={{ background: G.bg }}>
                        {['#', 'Word', 'Status', 'Top Suggestion', 'Distance'].map((h, i) => (
                          <th key={i} style={{
                            padding: '12px 14px', textAlign: 'left',
                            fontSize: 12, fontWeight: 700, color: G.green,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            borderBottom: `2px solid ${G.border}`, whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {results.map((res, i) => {
                          const disp       = highlightStatus(res, i, grammarIssues);
                          const topSug     = res.suggestions?.[0];
                          const isSelected = selectedWordIndex === i;
                          return (
                            <motion.tr
                              key={i}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.02 }}
                              onClick={() => setSelectedWordIndex(isSelected ? null : i)}
                              style={{
                                borderTop: `1px solid ${G.border}`,
                                cursor: 'pointer',
                                background: isSelected ? G.greenLight : G.white,
                                transition: 'background 0.12s',
                              }}
                            >
                              <td style={{ padding: '11px 14px', color: G.textMuted, fontSize: 13 }}>{i + 1}</td>
                              <td style={{ padding: '11px 14px', fontWeight: 700, color: G.text, fontSize: 14 }}>{res.word}</td>
                              <td style={{ padding: '11px 14px' }}>
                                <span style={{
                                  display: 'inline-block', padding: '3px 10px', borderRadius: 99,
                                  fontSize: 12, fontWeight: 700,
                                  background: `${statusColor(disp)}18`,
                                  color: statusColor(disp),
                                }}>
                                  {statusLabel(disp)}
                                </span>
                              </td>
                              <td style={{ padding: '11px 14px', fontSize: 14, color: G.green, fontWeight: 600 }}>
                                {topSug ? topSug.word : <span style={{ color: G.textMuted }}>—</span>}
                              </td>
                              <td style={{ padding: '11px 14px', fontSize: 13, color: G.textMuted }}>
                                {topSug ? (topSug.distance ?? topSug.dist ?? '—') : '—'}
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Right sidebar ── */}
        <AnimatePresence>
          {selectedWordIndex != null && results[selectedWordIndex] && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              style={{
                width: 280, flexShrink: 0,
                background: G.white, borderRadius: 14,
                borderTop: `5px solid ${G.green}`,
                boxShadow: '0 8px 28px rgba(0,0,0,0.10)',
                padding: 20,
                position: 'sticky', top: 24,
                height: 'fit-content',
              }}
            >
              {(() => {
                const res  = results[selectedWordIndex];
                const disp = highlightStatus(res, selectedWordIndex, grammarIssues);
                const g    = grammarIssueForIndex(grammarIssues, selectedWordIndex);
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Selected word</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: G.text }}>{res.word}</div>
                      </div>
                      <button
                        onClick={() => setSelectedWordIndex(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: G.textMuted, fontSize: 20, padding: 0, minWidth: 'auto', height: 'auto', lineHeight: 1 }}
                      >×</button>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <span style={{
                        display: 'inline-block', padding: '4px 12px', borderRadius: 99,
                        fontSize: 13, fontWeight: 700,
                        background: `${statusColor(disp)}18`,
                        color: statusColor(disp),
                      }}>
                        {statusLabel(disp)}
                      </span>
                    </div>

                    {g && (
                      <div style={{ background: G.purpleLight, borderRadius: 10, padding: '12px 14px', marginBottom: 14, border: '1px solid #d5c8f5' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: G.purple, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Grammar</div>
                        <div style={{ fontSize: 13, color: G.textMid, marginBottom: 6 }}>{g.message}</div>
                        <code style={{ background: '#e8dcf7', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700, color: G.purple }}>{g.replacement}</code>
                      </div>
                    )}

                    {res.suggestions && res.suggestions.length > 0 ? (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                          Suggestions
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {res.suggestions.map((s, i) => (
                            <div key={i} style={{ background: G.bg, borderRadius: 10, padding: '10px 12px', border: `1px solid ${G.border}` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.error_breakdown ? 6 : 8 }}>
                                <span style={{ fontWeight: 700, color: G.green, fontSize: 15 }}>{s.word}</span>
                                <span style={{ fontSize: 11, color: G.textMuted }}>dist: {s.distance ?? s.dist ?? '—'}</span>
                              </div>
                              {s.error_breakdown && (
                                <div style={{ fontSize: 11, color: G.textMuted, marginBottom: 8 }}>
                                  sub {s.error_breakdown.substitutions} · ins {s.error_breakdown.insertions} · del {s.error_breakdown.deletions}
                                </div>
                              )}
                              <button
                                onClick={() => void applySuggestion(selectedWordIndex, s.word, res.word, res.phrase_span ?? 1)}
                                style={{
                                  width: '100%', height: 32, fontSize: 12, fontWeight: 700,
                                  background: G.green, color: G.white,
                                  border: 'none', borderRadius: 7,
                                  cursor: 'pointer', minWidth: 'auto',
                                }}
                              >
                                Replace
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: G.textMuted, textAlign: 'center', padding: '16px 0' }}>
                        {disp === 'correct' ? '✓ No corrections needed' : 'No suggestions available'}
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
