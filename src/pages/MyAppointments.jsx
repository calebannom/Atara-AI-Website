import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthGate from '../components/AuthGate';
import { useAppointments } from '../context/AppointmentContext';
import { formatTime } from '../constants/availability';
import { CalendarDays, Clock, ChevronRight, ChevronLeft, CalendarCheck, Video, CalendarRange, UserCircle } from 'lucide-react';
import './Page.css';
import './MyAppointments.css';

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const PAGE_SIZE = 8;

function statusClass(status) {
  if (status === 'confirmed') return 'status-badge status-confirmed';
  if (status === 'completed') return 'status-badge status-completed';
  if (status === 'cancelled') return 'status-badge status-cancelled';
  if (status === 'pending') return 'status-badge status-pending';
  return 'status-badge status-pending';
}

function statusLabel(status) {
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'pending') return 'Pending';
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : '—';
}

function MyAppointmentsContent() {
  const { userAppointments, loading } = useAppointments();
  const [tab, setTab] = useState('upcoming');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (tab === 'upcoming') return userAppointments.filter((a) => a.status === 'confirmed');
    return userAppointments.filter((a) => a.status === tab);
  }, [userAppointments, tab]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dA = new Date(`${a.date}T${a.time || '00:00'}`);
      const dB = new Date(`${b.date}T${b.time || '00:00'}`);
      return tab === 'upcoming' ? dA - dB : dB - dA;
    });
  }, [filtered, tab]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(startIdx, startIdx + PAGE_SIZE);
  const endIdx = Math.min(startIdx + PAGE_SIZE, sorted.length);

  const summaryCounts = useMemo(() => ({
    upcoming: userAppointments.filter((a) => a.status === 'confirmed').length,
    completed: userAppointments.filter((a) => a.status === 'completed').length,
    cancelled: userAppointments.filter((a) => a.status === 'cancelled').length,
  }), [userAppointments]);

  return (
    <div className="ma-page">
      <div className="page-head">
        <div className="page-head-row">
          <div className="page-head-text">
            <div className="page-icon-badge page-icon-primary"><CalendarDays size={16} /></div>
            <div>
              <h1 className="page-title">Appointments</h1>
              <p className="page-head-sub">Your booked sessions with counselors</p>
            </div>
          </div>
          <Link to="/counselors" className="btn-primary">
            <CalendarRange size={13} /> Book a session
          </Link>
        </div>
      </div>

      <div className="ma-summary-row">
        <div className="ma-summary-card">
          <CalendarCheck size={14} className="ma-summary-icon ma-icon-confirmed" />
          <div>
            <span className="ma-summary-num">{summaryCounts.upcoming}</span>
            <span className="ma-summary-label">Upcoming</span>
          </div>
        </div>
        <div className="ma-summary-card">
          <CalendarCheck size={14} className="ma-summary-icon ma-icon-completed" />
          <div>
            <span className="ma-summary-num">{summaryCounts.completed}</span>
            <span className="ma-summary-label">Completed</span>
          </div>
        </div>
        <div className="ma-summary-card">
          <CalendarCheck size={14} className="ma-summary-icon ma-icon-cancelled" />
          <div>
            <span className="ma-summary-num">{summaryCounts.cancelled}</span>
            <span className="ma-summary-label">Cancelled</span>
          </div>
        </div>
      </div>

      <div className="page-tabs ma-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`page-tab ${tab === t.id ? 'page-tab-active' : ''}`}
            onClick={() => { setTab(t.id); setPage(1); }}
          >
            {t.label}
            <span className={`ma-tab-count ${tab === t.id ? 'ma-tab-count-active' : ''}`}>
              {t.id === 'upcoming' ? summaryCounts.upcoming
                : t.id === 'completed' ? summaryCounts.completed
                : summaryCounts.cancelled}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card ma-empty-state">
          <p className="ma-empty-text">Loading appointments…</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="card ma-empty-state">
          <UserCircle size={32} className="ma-empty-icon" />
          <p className="ma-empty-text">
            {tab === 'upcoming'
              ? 'No upcoming sessions. Find a counselor and book your first appointment.'
              : `No ${tab} sessions yet.`}
          </p>
          {tab === 'upcoming' && (
            <Link to="/counselors" className="btn-primary" style={{ marginTop: 14 }}>
              Find a counselor
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="card ma-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Date</th>
                  <th style={{ width: 100 }}>Time</th>
                  <th>Counselor</th>
                  <th>Subject</th>
                  <th style={{ width: 130 }}>Status</th>
                  <th style={{ width: 180, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((a) => (
                  <tr key={a.id}>
                    <td className="ma-date-cell">
                      <span className="ma-date">{a.date}</span>
                    </td>
                    <td>
                      <span className="ma-time">
                        <Clock size={12} /> {formatTime(a.time)}
                      </span>
                    </td>
                    <td className="ma-counselor-cell">
                      <span className="ma-counselor">{a.counselorName}</span>
                    </td>
                    <td>
                      {a.subject
                        ? <span className="ma-subject">{a.subject}</span>
                        : <span className="ma-muted">—</span>}
                    </td>
                    <td>
                      <span className={statusClass(a.status)}>{statusLabel(a.status)}</span>
                    </td>
                    <td className="ma-action-cell">
                      <div className="ma-actions">
                        {a.status === 'confirmed' && (
                          <Link to={`/appointments/${a.id}`} className="ma-btn ma-btn-primary">
                            <Video size={12} /> Join
                          </Link>
                        )}
                        <Link to={`/appointments/${a.id}`} className="ma-btn ma-btn-secondary">
                          View <ChevronRight size={12} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <div className="pagination-info">
                Showing {startIdx + 1}–{endIdx} of {sorted.length}
              </div>
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    className={`pagination-btn ${safePage === n ? 'pagination-btn-active' : ''}`}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                ))}
                <button
                  className="pagination-btn"
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function MyAppointmentsPage() {
  return (
    <AuthGate>
      <MyAppointmentsContent />
    </AuthGate>
  );
}
