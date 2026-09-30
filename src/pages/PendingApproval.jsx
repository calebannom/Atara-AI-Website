import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, ROLE } from '../context/AuthContext';
import { Clock, ShieldCheck, Award, ArrowLeft, LogOut, Loader2 } from 'lucide-react';
import { useConfirm } from '../components/ConfirmDialog';
import './Page.css';

function PendingApprovalContent() {
  const { user, loading: authLoading, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { confirm, Dialog } = useConfirm();
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!authLoading && user && role !== ROLE.PENDING_COUNSELOR && role !== ROLE.COUNSELOR && role !== ROLE.ADMIN && !user?.counselorApplication) {
      navigate('/dashboard', { replace: true });
    }
    if (!authLoading && (role === ROLE.COUNSELOR || role === ROLE.ADMIN)) {
      navigate('/counselor/dashboard', { replace: true });
    }
  }, [authLoading, user, role, navigate]);

  const app = user?.counselorApplication;
  const specialization = user?.specialization || app?.specialization || '';
  const licenseNumber = user?.licenseNumber || app?.licenseNumber || '';
  const yearsExperience = user?.yearsExperience ?? app?.yearsExperience ?? null;
  const submittedAtRef = user?.requestedAt || app?.submittedAt;
  useEffect(() => {
    if (!submittedAtRef) return;
    const start = typeof submittedAtRef.toDate === 'function'
      ? submittedAtRef.toDate()
      : new Date(submittedAtRef);
    if (Number.isNaN(start.getTime())) {
      // Server timestamp hasn't resolved yet (right after signup) — skip
      // rendering an elapsed time rather than showing "NaN min ago".
      setElapsed('');
      return;
    }
    const update = () => {
      const diff = Date.now() - start.getTime();
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      if (d > 0) setElapsed(`${d} day${d === 1 ? '' : 's'} ${h} hr${h === 1 ? '' : 's'}`);
      else if (h > 0) {
        const m = Math.floor((diff % 3600000) / 60000);
        setElapsed(`${h} hr${h === 1 ? '' : 's'} ${m} min`);
      } else {
        const m = Math.max(1, Math.floor(diff / 60000));
        setElapsed(`${m} min`);
      }
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [user?.requestedAt]);

  const handleSignOut = async () => {
    await confirm({
      title: 'Sign out?',
      message: "You can sign back in anytime to check your application status.",
      confirmLabel: 'Sign out',
      tone: 'safe',
      onConfirm: async () => {
        await signOut();
        navigate('/login');
      },
    });
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-canvas)' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,201,167,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8,
          animation: 'pulse 1.4s ease-in-out infinite',
        }}>
          <img src="/logo-icon.png" alt="Loading" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--color-canvas) 0%, #F8F5FF 50%, #E8FFF8 100%)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 28px',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img src="/logo-icon.png" alt="Atara" style={{ width: 28, height: 28 }} />
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            color: 'var(--color-ink)',
            fontWeight: 700,
          }}>Atara</span>
        </Link>
        <button
          onClick={handleSignOut}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-ink-secondary)',
            fontSize: 13, fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <LogOut size={14} /> Sign out
        </button>
      </header>

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
      }}>
        <div style={{
          maxWidth: 520,
          width: '100%',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-soft)',
          borderRadius: 20,
          padding: 40,
          boxShadow: 'var(--shadow-soft)',
          textAlign: 'left',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(76,59,207,0.15), rgba(0,201,167,0.15))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Clock size={28} style={{ color: 'var(--color-primary)' }} />
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            margin: '0 0 8px',
            color: 'var(--color-ink)',
          }}>
            Application received
          </h1>
          <p style={{
            margin: 0, color: 'var(--color-ink-secondary)',
            fontSize: 15, lineHeight: 1.6,
          }}>
            Hi <strong style={{ color: 'var(--color-ink)' }}>{user?.displayName || 'there'}</strong>, thanks for applying to join Atara's counselor team. Our admin team is reviewing your details.
          </p>

          <div style={{
            marginTop: 24,
            background: 'rgba(76,59,207,0.06)',
            border: '1px solid rgba(76,59,207,0.14)',
            borderRadius: 'var(--radius)',
            padding: '14px 16px',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}>
            <Loader2 size={16} style={{ color: 'var(--color-primary)', marginTop: 2, animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--color-ink-secondary)' }}>
              <div style={{ color: 'var(--color-ink)', fontWeight: 600, marginBottom: 2 }}>Review in progress</div>
              Typical turnaround is <strong>1–3 business days</strong>. You'll get an email once a decision is made.
              {elapsed && <div style={{ marginTop: 6, opacity: 0.8 }}>Submitted {elapsed} ago.</div>}
            </div>
          </div>

          <div style={{
            marginTop: 20,
            padding: '14px 16px',
            background: 'rgba(0,201,167,0.06)',
            border: '1px solid rgba(0,201,167,0.14)',
            borderRadius: 'var(--radius)',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <ShieldCheck size={16} style={{ color: 'var(--color-accent)', marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-ink-secondary)' }}>
              <div style={{ color: 'var(--color-ink)', fontWeight: 600, marginBottom: 2 }}>In the meantime, you can still use Atara as a member.</div>
              Your mood tracker, journal, goals, and AI chat are all available while we review.
            </div>
          </div>

          <div style={{
            marginTop: 20,
            padding: '14px 16px',
            background: 'var(--color-canvas)',
            border: '1px solid var(--color-border-soft)',
            borderRadius: 'var(--radius)',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <Award size={16} style={{ color: 'var(--color-bloom)', marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-ink-secondary)' }}>
              <div style={{ color: 'var(--color-ink)', fontWeight: 600, marginBottom: 4 }}>Application on file</div>
              {specialization && <div>· Specialization: <strong>{specialization}</strong></div>}
              {licenseNumber && <div>· License: <strong>{licenseNumber}</strong></div>}
              {yearsExperience != null && <div>· Experience: <strong>{yearsExperience} yr{yearsExperience === 1 ? '' : 's'}</strong></div>}
              <div style={{ marginTop: 4 }}>Contact <strong>support@atara.app</strong> if anything needs updating.</div>
            </div>
          </div>

          <div style={{
            marginTop: 28,
            display: 'flex', gap: 10, flexWrap: 'wrap',
          }}>
            <Link
              to="/dashboard"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--color-primary)', color: '#fff',
                padding: '11px 20px', borderRadius: 'var(--radius)',
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
                boxShadow: 'var(--shadow-soft)',
              }}
            >
              Go to my dashboard
            </Link>
            <Link
              to="/counselor-chat"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--color-surface)', color: 'var(--color-ink)',
                padding: '11px 20px', borderRadius: 'var(--radius)',
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
                border: '1px solid var(--color-border)',
              }}
            >
              <ArrowLeft size={14} /> Request a counselor
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
      {Dialog}
    </div>
  );
}

export default function PendingApprovalPage() {
  return <PendingApprovalContent />;
}
