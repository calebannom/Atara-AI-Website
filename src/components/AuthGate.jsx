import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE } from '../context/AuthContext';
import AppShell from './AppShell';

const roleRank = {
  [ROLE.USER]: 0,
  [ROLE.PENDING_COUNSELOR]: 1,
  [ROLE.COUNSELOR]: 2,
  [ROLE.ADMIN]: 3,
};

const meetsRole = (userRole, required) => {
  if (!required) return true;
  const requiredArr = Array.isArray(required) ? required : [required];
  const userRank = roleRank[userRole] ?? 0;
  return requiredArr.some((r) => userRank >= (roleRank[r] ?? 999));
};

export default function AuthGate({ children, requireRole }) {
  const { user, loading, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (requireRole && !meetsRole(role, requireRole)) {
      if (role === ROLE.PENDING_COUNSELOR) {
        navigate('/pending-approval');
      } else {
        navigate('/dashboard');
      }
    }
  }, [loading, user, role, requireRole, navigate]);

  if (loading) {
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

  if (!user) return null;
  if (requireRole && !meetsRole(role, requireRole)) return null;

  return <AppShell>{children}</AppShell>;
}
