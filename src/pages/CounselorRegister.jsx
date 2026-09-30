import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ShieldCheck, Award, Briefcase } from 'lucide-react';
import { SPECIALTIES } from '../constants/specialties';
import './Auth.css';

export default function CounselorRegisterPage() {
  const { signUpCounselor } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [specialization, setSpecialization] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!specialization.trim()) {
      setError('Please select your area of specialization.');
      return;
    }
    const yearsNum = yearsExperience.trim() ? Number(yearsExperience) : null;
    if (yearsNum !== null && (Number.isNaN(yearsNum) || yearsNum < 0 || yearsNum > 70)) {
      setError('Years of experience must be a valid number (0–70).');
      return;
    }
    setLoading(true);
    try {
      await signUpCounselor({
        name: name.trim(),
        email: email.trim(),
        password,
        specialization: specialization.trim(),
        licenseNumber: licenseNumber.trim(),
        yearsExperience: yearsNum,
        bio: bio.trim(),
      });
      navigate('/pending-approval');
    } catch (err) {
      let msg = err?.message?.replace('Firebase: ', '') || 'Could not create counselor account. Try again.';
      if (msg.toLowerCase().includes('password') && msg.toLowerCase().includes('6')) {
        msg = 'Password should be at least 6 characters long.';
      } else if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('badly')) {
        msg = 'That email address looks invalid — check the format and try again.';
      } else if (msg.toLowerCase().includes('already') && msg.toLowerCase().includes('use')) {
        msg = 'An account already exists with that email. Try signing in instead.';
      }
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
          <h1 className="auth-brand-title">Support others on their journey.</h1>
          <p className="auth-brand-subtitle">
            Join Atara's counselor team and bring compassionate care to people who need it, on a schedule that works for you.
          </p>
        </div>

        <footer className="auth-brand-footer">
          <p>© {new Date().getFullYear()} Atara. A mental health companion.</p>
          <p>Counselor applications reviewed within 1–3 business days.</p>
        </footer>
      </aside>

      {/* RIGHT: form panel */}
      <div className="auth-form-wrap">
        <div className="auth-form-inner">
          <Link to="/" className="auth-logo">
            <img src="/logo-icon.png" alt="Atara" className="auth-logo-img" />
            <span className="auth-logo-text">Atara</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              background: 'rgba(30, 64, 175, 0.12)', color: 'var(--color-primary)',
              borderRadius: '50%', width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Award size={18} />
            </div>
            <div>
              <h1 className="auth-title" style={{ margin: 0 }}>Counselor application</h1>
              <p className="auth-subtitle" style={{ margin: 0 }}>Join our team of licensed supporters</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-banner auth-banner-success">
              <ShieldCheck size={16} style={{ color: 'var(--color-success)', marginTop: 1 }} />
              <div>
                <strong>Privacy note.</strong> Your license number is only visible to admins during review. Once approved, your <em>name</em>, <em>specialization</em>, <em>years of experience</em>, and <em>bio</em> appear on your public counselor profile so users can find and choose you.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <label className="field-label" style={{ flex: 1 }}>
                Full name
                <input
                  type="text"
                  required
                  placeholder="Dr. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="counselor-input"
                  autoComplete="name"
                />
              </label>
              <label className="field-label" style={{ flex: 1 }}>
                Email
                <input
                  type="email"
                  required
                  placeholder="you@practice.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="counselor-input"
                  autoComplete="email"
                />
              </label>
            </div>

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

            <label className="field-label">
              <Briefcase size={13} style={{ marginRight: 5 }} />
              Primary specialization
              <select
                required
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="counselor-input"
                style={{ background: 'var(--color-input-bg)' }}
              >
                <option value="">Select your specialty…</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            <div style={{ display: 'flex', gap: 10 }}>
              <label className="field-label" style={{ flex: 1 }}>
                License number <span className="field-hint">(optional)</span>
                <input
                  type="text"
                  placeholder="e.g. LCSW-12345"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="counselor-input"
                />
              </label>
              <label className="field-label" style={{ flex: 1 }}>
                Years of experience <span className="field-hint">(optional)</span>
                <input
                  type="number"
                  min="0"
                  max="70"
                  placeholder="e.g. 5"
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  className="counselor-input"
                />
              </label>
            </div>

            <label className="field-label">
              Short bio <span className="field-hint">(optional — shown to users after approval)</span>
              <textarea
                className="counselor-textarea"
                rows={4}
                placeholder="A sentence or two about your practice, approach, or what you specialize in."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={600}
              />
            </label>

            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? 'Submitting application…' : 'Submit for review'}
            </button>
          </form>

          <div className="auth-divider" />
          <p className="auth-switch">
            Not a counselor? <Link to="/register">Create a regular account</Link>
          </p>
          <p className="auth-switch">
            Already applied? <Link to="/login">Sign in</Link> to check your status.
          </p>
        </div>
      </div>
    </div>
  );
}
