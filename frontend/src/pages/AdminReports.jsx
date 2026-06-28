import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ── tiny helpers ──────────────────────────────────────────────────────────────
const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);
const num = (v) => (v == null ? '—' : Number(v).toLocaleString());
const dec = (v, d = 4) => (v == null ? '—' : Number(v).toFixed(d));

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      padding: '22px 24px',
      borderLeft: `5px solid ${accent || 'var(--pnc-green)'}`,
      boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
      minWidth: 160,
      flex: 1,
    }}>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#1a2e24' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 style={{ margin: '32px 0 14px', color: 'var(--pnc-green)', fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid #e8f5e9', paddingBottom: 8 }}>
      {children}
    </h3>
  );
}

function Badge({ value, max, label, color }) {
  const pctVal = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color: '#666' }}>{num(value)}</span>
      </div>
      <div style={{ background: '#f0f0f0', borderRadius: 99, height: 8, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pctVal}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ background: color || 'var(--pnc-green)', height: '100%', borderRadius: 99 }}
        />
      </div>
    </div>
  );
}

// ── Algorithm Comparison Tool ─────────────────────────────────────────────────
function AlgorithmCompareTool() {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const compare = async () => {
    if (!source.trim() || !target.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ source: source.trim(), target: target.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const meterStyle = (val, isGood) => ({
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: 99,
    fontSize: 13,
    fontWeight: 700,
    background: isGood ? '#e8f5e9' : '#fff3e0',
    color: isGood ? '#2e7d32' : '#e65100',
  });

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.07)', marginBottom: 24 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          value={source}
          onChange={e => setSource(e.target.value)}
          placeholder="Misspelled word (e.g. recieve)"
          style={{ flex: 1, minWidth: 140 }}
        />
        <input
          value={target}
          onChange={e => setTarget(e.target.value)}
          placeholder="Correct word (e.g. receive)"
          style={{ flex: 1, minWidth: 140 }}
        />
        <button onClick={compare} disabled={loading} style={{ minWidth: 120 }}>
          {loading ? 'Comparing…' : 'Compare'}
        </button>
      </div>
      {error && <p style={{ color: '#c00', fontSize: 13 }}>{error}</p>}
      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
            {/* Levenshtein */}
            <div style={{ background: '#f8fdf9', borderRadius: 10, padding: 16, border: '1px solid #c8e6c9' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Adapted Levenshtein</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1a2e24' }}>{dec(result.levenshtein_distance, 2)}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>edit distance</div>
              <div style={{ marginTop: 10, fontSize: 13 }}>
                Normalized: <span style={meterStyle(result.levenshtein_normalized <= 0.3, result.levenshtein_normalized <= 0.3)}>{dec(result.levenshtein_normalized, 4)}</span>
              </div>
              {result.edit_breakdown && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
                  <div>Substitutions: <strong>{result.edit_breakdown.substitutions}</strong></div>
                  <div>Insertions: <strong>{result.edit_breakdown.insertions}</strong></div>
                  <div>Deletions: <strong>{result.edit_breakdown.deletions}</strong></div>
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <span style={{ ...meterStyle(result.lev_accepts, result.lev_accepts), fontSize: 12 }}>
                  {result.lev_accepts ? '✓ Accepts match' : '✗ Rejects match'}
                </span>
              </div>
            </div>

            {/* Jaro-Winkler */}
            <div style={{ background: '#faf5ff', borderRadius: 10, padding: 16, border: '1px solid #e1bee7' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Jaro-Winkler</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#4527a0' }}>{dec(result.jaro_winkler_similarity, 4)}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>similarity score</div>
              <div style={{ marginTop: 10, fontSize: 13 }}>
                Jaro only: <span style={{ fontWeight: 700 }}>{dec(result.jaro_similarity, 4)}</span>
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                Distance: <span style={{ fontWeight: 700 }}>{dec(result.jaro_winkler_distance, 4)}</span>
              </div>
              <div style={{ marginTop: 10 }}>
                <span style={{ ...meterStyle(result.jw_accepts, result.jw_accepts), fontSize: 12 }}>
                  {result.jw_accepts ? '✓ Accepts match' : '✗ Rejects match'}
                </span>
              </div>
            </div>

            {/* Verdict */}
            <div style={{ background: result.agreement ? '#e8f5e9' : '#fff3e0', borderRadius: 10, padding: 16, border: `1px solid ${result.agreement ? '#a5d6a7' : '#ffcc80'}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Verdict</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: result.agreement ? '#2e7d32' : '#e65100' }}>
                {result.agreement ? '✓ Algorithms Agree' : '⚠ Algorithms Disagree'}
              </div>
              <div style={{ marginTop: 12, fontSize: 13, color: '#555' }}>
                Preferred for <strong>"{result.source}"</strong>:
              </div>
              <div style={{ marginTop: 4 }}>
                <span style={{ padding: '4px 12px', borderRadius: 99, background: '#1a2e24', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                  {result.preferred_algorithm}
                </span>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
                {result.preferred_algorithm === 'jaro-winkler'
                  ? 'Short word — prefix similarity matters more'
                  : 'Longer word — edit count is more meaningful'}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Main Report Page ──────────────────────────────────────────────────────────
export default function AdminReports() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  const adminToken = localStorage.getItem('admin_token');

  useEffect(() => {
    if (!adminToken) { navigate('/admin/login'); return; }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${adminToken}`, Accept: 'application/json' };
      const [ovRes, usRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/reports/overview`, { headers }),
        fetch(`${API_BASE}/api/admin/reports/users`, { headers }),
      ]);
      if (!ovRes.ok) throw new Error(`Overview: HTTP ${ovRes.status}`);
      const ovData = await ovRes.json();
      const usData = usRes.ok ? await usRes.json() : { users: [] };
      setOverview(ovData);
      setUsers(usData.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const ov = overview?.overview || {};
  const algo = overview?.algorithm_comparison || {};
  const topMisspelled = overview?.top_misspelled || [];
  const dailyTrend = overview?.daily_trend || [];

  const tabs = ['overview', 'algorithm', 'users', 'misspelled', 'compare'];

  const tabLabel = { overview: 'Overview', algorithm: 'Algorithm', users: 'Users', misspelled: 'Top Errors', compare: 'Live Compare' };

  return (
    <div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, color: 'var(--pnc-green)', fontWeight: 800, fontSize: 22 }}>📊 Data Report</h2>
        <p style={{ color: '#666', marginTop: 6, marginBottom: 0 }}>System-wide spell check statistics and algorithm comparison</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? 'var(--pnc-green)' : '#f0f0f0',
              color: activeTab === tab ? '#fff' : '#444',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              minWidth: 'auto',
              height: 'auto',
            }}
          >
            {tabLabel[tab]}
          </button>
        ))}
        <button onClick={fetchData} style={{ background: '#e8f5e9', color: 'var(--pnc-green)', marginLeft: 'auto', minWidth: 'auto', height: 'auto', padding: '8px 18px', fontSize: 13 }}>
          ↻ Refresh
        </button>
      </div>

      {error && <div style={{ padding: 16, background: '#fee', color: '#c00', borderRadius: 10, marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Loading report data…</div>
      ) : (
        <>
          {/* ── OVERVIEW TAB ─────────────────────────────────── */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                <StatCard label="Total Checks"    value={num(ov.total_checks)}    sub="spell check sessions" />
                <StatCard label="Words Analyzed"  value={num(ov.total_words)}     sub="total words processed" accent="#7b1fa2" />
                <StatCard label="Errors Found"    value={num(ov.total_misspelled)} sub="misspelled words"     accent="#e53935" />
                <StatCard label="Unique Users"    value={num(ov.unique_users)}    sub="registered accounts"  accent="#0277bd" />
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                <StatCard label="Avg Correction Rate" value={pct(ov.avg_correction_rate)} sub="words needing correction" accent="#f57c00" />
                <StatCard label="Avg Word Error Rate" value={pct(ov.avg_wer)}             sub="WER across all sessions"  accent="#c62828" />
                <StatCard label="Suggestions Given"   value={num(ov.total_suggested)}     sub="words with suggestions"   accent="#2e7d32" />
              </div>

              <SectionTitle>Daily Activity (Last 30 Days)</SectionTitle>
              {dailyTrend.length === 0 ? (
                <p style={{ color: '#aaa', fontSize: 14 }}>No activity data yet. Start using the spell checker to generate reports.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Checks</th>
                        <th>Errors Found</th>
                        <th>Avg Correction Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyTrend.map((row, i) => (
                        <tr key={i}>
                          <td>{row.date}</td>
                          <td>{num(row.checks)}</td>
                          <td>{num(row.misspelled)}</td>
                          <td>{pct(row.avg_correction_rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* ── ALGORITHM TAB ─────────────────────────────────── */}
          {activeTab === 'algorithm' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SectionTitle>Algorithm Performance Summary</SectionTitle>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
                <StatCard label="Avg Levenshtein Distance"   value={dec(algo.avg_lev_distance, 3)}  sub="lower = closer match"      accent="var(--pnc-green)" />
                <StatCard label="Avg Jaro-Winkler Similarity" value={dec(algo.avg_jw_similarity, 4)} sub="higher = more similar"     accent="#7b1fa2" />
                <StatCard label="Algorithm Agreements"        value={num(algo.agreements)}           sub={`of ${num(algo.total)} pairs`} accent="#0277bd" />
              </div>

              <SectionTitle>Algorithm Comparison Guide</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div style={{ background: '#f8fdf9', borderRadius: 12, padding: 20, border: '1px solid #c8e6c9' }}>
                  <div style={{ fontWeight: 800, color: 'var(--pnc-green)', marginBottom: 10, fontSize: 15 }}>Adapted Levenshtein</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#444', lineHeight: 1.8 }}>
                    <li>Counts minimum edits (insert, delete, substitute)</li>
                    <li>Distance of 0 = identical, higher = more different</li>
                    <li>Accepts matches with distance ≤ 3</li>
                    <li>Best for longer words (6+ characters)</li>
                    <li>Weighted by Filipino phonetic patterns</li>
                  </ul>
                </div>
                <div style={{ background: '#faf5ff', borderRadius: 12, padding: 20, border: '1px solid #e1bee7' }}>
                  <div style={{ fontWeight: 800, color: '#7b1fa2', marginBottom: 10, fontSize: 15 }}>Jaro-Winkler</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#444', lineHeight: 1.8 }}>
                    <li>Measures character overlap and transpositions</li>
                    <li>Score of 1.0 = identical, 0.0 = no similarity</li>
                    <li>Accepts matches with similarity ≥ 0.75</li>
                    <li>Best for short words (≤ 5 characters)</li>
                    <li>Gives bonus for matching prefixes</li>
                  </ul>
                </div>
                <div style={{ background: '#fff8e1', borderRadius: 12, padding: 20, border: '1px solid #ffe082' }}>
                  <div style={{ fontWeight: 800, color: '#f57c00', marginBottom: 10, fontSize: 15 }}>When They Disagree</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#444', lineHeight: 1.8 }}>
                    <li>Short words: prefer Jaro-Winkler</li>
                    <li>Long words: prefer Levenshtein</li>
                    <li>Transpositions: Jaro-Winkler handles better</li>
                    <li>Missing letters: Levenshtein handles better</li>
                    <li>Both used together = higher accuracy</li>
                  </ul>
                </div>
              </div>

              <SectionTitle>Error Breakdown Distribution</SectionTitle>
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}>
                <p style={{ fontSize: 13, color: '#666', marginTop: 0 }}>Based on logged spell check sessions</p>
                {algo.total > 0 ? (
                  <>
                    <Badge value={algo.agreements}              max={algo.total} label="Algorithm Agreement Rate"     color="var(--pnc-green)" />
                    <Badge value={algo.total - algo.agreements} max={algo.total} label="Algorithm Disagreement Rate"  color="#e53935" />
                  </>
                ) : (
                  <p style={{ color: '#aaa', fontSize: 14 }}>No algorithm comparison data yet. Use the spell checker to generate data.</p>
                )}
              </div>
            </motion.div>
          )}

          {/* ── USERS TAB ─────────────────────────────────────── */}
          {activeTab === 'users' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SectionTitle>Registered User Activity</SectionTitle>
              {users.length === 0 ? (
                <p style={{ color: '#aaa', fontSize: 14 }}>No user activity logged yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Email</th>
                        <th>Total Checks</th>
                        <th>Words Analyzed</th>
                        <th>Errors Found</th>
                        <th>Avg Correction Rate</th>
                        <th>Avg WER</th>
                        <th>Last Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => (
                        <motion.tr key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                          <td style={{ color: '#aaa' }}>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{u.user_email}</td>
                          <td>{num(u.total_checks)}</td>
                          <td>{num(u.total_words)}</td>
                          <td style={{ color: '#e53935', fontWeight: 600 }}>{num(u.total_misspelled)}</td>
                          <td>{pct(u.avg_correction_rate)}</td>
                          <td>{pct(u.avg_wer)}</td>
                          <td style={{ fontSize: 12, color: '#888' }}>{u.last_active ? new Date(u.last_active).toLocaleDateString() : '—'}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* ── MISSPELLED TAB ────────────────────────────────── */}
          {activeTab === 'misspelled' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SectionTitle>Most Frequently Misspelled Words</SectionTitle>
              {topMisspelled.length === 0 ? (
                <p style={{ color: '#aaa', fontSize: 14 }}>No error data logged yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Misspelled Word</th>
                        <th>Times Found</th>
                        <th>Avg Levenshtein Distance</th>
                        <th>Avg Jaro-Winkler Similarity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topMisspelled.map((row, i) => (
                        <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                          <td style={{ color: '#aaa' }}>{i + 1}</td>
                          <td style={{ fontWeight: 700, color: '#e53935' }}>{row.misspelled_word}</td>
                          <td>{num(row.frequency)}</td>
                          <td>{dec(row.avg_lev_distance, 3)}</td>
                          <td>
                            <span style={{
                              padding: '2px 10px',
                              borderRadius: 99,
                              fontSize: 12,
                              fontWeight: 700,
                              background: row.avg_jw_similarity >= 0.75 ? '#e8f5e9' : '#fff3e0',
                              color: row.avg_jw_similarity >= 0.75 ? '#2e7d32' : '#e65100',
                            }}>
                              {dec(row.avg_jw_similarity, 4)}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {/* ── LIVE COMPARE TAB ──────────────────────────────── */}
          {activeTab === 'compare' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SectionTitle>Live Algorithm Comparison</SectionTitle>
              <p style={{ fontSize: 13, color: '#666', marginTop: 0, marginBottom: 16 }}>
                Enter any word pair to compare Adapted Levenshtein vs Jaro-Winkler side by side.
              </p>
              <AlgorithmCompareTool />

              <SectionTitle>Sample Word Pairs to Try</SectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  ['recieve', 'receive'], ['seperate', 'separate'], ['definately', 'definitely'],
                  ['accomodate', 'accommodate'], ['tommorrow', 'tomorrow'], ['beleive', 'believe'],
                  ['occassion', 'occasion'], ['embarass', 'embarrass'], ['neccessary', 'necessary'],
                  ['wierd', 'weird'], ['kalian', 'kailan'], ['salamats', 'salamat'],
                ].map(([a, b], i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveTab('compare'); }}
                    style={{ background: '#f0f4f8', color: '#333', fontSize: 12, padding: '6px 14px', minWidth: 'auto', height: 'auto', borderRadius: 8 }}
                  >
                    {a} → {b}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
