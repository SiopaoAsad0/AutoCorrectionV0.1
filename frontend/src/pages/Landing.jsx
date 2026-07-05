import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || '';

const G = {
  green:      '#00703c',
  greenLight: '#e8f5ee',
  greenMid:   '#c8e6d6',
  gold:       '#ffcc00',
  goldLight:  '#fff8d6',
  red:        '#dc3545',
  redLight:   '#fdf0f1',
  text:       '#1a2e24',
  textMid:    '#4a5c52',
  textMuted:  '#8a9e94',
  border:     '#e0ebe4',
  bg:         '#f5f7f6',
  white:      '#ffffff',
};

const FEATURES = [
  {
    icon: '✎',
    title: 'Spell check & suggestions',
    desc: 'Weighted Levenshtein distance matching with dictionary-backed corrections for both English and Filipino.',
  },
  {
    icon: '🔗',
    title: 'Dual-algorithm comparison',
    desc: 'Adapted Levenshtein and Jaro-Winkler run side-by-side on every word — the best match wins.',
  },
  {
    icon: '🇵🇭',
    title: 'Taglish-aware',
    desc: 'Understands Filipino morphology, informal contractions, and mixed-language sentences.',
  },
  {
    icon: '📊',
    title: 'Per-session analytics',
    desc: 'See correction rates, word error rate, detected language, and processing latency after every check.',
  },
  {
    icon: '🧠',
    title: 'Context-aware ranking',
    desc: 'Suggestions are ranked by sentence context and word frequency, not just edit distance.',
  },
  {
    icon: '👤',
    title: 'Student profiles',
    desc: 'Sign in with your PNC student ID to save your session and contact the admin directly.',
  },
];

export default function Landing() {
  const [contactName,    setContactName]    = useState('');
  const [contactEmail,   setContactEmail]   = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [loading,        setLoading]        = useState(false);
  const [feedback,       setFeedback]       = useState(null);
  const [error,          setError]          = useState(null);

  const submitContact = async (e) => {
    e.preventDefault();
    setError(null); setFeedback(null);
    const name    = contactName.trim();
    const email   = contactEmail.trim();
    const message = contactMessage.trim();
    if (!name || !email || !message) {
      setError('Please fill in all fields.'); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.message ||
          (data.errors && Object.values(data.errors).flat().join(' ')) ||
          `Could not send (${res.status})`;
        throw new Error(msg);
      }
      setFeedback(data.message || 'Thanks — we received your message!');
      setContactName(''); setContactEmail(''); setContactMessage('');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: G.white, fontFamily: "'Inter','Segoe UI',Roboto,sans-serif", color: G.text }}>

      {/* ══ NAV ══════════════════════════════════════════════════════════ */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: G.white,
        boxShadow: '0 1px 0 #e0ebe4',
      }}>
        <div style={{
          maxWidth: 1080, margin: '0 auto',
          padding: '0 24px',
          height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: G.green,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: G.white, fontWeight: 800,
            }}>P</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: G.text, lineHeight: 1.1 }}>PNC</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: G.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1 }}>
                Taglish Spell Checker
              </div>
            </div>
          </motion.div>

          {/* Nav links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <a
              href="#contact"
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                color: G.textMuted, textDecoration: 'none', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.target.style.background = G.greenLight; e.target.style.color = G.green; }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = G.textMuted; }}
            >
              Contact
            </a>
            <Link
              to="/login"
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                color: G.textMuted, textDecoration: 'none',
              }}
              onMouseEnter={e => { e.target.style.background = G.greenLight; e.target.style.color = G.green; }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = G.textMuted; }}
            >
              Log in
            </Link>
            <Link
              to="/signup"
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                background: G.green, color: G.white, textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(0,112,60,0.25)',
                transition: 'filter 0.15s, transform 0.15s',
              }}
              onMouseEnter={e => { e.target.style.filter = 'brightness(1.08)'; e.target.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.target.style.filter = 'none'; e.target.style.transform = 'none'; }}
            >
              Create account
            </Link>
          </motion.div>
        </div>
        {/* Gold accent */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${G.green} 60%, ${G.gold} 100%)` }} />
      </header>

      <main style={{ flex: 1 }}>

        {/* ══ HERO ════════════════════════════════════════════════════════ */}
        <section style={{
          maxWidth: 860, margin: '0 auto',
          padding: '72px 24px 64px',
          textAlign: 'center',
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div style={{
              display: 'inline-block',
              background: G.goldLight, color: '#a07800',
              fontSize: 12, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              padding: '6px 16px', borderRadius: 99,
              border: '1px solid #ffe58a',
              marginBottom: 24,
            }}>
              Student writing assistant · PNC
            </div>

            <h1 style={{
              margin: '0 0 20px',
              fontSize: 'clamp(1.9rem, 4.5vw, 2.8rem)',
              fontWeight: 800, lineHeight: 1.2, color: G.text,
            }}>
              Spell-check your Taglish text<br />
              <span style={{ color: G.green }}>with confidence</span>
            </h1>

            <p style={{
              margin: '0 auto 36px',
              maxWidth: 580,
              fontSize: '1.05rem', lineHeight: 1.7, color: G.textMid,
            }}>
              Paste your draft, run analysis, and get smart corrections powered by Levenshtein distance and Jaro-Winkler similarity — built for Filipino learners.
            </p>

            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/signup" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700,
                background: G.green, color: G.white, textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(0,112,60,0.28)',
              }}>
                Get started →
              </Link>
              <Link to="/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700,
                background: G.white, color: G.green, textDecoration: 'none',
                border: `2px solid ${G.greenMid}`,
              }}>
                Log in
              </Link>
            </div>
          </motion.div>
        </section>

        {/* ══ FEATURES ════════════════════════════════════════════════════ */}
        <section style={{
          background: G.bg,
          borderTop: `1px solid ${G.border}`,
          borderBottom: `1px solid ${G.border}`,
          padding: '56px 24px',
        }}>
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4 }}
              style={{ textAlign: 'center', marginBottom: 40 }}
            >
              <h2 style={{ margin: '0 0 10px', fontSize: '1.5rem', fontWeight: 800, color: G.text }}>
                Everything you need for better writing
              </h2>
              <p style={{ margin: 0, color: G.textMuted, fontSize: 14 }}>
                Powered by two spelling algorithms, Filipino morphology, and context-aware ranking.
              </p>
            </motion.div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}>
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  style={{
                    background: G.white,
                    borderRadius: 14, padding: 22,
                    border: `1px solid ${G.border}`,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: G.greenLight, border: `1px solid ${G.greenMid}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, marginBottom: 14,
                  }}>
                    {f.icon}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: G.text, marginBottom: 6 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: G.textMid, lineHeight: 1.6 }}>{f.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ HOW IT WORKS ════════════════════════════════════════════════ */}
        <section style={{ padding: '56px 24px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <h2 style={{ margin: '0 0 10px', fontSize: '1.4rem', fontWeight: 800, color: G.text }}>
                How it works
              </h2>
              <p style={{ margin: '0 0 36px', color: G.textMuted, fontSize: 14 }}>Three simple steps.</p>
            </motion.div>

            <div style={{ display: 'flex', gap: 0, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { step: '1', title: 'Create an account', desc: 'Sign up with your student ID and name — no password required for students.' },
                { step: '2', title: 'Paste your text',   desc: 'Type or paste any English, Filipino, or Taglish text into the checker.' },
                { step: '3', title: 'Review results',    desc: 'See highlighted words, click for suggestions, and accept corrections instantly.' },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  style={{
                    flex: 1, minWidth: 180,
                    padding: '24px 20px',
                    position: 'relative',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: G.green, color: G.white,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 800, margin: '0 auto 14px',
                    boxShadow: '0 4px 14px rgba(0,112,60,0.25)',
                  }}>
                    {s.step}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: G.text, marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: G.textMid, lineHeight: 1.6 }}>{s.desc}</div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              style={{ marginTop: 32 }}
            >
              <Link to="/signup" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 26px', borderRadius: 10, fontSize: 14, fontWeight: 700,
                background: G.green, color: G.white, textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(0,112,60,0.25)',
              }}>
                Start now — it's free →
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ══ CONTACT ═════════════════════════════════════════════════════ */}
        <section
          id="contact"
          style={{
            background: G.bg,
            borderTop: `1px solid ${G.border}`,
            padding: '56px 24px 64px',
          }}
        >
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              style={{ textAlign: 'center', marginBottom: 28 }}
            >
              <h2 style={{ margin: '0 0 10px', fontSize: '1.4rem', fontWeight: 800, color: G.text }}>
                Contact us
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: G.textMuted, lineHeight: 1.6 }}>
                Questions or feedback? Administrators read every message and can reply directly.
              </p>
            </motion.div>

            <div style={{
              background: G.white, borderRadius: 16, padding: 28,
              border: `1px solid ${G.border}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: G.textMid, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="Your full name"
                    maxLength={255}
                    style={{ marginBottom: 0, fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: G.textMid, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                    placeholder="you@email.com"
                    style={{ marginBottom: 0, fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: G.textMid, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Message
                  </label>
                  <textarea
                    value={contactMessage}
                    onChange={e => setContactMessage(e.target.value)}
                    rows={5}
                    maxLength={5000}
                    placeholder="What would you like to tell us?"
                    style={{ marginBottom: 0, fontSize: 14, minHeight: 120 }}
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ padding: '10px 14px', background: G.redLight, color: G.red, borderRadius: 8, fontSize: 13, border: '1px solid #f5c6cb' }}
                    >
                      {error}
                    </motion.div>
                  )}
                  {feedback && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ padding: '10px 14px', background: G.greenLight, color: G.green, borderRadius: 8, fontSize: 13, border: `1px solid ${G.greenMid}`, fontWeight: 600 }}
                    >
                      ✓ {feedback}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={submitContact}
                  disabled={loading}
                  style={{
                    height: 46, fontSize: 14, fontWeight: 700,
                    background: loading ? '#b0c4ba' : G.green,
                    color: G.white, border: 'none', borderRadius: 10,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    minWidth: 'auto',
                  }}
                >
                  {loading ? 'Sending…' : '↑ Send message'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
      <footer style={{
        background: G.text,
        padding: '28px 24px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: G.green,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: G.white, fontWeight: 800,
            }}>P</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>PNC Taglish Spell Checker</span>
          </div>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            Pamantasan ng Cabuyao · Student Writing Assistant
          </p>
          <Link to="/admin/login" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
            Admin portal
          </Link>
        </div>
      </footer>
    </div>
  );
}
