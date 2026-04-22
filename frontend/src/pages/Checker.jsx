import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = ''; // use Vite proxy: /api -> Laravel

/** Match suggestion casing to the original token (Title, ALL CAPS, or lower). */
function adjustCaseToMatchOriginal(suggestion, originalRaw) {
  if (!suggestion || !originalRaw) return suggestion;
  const s = String(suggestion);
  const o = originalRaw;
  if (o === o.toUpperCase() && /[\p{L}]/u.test(o)) {
    return s.toUpperCase();
  }
  if (/^\p{Lu}/u.test(o)) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s;
}

/** Nth word token in text (split like the highlighter); returns start/end in full string. */
function getWordChunkBounds(fullText, targetWordIndex) {
  const parts = fullText.split(/(\s+)/u);
  let wi = 0;
  let pos = 0;
  for (const part of parts) {
    const len = part.length;
    if (part.trim() !== '') {
      if (wi === targetWordIndex) {
        return { start: pos, end: pos + len, raw: part };
      }
      wi++;
    }
    pos += len;
  }
  return null;
}

/** Map Part of Speech to CSS class for color-coded badges */
function getPOSClass(pos) {
  if (!pos || pos === 'Unknown') return 'pos-unknown';
  const p = (pos || '').toLowerCase();
  if (p.includes('noun')) return 'pos-noun';
  if (p.includes('verb')) return 'pos-verb';
  if (p.includes('adjective') || p.includes('adj')) return 'pos-adjective';
  if (p.includes('adverb')) return 'pos-adverb';
  if (p.includes('pronoun')) return 'pos-pronoun';
  if (p.includes('preposition')) return 'pos-preposition';
  if (p.includes('conjunction')) return 'pos-conjunction';
  if (p.includes('determiner')) return 'pos-determiner';
  if (p.includes('interjection')) return 'pos-interjection';
  if (p.includes('particle')) return 'pos-particle';
  return 'pos-default';
}

/** Short description of POS for legend */
const POS_LEGEND = [
  { tag: 'Noun', desc: 'thing, place, person' },
  { tag: 'Verb', desc: 'action or state' },
  { tag: 'Adjective', desc: 'describes a noun' },
  { tag: 'Adverb', desc: 'describes a verb/adj' },
  { tag: 'Pronoun', desc: 'replaces a noun' },
  { tag: 'Preposition', desc: 'relation (in, on, at)' },
  { tag: 'Conjunction', desc: 'connects words/clauses' },
  { tag: 'Determiner', desc: 'a, the, this' },
  { tag: 'Interjection', desc: 'exclamation (oh!, wow)' },
];

export default function Checker() {
  const [text, setText] = useState('');
  const [results, setResults] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [language, setLanguage] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [selectedWordIndex, setSelectedWordIndex] = useState(null);
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const textareaRef = useRef(null);
  const mirrorRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const pncUser = localStorage.getItem('pnc_user');
    if (!isLoggedIn || !pncUser) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const syncScroll = () => {
    if (textareaRef.current && mirrorRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop;
      mirrorRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const chunks = text.split(/(\s+)/u);
  const wordCount = chunks.filter((c) => c.trim() !== '').length;
  const canHighlight = results.length > 0 && results.length === wordCount;
  let wordIndex = 0;
  const mirrorContent = canHighlight
    ? chunks.map((chunk, i) => {
        if (chunk.trim() === '') return chunk;
        const res = results[wordIndex++];
        const status = res?.status || 'misspelled';
        return (
          <span key={i} className={`word-status-inline status-${status}`}>
            {chunk}
          </span>
        );
      })
    : [text];

  /** @param {string} [textOverride] analyze this text instead of current `text` state (keeps highlights in sync after replacements). */
  const runAnalysis = async (textOverride) => {
    const source = textOverride !== undefined ? textOverride : text;
    const trimmed = String(source).trim();
    if (!trimmed) {
      setError('Please enter some text.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Request failed: ${res.status}`);
      }
      const data = await res.json();
      setResults(data.words || []);
      setAnalytics(data.analytics || null);
      setLanguage(data.language || null);
      setLatencyMs(data.processing_time_ms ?? null);
    } catch (err) {
      setError(err.message || 'Analysis failed. Is the Laravel backend running on port 8000?');
      setResults([]);
      setAnalytics(null);
      setLanguage(null);
      setLatencyMs(null);
    } finally {
      setLoading(false);
    }
  };

  const normalizeStatus = (status) => {
    if (!status) return 'misspelled';
    const s = status.toLowerCase();
    if (s === 'correct') return 'Correct';
    if (s === 'suggested') return 'Suggested';
    return 'Incorrect';
  };

  const handleTextareaClick = (e) => {
    if (results.length === 0) return;
    const cursor = e.target.selectionStart;
    const words = text.split(/(\s+)/u);
    let currentPos = 0;
    let wordIdx = 0;
    for (const w of words) {
      if (w.trim() === '') {
        currentPos += w.length;
        continue;
      }
      if (cursor >= currentPos && cursor < currentPos + w.length) {
        const wordResult = results[wordIdx];
        if (wordResult) {
          setSelectedWord(wordResult);
          setSelectedWordIndex(wordIdx);
          if (wordResult.suggestions && wordResult.suggestions.length > 0) {
            const rect = textareaRef.current.getBoundingClientRect();
            setActiveSuggestion({
              wordIndex: wordIdx,
              start: currentPos,
              end: currentPos + w.length,
              raw: w,
              phraseSpan: wordResult.phrase_span ?? 1,
              suggestions: wordResult.suggestions.map((s) => ({
                word: s.word,
                dist: s.distance ?? s.dist,
                pos: s.pos ?? 'Unknown',
              })),
              x: Math.min(e.clientX - rect.left, rect.width - 200),
              y: e.clientY - rect.top + 10,
            });
          } else {
            setActiveSuggestion(null);
          }
          return;
        }
      }
      currentPos += w.length;
      wordIdx++;
    }
    setActiveSuggestion(null);
  };

  /** Replace one or more consecutive tokens (hybrid phrase) with a suggestion, then re-run analysis. */
  const applySuggestion = async (wordIndex, replacement, originalRaw, phraseSpan = 1) => {
    if (wordIndex == null || wordIndex < 0) return;
    const span = Number(phraseSpan) > 1 ? Number(phraseSpan) : 1;
    let bounds;
    if (span > 1) {
      const first = getWordChunkBounds(text, wordIndex);
      const last = getWordChunkBounds(text, wordIndex + span - 1);
      if (!first || !last) return;
      bounds = { start: first.start, end: last.end, raw: text.slice(first.start, last.end) };
    } else {
      bounds = getWordChunkBounds(text, wordIndex);
    }
    if (!bounds) return;
    const raw = originalRaw ?? bounds.raw;
    const cased = adjustCaseToMatchOriginal(replacement, raw);
    const newText = text.slice(0, bounds.start) + cased + text.slice(bounds.end);
    setText(newText);
    setActiveSuggestion(null);
    setSelectedWord(null);
    setSelectedWordIndex(null);
    await runAnalysis(newText);
  };

  const replaceWordFromPopup = (newWord) => {
    if (!activeSuggestion) return;
    void applySuggestion(
      activeSuggestion.wordIndex,
      newWord,
      activeSuggestion.raw,
      activeSuggestion.phraseSpan ?? 1
    );
  };

  const downloadCSV = () => {
    if (results.length === 0) {
      alert('Please run analysis first!');
      return;
    }
    let csvContent =
      'Word,Status,Detected POS,Suggestions (Word|POS|Dist)\n';
    results.forEach((r) => {
      const suggestions = (r.suggestions || [])
        .map((s) => `${s.word}(${s.pos ?? 'Unknown'})[d:${s.distance ?? s.dist ?? ''}]`)
        .join(' | ');
      csvContent += `"${r.word}","${normalizeStatus(r.status)}","${r.pos ?? 'Unknown'}","${suggestions}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Taglish_Analysis_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="checker-layout"
      style={{ display: 'flex', gap: '20px', maxWidth: '1200px', margin: '40px auto' }}
    >
      <div className="container" style={{ flex: '2', position: 'relative' }}>
        <h2>PNC Taglish Spell Checker</h2>
        <div className={`textarea-highlight-wrap${canHighlight ? ' has-highlight' : ''}`}>
          <div
            ref={mirrorRef}
            className="textarea-mirror"
            aria-hidden="true"
          >
            {canHighlight ? mirrorContent : text || '\u00A0'}
          </div>
          <textarea
            ref={textareaRef}
            rows="6"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setActiveSuggestion(null);
              setSelectedWordIndex(null);
            }}
            onScroll={syncScroll}
            onClick={handleTextareaClick}
            className="textarea-with-highlight"
            placeholder="Type here. Run Analysis to check spelling. Click words to see part of speech..."
          />
          <AnimatePresence>
            {activeSuggestion && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="popup"
                style={{
                  position: 'absolute',
                  left: activeSuggestion.x,
                  top: activeSuggestion.y,
                  background: 'white',
                  border: '2px solid #00703c',
                  borderRadius: '12px',
                  padding: '10px',
                  zIndex: 1000,
                  boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
                  minWidth: '220px',
                }}
              >
                <p
                  style={{
                    margin: '0 0 8px 0',
                    fontSize: '11px',
                    fontWeight: '800',
                    color: '#666',
                    textTransform: 'uppercase',
                  }}
                >
                  Suggestions
                </p>
                {activeSuggestion.suggestions.map((s, i) => (
                  <motion.div
                    whileHover={{ x: 10, backgroundColor: '#f0fcf4' }}
                    key={i}
                    onClick={() => replaceWordFromPopup(s.word)}
                    style={{
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '6px',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                    title="Replace this word in your text"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 'bold', color: '#00703c' }}>
                        {s.word}
                      </span>
                      <span style={{ fontSize: '10px', color: '#999' }}>
                        Dist: {s.dist} · Replace
                      </span>
                    </div>
                    <div className={`pos-badge ${getPOSClass(s.pos)}`} style={{ marginTop: '4px' }}>
                      {s.pos}
                    </div>
                  </motion.div>
                ))}
                <button
                  onClick={() => setActiveSuggestion(null)}
                  style={{
                    width: '100%',
                    marginTop: '10px',
                    background: '#eee',
                    color: '#333',
                  }}
                >
                  Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {results.length > 0 && (
          <p style={{ fontSize: 12, color: '#666', marginTop: 6, marginBottom: 0 }}>
            Green = correct, orange = has suggestion, red = incorrect. Click a word for POS and suggestions; choosing a suggestion updates your text and refreshes analysis automatically so you can correct multiple words in a row.
          </p>
        )}

        {error && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              background: '#fee',
              color: '#c00',
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        <div
          className="main-actions"
          style={{
            display: 'flex',
            gap: '15px',
            justifyContent: 'center',
            marginTop: '20px',
          }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={runAnalysis}
            disabled={loading}
          >
            {loading ? 'Analyzing…' : 'Run Analysis'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setText('');
              setResults([]);
              setAnalytics(null);
              setLanguage(null);
              setError(null);
              setSelectedWord(null);
              setSelectedWordIndex(null);
              setActiveSuggestion(null);
              setLatencyMs(null);
            }}
            style={{ background: '#6c757d' }}
          >
            Clear
          </motion.button>
        </div>

        <motion.table layout style={{ marginTop: '30px' }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Word</th>
              <th>Result</th>
              <th>Part of Speech (POS)</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {results.map((res, i) => (
                <motion.tr
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  key={i}
                  onClick={() => {
                    setSelectedWord(res);
                    setSelectedWordIndex(i);
                  }}
                  style={{
                    cursor: 'pointer',
                    background:
                      selectedWordIndex === i ? '#f0fcf4' : '',
                  }}
                >
                  <td style={{ color: '#888' }}>{i + 1}</td>
                  <td>{res.word}</td>
                  <td
                    style={{
                      color:
                        res.status === 'correct'
                          ? 'green'
                          : res.status === 'suggested'
                            ? 'orange'
                            : 'red',
                      fontWeight: 'bold',
                    }}
                  >
                    {normalizeStatus(res.status)}
                  </td>
                  <td>
                    <span className={`pos-badge ${getPOSClass(res.pos)}`}>
                      {res.pos ?? 'Unknown'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </motion.table>

        {/* Part of Speech legend */}
        {results.length > 0 && (
          <div style={{ marginTop: 20, padding: 12, background: '#f0f4f8', borderRadius: 10, fontSize: 12 }}>
            <strong style={{ color: '#00703c' }}>Part of Speech (POS) types:</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 8 }}>
              {POS_LEGEND.map((item, idx) => (
                <span key={idx}>
                  <span className={`pos-badge ${getPOSClass(item.tag)}`}>{item.tag}</span>
                  <span style={{ color: '#555', marginLeft: 4 }}>— {item.desc}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {analytics && (
          <div
            style={{
              marginTop: 24,
              padding: 16,
              background: '#f8f9fa',
              borderRadius: 12,
              border: '1px solid #eee',
            }}
          >
            <h4 style={{ marginTop: 0, color: '#00703c' }}>Analytics</h4>
            <p>
              <strong>Total words:</strong> {analytics.total_words} &nbsp;|&nbsp;{' '}
              <strong>Language:</strong> {language || analytics.language}{' '}
              &nbsp;|&nbsp; <strong>Correction rate:</strong>{' '}
              {(analytics.correction_rate * 100).toFixed(1)}%
              {typeof analytics.word_error_rate === 'number' && (
                <>
                  {' '}
                  &nbsp;|&nbsp; <strong>Word error rate (WER):</strong>{' '}
                  {(analytics.word_error_rate * 100).toFixed(1)}%
                </>
              )}
              {latencyMs != null && (
                <>
                  {' '}
                  &nbsp;|&nbsp; <strong>Latency:</strong> {latencyMs} ms
                </>
              )}
            </p>
            {analytics.status_counts && (
              <p>
                Correct: {analytics.status_counts.correct ?? 0} &nbsp; Misspelled:{' '}
                {analytics.status_counts.misspelled ?? 0} &nbsp; Suggested:{' '}
                {analytics.status_counts.suggested ?? 0}
              </p>
            )}
            {analytics.pos_counts && Object.keys(analytics.pos_counts).length > 0 && (
              <div>
                <strong>Part of Speech breakdown:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {Object.entries(analytics.pos_counts).map(([pos, count]) => (
                    <span key={pos} className={`pos-badge ${getPOSClass(pos)}`}>
                      {pos}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div
          style={{
            marginTop: '30px',
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: '1px solid #eee',
            paddingTop: '20px',
          }}
        >
          <button
            onClick={downloadCSV}
            style={{ backgroundColor: '#2ecc71', width: 'auto' }}
          >
            Export (.csv)
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('isLoggedIn');
              localStorage.removeItem('pnc_user');
              navigate('/login');
            }}
            style={{ backgroundColor: '#dc3545', width: 'auto' }}
          >
            Logout System
          </button>
        </div>
      </div>

      <AnimatePresence>
        {selectedWord && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="sidebar"
            style={{
              flex: '1',
              background: 'white',
              padding: '25px',
              borderRadius: '20px',
              borderTop: '10px solid #00703c',
              boxShadow: '0 15px 40px rgba(0,0,0,0.1)',
              height: 'fit-content',
              position: 'sticky',
              top: '20px',
            }}
          >
            <h3 style={{ marginTop: 0, color: '#00703c' }}>Word & Part of Speech</h3>
            <hr />
            <div style={{ marginBottom: '15px' }}>
              <small style={{ color: '#999' }}>Word:</small>
              <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                {selectedWord.word}
              </div>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <small style={{ color: '#999' }}>Type of speech in sentence:</small>
              <div style={{ marginTop: 6 }}>
                <span className={`pos-badge ${getPOSClass(selectedWord.pos)}`} style={{ fontSize: 12, padding: '6px 12px' }}>
                  {selectedWord.pos ?? 'Unknown'}
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#666', marginTop: 6, marginBottom: 0 }}>
                {selectedWord.pos === 'Noun' && 'Names a person, place, or thing.'}
                {selectedWord.pos === 'Verb' && 'Expresses an action or state.'}
                {selectedWord.pos === 'Adjective' && 'Describes or modifies a noun.'}
                {selectedWord.pos === 'Adverb' && 'Describes a verb, adjective, or another adverb.'}
                {selectedWord.pos === 'Pronoun' && 'Replaces a noun (e.g. he, she, it).'}
                {selectedWord.pos === 'Interjection' && 'Short exclamation (e.g. oh, wow).'}
                {(!selectedWord.pos || selectedWord.pos === 'Unknown') && 'Part of speech could not be determined.'}
              </p>
            </div>
            {selectedWord.suggestions && selectedWord.suggestions.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <small style={{ color: '#999' }}>Suggestions — click Replace to swap in the text:</small>
                <ul style={{ margin: '8px 0 0', paddingLeft: 0, listStyle: 'none' }}>
                  {selectedWord.suggestions.map((s, i) => (
                    <li
                      key={i}
                      style={{
                        marginBottom: 10,
                        padding: '10px 12px',
                        background: '#f8faf9',
                        borderRadius: 10,
                        border: '1px solid #e8eeea',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <div>
                          <strong style={{ color: '#00703c' }}>{s.word}</strong>
                          <span className={`pos-badge ${getPOSClass(s.pos)}`} style={{ marginLeft: 6, fontSize: 10 }}>
                            {s.pos ?? 'Unknown'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedWordIndex == null) return;
                            void applySuggestion(
                              selectedWordIndex,
                              s.word,
                              selectedWord.word,
                              selectedWord.phrase_span ?? 1
                            );
                          }}
                          disabled={selectedWordIndex == null}
                          style={{
                            padding: '6px 14px',
                            fontSize: 12,
                            fontWeight: 700,
                            background: '#00703c',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            cursor: selectedWordIndex == null ? 'not-allowed' : 'pointer',
                            opacity: selectedWordIndex == null ? 0.5 : 1,
                          }}
                        >
                          Replace
                        </button>
                      </div>
                      <div style={{ color: '#888', fontSize: 11, marginTop: 6 }}>
                        dist: {s.distance ?? s.dist}
                        {s.error_breakdown && (
                          <span>
                            {' '}
                            (sub {s.error_breakdown.substitutions}, ins {s.error_breakdown.insertions}, del{' '}
                            {s.error_breakdown.deletions})
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
