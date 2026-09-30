import React, { useState } from 'react';
import AuthGate from '../components/AuthGate';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  User, Mail, Camera, Shield, Lock, Eye, EyeOff, Trash2,
  Save, AlertTriangle, ArrowLeft, ShieldAlert, LogOut,
} from 'lucide-react';
import ConfirmDialog, { useConfirm } from '../components/ConfirmDialog';
import { auth, db } from '../firebase';
import {
  EmailAuthProvider, reauthenticateWithCredential,
  updatePassword, updateEmail, deleteUser,
} from 'firebase/auth';
import { doc, deleteDoc, writeBatch, collection, query, where, getDocs, limit } from 'firebase/firestore';
import './Profile.css';

function initials(name) {
  if (!name) return '';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function ProfileContent() {
  const { user, updateProfile, signOut, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { confirm, Dialog } = useConfirm();

  const handleSignOut = async () => {
    await confirm({
      title: 'Sign out of Atara?',
      message: "You'll be signed out of your account. Your data stays safe — you can always sign back in to continue.",
      confirmLabel: 'Sign out',
      tone: 'safe',
      onConfirm: async () => {
        await signOut();
        navigate('/', { replace: true });
      },
    });
  };

  // Account info form
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileError, setProfileError] = useState('');

  // Reauth prompt (needed for sensitive ops: change email, change pw, delete)
  const [reauthOpen, setReauthOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState('');
  const [reauthLoading, setReauthLoading] = useState(false);
  const reauthCallback = React.useRef(null);

  // Change password form (only visible after reauth OR user clicks button)
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwShow, setPwShow] = useState({ current: false, new: false, confirm: false });
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileMsg('');
    if (!name.trim()) { setProfileError('Please enter your name.'); return; }
    if (name.trim().length < 2) { setProfileError('Name must be at least 2 characters.'); return; }

    const needsEmailChange = email.trim() !== (user?.email || '') && email.trim();

    const doUpdate = async () => {
      setSaving(true);
      try {
        const updates = {
          displayName: name.trim(),
          bio: bio.trim(),
          photoURL: photoURL.trim() || null,
        };
        await updateProfile(updates);

        if (needsEmailChange) {
          try {
            await updateEmail(auth.currentUser, email.trim());
            setProfileMsg('Saved! Your email change may require verifying the new address.');
          } catch (err) {
            setProfileError(`Saved name/bio but email failed to update: ${err?.message?.replace('Firebase: ', '') || 'Try again later.'}`);
            return;
          }
        } else {
          setProfileMsg('Profile saved!');
        }
      } finally {
        setSaving(false);
      }
    };

    if (needsEmailChange) {
      openReauth(async () => { await doUpdate(); });
    } else {
      await doUpdate();
    }
  };

  const openReauth = (cb) => {
    reauthCallback.current = cb;
    setReauthPassword('');
    setReauthError('');
    setReauthOpen(true);
  };

  const handleReauth = async (e) => {
    e.preventDefault();
    setReauthError('');
    if (!reauthPassword.trim()) {
      setReauthError('Please enter your current password.');
      return;
    }
    setReauthLoading(true);
    try {
      const cred = EmailAuthProvider.credential(user.email || '', reauthPassword.trim());
      await reauthenticateWithCredential(auth.currentUser, cred);
      setReauthOpen(false);
      const cb = reauthCallback.current;
      reauthCallback.current = null;
      if (cb) await cb();
    } catch (err) {
      const msg = err?.message?.replace('Firebase: ', '') || 'Password did not match.';
      setReauthError(msg);
    } finally {
      setReauthLoading(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    await confirm({
      title: 'Send password reset email?',
      message: `We'll send a password reset link to ${user.email}. You can set a new password from there.`,
      confirmLabel: 'Send reset email',
      tone: 'neutral',
      onConfirm: async () => {
        try {
          await resetPassword(user.email);
          setPwMsg('Reset email sent — check your inbox (and spam folder).');
        } catch (err) {
          setPwError(err?.message?.replace('Firebase: ', '') || 'Could not send reset email.');
        }
      },
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg('');
    setPwError('');
    if (!pwCurrent.trim()) { setPwError('Please enter your current password.'); return; }
    if (pwNew.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
    if (pwNew !== pwConfirm) { setPwError('New passwords don\'t match.'); return; }
    if (pwCurrent === pwNew) { setPwError('New password is the same as the old one.'); return; }

    setPwSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email || '', pwCurrent.trim());
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, pwNew.trim());
      setPwMsg('Password updated! Use your new password next time you sign in.');
      setPwCurrent(''); setPwNew(''); setPwConfirm('');
    } catch (err) {
      let msg = err?.message?.replace('Firebase: ', '') || 'Could not change password.';
      if (msg.toLowerCase().includes('credential') || msg.toLowerCase().includes('password')) {
        msg = 'Your current password didn\'t match. Please try again.';
      }
      setPwError(msg);
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    await confirm({
      title: 'Delete your account?',
      message: 'This will permanently delete your Atara account, including your moods, journals, goals, and chat history. This cannot be undone. You will be signed out immediately.',
      confirmLabel: 'Yes — permanently delete',
      tone: 'danger',
      onConfirm: () => new Promise((resolve, reject) => {
        // Nested confirm to require reauth first
        openReauth(async () => {
          try {
            const uid = user.uid;
            // Delete user data (moods, journals, goals, chat messages, user doc) in a batch
            const batch = writeBatch(db);
            const userDoc = doc(db, 'users', uid);
            batch.delete(userDoc);

            const collectionsToClear = ['moods', 'journals', 'goals', 'chatMessages', 'counselorTickets'];
            for (const colName of collectionsToClear) {
              // Firestore batches can't "delete where" directly; fetch docs first
              const q = query(collection(db, colName), where('userId', '==', uid), limit(500));
              const snap = await getDocs(q);
              snap.docs.forEach((d) => batch.delete(d.ref));
            }
            await batch.commit();
            await deleteUser(auth.currentUser);
            await signOut();
            resolve(true);
            navigate('/', { replace: true });
          } catch (err) {
            reject(err);
          }
        });
      }).catch((err) => {
        setProfileError(`Could not delete: ${err?.message?.replace('Firebase: ', '') || err.message}`);
      }),
    });
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="page-head-row">
        <div className="page-head-text">
          <div className="page-icon-badge page-icon-primary"><User size={18} /></div>
          <div>
            <h1 className="page-title">Your profile</h1>
            <p className="page-head-sub">Manage your account details</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/dashboard" className="journal-cancel" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <button onClick={handleSignOut} className="btn-primary" style={{ background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>
            <LogOut size={15} style={{ marginRight: 6 }} />
            Sign out
          </button>
        </div>
      </div>

      <div className="profile-hero">
        <div className="profile-avatar-big" style={photoURL ? { background: 'none', padding: 0 } : undefined}>
          {photoURL ? (
            <img src={photoURL} alt="Avatar" />
          ) : (
            <span>{initials(user.displayName) || '👤'}</span>
          )}
        </div>
        <div className="profile-hero-info">
          <h2 className="profile-hero-name">{user.displayName || 'New user'}</h2>
          <p className="profile-hero-email"><Mail size={14} /> {user.email}</p>
          <div className="profile-hero-meta">
            <span><Shield size={13} /> Email/password account</span>
            <span>Joined: {user.createdAt ? new Date(user.createdAt.seconds * 1000 || user.createdAt).toLocaleDateString() : '—'}</span>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        {/* Account details */}
        <section className="profile-card">
          <h2 className="profile-card-title">
            <User size={16} /> Account details
          </h2>
          <form onSubmit={handleSaveProfile} className="profile-form">
            <label className="field-label">
              Display name
              <input
                type="text"
                className="counselor-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
                required
                minLength={2}
              />
            </label>
            <label className="field-label">
              Email
              <span className="field-hint">Changing email requires re-verification.</span>
              <input
                type="email"
                className="counselor-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving}
                required
              />
            </label>
            <label className="field-label">
              Photo URL (optional)
              <span className="field-hint"><Camera size={12} style={{ marginRight: 3 }} /> A direct image link ending in .jpg or .png</span>
              <input
                type="url"
                className="counselor-input"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                disabled={saving}
                placeholder="https://…"
              />
            </label>
            <label className="field-label">
              Short bio (optional)
              <span className="field-hint">A sentence or two about you — stays private on your account.</span>
              <textarea
                className="counselor-textarea"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={saving}
                maxLength={280}
                placeholder="e.g. tea enthusiast, learning to take it one day at a time."
              />
            </label>

            {profileMsg && <div className="auth-success">{profileMsg}</div>}
            {profileError && <p className="auth-error">{profileError}</p>}

            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={15} style={{ marginRight: 6 }} />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </section>

        {/* Security */}
        <section className="profile-card">
          <h2 className="profile-card-title">
            <Lock size={16} /> Security
          </h2>
          <form onSubmit={handleChangePassword} className="profile-form">
            <label className="field-label">
              Current password
              <div className="auth-password-wrap">
                <input
                  type={pwShow.current ? 'text' : 'password'}
                  className="auth-input"
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                  autoComplete="current-password"
                  disabled={pwSaving}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setPwShow((s) => ({ ...s, current: !s.current }))}
                  tabIndex={-1}
                >
                  {pwShow.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <label className="field-label">
              New password
              <span className="field-hint">At least 6 characters.</span>
              <div className="auth-password-wrap">
                <input
                  type={pwShow.new ? 'text' : 'password'}
                  className="auth-input"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  disabled={pwSaving}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setPwShow((s) => ({ ...s, new: !s.new }))}
                  tabIndex={-1}
                >
                  {pwShow.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
            <label className="field-label">
              Confirm new password
              <div className="auth-password-wrap">
                <input
                  type={pwShow.confirm ? 'text' : 'password'}
                  className="auth-input"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  disabled={pwSaving}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setPwShow((s) => ({ ...s, confirm: !s.confirm }))}
                  tabIndex={-1}
                >
                  {pwShow.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {pwMsg && <div className="auth-success">{pwMsg}</div>}
            {pwError && <p className="auth-error">{pwError}</p>}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="submit" className="btn-primary" disabled={pwSaving}>
                <Lock size={15} style={{ marginRight: 6 }} />
                {pwSaving ? 'Updating…' : 'Update password'}
              </button>
              <button
                type="button"
                onClick={handleSendPasswordReset}
                className="journal-cancel"
                disabled={pwSaving}
              >
                Email me a reset link instead
              </button>
            </div>
          </form>
        </section>

        {/* Danger zone */}
        <section className="profile-card profile-danger-card">
          <h2 className="profile-card-title" style={{ color: 'var(--color-error)' }}>
            <ShieldAlert size={16} /> Danger zone
          </h2>
          <p className="profile-card-body">
            <strong>Permanently</strong> delete your Atara account and all associated data — moods, journals, goals,
            chat history, and profile. This action cannot be undone.
          </p>
          <div className="danger-banner">
            <AlertTriangle size={16} />
            Your data is deleted immediately. We will not be able to recover any of it.
          </div>
          <button
            type="button"
            className="danger-btn"
            onClick={handleDeleteAccount}
          >
            <Trash2 size={15} style={{ marginRight: 6 }} />
            Delete my account
          </button>
        </section>
      </div>

      {/* Reauth dialog (not rendered via useConfirm because it needs inputs) */}
      {reauthOpen && (
        <div className="confirm-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setReauthOpen(false); }} role="dialog" aria-modal="true">
          <div className="confirm-dialog">
            <h2 className="confirm-title" style={{ color: 'var(--color-primary)' }}>
              <Shield size={18} style={{ marginRight: 8 }} />
              Confirm your password
            </h2>
            <p className="confirm-body">
              For your security, please re-enter your current password before making this change.
            </p>
            <form onSubmit={handleReauth}>
              <div className="auth-password-wrap" style={{ marginBottom: 12 }}>
                <input
                  type={pwShow.current ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Your password"
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  autoFocus
                  autoComplete="current-password"
                  disabled={reauthLoading}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setPwShow((s) => ({ ...s, current: !s.current }))}
                  tabIndex={-1}
                >
                  {pwShow.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {reauthError && <p className="auth-error" style={{ margin: '0 0 14px' }}>{reauthError}</p>}
              <div className="confirm-actions">
                <button
                  type="button"
                  className="confirm-cancel"
                  disabled={reauthLoading}
                  onClick={() => { setReauthOpen(false); reauthCallback.current = null; }}
                >
                  Cancel
                </button>
                <button type="submit" className="confirm-confirm confirm-safe" disabled={reauthLoading}>
                  {reauthLoading ? 'Verifying…' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {Dialog}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGate>
      <ProfileContent />
    </AuthGate>
  );
}
