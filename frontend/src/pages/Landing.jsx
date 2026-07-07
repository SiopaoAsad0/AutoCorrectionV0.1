import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || '';

/* ────────────────────────────────────────────────────────────────────────
   Design tokens
   Identity: an editor's manuscript — the actual work of the product
   (a word struck out, a word corrected) is the visual subject, not an
   illustration of it. Warm paper, forest ink, a single "pencil red" for
   corrections, mono type for anything the algorithm produced.
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
  red:        '#b3402f',
  redTint:    '#f7e9e5',
  gold:       '#a8842f',
  hairline:   '#d7d9cd',
  white:      '#fffdf8',
};

const FONTS_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  .pnc-landing * { box-sizing: border-box; }
  .pnc-landing a:focus-visible,
  .pnc-landing button:focus-visible,
  .pnc-landing input:focus-visible,
  .pnc-landing textarea:focus-visible {
    outline: 2px solid ${T.forest};
    outline-offset: 2px;
  }
  .pnc-landing ::selection { background: ${T.forestTint}; color: ${T.forestDeep}; }
  .pnc-nav-link { transition: color 0.15s ease; }
  .pnc-nav-link:hover { color: ${T.forest} !important; }
  .pnc-cta-primary { transition: transform 0.15s ease, box-shadow 0.15s ease; }
  .pnc-cta-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(18,58,41,0.28); }
  .pnc-cta-secondary { transition: border-color 0.15s ease, color 0.15s ease; }
  .pnc-cta-secondary:hover { border-color: ${T.forest} !important; color: ${T.forestDeep} !important; }
  .pnc-field { transition: border-color 0.15s ease; }
  .pnc-field:focus { border-color: ${T.forest} !important; }
  @media (prefers-reduced-motion: reduce) {
    .pnc-landing * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
  }

  /* ── Mobile breakpoints ──────────────────────────────────────────── */

  /* Tablet / small laptop: hero starts to tighten before it fully stacks */
  @media (max-width: 860px) {
    .pnc-hero-grid { gap: 40px !important; }
  }

  @media (max-width: 720px) {
    .pnc-hero-grid { grid-template-columns: 1fr !important; }
    .pnc-hero-section { padding: 36px 20px 32px !important; }
    .pnc-features-section { padding: 44px 20px !important; }
    .pnc-steps-section { padding: 44px 20px !important; }
    .pnc-contact-section { padding: 44px 20px 52px !important; }
    .pnc-features-grid { grid-template-columns: 1fr !important; }
    .pnc-nav-subtitle { font-size: 9px !important; }
    .pnc-nav-brand-name { font-size: 13px !important; }
    .pnc-cta-nav { padding: 8px 14px !important; font-size: 12.5px !important; }
  }

  @media (max-width: 480px) {
    .pnc-nav-inner { padding: 0 16px !important; height: 58px !important; }
    .pnc-nav-contact { display: none !important; }
    .pnc-nav-login { padding: 7px 10px !important; }
    .pnc-hero-eyebrow { font-size: 10px !important; margin-bottom: 14px !important; }
    .pnc-hero-title { font-size: 1.6rem !important; margin-bottom: 16px !important; }
    .pnc-hero-sub { font-size: 14.5px !important; margin-bottom: 26px !important; }
    .pnc-hero-actions { flex-direction: column; align-items: stretch; }
    .pnc-hero-actions a { justify-content: center; width: 100%; }
    .pnc-manuscript-card { padding: 16px 16px !important; }
    .pnc-section-title { font-size: 1.25rem !important; }
    .pnc-footer-inner { flex-direction: column; align-items: flex-start !important; gap: 16px !important; }
    .pnc-footer-links { width: 100%; justify-content: space-between !important; }
  }
`;

/* Correction samples for the hero manuscript card — mirrors real output:
   a struck original, an arrow, the corrected form, tagged by language. */
const CORRECTIONS = [
  { before: 'recieve',          after: 'receive',          tag: 'EN',  context: 'will __ feedback within the week' },
  { before: 'nangangailagan',   after: 'nangangailangan',  tag: 'FIL', context: 'ang mga estudyante ay __ ng gabay' },
  { before: 'comprehensiv',     after: 'comprehensive',    tag: 'EN',  context: 'a more __ na paliwanag' },
];

/* Feature list — manuscript marginalia marks stand in for icons, each one
   distinct rather than decorative. */
const FEATURES = [
  {
    mark: '¶',
    title: 'Spell check & suggestions',
    desc: 'Weighted Levenshtein distance runs against a dictionary built for both English and Filipino, so a correction is never guessing at the wrong language.',
  },
  {
    mark: '§',
    title: 'Dual-algorithm comparison',
    desc: 'Adapted Levenshtein and Jaro-Winkler score every word independently. When they disagree, you see both candidates, not just the one the system picked.',
  },
  {
    mark: '†',
    title: 'Taglish-aware',
    desc: 'Filipino affixes, contractions, and code-switched sentences are parsed as one grammar, not two overlapping ones bolted together.',
  },
  {
    mark: '‡',
    title: 'Per-session analytics',
    desc: 'Correction rate, word error rate, detected language, and processing latency are logged after every check — not just the final corrected text.',
  },
  {
    mark: '*',
    title: 'Context-aware ranking',
    desc: 'Suggestions are ordered by surrounding sentence context and word frequency in real usage, not by edit distance alone.',
  },
  {
    mark: '○',
    title: 'Student profiles',
    desc: 'Sign in with your PNC student ID to keep a running session history and message an administrator directly if something looks wrong.',
  },
];

const STEPS = [
  { num: 'I',   title: 'Create an account', desc: 'Sign up with your student ID and name — no password required for students.' },
  { num: 'II',  title: 'Paste your text',   desc: 'Type or paste any English, Filipino, or Taglish text into the checker.' },
  { num: 'III', title: 'Review results',    desc: 'See flagged words in place, open suggestions, and accept a correction with one click.' },
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
      setFeedback(data.message || 'Thanks — we received your message.');
      setContactName(''); setContactEmail(''); setContactMessage('');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="pnc-landing" style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: T.paper, fontFamily: "'Inter', system-ui, sans-serif", color: T.ink,
      overflowX: 'hidden', width: '100%',
    }}>
      <style>{FONTS_IMPORT}</style>

      {/* ══ NAV ══════════════════════════════════════════════════════════ */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: T.paper, borderBottom: `1px solid ${T.hairline}` }}>
        <div className="pnc-nav-inner" style={{
          maxWidth: 1080, margin: '0 auto', padding: '0 24px', height: 64,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}
          >
            <div style={{
              flexShrink: 0, width: 34, height: 34, borderRadius: 4,
              border: `1.5px solid ${T.ink}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Source Serif 4', serif", fontSize: 17, fontWeight: 700, color: T.ink,
            }}>P</div>
            <div style={{ minWidth: 0 }}>
              <div className="pnc-nav-brand-name" style={{
                fontFamily: "'Source Serif 4', serif", fontSize: 15, fontWeight: 700, color: T.ink, lineHeight: 1.1,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                Pamantasan ng Cabuyao
              </div>
              <div className="pnc-nav-subtitle" style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 500, color: T.inkFaint,
                textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1.3,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                Taglish Spell Checker
              </div>
            </div>
          </motion.div>

          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
          >
            <a href="#contact" className="pnc-nav-link pnc-nav-contact" style={{ padding: '8px 14px', fontSize: 13, fontWeight: 500, color: T.inkSoft, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Contact
            </a>
            <Link to="/login" className="pnc-nav-link pnc-nav-login" style={{ padding: '8px 14px', fontSize: 13, fontWeight: 500, color: T.inkSoft, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Log in
            </Link>
            <Link
              to="/signup"
              className="pnc-cta-primary pnc-cta-nav"
              style={{
                marginLeft: 8, padding: '9px 18px', borderRadius: 6, fontSize: 13, fontWeight: 700,
                background: T.forestDeep, color: T.white, textDecoration: 'none', whiteSpace: 'nowrap',
              }}
            >
              Create account
            </Link>
          </motion.nav>
        </div>
      </header>

      <main style={{ flex: 1 }}>

        {/* ══ HERO ════════════════════════════════════════════════════════ */}
        <section className="pnc-hero-section" style={{ maxWidth: 1080, margin: '0 auto', padding: '64px 24px 40px' }}>
          <div className="pnc-hero-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)', gap: 56, alignItems: 'center' }}>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="pnc-hero-eyebrow" style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 500,
                color: T.forestDeep, textTransform: 'uppercase', letterSpacing: '0.1em',
                marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ width: 18, height: 1, background: T.forestDeep, display: 'inline-block' }} />
                Student writing assistant
              </div>

              <h1 className="pnc-hero-title" style={{
                margin: '0 0 22px', fontFamily: "'Source Serif 4', serif",
                fontSize: 'clamp(1.75rem, 6vw, 2.9rem)', fontWeight: 700, lineHeight: 1.18, color: T.ink,
              }}>
                Every misspelled word — in English, Filipino, or both at once.
              </h1>

              <p className="pnc-hero-sub" style={{ margin: '0 0 32px', maxWidth: 480, fontSize: 16, lineHeight: 1.7, color: T.inkSoft }}>
                Paste a paragraph and two algorithms check it side by side, word by word — weighted Levenshtein distance and Jaro-Winkler similarity — so nothing slips through for being in the wrong language.
              </p>

              <div className="pnc-hero-actions" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link to="/signup" className="pnc-cta-primary" style={{
                  display: 'inline-flex', alignItems: 'center', padding: '13px 26px', borderRadius: 6,
                  fontSize: 14, fontWeight: 700, background: T.forestDeep, color: T.white, textDecoration: 'none',
                }}>
                  Get started
                </Link>
                <Link to="/login" className="pnc-cta-secondary" style={{
                  display: 'inline-flex', alignItems: 'center', padding: '13px 26px', borderRadius: 6,
                  fontSize: 14, fontWeight: 700, background: 'transparent', color: T.inkSoft,
                  border: `1.5px solid ${T.hairline}`, textDecoration: 'none',
                }}>
                  Log in
                </Link>
              </div>
            </motion.div>

            {/* Signature element: an actual corrections log, styled like a
                manuscript proof — this is the product's real output. */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="pnc-manuscript-card"
              style={{
                background: T.white, border: `1px solid ${T.hairline}`, borderRadius: 8,
                padding: '20px 22px', boxShadow: '0 1px 2px rgba(22,36,29,0.04)',
                width: '100%', minWidth: 0,
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: 14, marginBottom: 14, borderBottom: `1px solid ${T.hairline}`,
              }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: T.inkFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Correction log
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: T.inkFaint }}>
                  3 flagged
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {CORRECTIONS.map((c, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 14, color: T.inkSoft, lineHeight: 1.5 }}>
                      {c.context.split('__').map((part, idx, arr) => (
                        <span key={idx}>
                          {part}
                          {idx < arr.length - 1 && (
                            <span style={{ color: T.ink, fontWeight: 600 }}>…</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600,
                        background: T.forestTint, color: T.forestDeep, letterSpacing: '0.03em',
                      }}>{c.tag}</span>
                      <span style={{ color: T.red, textDecoration: 'line-through', textDecorationColor: T.red }}>
                        {c.before}
                      </span>
                      <span style={{ color: T.inkFaint }}>→</span>
                      <span style={{ color: T.forestDeep, fontWeight: 600 }}>{c.after}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ══ FEATURES ════════════════════════════════════════════════════ */}
        <section className="pnc-features-section" style={{ borderTop: `1px solid ${T.hairline}`, borderBottom: `1px solid ${T.hairline}`, background: T.paperDim, padding: '60px 24px' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4 }}
              style={{ marginBottom: 40, maxWidth: 520 }}
            >
              <h2 className="pnc-section-title" style={{ margin: '0 0 10px', fontFamily: "'Source Serif 4', serif", fontSize: '1.6rem', fontWeight: 700, color: T.ink }}>
                What the checker actually does
              </h2>
              <p style={{ margin: 0, color: T.inkSoft, fontSize: 14.5, lineHeight: 1.6 }}>
                Six things running underneath every check, in plain terms.
              </p>
            </motion.div>

            <div className="pnc-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0 40px' }}>
              {FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-20px' }}
                  transition={{ delay: i * 0.04, duration: 0.35 }}
                  style={{
                    display: 'flex', gap: 16, padding: '20px 0',
                    borderBottom: `1px solid ${T.hairline}`,
                  }}
                >
                  <div style={{
                    flexShrink: 0, width: 30, fontFamily: "'Source Serif 4', serif",
                    fontSize: 22, fontWeight: 600, color: T.gold, lineHeight: 1.3,
                  }}>
                    {f.mark}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: T.ink, marginBottom: 5 }}>{f.title}</div>
                    <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.65 }}>{f.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ HOW IT WORKS ════════════════════════════════════════════════ */}
        <section className="pnc-steps-section" style={{ padding: '60px 24px' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              style={{ marginBottom: 36 }}
            >
              <h2 className="pnc-section-title" style={{ margin: '0 0 10px', fontFamily: "'Source Serif 4', serif", fontSize: '1.4rem', fontWeight: 700, color: T.ink }}>
                How it works
              </h2>
              <p style={{ margin: 0, color: T.inkSoft, fontSize: 14 }}>Three steps, start to finish.</p>
            </motion.div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {STEPS.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.35 }}
                  style={{
                    display: 'flex', gap: 22, alignItems: 'flex-start', padding: '20px 0',
                    borderTop: i === 0 ? 'none' : `1px solid ${T.hairline}`,
                  }}
                >
                  <div style={{
                    flexShrink: 0, width: 40, fontFamily: "'Source Serif 4', serif",
                    fontSize: 18, fontWeight: 600, color: T.forestDeep,
                  }}>
                    {s.num}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: T.ink, marginBottom: 4 }}>{s.title}</div>
                    <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6 }}>{s.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 }}
              style={{ marginTop: 28 }}
            >
              <Link to="/signup" className="pnc-cta-primary" style={{
                display: 'inline-flex', alignItems: 'center', padding: '12px 24px', borderRadius: 6,
                fontSize: 14, fontWeight: 700, background: T.forestDeep, color: T.white, textDecoration: 'none',
              }}>
                Start now — it's free
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ══ CONTACT ═════════════════════════════════════════════════════ */}
        <section id="contact" className="pnc-contact-section" style={{ borderTop: `1px solid ${T.hairline}`, background: T.paperDim, padding: '60px 24px 68px' }}>
          <div style={{ maxWidth: 460, margin: '0 auto' }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              style={{ marginBottom: 26 }}
            >
              <h2 className="pnc-section-title" style={{ margin: '0 0 8px', fontFamily: "'Source Serif 4', serif", fontSize: '1.4rem', fontWeight: 700, color: T.ink }}>
                Contact us
              </h2>
              <p style={{ margin: 0, fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6 }}>
                Questions or feedback? An administrator reads every message and can reply directly.
              </p>
            </motion.div>

            <div style={{ background: T.white, borderRadius: 8, padding: 26, border: `1px solid ${T.hairline}` }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: T.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="Your full name"
                    maxLength={255}
                    className="pnc-field"
                    style={{ width: '100%', padding: '10px 12px', fontSize: 16, borderRadius: 5, border: `1.5px solid ${T.hairline}`, background: T.paper, color: T.ink }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: T.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="pnc-field"
                    style={{ width: '100%', padding: '10px 12px', fontSize: 16, borderRadius: 5, border: `1.5px solid ${T.hairline}`, background: T.paper, color: T.ink }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: T.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>
                    Message
                  </label>
                  <textarea
                    value={contactMessage}
                    onChange={e => setContactMessage(e.target.value)}
                    rows={5}
                    maxLength={5000}
                    placeholder="What would you like to tell us?"
                    className="pnc-field"
                    style={{ width: '100%', padding: '10px 12px', fontSize: 16, borderRadius: 5, border: `1.5px solid ${T.hairline}`, background: T.paper, color: T.ink, minHeight: 120, fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ padding: '10px 14px', background: T.redTint, color: T.red, borderRadius: 5, fontSize: 13, border: `1px solid ${T.red}33` }}
                    >
                      {error}
                    </motion.div>
                  )}
                  {feedback && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ padding: '10px 14px', background: T.forestTint, color: T.forestDeep, borderRadius: 5, fontSize: 13, border: `1px solid ${T.forest}33`, fontWeight: 600 }}
                    >
                      {feedback}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={submitContact}
                  disabled={loading}
                  className="pnc-cta-primary"
                  style={{
                    height: 46, fontSize: 14, fontWeight: 700, marginTop: 4,
                    background: loading ? T.inkFaint : T.forestDeep,
                    color: T.white, border: 'none', borderRadius: 6,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Sending…' : 'Send message'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
      <footer style={{ background: T.forestDeep, padding: '30px 24px' }}>
        <div className="pnc-footer-inner" style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 3, border: '1.5px solid rgba(255,255,255,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Source Serif 4', serif", fontSize: 13, fontWeight: 700, color: T.white,
            }}>P</div>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,253,248,0.85)' }}>
              PNC Taglish Spell Checker
            </span>
          </div>
          <div className="pnc-footer-links" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,253,248,0.45)' }}>
              Pamantasan ng Cabuyao
            </span>
            <Link to="/admin/login" style={{ fontSize: 12, color: 'rgba(255,253,248,0.45)', textDecoration: 'none' }}>
              Admin portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
