import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-header">
        <motion.div
          className="landing-logo"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <span className="landing-logo-mark">PNC</span>
          <span className="landing-logo-text">Spell Check</span>
        </motion.div>
        <motion.nav
          className="landing-nav"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <Link to="/login" className="landing-link">
            Log in
          </Link>
          <Link to="/signup" className="landing-btn landing-btn-primary">
            Create account
          </Link>
        </motion.nav>
      </header>

      <main className="landing-main">
        <motion.section
          className="landing-hero"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="landing-eyebrow">Student writing assistant</p>
          <h1 className="landing-title">
            Check spelling, see suggestions, and explore word patterns in your text.
          </h1>
          <p className="landing-subtitle">
            Built for PNC learners: paste your draft, run analysis, and review highlighted words with part-of-speech context—then keep editing with confidence.
          </p>
          <div className="landing-cta">
            <Link to="/signup" className="landing-btn landing-btn-primary landing-btn-lg">
              Get started
            </Link>
            <Link to="/login" className="landing-btn landing-btn-outline landing-btn-lg">
              I already have an account
            </Link>
          </div>
        </motion.section>

        <motion.ul
          className="landing-features"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
        >
          <li>
            <strong>Spell &amp; suggestions</strong>
            <span>Weighted matching and dictionary-backed corrections.</span>
          </li>
          <li>
            <strong>POS highlights</strong>
            <span>Color-coded parts of speech for clearer revision.</span>
          </li>
          <li>
            <strong>Your profile</strong>
            <span>Sign in to use the checker and manage your student info.</span>
          </li>
        </motion.ul>
      </main>

      <footer className="landing-footer">
        <p>Pamantasan ng Cabuyao · Auto-correction demo</p>
      </footer>
    </div>
  );
}
