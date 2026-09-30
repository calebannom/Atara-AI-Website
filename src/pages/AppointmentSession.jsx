import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import AuthGate from '../components/AuthGate';
import { useAuth, ROLE } from '../context/AuthContext';
import { useAppointments } from '../context/AppointmentContext';
import { useReviews } from '../context/ReviewContext';
import StarRating from '../components/StarRating';
import { formatTime } from '../constants/availability';
import { CRISIS_LINES } from '../constants/crisisResources';
import {
  ArrowLeft, Send, ShieldCheck, AlertTriangle, CheckCircle, XCircle, Clock,
} from 'lucide-react';
import ConfirmDialog, { useConfirm } from '../components/ConfirmDialog';
import './CounselorChat.css';

const STATUS_LABEL = {
  confirmed: { text: 'Confirmed', color: '#10b981', Icon: CheckCircle },
  completed: { text: 'Completed', color: '#6b7280', Icon: CheckCircle },
  cancelled: { text: 'Cancelled', color: '#ef4444', Icon: XCircle },
};

function AppointmentSessionContent() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { confirm, Dialog } = useConfirm();
  const {
    userAppointments, counselorAppointments,
    subscribeToAppointmentMessages, getAppointmentMessages, sendAppointmentMessage,
    cancelAppointment, completeAppointment,
  } = useAppointments();
  const { myReviewedAppointmentIds, submitReview } = useReviews();

  const isCounselorView = role === ROLE.COUNSELOR || role === ROLE.ADMIN;
  const appt = (isCounselorView ? counselorAppointments : userAppointments).find((a) => a.id === id);
  const messages = getAppointmentMessages(id);
  const [message, setMessage] = useState('');
  const bottomRef = useRef(null);
  const alreadyReviewed = myReviewedAppointmentIds.includes(id);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAnonymous, setReviewAnonymous] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    const unsub = subscribeToAppointmentMessages(id);
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [id, subscribeToAppointmentMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!message.trim()) return;
    const text = message;
    setMessage('');
    await sendAppointmentMessage(id, text, isCounselorView ? 'counselor' : 'user');
  };

  const handleCancel = async () => {
    await confirm({
      title: 'Cancel this appointment?',
      message: 'This frees up the time slot for someone else. This can\'t be undone.',
      tone: 'danger',
      confirmLabel: 'Cancel appointment',
      onConfirm: async () => {
        await cancelAppointment(id);
        navigate(isCounselorView ? '/counselor/appointments' : '/appointments', { replace: true });
      },
    });
  };

  const handleComplete = async () => {
    await confirm({
      title: 'Mark session as completed?',
      message: 'This moves the appointment into your completed history.',
      tone: 'safe',
      confirmLabel: 'Mark completed',
      onConfirm: async () => {
        await completeAppointment(id);
      },
    });
  };

  const handleSubmitReview = async () => {
    if (!reviewRating) return;
    setSubmittingReview(true);
    setReviewError('');
    try {
      await submitReview({
        appointmentId: id,
        counselorId: appt.counselorId,
        counselorName: appt.counselorName,
        rating: reviewRating,
        comment: reviewComment,
        anonymous: reviewAnonymous,
      });
      setReviewSubmitted(true);
    } catch (err) {
      setReviewError(err?.message || 'Could not submit your rating. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderDate = (raw) => {
    try {
      const d = typeof raw?.toDate === 'function' ? raw.toDate() : new Date(raw || 0);
      return d.toLocaleString([], { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (!appt) {
    return (
      <div className="counselor-page">
        <Link to={isCounselorView ? '/counselor/appointments' : '/appointments'} className="cp-back-link"><ArrowLeft size={14} /> Back</Link>
        <p className="journal-empty" style={{ marginTop: 20 }}>Loading appointment, or it doesn't exist.</p>
      </div>
    );
  }

  const status = STATUS_LABEL[appt.status] || STATUS_LABEL.confirmed;
  const StatusIcon = status.Icon;
  const otherPartyName = isCounselorView
    ? (appt.anonymous ? 'Anonymous patient' : (appt.userDisplayName || 'Patient'))
    : appt.counselorName;

  return (
    <div className="counselor-page">
      <Link to={isCounselorView ? '/counselor/appointments' : '/appointments'} className="cp-back-link"><ArrowLeft size={14} /> Back</Link>

      {location.state?.justBooked && (
        <div className="auth-banner auth-banner-success" style={{ margin: '16px 0' }}>
          <CheckCircle size={16} style={{ color: 'var(--color-success)', marginTop: 1 }} />
          <div><strong>Booked!</strong> Your session with {appt.counselorName} is confirmed for {formatTime(appt.time)}.</div>
        </div>
      )}

      <div className="crisis-banner" role="alert">
        <AlertTriangle size={18} className="crisis-icon" />
        <div className="crisis-body">
          <strong>Not for emergencies.</strong> If you or someone you know is in immediate danger, call your local emergency number.
          In Ghana: {CRISIS_LINES[0].name} <strong>{CRISIS_LINES[0].number}</strong> · {CRISIS_LINES[1].name} <strong>{CRISIS_LINES[1].number}</strong>.
        </div>
      </div>

      <div className="counselor-chat" style={{ marginTop: 16 }}>
        <div className="chat-head">
          <div>
            <p className="chat-head-title">
              {isCounselorView ? `Session with ${otherPartyName}` : `Session with ${otherPartyName}`}
            </p>
            <p className="chat-head-status" style={{ color: status.color }}>
              <StatusIcon size={13} style={{ marginRight: 6, verticalAlign: -1 }} />
              {status.text} · {appt.date} · {formatTime(appt.time)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isCounselorView && appt.status === 'confirmed' && (
              <button className="close-convo-btn" onClick={handleComplete}>Mark completed</button>
            )}
            {appt.status === 'confirmed' && (
              <button className="close-convo-btn" onClick={handleCancel}>Cancel</button>
            )}
          </div>
        </div>

        <div className="counselor-messages" aria-live="polite">
          <div className="anony-notice">
            <ShieldCheck size={14} />
            {appt.anonymous
              ? 'Anonymous session. Do not share your real name, address, or financial information.'
              : 'Named session.'}
          </div>
          {messages.length === 0 && (
            <div className="cc-waiting"><Clock size={16} /> <span>No messages yet — say hello, or wait until your scheduled time.</span></div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`cc-row ${m.sender === (isCounselorView ? 'counselor' : 'user') ? 'cc-row-user' : 'cc-row-counselor'}`}>
              <div className={`cc-bubble ${m.sender === (isCounselorView ? 'counselor' : 'user') ? 'cc-bubble-user' : 'cc-bubble-counselor'}`}>
                {m.sender === 'counselor' && <p className="cc-counselor-name">{m.senderName || 'Counselor'}</p>}
                <p className="cc-text">{m.text}</p>
                <p className="cc-time">{renderDate(m.createdAt)}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {appt.status === 'confirmed' && (
          <form onSubmit={handleSend} className="chat-input-bar counselor-input-bar">
            <input
              className="chat-input"
              placeholder="Write a message…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              maxLength={4000}
            />
            <button type="submit" className="chat-send-btn" disabled={!message.trim()}>
              <Send size={18} />
            </button>
          </form>
        )}
      </div>

      {!isCounselorView && appt.status === 'completed' && (
        <div className="cp-section" style={{ borderTop: '1px solid var(--color-border-soft)', marginTop: 8 }}>
          <h2 className="cp-section-title">Rate this session</h2>
          {alreadyReviewed || reviewSubmitted ? (
            <p className="cs-card-meta">Thanks — you already left feedback for this session.</p>
          ) : (
            <>
              <StarRating value={reviewRating} onChange={setReviewRating} size={26} />
              <textarea
                className="counselor-textarea"
                rows={3}
                maxLength={800}
                placeholder="Optional — how did the session go?"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                style={{ marginTop: 12 }}
              />
              <label
                className="ba-anon-toggle"
                style={{ marginTop: 8, display: 'inline-flex' }}
                title={reviewAnonymous ? 'Posted without your name' : 'Your name will show on the review'}
              >
                <input type="checkbox" checked={reviewAnonymous} onChange={() => setReviewAnonymous((v) => !v)} style={{ display: 'none' }} />
                {reviewAnonymous ? 'Post anonymously' : `Post as ${appt.userDisplayName || 'yourself'}`}
              </label>
              <div>
                <button
                  className="btn-primary"
                  style={{ marginTop: 14 }}
                  disabled={!reviewRating || submittingReview}
                  onClick={handleSubmitReview}
                >
                  {submittingReview ? 'Submitting…' : 'Submit rating'}
                </button>
                {reviewError && (
                  <p className="auth-error" style={{ marginTop: 8 }}>{reviewError}</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {Dialog}
    </div>
  );
}

export default function AppointmentSessionPage() {
  return (
    <AuthGate>
      <AppointmentSessionContent />
    </AuthGate>
  );
}
