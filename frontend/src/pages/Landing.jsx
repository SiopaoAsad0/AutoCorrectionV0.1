import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const API_BASE = '';

export default function Landing() {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [contactFeedback, setContactFeedback] = useState(null);
  const [contactError, setContactError] = useState(null);

  const submitContact = async (e) => {
    e.preventDefault();
    setContactError(null);
    setContactFeedback(null);
    const name = contactName.trim();
    const email = contactEmail.trim();
    const message = contactMessage.trim();
    if (!name || !email || !message) {
      setContactError('Please fill in name, email, and message.');
      return;
    }
    setContactLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data.message ||
          (data.errors && Object.values(data.errors).flat().join(' ')) ||
          `Could not send (${res.status})`;
        throw new Error(msg);
      }
      setContactFeedback(data.message || 'Thanks — we received your message.');
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    } catch (err) {
      setContactError(err.message || 'Something went wrong.');
    } finally {
      setContactLoading(false);
    }
  };

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
          <a href="#contact" className="landing-link">
            Contact
          </a>
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

        <motion.section
          id="contact"
          className="landing-contact"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.45 }}
        >
          <h2 className="landing-contact-title">Contact us</h2>
          <p className="landing-contact-lead">
            Questions or feedback? Send a message — administrators can read it and add a reply in the admin console.
          </p>
          <form className="landing-contact-form" onSubmit={submitContact}>
            <label className="landing-contact-label">
              Name
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                autoComplete="name"
                maxLength={255}
                required
              />
            </label>
            <label className="landing-contact-label">
              Email
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="landing-contact-label">
              Message
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                rows={5}
                maxLength={5000}
                required
              />
            </label>
            {contactError && <p className="landing-contact-error">{contactError}</p>}
            {contactFeedback && <p className="landing-contact-success">{contactFeedback}</p>}
            <button type="submit" className="landing-btn landing-btn-primary landing-btn-lg" disabled={contactLoading}>
              {contactLoading ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </motion.section>
      </main>

      <footer className="landing-footer">
        <p>Pamantasan ng Cabuyao · Auto-correction demo</p>
        <p className="landing-footer-meta">
          <Link to="/admin/login" className="landing-footer-link">
            Admin
          </Link>
        </p>
      </footer>
    </div>
  );
}
