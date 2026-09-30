import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, ROLE } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import './Auth.css';

const homeRouteForRole = (role) => {
  switch (role) {
    case ROLE.COUNSELOR:
    case ROLE.ADMIN:
      return '/counselor/dashboard';
    case ROLE.PENDING_COUNSELOR:
      return '/pending-approval';
    default:
      return '/dashboard';
  }
};

export default function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(email, password);
      setSubmitting(false);
    } catch (err) {
      setError(err?.message?.replace('Firebase: ', '') || 'Sign in failed. Check your details and try again.');
      setSubmitting(false);
    }
  };

  React.useEffect(() => {
    if (loading || !user || submitting) return;
    const target = location.state?.from || homeRouteForRole(user.role || ROLE.USER);
    navigate(target, { replace: true });
  }, [loading, user, submitting, navigate, location.state?.from]);

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
          <h1 className="auth-brand-title">A companion, not a clinic.</h1>
          <p className="auth-brand-subtitle">
            A journey to feeling like yourself again — whenever you need it.
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
            <h1 className="auth-title">Sign in to Atara</h1>
            <p className="auth-subtitle">Welcome back — your companion missed you 🌿</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
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
              <div className="auth-password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                  autoComplete="current-password"
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

            <Link to="/reset-password" className="auth-forgot">Forgot your password?</Link>

            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={isWorking} className="auth-submit">
              {isWorking ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="auth-divider" />
          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
          <p className="auth-switch">
            Counselor? <Link to="/counselor-signup">Apply here</Link> · Already applied? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
