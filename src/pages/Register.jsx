import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, ROLE } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import './Auth.css';

export default function RegisterPage() {
  const { signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    setSubmitting(true);
    try {
      await signUp(name.trim(), email.trim(), password);
      setSubmitting(false);
    } catch (err) {
      let msg = err?.message?.replace('Firebase: ', '') || 'Could not create account. Try again.';
      if (msg.toLowerCase().includes('password') && msg.toLowerCase().includes('6')) {
        msg = 'Password should be at least 6 characters long.';
      } else if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('badly')) {
        msg = 'That email address looks invalid — check the format and try again.';
      } else if (msg.toLowerCase().includes('already') && msg.toLowerCase().includes('use')) {
        msg = 'An account already exists with that email. Try signing in instead.';
      }
      setError(msg);
      setSubmitting(false);
    }
  };

  React.useEffect(() => {
    if (loading || !user || submitting) return;
    navigate(user.role === ROLE.COUNSELOR || user.role === ROLE.ADMIN ? '/counselor/dashboard' : '/dashboard', { replace: true });
  }, [loading, user, submitting, navigate]);

  const isWorking = submitting || loading;

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
          <h1 className="auth-brand-title">Your calm space starts here.</h1>
          <p className="auth-brand-subtitle">
            Free, private, and here whenever you need it. No pressure — take it one small step at a time.
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
          <Link to="/" className="auth-logo">
            <img src="/logo-icon.png" alt="Atara" className="auth-logo-img" />
            <span className="auth-logo-text">Atara</span>
          </Link>

          <div className="auth-head">
            <h1 className="auth-title">Start your journey</h1>
            <p className="auth-subtitle">Create an account — it's free, private, and takes 30 seconds.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label className="field-label">
              Your name
              <input
                type="text"
                required
                placeholder="e.g. Ama Sarpong"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="auth-input"
                autoComplete="name"
              />
            </label>

            <label className="field-label">
              Email
              <input
                type="email"
                required
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
                autoComplete="email"
              />
            </label>

            <label className="field-label">
              Password
              <span className="field-hint">At least 6 characters</span>
              <div className="auth-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Choose a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={isWorking} className="auth-submit">
              {isWorking ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="auth-divider" />
          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
          <p className="auth-switch">
            Are you a licensed counselor? <Link to="/counselor-signup">Apply to join our team</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
