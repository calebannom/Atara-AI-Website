import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, ROLE } from '../context/AuthContext';
import { useCounselor } from '../context/CounselorContext';
import {
  Menu, X, LogOut, User as UserIcon, Bell,
} from 'lucide-react';
import ConfirmDialog, { useConfirm } from './ConfirmDialog';
import './AppShell.css';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/chat', label: 'Atara Chat' },
  { href: '/counselors', label: 'Counselors' },
  { href: '/appointments', label: 'Appointments' },
  { href: '/mood', label: 'Mood' },
  { href: '/mood/insights', label: 'Insights' },
  { href: '/journal', label: 'Journal' },
  { href: '/goals', label: 'Goals' },
  { href: '/discover', label: 'Discover' },
];

const COUNSELOR_NAV = [
  { href: '/counselor/dashboard', label: 'Dashboard' },
  { href: '/counselor/appointments', label: 'Appointments' },
  { href: '/counselor/availability', label: 'Availability' },
];

function initials(name) {
  if (!name) return '';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function AppShell({ children }) {
  const location = useLocation();
  const { user, signOut, role } = useAuth();
  const { isCounselor } = useCounselor();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
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

  const isActive = (href) => location.pathname === href || location.pathname.startsWith(href + '/');
  const navItems = isCounselor ? COUNSELOR_NAV : NAV_ITEMS;
  const homeHref = isCounselor ? '/counselor/dashboard' : '/dashboard';
  const showPatientActionLinks = !isCounselor && role !== ROLE.COUNSELOR && role !== ROLE.ADMIN;

  return (
    <div className="shell">
      <header className="shell-topnav">
        <div className="shell-topnav-inner">
          <Link to={homeHref} className="shell-logo">
            <div className="shell-logo-vertical">
              <img src="/logo-icon.png" alt="Atara" className="shell-logo-img" />
              <span className="shell-logo-text">Atara</span>
            </div>
          </Link>

          <nav className="shell-topnav-links" aria-label="Primary">
            {navItems.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  to={href}
                  className={`nav-link ${active ? 'nav-link-active' : ''}`}
                >
                  {label}
                </Link>
              );
            })}
            {showPatientActionLinks && (
              <Link
                to="/counselor-chat"
                className={`nav-link ${isActive('/counselor-chat') ? 'nav-link-active' : ''}`}
              >
                Counselors
              </Link>
            )}
          </nav>

          <div className="shell-topnav-user">
            <button className="shell-notif-btn" aria-label="Notifications">
              <Bell size={16} />
              <span className="shell-notif-dot" />
            </button>
            <Link to="/profile" className="shell-avatar-link" aria-label="Profile">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="shell-avatar-img" />
              ) : (
                <div className="shell-avatar">{initials(user?.displayName)}</div>
              )}
            </Link>
            <button
              onClick={() => setMobileOpen(true)}
              className="shell-menu-btn"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="shell-mobile-overlay">
          <div className="shell-mobile-backdrop" onClick={() => setMobileOpen(false)} />
          <aside className="shell-sidebar-mobile">
            <div className="shell-mobile-head">
              <Link to={homeHref} className="shell-logo" onClick={() => setMobileOpen(false)}>
                <div className="shell-logo-vertical">
                  <img src="/logo-icon.png" alt="Atara" className="shell-logo-img" />
                  <span className="shell-logo-text">Atara</span>
                </div>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="shell-close-btn" aria-label="Close menu">
                <X size={20} />
              </button>
            </div>

            <nav className="shell-mobile-links" aria-label="Mobile">
              {navItems.map(({ href, label }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    to={href}
                    onClick={() => setMobileOpen(false)}
                    className={`shell-mobile-link ${active ? 'shell-mobile-link-active' : ''}`}
                  >
                    {label}
                  </Link>
                );
              })}
              {showPatientActionLinks && (
                <Link
                  to="/counselor-chat"
                  onClick={() => setMobileOpen(false)}
                  className={`shell-mobile-link ${isActive('/counselor-chat') ? 'shell-mobile-link-active' : ''}`}
                >
                  Talk to a Counselor
                </Link>
              )}

              <hr className="shell-mobile-divider" />

              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className={`shell-mobile-link ${isActive('/profile') ? 'shell-mobile-link-active' : ''}`}
              >
                <UserIcon size={14} style={{ marginRight: 8 }} />
                Profile
              </Link>
              <button
                onClick={() => { setMobileOpen(false); handleSignOut(); }}
                className="shell-mobile-link shell-mobile-signout"
              >
                <LogOut size={14} style={{ marginRight: 8 }} />
                Sign out
              </button>
            </nav>

            {user && (
              <div className="shell-mobile-footer">
                <Link to="/profile" className="shell-mobile-user" onClick={() => setMobileOpen(false)}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="shell-avatar-img" />
                  ) : (
                    <div className="shell-avatar shell-avatar-sm">{initials(user.displayName)}</div>
                  )}
                  <div className="shell-mobile-user-info">
                    <p className="shell-mobile-user-name">{user.displayName}</p>
                    <p className="shell-mobile-user-email">{user.email}</p>
                  </div>
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}

      <main className="shell-main">{children}</main>
      {Dialog}
    </div>
  );
}
