import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || '';

/* ────────────────────────────────────────────────────────────────────────
   Same design tokens as Landing.jsx. Worth lifting into a shared
   /src/theme.js and importing in both places once you have a moment —
   duplicated here only because this file was shared standalone.
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
  goldTint:   '#f7f1e2',
  plum:       '#6d5a8f',
  plumTint:   '#efebf5',
  red:        '#b3402f',
  redTint:    '#f7e9e5',
  hairline:   '#d7d9cd',
  white:      '#fffdf8',
};

const FONTS_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  .pnc-checker * { box-sizing: border-box; }
  .pnc-checker button:focus-visible,
  .pnc-checker textarea:focus-visible,
  .pnc-checker tr:focus-visible {
    outline: 2px solid ${T.forest};
    outline-offset: 2px;
  }
  .pnc-checker table { margin-top: 0; }
  .pnc-checker tbody tr:hover { background: ${T.forestTint}; }
  .pnc-btn-primary { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .pnc-btn-primary:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(18,58,41,0.25); }
  .pnc-btn-ghost { transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease; }
  .pnc-btn-ghost:not(:disabled):hover { border-color: ${T.forest} !important; }

  /* Overrides for the highlight-overlay classes used by the textarea mirror.
     These class names (textarea-highlight-wrap / textarea-mirror /
     textarea-with-highlight / word-status-inline) are assumed to live in
     your global stylesheet for positioning + font sync between the mirror
     and the real textarea. Only colors are overridden here — if your base
     CSS already sets background/border on these, share that file and I'll
     fold this in properly instead of layering on top of it. */
  .pnc-checker .word-status-inline.status-correct    { background: transparent; border-bottom: 2px solid ${T.forest}; }
  .pnc-checker .word-status-inline.status-suggested  { background: ${T.goldTint}; border-bottom: 2px solid ${T.gold}; }
  .pnc-checker .word-status-inline.status-grammar     { background: ${T.plumTint}; border-bottom: 2px solid ${T.plum}; }
  .pnc-checker .word-status-inline.status-misspelled,
  .pnc-checker .word-status-inline.status-incorrect   { background: ${T.redTint}; border-bottom: 2px solid ${T.red}; }

  /* Punctuation attached to a word (leading/trailing) is rendered plain —
     no status color, no underline — so only the letters of the word carry
     the correctness signal. */
  .pnc-checker .word-punct-inline { color: ${T.inkSoft}; background: transparent; border-bottom: none; }

  @media (prefers-reduced-motion: reduce) {
    .pnc-checker * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
  }
`;

/* ── helpers (unchanged logic) ── */
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

/* Splits a whitespace-delimited chunk into leading punctuation / a letter-
   or-number-bearing core / trailing punctuation, e.g. `"(hello)," ->
   { lead: "(", core: "hello", trail: ')","' }` — wait, no: trailing greedily
   grabs every non-letter run at the end, so `"(hello)," -> lead:"(",
   core:"hello", trail:")," `. Internal punctuation (apostrophes in
   "don't", hyphens in "e-mail") is left untouched since it isn't at the
   start or end of the chunk. Pure-punctuation chunks (e.g. "--", "...")
   come back with an empty core. */
function splitPunctuation(raw) {
  const m = raw.match(/^([\p{P}\p{S}]*)(.*?)([\p{P}\p{S}]*)$/u);
  if (!m) return { lead: '', core: raw, trail: '' };
  return { lead: m[1], core: m[2], trail: m[3] };
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
  if (status === 'correct')   return T.forestDeep;
  if (status === 'suggested') return T.gold;
  if (status === 'grammar')   return T.plum;
  return T.red;
}

function statusTint(status) {
  if (status === 'correct')   return T.forestTint;
  if (status === 'suggested') return T.goldTint;
  if (status === 'grammar')   return T.plumTint;
  return T.redTint;
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
      padding: '10px 20px', borderRadius: 8,
      background: T.white, border: `1px solid ${T.hairline}`, minWidth: 76,
    }}>
      <span style={{ fontFamily: "'Source Serif 4', serif", fontSize: 21, fontWeight: 700, color: color || T.ink }}>{value}</span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: T.inkFaint, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{label}</span>
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
        const { lead, core, trail } = splitPunctuation(chunk);

        // Pure-punctuation token (e.g. "--", "...") — nothing to grade.
        if (!core) return <span key={i} className="word-punct-inline">{chunk}</span>;

        return (
          <span key={i}>
            {lead  && <span className="word-punct-inline">{lead}</span>}
            <span className={`word-status-inline status-${status}`}>{core}</span>
            {trail && <span className="word-punct-inline">{trail}</span>}
          </span>
        );
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
          // If the click landed inside the leading/trailing punctuation of
          // this chunk rather than on its letters, there's nothing to
          // correct — don't pop a suggestion box over a comma.
          const { lead, core } = splitPunctuation(w);
          const offsetInChunk  = cursor - currentPos;
          const clickedPunctOnly = !core || offsetInChunk < lead.length || offsetInChunk >= lead.length + core.length;
          if (clickedPunctOnly) { setActiveSuggestion(null); setSelectedWordIndex(null); return; }

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

    // Replace only the letter-bearing core of the chunk so any leading/
    // trailing punctuation the user typed (e.g. the comma in "hello,") is
    // preserved instead of being clobbered by the replacement word.
    const { lead, core, trail } = splitPunctuation(bounds.raw);
    const cased = adjustCaseToMatchOriginal(replacementText, originalRaw ?? core ?? bounds.raw);
    const newCore = core ? cased : cased; // pure-punctuation chunks just get replaced outright
    const replacedChunk = core ? `${lead}${newCore}${trail}` : cased;
    const newText = text.slice(0, bounds.start) + replacedChunk + text.slice(bounds.end);
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
    <div className="pnc-checker" style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 64px', fontFamily: "'Inter', system-ui, sans-serif", color: T.ink, background: T.paper }}>
      <style>{FONTS_IMPORT}</style>

      {/* ── Page header ── */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 12,
        borderBottom: `1px solid ${T.hairline}`,
        paddingBottom: 18, marginBottom: 28,
      }}>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 500, color: T.forestDeep, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            PNC Spell Checker
          </div>
          <h1 style={{ margin: 0, fontFamily: "'Source Serif 4', serif", fontSize: '1.7rem', fontWeight: 700, color: T.ink }}>Taglish Spell Checker</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: T.inkSoft }}>
            Levenshtein + Jaro-Winkler — English &amp; Filipino
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={downloadCSV}
            disabled={results.length === 0}
            className="pnc-btn-ghost"
            style={{
              minWidth: 'auto', height: 36, padding: '0 16px', fontSize: 13, fontWeight: 500,
              background: T.white,
              color: results.length > 0 ? T.forestDeep : T.inkFaint,
              border: `1.5px solid ${T.hairline}`,
              borderRadius: 6, cursor: results.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            ↓ Export CSV
          </button>
          <button
            onClick={() => { localStorage.removeItem('isLoggedIn'); localStorage.removeItem('pnc_user'); navigate('/login'); }}
            className="pnc-btn-ghost"
            style={{ minWidth: 'auto', height: 36, padding: '0 16px', fontSize: 13, fontWeight: 500, background: T.redTint, color: T.red, border: `1.5px solid ${T.red}33`, borderRadius: 6, cursor: 'pointer' }}
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
            background: T.white, borderRadius: 8, padding: 24,
            border: `1px solid ${T.hairline}`,
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${T.hairline}` }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: T.forestDeep, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { dot: T.forest, label: 'Correct' },
                  { dot: T.gold,   label: 'Suggested' },
                  { dot: T.plum,   label: 'Grammar' },
                  { dot: T.red,    label: 'Error' },
                ].map((l, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.inkSoft }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.dot, display: 'inline-block' }} />
                    {l.label}
                  </span>
                ))}
              </div>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 500, color: isAtLimit ? T.red : T.inkFaint }}>
                {wordCount} / {MAX_INPUT_WORDS} words
              </span>
            </div>

            {/* Inline popup */}
            <div style={{ position: 'relative' }}>
              <AnimatePresence>
                {activeSuggestion && (
                  <motion.div
                    initial={{ scale: 0.96, opacity: 0, y: 6 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute',
                      left: activeSuggestion.x, top: -60,
                      background: T.white,
                      border: `1px solid ${T.hairline}`,
                      borderRadius: 8, padding: 12,
                      zIndex: 1000,
                      boxShadow: '0 10px 28px rgba(22,36,29,0.14)',
                      minWidth: 220, maxWidth: 300,
                    }}
                  >
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, color: T.inkFaint, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                      Suggestions
                    </div>
                    {activeSuggestion.suggestions.map((s, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ x: 3, backgroundColor: T.forestTint }}
                        onClick={() => void applySuggestion(activeSuggestion.wordIndex, s.word, activeSuggestion.raw, activeSuggestion.phraseSpan ?? 1)}
                        style={{
                          cursor: 'pointer', padding: '8px 10px',
                          borderRadius: 6, marginBottom: 4,
                          border: `1px solid ${T.hairline}`,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          transition: 'background 0.12s',
                        }}
                      >
                        <span style={{ fontWeight: 700, color: T.forestDeep, fontSize: 14 }}>{s.word}</span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.inkFaint }}>
                          {s.grammar ? 'grammar fix' : `dist: ${s.dist}`}
                        </span>
                      </motion.div>
                    ))}
                    <button
                      onClick={() => setActiveSuggestion(null)}
                      className="pnc-btn-ghost"
                      style={{
                        width: '100%', marginTop: 8, height: 30, fontSize: 12,
                        background: T.paperDim, color: T.inkSoft,
                        border: `1px solid ${T.hairline}`, borderRadius: 6,
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
              <button
                onClick={() => void runAnalysis()}
                disabled={loading || !text.trim()}
                className="pnc-btn-primary"
                style={{
                  flex: 1, height: 46, fontSize: 14.5, fontWeight: 700,
                  background: loading || !text.trim() ? T.inkFaint : T.forestDeep,
                  color: T.white, border: 'none', borderRadius: 6,
                  cursor: loading || !text.trim() ? 'not-allowed' : 'pointer',
                  minWidth: 'auto',
                }}
              >
                {loading ? 'Analyzing…' : 'Run analysis'}
              </button>
              <button
                onClick={clearAll}
                className="pnc-btn-ghost"
                style={{
                  height: 46, padding: '0 20px', fontSize: 14, fontWeight: 600,
                  background: T.paperDim, color: T.inkSoft,
                  border: `1px solid ${T.hairline}`, borderRadius: 6,
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
                style={{ padding: '12px 16px', background: T.redTint, color: T.red, borderRadius: 6, marginBottom: 16, fontSize: 14, border: `1px solid ${T.red}33` }}
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
                style={{ background: T.plumTint, borderRadius: 8, padding: '14px 18px', marginBottom: 16, border: `1px solid ${T.plum}33` }}
              >
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: T.plum, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Grammar hints ({grammarIssues.length})
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: T.inkSoft, lineHeight: 1.9 }}>
                  {grammarIssues.map((g, i) => (
                    <li key={i}>
                      {g.message}{' '}
                      <code style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#e3dcee', padding: '1px 7px', borderRadius: 4, fontSize: 12, fontWeight: 600, color: T.plum }}>{g.replacement}</code>
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
                  background: T.white, borderRadius: 8, padding: '18px 20px',
                  border: `1px solid ${T.hairline}`,
                  marginBottom: 20,
                }}>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: T.forestDeep, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                    Analysis summary
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                    <StatPill label="Total"     value={analytics.total_words} />
                    <StatPill label="Correct"   value={sc.correct    ?? 0} color={T.forestDeep} />
                    <StatPill label="Suggested" value={sc.suggested  ?? 0} color={T.gold} />
                    <StatPill label="Error"     value={sc.misspelled ?? 0} color={T.red} />
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: T.inkSoft, paddingTop: 10, borderTop: `1px solid ${T.hairline}` }}>
                    <span>Language: <strong style={{ color: T.ink }}>{language || analytics.language || '—'}</strong></span>
                    <span>Correction rate: <strong style={{ color: T.ink }}>{(analytics.correction_rate * 100).toFixed(1)}%</strong></span>
                    {typeof analytics.word_error_rate === 'number' && (
                      <span>WER: <strong style={{ color: T.ink }}>{(analytics.word_error_rate * 100).toFixed(1)}%</strong></span>
                    )}
                    {latencyMs != null && (
                      <span>Latency: <strong style={{ color: T.ink }}>{latencyMs} ms</strong></span>
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
                <div style={{ fontSize: 12, color: T.inkFaint, marginBottom: 8 }}>
                  Click any word row to see its suggestions in the panel →
                </div>
                <div style={{
                  background: T.white, borderRadius: 8,
                  border: `1px solid ${T.hairline}`,
                  overflowX: 'auto',
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: T.paperDim }}>
                        {['#', 'Word', 'Status', 'Top Suggestion', 'Distance'].map((h, i) => (
                          <th key={i} style={{
                            padding: '12px 14px', textAlign: 'left',
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 11, fontWeight: 600, color: T.forestDeep,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            borderBottom: `1px solid ${T.hairline}`, whiteSpace: 'nowrap',
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
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: Math.min(i * 0.015, 0.3) }}
                              onClick={() => setSelectedWordIndex(isSelected ? null : i)}
                              style={{
                                borderTop: `1px solid ${T.hairline}`,
                                cursor: 'pointer',
                                background: isSelected ? T.forestTint : T.white,
                              }}
                            >
                              <td style={{ padding: '11px 14px', color: T.inkFaint, fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}>{i + 1}</td>
                              <td style={{ padding: '11px 14px', fontWeight: 700, color: T.ink, fontSize: 14 }}>{res.word}</td>
                              <td style={{ padding: '11px 14px' }}>
                                <span style={{
                                  display: 'inline-block', padding: '3px 10px', borderRadius: 99,
                                  fontSize: 12, fontWeight: 600,
                                  background: statusTint(disp),
                                  color: statusColor(disp),
                                }}>
                                  {statusLabel(disp)}
                                </span>
                              </td>
                              <td style={{ padding: '11px 14px', fontSize: 14, color: T.forestDeep, fontWeight: 600 }}>
                                {topSug ? topSug.word : <span style={{ color: T.inkFaint }}>—</span>}
                              </td>
                              <td style={{ padding: '11px 14px', fontSize: 13, color: T.inkFaint, fontFamily: "'IBM Plex Mono', monospace" }}>
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              style={{
                width: 280, flexShrink: 0,
                background: T.white, borderRadius: 8,
                borderTop: `3px solid ${T.forestDeep}`,
                border: `1px solid ${T.hairline}`,
                borderTopWidth: 3, borderTopColor: T.forestDeep,
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
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, color: T.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Selected word</div>
                        <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 22, fontWeight: 700, color: T.ink }}>{res.word}</div>
                      </div>
                      <button
                        onClick={() => setSelectedWordIndex(null)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkFaint, fontSize: 20, padding: 0, minWidth: 'auto', height: 'auto', lineHeight: 1 }}
                      >×</button>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <span style={{
                        display: 'inline-block', padding: '4px 12px', borderRadius: 99,
                        fontSize: 13, fontWeight: 600,
                        background: statusTint(disp),
                        color: statusColor(disp),
                      }}>
                        {statusLabel(disp)}
                      </span>
                    </div>

                    {g && (
                      <div style={{ background: T.plumTint, borderRadius: 6, padding: '12px 14px', marginBottom: 14, border: `1px solid ${T.plum}33` }}>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, color: T.plum, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Grammar</div>
                        <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 6 }}>{g.message}</div>
                        <code style={{ fontFamily: "'IBM Plex Mono', monospace", background: '#e3dcee', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, color: T.plum }}>{g.replacement}</code>
                      </div>
                    )}

                    {res.suggestions && res.suggestions.length > 0 ? (
                      <div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, color: T.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                          Suggestions
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {res.suggestions.map((s, i) => (
                            <div key={i} style={{ background: T.paperDim, borderRadius: 6, padding: '10px 12px', border: `1px solid ${T.hairline}` }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.error_breakdown ? 6 : 8 }}>
                                <span style={{ fontWeight: 700, color: T.forestDeep, fontSize: 15 }}>{s.word}</span>
                                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.inkFaint }}>dist: {s.distance ?? s.dist ?? '—'}</span>
                              </div>
                              {s.error_breakdown && (
                                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.inkFaint, marginBottom: 8 }}>
                                  sub {s.error_breakdown.substitutions} · ins {s.error_breakdown.insertions} · del {s.error_breakdown.deletions}
                                </div>
                              )}
                              <button
                                onClick={() => void applySuggestion(selectedWordIndex, s.word, res.word, res.phrase_span ?? 1)}
                                className="pnc-btn-primary"
                                style={{
                                  width: '100%', height: 32, fontSize: 12, fontWeight: 700,
                                  background: T.forestDeep, color: T.white,
                                  border: 'none', borderRadius: 5,
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
                      <div style={{ fontSize: 13, color: T.inkFaint, textAlign: 'center', padding: '16px 0' }}>
                        {disp === 'correct' ? 'No corrections needed' : 'No suggestions available'}
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
