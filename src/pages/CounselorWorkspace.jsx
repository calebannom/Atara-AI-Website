import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthGate from '../components/AuthGate';
import { useAuth, ROLE } from '../context/AuthContext';
import { useCounselor } from '../context/CounselorContext';
import { useAppointments } from '../context/AppointmentContext';
import { formatTime } from '../constants/availability';
import {
  Shield,
  Stethoscope,
  Calendar,
  Clock,
  Video,
  ChevronRight,
  Search,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Users,
  MessageSquare,
  Activity,
  Ticket,
  Settings,
} from 'lucide-react';
import './CounselorWorkspace.css';

const TicketStatusStyle = {
  open: { label: 'Open', tone: 'tone-watch', Icon: AlertTriangle },
  claimed: { label: 'Claimed by you', tone: 'tone-stable', Icon: CheckCircle2 },
  closed: { label: 'Closed', tone: 'tone-followup', Icon: CircleDot },
};

function relativeDate(d) {
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function toDate(ticket) {
  // lastMessageAt is a Firestore Timestamp once synced, but can briefly be
  // null right after creation (serverTimestamp hasn't round-tripped yet).
  return ticket.lastMessageAt?.toDate?.() || ticket.createdAt?.toDate?.() || new Date();
}

function formatAppointmentDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString([], {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function CounselorWorkspaceContent() {
  const { user, role } = useAuth();
  const { allTickets, loading: ticketsLoading } = useCounselor();
  const { counselorAppointments, loading: apptsLoading } = useAppointments();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const credentials = useMemo(() => {
    const spec = user?.specialization ? `, ${user.specialization}` : '';
    const license = user?.licenseNumber ? ` · ${user.licenseNumber}` : '';
    const exp = user?.yearsExperience ? ` · ${user.yearsExperience} yrs` : '';
    const baseTitle = role === ROLE.ADMIN ? 'Clinical Admin' : 'Counselor';
    return `${baseTitle}${spec}${license}${exp}`;
  }, [user, role]);

  // "My queue" — tickets that are open (unclaimed, visible to any counselor)
  // or already claimed by this counselor. Closed tickets stay out of the
  // day-to-day workspace view; the full history lives on /counselor/tickets.
  const myQueue = useMemo(() => {
    const uid = user?.uid;
    return allTickets.filter((t) => t.status === 'open' || t.claimedBy === uid);
  }, [allTickets, user?.uid]);

  const filteredQueue = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myQueue.filter((t) => {
      if (statusFilter === 'open' && t.status !== 'open') return false;
      if (statusFilter === 'mine' && t.claimedBy !== user?.uid) return false;
      if (!q) return true;
      return (
        (t.anonymousCode || '').toLowerCase().includes(q) ||
        (t.subject || '').toLowerCase().includes(q)
      );
    });
  }, [myQueue, statusFilter, search, user?.uid]);

  const upcomingAppointments = useMemo(() => {
    const today = todayStr();
    return counselorAppointments
      .filter((a) => a.status === 'confirmed' && a.date >= today)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 5);
  }, [counselorAppointments]);

  const stats = useMemo(() => {
    const openTickets = allTickets.filter((t) => t.status === 'open').length;
    const myTickets = allTickets.filter((t) => t.claimedBy === user?.uid).length;
    const urgentTickets = myQueue.filter((t) => t.priority === 'urgent' || t.priority === 'high').length;
    const today = todayStr();
    const appointmentsToday = counselorAppointments.filter(
      (a) => a.status === 'confirmed' && a.date === today
    ).length;
    const confirmedUpcoming = counselorAppointments.filter(
      (a) => a.status === 'confirmed' && a.date >= today
    ).length;

    // Caseload: distinct people this counselor has an active thread with,
    // across claimed tickets and confirmed/completed appointments.
    const patientIds = new Set();
    allTickets.forEach((t) => { if (t.claimedBy === user?.uid) patientIds.add(t.userId); });
    counselorAppointments.forEach((a) => {
      if (a.status === 'confirmed' || a.status === 'completed') patientIds.add(a.userId);
    });

    return { caseload: patientIds.size, appointmentsToday, openTickets, myTickets, urgentTickets, confirmedUpcoming };
  }, [allTickets, counselorAppointments, myQueue, user?.uid]);

  const displayName = user?.displayName || 'Clinician';
  const firstName = displayName.split(' ')[0];
  const loading = ticketsLoading || apptsLoading;

  return (
    <div className="cw">
      <div className="cw-banner" role="note">
        <Shield size={16} className="cw-banner-icon" />
        <div>
          <strong>Counselor workspace.</strong>
          {' '}Patients can choose to stay anonymous — anonymous conversations show a code instead of a name.
          If someone mentions a safety concern, follow your organization's escalation policy.
        </div>
      </div>

      {/* Top summary header */}
      <header className="cw-head">
        <div className="cw-head-left">
          <div className="cw-head-avatar">
            <Stethoscope size={22} />
          </div>
          <div>
            <p className="cw-head-eyebrow">
              <Activity size={12} /> Counselor workspace
            </p>
            <h1 className="cw-head-title">Welcome, {firstName}.</h1>
            <p className="cw-head-credentials">{credentials}</p>
          </div>
        </div>

        <div className="cw-head-right">
          <Link className="cw-head-link" to="/counselor/tickets">
            <Ticket size={14} /> Open tickets
            <span className="cw-head-chip">{stats.openTickets}</span>
          </Link>
          <Link className="cw-head-link" to="/counselor/availability">
            <Settings size={14} /> Manage availability
          </Link>
        </div>
      </header>

      {/* Stat strip */}
      <section className="cw-stat-strip" aria-label="Today's overview">
        <div className="cw-stat">
          <div className="cw-stat-icon icon-caseload"><Users size={16} /></div>
          <div>
            <p className="cw-stat-label">Active caseload</p>
            <p className="cw-stat-value">{stats.caseload}</p>
          </div>
        </div>
        <div className="cw-stat">
          <div className="cw-stat-icon icon-sessions"><Calendar size={16} /></div>
          <div>
            <p className="cw-stat-label">Sessions today</p>
            <p className="cw-stat-value">{stats.appointmentsToday}</p>
          </div>
        </div>
        <div className="cw-stat">
          <div className="cw-stat-icon icon-tickets"><Ticket size={16} /></div>
          <div>
            <p className="cw-stat-label">Tickets in queue</p>
            <p className="cw-stat-value">{stats.openTickets} <span className="cw-stat-sub">· {stats.myTickets} mine</span></p>
          </div>
        </div>
        <div className="cw-stat">
          <div className="cw-stat-icon icon-watch"><AlertTriangle size={16} /></div>
          <div>
            <p className="cw-stat-label">High priority</p>
            <p className="cw-stat-value value-warn">{stats.urgentTickets}</p>
          </div>
        </div>
      </section>

      {/* Main 65 / 35 split */}
      <section className="cw-body">
        {/* LEFT — Ticket queue table */}
        <div className="cw-col cw-col-main">
          <div className="cw-card cw-card-table">
            <div className="cw-card-head">
              <div>
                <h2 className="cw-card-title">
                  <MessageSquare size={16} /> Your queue
                </h2>
                <p className="cw-card-sub">{filteredQueue.length} ticket{filteredQueue.length === 1 ? '' : 's'} · open + claimed by you</p>
              </div>
              <div className="cw-table-tools">
                <div className="cw-search">
                  <Search size={14} />
                  <input
                    type="search"
                    placeholder="Search code or subject…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search ticket queue"
                  />
                </div>
                <div className="cw-filter-row" role="tablist" aria-label="Filter by status">
                  {[
                    { id: 'active', label: 'All active' },
                    { id: 'open', label: 'Unclaimed' },
                    { id: 'mine', label: 'Mine' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      role="tab"
                      aria-selected={statusFilter === f.id}
                      className={`cw-filter-btn ${statusFilter === f.id ? 'cw-filter-active' : ''}`}
                      onClick={() => setStatusFilter(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="cw-table-wrap" role="region" aria-label="Ticket queue table" tabIndex={0}>
              <table className="cw-table">
                <thead>
                  <tr>
                    <th style={{ width: '22%' }}>Patient</th>
                    <th style={{ width: '16%' }}>Status</th>
                    <th style={{ width: '28%' }}>Subject</th>
                    <th style={{ width: '16%' }}>Last activity</th>
                    <th style={{ width: '18%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="cw-table-empty">Loading…</td></tr>
                  ) : filteredQueue.length === 0 ? (
                    <tr><td colSpan={5} className="cw-table-empty">No tickets match this filter.</td></tr>
                  ) : (
                    filteredQueue.map((t) => {
                      const st = TicketStatusStyle[t.status] || TicketStatusStyle.open;
                      const StIcon = st.Icon;
                      const code = t.anonymousCode || t.id.slice(0, 6).toUpperCase();
                      return (
                        <tr key={t.id} className="cw-row">
                          <td>
                            <div className="cw-cell-id">
                              <span className="cw-id-avatar">{code.slice(-2)}</span>
                              <div>
                                <p className="cw-id-code">{t.anonymous === false ? (t.userDisplayName || code) : code}</p>
                                <p className="cw-id-sub">{t.priority ? `${t.priority} priority` : 'normal priority'}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`cw-status-pill ${st.tone}`}>
                              <StIcon size={12} /> {st.label}
                            </span>
                          </td>
                          <td className="cw-cell-muted">{t.subject || 'No subject given'}</td>
                          <td className="cw-cell-muted">
                            <span className="cw-time">
                              <Clock size={12} /> {relativeDate(toDate(t))}
                            </span>
                          </td>
                          <td>
                            <Link className="cw-case-btn" to="/counselor/tickets">
                              <MessageSquare size={14} />
                              Open ticket
                              <ChevronRight size={14} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT — Upcoming Appointments */}
        <aside className="cw-col cw-col-side" aria-label="Upcoming appointments">
          <div className="cw-card cw-card-appts">
            <div className="cw-card-head">
              <div>
                <h2 className="cw-card-title">
                  <Calendar size={16} /> Upcoming appointments
                </h2>
                <p className="cw-card-sub">{stats.appointmentsToday} scheduled today</p>
              </div>
              <Link className="cw-cal-btn" to="/counselor/appointments">
                View all
                <ChevronRight size={14} />
              </Link>
            </div>

            <ul className="cw-appt-list">
              {loading ? (
                <li className="cw-table-empty">Loading…</li>
              ) : upcomingAppointments.length === 0 ? (
                <li className="cw-table-empty">No upcoming appointments booked.</li>
              ) : (
                upcomingAppointments.map((apt) => {
                  const isToday = apt.date === todayStr();
                  const patientLabel = apt.anonymous ? 'Anonymous patient' : (apt.userDisplayName || 'Patient');
                  return (
                    <li key={apt.id} className={`cw-appt ${isToday ? 'cw-appt-next' : ''}`}>
                      <div className="cw-appt-time-col">
                        <p className="cw-appt-time">{formatTime(apt.time)}</p>
                        <p className="cw-appt-date">{formatAppointmentDate(apt.date)}</p>
                        <span className="cw-appt-duration">50 min</span>
                      </div>

                      <div className="cw-appt-divider" aria-hidden="true" />

                      <div className="cw-appt-body">
                        {isToday && <span className="cw-appt-live-pill"><span className="live-dot" /> Today</span>}
                        <div className="cw-appt-topline">
                          <span className="cw-appt-patient">
                            <span className="cw-id-avatar cw-id-avatar-sm">{patientLabel.slice(-2)}</span>
                            {patientLabel}
                          </span>
                          <span className="cw-appt-mode">
                            <Video size={12} /> Video
                          </span>
                        </div>
                        {apt.subject && <p className="cw-appt-case">{apt.subject}</p>}
                      </div>

                      <Link
                        className="cw-launch-btn"
                        to={`/counselor/appointments/${apt.id}`}
                        aria-label={`Open appointment with ${patientLabel}`}
                      >
                        <Video size={14} /> Open
                      </Link>
                    </li>
                  );
                })
              )}
            </ul>

            <div className="cw-next-steps">
              <p className="cw-next-label">
                <Activity size={13} /> Queue status
              </p>
              <ul className="cw-next-list">
                <li>
                  <CheckCircle2 size={14} className="ok" />
                  {stats.confirmedUpcoming} confirmed appointment{stats.confirmedUpcoming === 1 ? '' : 's'} upcoming
                </li>
                <li>
                  <CheckCircle2 size={14} className="ok" />
                  {stats.openTickets} ticket{stats.openTickets === 1 ? '' : 's'} waiting for a counselor to claim
                </li>
                {stats.urgentTickets > 0 && (
                  <li>
                    <AlertTriangle size={14} className="warn" />
                    {stats.urgentTickets} high-priority ticket{stats.urgentTickets === 1 ? '' : 's'} in your queue — review soon
                  </li>
                )}
              </ul>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

export default function CounselorWorkspacePage() {
  return (
    <AuthGate requireRole={[ROLE.COUNSELOR, ROLE.ADMIN]}>
      <CounselorWorkspaceContent />
    </AuthGate>
  );
}
