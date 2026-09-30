import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, ROLE } from '../context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────
// Single source of truth for route-level access control.
//
// This used to run its own independent onAuthStateChanged + Firestore
// getDoc, completely separate from AuthContext (which every page ALSO
// consumes via AuthGate/useAuth). Two components independently deciding
// "who is this user and what role do they have" is exactly the kind of
// race condition that caused:
//   - the app appearing stuck on a spinner or silently logging people out
//     (two listeners resolving at different times / disagreeing)
//   - counsellors occasionally being bounced to the patient dashboard
//   - the landing page not opening as the default route
// AuthContext already does this resolution once (including turning a
// pending counselor application into the "pending_counselor" role) —
// this component now just reads that result instead of recomputing it.
// ─────────────────────────────────────────────────────────────────────────

const COUNSELOR_HOME = '/counselor/dashboard';
const PATIENT_HOME = '/dashboard';
const LOGIN_PAGE = '/login';
const PENDING_PAGE = '/pending-approval';

const isCounselorRole = (role) => role === ROLE.COUNSELOR || role === ROLE.ADMIN;
const isAdminRole = (role) => role === ROLE.ADMIN;

// Matches the homeRouteForRole() logic already used by Login.jsx/Landing.jsx,
// so a mis-routed visitor always lands in the same place a normal sign-in
// would have sent them — no second, disagreeing definition of "home".
function homeForRole(role) {
  if (role === ROLE.COUNSELOR || role === ROLE.ADMIN) return COUNSELOR_HOME;
  if (role === ROLE.PENDING_COUNSELOR) return PENDING_PAGE;
  return PATIENT_HOME;
}

export default function RoleProtectedRoute({ children, roleType }) {
  const location = useLocation();
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="rbac-loader" role="status" aria-live="polite">
        <div className="rbac-loader-ring">
          <div className="rbac-loader-spinner" />
          <img src="/logo-icon.png" alt="" className="rbac-loader-logo" />
        </div>
        <p className="rbac-loader-text">Verifying access…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={LOGIN_PAGE} replace state={{ from: location.pathname }} />;
  }

  if (roleType === 'admin') {
    if (!isAdminRole(role)) {
      return <Navigate to={homeForRole(role)} replace />;
    }
  } else if (roleType === 'counselor') {
    if (!isCounselorRole(role)) {
      return <Navigate to={homeForRole(role)} replace />;
    }
  } else if (roleType === 'patient') {
    // Approved counsellors/admins should never be treated as patients —
    // send them back to their own workspace instead of rendering patient UI.
    if (isCounselorRole(role)) {
      return <Navigate to={homeForRole(role)} replace />;
    }
  }
  // roleType === 'auth': any signed-in, non-pending user may pass through.

  return children;
}
