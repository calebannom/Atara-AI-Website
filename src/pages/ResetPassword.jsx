import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Mail } from 'lucide-react';
import './Auth.css';

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setSuccess(false);
      const msg = err?.message?.replace('Firebase: ', '') || 'Could not send reset email. Please check the address and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* LEFT: brand panel */}
      <aside className="auth-brand">
        <div className="auth-brand-top">
          <Link to="/" className="auth-brand-top-logo">
            <img src="/logo-icon.png" alt="Atara" />
            <span>Atara</span>
          </Link>
        </div>

        <div className="auth-brand-center">
          <div className="auth-brand-logo-big">
            <img src="/logo-full.png" alt="Atara" />
          </div>
          <h1 className="auth-brand-title">Back to your journey.</h1>
          <p className="auth-brand-subtitle">
            We'll send you a quick link to reset your password — you'll be back in your space in no time.
          </p>
        </div>

        <footer className="auth-brand-footer">
          <p>© {new Date().getFullYear()} Atara. A mental health companion.</p>
          <p>Not a replacement for professional care.</p>
        </footer>
      </aside>

      {/* RIGHT: form panel */}
      <div className="auth-form-wrap">
        <div className="auth-form-inner">
          <Link to="/login" className="auth-logo">
            <ArrowLeft size={18} style={{ color: 'var(--color-ink-secondary)' }} />
            <span style={{ color: 'var(--color-ink-secondary)', fontSize: 13, fontWeight: 500 }}>Back to sign in</span>
          </Link>

          <div className="auth-head">
            <h1 className="auth-title">Reset your password</h1>
            <p className="auth-subtitle">
              Enter the email you used to create your account and we'll send you a link to set a new password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="field-label">
              Email address
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-ink-muted)' }} />
                <input
                  type="email"
                  required
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="auth-input"
                  style={{ paddingLeft: 44 }}
                  autoFocus
                />
              </div>
            </label>

            {error && <p className="auth-error">{error}</p>}
            {success && (
              <div className="auth-success">
                ✉️ Reset email sent! Check your inbox (and spam folder) for a link from Firebase. The link will expire in 1 hour.
              </div>
            )}

            <button type="submit" disabled={loading || success} className="auth-submit">
              {loading ? 'Sending…' : success ? 'Email sent ✓' : 'Send reset link'}
            </button>
          </form>

          <div className="auth-divider" />
          <p className="auth-switch">
            Remembered your password? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
