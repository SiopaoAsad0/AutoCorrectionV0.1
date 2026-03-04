import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function Checker() {
  const [text, setText] = useState('');
  const [results, setResults] = useState([]);
  const [dictionary, setDictionary] = useState(new Map());
  const [selectedWord, setSelectedWord] = useState(null);
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const textareaRef = useRef(null);
  const navigate = useNavigate();

  /**
   * 1. COMPREHENSIVE POS ENGINE
   * Proven linguistic patterns for English and Tagalog titles, verbs, and nouns
   */
  const guessPOS = (word) => {
    const w = word.toLowerCase().trim();
    if (!w) return "Unknown";

    // Titles & Occupations (e.g., Dr, Atty, Engr, Guro)
    if (/^(dr|atty|engr|arch|prof|hon|g|gn|bb|mr|ms|mrs)\.?$/.test(w)) return "Noun (Title)";

    // TAGALOG MORPHOLOGY Patterns
    if (/^(mag|nag|mang|nang|maki|naki|ma|na|ipa|ipag|ika|pag)/.test(w) || 
        /^([b-df-hj-np-rt-v]um[aeiou])/.test(w) || 
        /(in|an|han|nan|hin)$/.test(w)) return "Tagalog Verb";
    
    if (/^ma[a-z]{3,}/.test(w) || /^(naka|napaka|pala|kay)/.test(w)) return "Tagalog Adjective";
    if (/^(pag|pang|tag|taga|ka)/.test(w)) return "Tagalog Noun";

    // ENGLISH MORPHOLOGY Patterns
    if (w.endsWith('ly')) return "English Adverb";
    if (/(ing|ed|ate|ify|ize|ise)$/.test(w)) return "English Verb";
    if (/(able|ible|al|ful|ic|ish|less|ous|ive|y)$/.test(w)) return "English Adjective";
    if (/(tion|sion|ness|ment|ity|ship|ance|ence|er|or|ist|ism)$/.test(w)) return "English Noun";

    return "Root / Common";
  };

  /**
   * 2. DATA LOADING
   * Processes provided CSV, JSON, and Text datasets with sanitization
   */
  useEffect(() => {
    const loadAllDatasets = async () => {
      const files = [
        { path: '/tagalog/tagalog_dict.json', type: 'json' },
        { path: '/tagalog/tagalog_dict.csv', type: 'text' },
        { path: '/english/aspell.txt', type: 'text' },
        { path: '/english/wikipedia.txt', type: 'text' }
      ];

      const masterMap = new Map();
      for (const file of files) {
        try {
          const res = await fetch(file.path);
          if (!res.ok) continue;

          if (file.type === 'json') {
            const json = await res.json();
            const data = json.data || json;
            if (Array.isArray(data)) data.forEach(v => {
               const wordStr = (typeof v === 'string' ? v : v.word);
               if (wordStr) {
                 const clean = wordStr.toLowerCase().trim();
                 masterMap.set(clean, guessPOS(clean));
               }
            });
          } else {
            const textData = await res.text();
            textData.split(/\r?\n/).forEach(line => {
              const match = line.match(/^[\w-]+/); 
              if (match) {
                const word = match[0].toLowerCase();
                masterMap.set(word, guessPOS(word));
              }
            });
          }
        } catch (e) { console.error("Load failed for", file.path); }
      }
      setDictionary(masterMap);
    };
    loadAllDatasets();
  }, []);

  const getLevenshteinDistance = (a, b) => {
    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(matrix[i-1][j]+1, matrix[i][j-1]+1, matrix[i-1][j-1]+cost);
      }
    }
    return matrix[a.length][b.length];
  };

  /**
   * 3. ANALYSIS LOGIC
   * Added Punctuation Stripping for accurate matching
   */
  const checkSpelling = () => {
    const words = text.split(/\s+/);
    const checkResults = words.map(rawWord => {
      // Strips punctuation (like the period in "tres.") for dictionary comparison
      const cleanWord = rawWord.toLowerCase().replace(/[^\w-]/g, '');
      if (!cleanWord) return null;

      if (dictionary.has(cleanWord)) {
        return { word: rawWord, status: "Correct", suggestions: [], pos: dictionary.get(cleanWord) };
      }

      let suggestionsList = [];
      dictionary.forEach((pos, dictWord) => {
        if (Math.abs(dictWord.length - cleanWord.length) <= 2) {
          const dist = getLevenshteinDistance(cleanWord, dictWord);
          if (dist <= 2) suggestionsList.push({ word: dictWord, dist, pos });
        }
      });
      return { 
        word: rawWord, 
        status: "Incorrect", 
        suggestions: suggestionsList.sort((a,b)=>a.dist-b.dist).slice(0, 5),
        pos: guessPOS(cleanWord)
      };
    }).filter(res => res !== null);

    setResults(checkResults);
  };

  const handleTextareaClick = (e) => {
    const cursor = e.target.selectionStart;
    const words = text.split(/(\s+)/);
    let currentPos = 0;
    for (let w of words) {
      if (cursor >= currentPos && cursor <= currentPos + w.length && w.trim() !== "") {
        const cleanWord = w.toLowerCase().replace(/[^\w-]/g, '');
        if (cleanWord && !dictionary.has(cleanWord)) {
          const suggestions = [];
          dictionary.forEach((pos, dictWord) => {
            if (Math.abs(dictWord.length - cleanWord.length) <= 2) {
              const dist = getLevenshteinDistance(cleanWord, dictWord);
              if (dist <= 2) suggestions.push({ word: dictWord, dist, pos });
            }
          });
          const rect = textareaRef.current.getBoundingClientRect();
          setActiveSuggestion({
            word: cleanWord, start: currentPos, end: currentPos + w.length,
            suggestions: suggestions.sort((a,b)=>a.dist-b.dist).slice(0, 5),
            x: Math.min(e.clientX - rect.left, rect.width - 200), y: e.clientY - rect.top + 10
          });
          return;
        }
      }
      currentPos += w.length;
    }
    setActiveSuggestion(null);
  };

  const replaceWord = (newWord) => {
    const newText = text.substring(0, activeSuggestion.start) + newWord + text.substring(activeSuggestion.end);
    setText(newText);
    setActiveSuggestion(null);
  };

  const downloadCSV = () => {
    if (results.length === 0) return alert("Please run analysis first!");
    let csvContent = "Word,Status,Detected POS,Suggestions (Word|POS|Dist)\n";
    results.forEach(r => {
      const suggestions = r.suggestions.map(s => `${s.word}(${s.pos})[d:${s.dist}]`).join(' | ');
      csvContent += `"${r.word}","${r.status}","${r.pos}","${suggestions}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Taglish_Analysis_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            onChange={(e) => {setText(e.target.value); setActiveSuggestion(null);}}
            onClick={handleTextareaClick}
            placeholder="Type here. Click highlighted words for suggestions..."
          />
          
          <AnimatePresence>
            {activeSuggestion && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="popup" 
                style={{ position: 'absolute', left: activeSuggestion.x, top: activeSuggestion.y, background: 'white', border: '2px solid #00703c', borderRadius: '12px', padding: '10px', zIndex: 1000, boxShadow: '0 12px 30px rgba(0,0,0,0.2)', minWidth: '220px' }}
              >
                <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: '800', color: '#666', textTransform: 'uppercase' }}>Suggestions</p>
                {activeSuggestion.suggestions.map((s, i) => (
                  <motion.div 
                    whileHover={{ x: 10, backgroundColor: "#f0fcf4" }}
                    key={i} 
                    onClick={() => replaceWord(s.word)} 
                    style={{ cursor: 'pointer', padding: '8px', borderRadius: '6px', borderBottom: '1px solid #f0f0f0' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 'bold', color: '#00703c' }}>{s.word}</span>
                      <span style={{ fontSize: '10px', color: '#999' }}>Dist: {s.dist}</span>
                    </div>
                    <div className="pos-badge" style={{ marginTop: '4px' }}>{s.pos}</div>
                  </motion.div>
                ))}
                <button onClick={() => setActiveSuggestion(null)} style={{ width: '100%', marginTop: '10px', background: '#eee', color: '#333' }}>Close</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="main-actions" style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px' }}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={checkSpelling}>Run Analysis</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => {setText(''); setResults([]);}} style={{ background: '#6c757d' }}>Clear</motion.button>
        </div>

        <motion.table layout style={{ marginTop: '30px' }}>
          <thead><tr><th>Word</th><th>Result</th></tr></thead>
          <tbody>
            <AnimatePresence>
              {results.map((res, i) => (
                <motion.tr 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  key={i} 
                  onClick={() => setSelectedWord(res)} 
                  style={{ cursor: 'pointer', background: selectedWord?.word === res.word ? '#f0fcf4' : '' }}
                >
                  <td>{res.word}</td>
                  <td style={{ color: res.status === "Correct" ? "green" : "red", fontWeight: 'bold' }}>{res.status}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </motion.table>

        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <button onClick={downloadCSV} style={{ backgroundColor: '#2ecc71', width: 'auto' }}>Export (.csv)</button>
          <button onClick={() => navigate('/login')} style={{ backgroundColor: '#dc3545', width: 'auto' }}>Logout System</button>
        </div>
      </div>

      <AnimatePresence>
        {selectedWord && (
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="sidebar" 
            style={{ flex: '1', background: 'white', padding: '25px', borderRadius: '20px', borderTop: '10px solid #00703c', boxShadow: '0 15px 40px rgba(0,0,0,0.1)', height: 'fit-content', position: 'sticky', top: '20px' }}
          >
            <h3 style={{ marginTop: 0, color: '#00703c' }}>Linguistic Details</h3>
            <hr />
            <div style={{ marginBottom: '15px' }}>
               <small style={{ color: '#999' }}>Word Analyzed:</small>
               <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedWord.word}</div>
            </div>
            <div style={{ marginBottom: '15px' }}>
               <small style={{ color: '#999' }}>Part of Speech:</small>
               <div className="pos-badge" style={{ display: 'inline-block' }}>{selectedWord.pos}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}