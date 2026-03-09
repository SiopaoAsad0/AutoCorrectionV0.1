import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = ''; // use Vite proxy: /api -> Laravel

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const textareaRef = useRef(null);
  const navigate = useNavigate();

  const runAnalysis = async () => {
    const trimmed = text.trim();
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
    } catch (err) {
      setError(err.message || 'Analysis failed. Is the Laravel backend running on port 8000?');
      setResults([]);
      setAnalytics(null);
      setLanguage(null);
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
    const words = text.split(/(\s+)/);
    let currentPos = 0;
    for (const w of words) {
      if (cursor >= currentPos && cursor <= currentPos + w.length && w.trim() !== '') {
        const cleanWord = w.toLowerCase().replace(/[^\w-]/g, '');
        if (cleanWord) {
          const wordResult = results.find(
            (r) => r.normalized === cleanWord || r.word === w.trim()
          );
          if (wordResult && wordResult.suggestions && wordResult.suggestions.length > 0) {
            const rect = textareaRef.current.getBoundingClientRect();
            setActiveSuggestion({
              word: cleanWord,
              start: currentPos,
              end: currentPos + w.length,
              suggestions: wordResult.suggestions.map((s) => ({
                word: s.word,
                dist: s.distance ?? s.dist,
                pos: s.pos ?? 'Unknown',
              })),
              x: Math.min(e.clientX - rect.left, rect.width - 200),
              y: e.clientY - rect.top + 10,
            });
            return;
          }
        }
      }
      currentPos += w.length;
    }
    setActiveSuggestion(null);
  };

  const replaceWord = (newWord) => {
    if (!activeSuggestion) return;
    const newText =
      text.substring(0, activeSuggestion.start) +
      newWord +
      text.substring(activeSuggestion.end);
    setText(newText);
    setActiveSuggestion(null);
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
        <div style={{ position: 'relative' }}>
          <textarea
            ref={textareaRef}
            rows="6"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setActiveSuggestion(null);
            }}
            onClick={handleTextareaClick}
            placeholder="Type here. Run Analysis to check spelling. Click highlighted words for suggestions..."
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
                    onClick={() => replaceWord(s.word)}
                    style={{
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '6px',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 'bold', color: '#00703c' }}>
                        {s.word}
                      </span>
                      <span style={{ fontSize: '10px', color: '#999' }}>
                        Dist: {s.dist}
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
            }}
            style={{ background: '#6c757d' }}
          >
            Clear
          </motion.button>
        </div>

        {/* Sentence view: each word with its Part of Speech below */}
        {results.length > 0 && (
          <div style={{ marginTop: 24, padding: 16, background: '#fafafa', borderRadius: 12, border: '1px solid #eee' }}>
            <h4 style={{ marginTop: 0, marginBottom: 12, color: '#00703c' }}>Sentence with Part of Speech</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              Each word is labeled with its type of speech (POS) as detected by the system.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', alignItems: 'flex-end' }}>
              {results.map((res, i) => (
                <span
                  key={i}
                  onClick={() => setSelectedWord(res)}
                  style={{ cursor: 'pointer', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: '4px 6px', borderRadius: 8, background: selectedWord?.word === res.word ? '#e8f5e9' : 'transparent' }}
                >
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{res.word}</span>
                  <span className={`pos-badge ${getPOSClass(res.pos)}`} style={{ marginTop: 4 }}>
                    {res.pos ?? 'Unknown'}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

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
                  onClick={() => setSelectedWord(res)}
                  style={{
                    cursor: 'pointer',
                    background: selectedWord?.word === res.word ? '#f0fcf4' : '',
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
            onClick={() => navigate('/login')}
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
                <small style={{ color: '#999' }}>Suggestions (with POS):</small>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  {selectedWord.suggestions.map((s, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      <strong>{s.word}</strong>
                      <span className={`pos-badge ${getPOSClass(s.pos)}`} style={{ marginLeft: 6, fontSize: 10 }}>
                        {s.pos ?? 'Unknown'}
                      </span>
                      <span style={{ color: '#888', marginLeft: 4 }}>dist: {s.distance ?? s.dist}</span>
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
