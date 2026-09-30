import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AuthGate from '../components/AuthGate';
import { useCounselor } from '../context/CounselorContext';
import { useAppointments } from '../context/AppointmentContext';
import { nextDates, formatTime } from '../constants/availability';
import { CRISIS_LINES } from '../constants/crisisResources';
import { ArrowLeft, CalendarDays, Clock, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import './Page.css';
import './BookAppointment.css';

const ANON_KEY = 'atara_booking_anon_mode';

function BookAppointmentContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCounselorProfile, loading: counselorLoading } = useCounselor();
  const { getAvailableSlots, bookAppointment } = useAppointments();
  const counselor = getCounselorProfile(id);

  const dates = nextDates(14);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [subject, setSubject] = useState('');
  const [anonymous, setAnonymous] = useState(() => {
    try {
      const raw = window.localStorage.getItem(ANON_KEY);
      return raw == null ? true : raw === 'true';
    } catch {
      return true;
    }
  });
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedDate || !counselor) return;
    let cancelled = false;
    setSlotsLoading(true);
    setSelectedTime('');
    getAvailableSlots(counselor.id, selectedDate, counselor.availability)
      .then((s) => { if (!cancelled) setSlots(s); })
      .catch(() => { if (!cancelled) setSlots([]); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDate, counselor, getAvailableSlots]);

  const toggleAnon = () => {
    setAnonymous((prev) => {
      const next = !prev;
      try { window.localStorage.setItem(ANON_KEY, String(next)); } catch {}
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) return;
    setBooking(true);
    setError('');
    try {
      const apptId = await bookAppointment({
        counselorId: counselor.id,
        counselorName: counselor.displayName,
        date: selectedDate,
        time: selectedTime,
        subject,
        anonymous,
      });
      navigate(`/appointments/${apptId}`, { replace: true, state: { justBooked: true } });
    } catch (err) {
      setError(err?.message || 'Could not book that slot. Please try another time.');
      setSelectedTime('');
    } finally {
      setBooking(false);
    }
  };

  if (counselorLoading) return <p className="journal-empty">Loading…</p>;

  if (!counselor) {
    return (
      <div className="book-appt-page">
        <Link to="/counselors" className="cp-back-link"><ArrowLeft size={14} /> Back to search</Link>
        <div className="cs-empty" style={{ marginTop: 24 }}>
          <p>We couldn't find that counselor.</p>
        </div>
      </div>
    );
  }

  const hasAnyAvailability = counselor.availability
    && Object.values(counselor.availability).some((d) => d?.enabled);

  return (
    <div className="book-appt-page">
      <Link to={`/counselors/${counselor.id}`} className="cp-back-link"><ArrowLeft size={14} /> Back to profile</Link>

      <div className="page-head-row">
        <div className="page-head-text">
          <div className="page-icon-badge page-icon-primary"><CalendarDays size={18} /></div>
          <div>
            <h1 className="page-title" style={{ fontSize: 30 }}>Book with {counselor.displayName}</h1>
            <p className="page-head-sub">A 50-minute chat session</p>
          </div>
        </div>
      </div>

      {!hasAnyAvailability ? (
        <div className="cs-empty">
          <p>{counselor.displayName} hasn't set their availability yet. Try requesting a conversation with them directly instead.</p>
          <button className="btn-primary" style={{ marginTop: 14 }} onClick={() => navigate('/counselor-chat', { state: { requestedCounselorId: counselor.id, requestedCounselorName: counselor.displayName } })}>
            Message {counselor.displayName.split(' ')[0]} instead
          </button>
        </div>
      ) : (
        <>
          <section className="ba-section">
            <h2 className="cp-section-title">1. Choose a date</h2>
            <div className="ba-date-row">
              {dates.map((d) => (
                <button
                  key={d.dateStr}
                  className={`ba-date-chip ${selectedDate === d.dateStr ? 'ba-chip-active' : ''}`}
                  onClick={() => setSelectedDate(d.dateStr)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </section>

          {selectedDate && (
            <section className="ba-section">
              <h2 className="cp-section-title">2. Choose a time</h2>
              {slotsLoading ? (
                <p className="journal-empty">Checking availability…</p>
              ) : slots.length === 0 ? (
                <p className="cs-card-meta">No open slots that day. Try another date.</p>
              ) : (
                <div className="ba-time-row">
                  {slots.map((t) => (
                    <button
                      key={t}
                      className={`ba-time-chip ${selectedTime === t ? 'ba-chip-active' : ''}`}
                      onClick={() => setSelectedTime(t)}
                    >
                      <Clock size={13} /> {formatTime(t)}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {selectedTime && (
            <section className="ba-section">
              <h2 className="cp-section-title">3. Confirm booking</h2>
              <div className="ba-summary">
                <p><strong>Counselor:</strong> {counselor.displayName}</p>
                <p><strong>Date:</strong> {dates.find((d) => d.dateStr === selectedDate)?.label}</p>
                <p><strong>Time:</strong> {formatTime(selectedTime)}</p>
                <p><strong>Duration:</strong> 50 minutes</p>
              </div>

              <label className="field-label">
                What would you like to talk about? <span className="field-hint">(optional)</span>
                <textarea
                  className="counselor-textarea"
                  rows={3}
                  maxLength={200}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="A sentence or two so your counselor can prepare."
                />
              </label>

              <label
                className="ba-anon-toggle"
                title={anonymous ? 'Anonymous — counselor never sees your account info' : 'Named — your display name is visible'}
              >
                <input type="checkbox" checked={anonymous} onChange={toggleAnon} style={{ display: 'none' }} />
                {anonymous ? <EyeOff size={14} /> : <Eye size={14} />}
                {anonymous ? 'Anonymous booking' : 'Named booking'}
              </label>

              <div className="auth-banner auth-banner-success" style={{ marginTop: 12 }}>
                <ShieldCheck size={16} style={{ color: 'var(--color-success)', marginTop: 1 }} />
                <div>
                  Not for emergencies. If you're in crisis, contact your local emergency number right away.
                  In Ghana: {CRISIS_LINES[0].name} <strong>{CRISIS_LINES[0].number}</strong> · {CRISIS_LINES[1].name} <strong>{CRISIS_LINES[1].number}</strong>.
                </div>
              </div>

              {error && <p className="auth-error">{error}</p>}

              <button className="btn-primary" style={{ marginTop: 16 }} onClick={handleConfirm} disabled={booking}>
                {booking ? 'Booking…' : 'Confirm booking'}
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default function BookAppointmentPage() {
  return (
    <AuthGate>
      <BookAppointmentContent />
    </AuthGate>
  );
}
