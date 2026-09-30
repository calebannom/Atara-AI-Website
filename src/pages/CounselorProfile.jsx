import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AuthGate from '../components/AuthGate';
import { useCounselor } from '../context/CounselorContext';
import { useReviews } from '../context/ReviewContext';
import StarRating from '../components/StarRating';
import { enabledDays, formatTime } from '../constants/availability';
import { Award, ArrowLeft, MessageCircleHeart, CalendarDays, Clock } from 'lucide-react';
import './Page.css';
import './CounselorProfile.css';

function initials(name) {
  if (!name) return 'C';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function CounselorProfileContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCounselorProfile, loading } = useCounselor();
  const { getCounselorReviews } = useReviews();
  const counselor = getCounselorProfile(id);
  const [reviewData, setReviewData] = useState(null);

  useEffect(() => {
    if (!counselor) return;
    let cancelled = false;
    getCounselorReviews(counselor.id).then((data) => {
      if (!cancelled) setReviewData(data);
    });
    return () => { cancelled = true; };
  }, [counselor?.id, getCounselorReviews]);

  const handleStartConversation = () => {
    navigate('/counselor-chat', {
      state: {
        requestedCounselorId: counselor.id,
        requestedCounselorName: counselor.displayName,
      },
    });
  };

  if (loading) {
    return <p className="journal-empty">Loading…</p>;
  }

  if (!counselor) {
    return (
      <div className="counselor-profile-page">
        <Link to="/counselors" className="cp-back-link"><ArrowLeft size={14} /> Back to search</Link>
        <div className="cs-empty" style={{ marginTop: 24 }}>
          <p>We couldn't find that counselor. They may no longer be active on the platform.</p>
        </div>
      </div>
    );
  }

  // Straight off the counselor's own /counselorProfiles doc — the same
  // document their availability editor writes to, so what they save here is
  // what patients read.
  const available = enabledDays(counselor.availability);

  return (
    <div className="counselor-profile-page">
      <Link to="/counselors" className="cp-back-link"><ArrowLeft size={14} /> Back to search</Link>

      <div className="cp-header">
        <div className="cp-avatar">{initials(counselor.displayName)}</div>
        <div>
          <h1 className="page-title" style={{ fontSize: 30, marginBottom: 4 }}>{counselor.displayName}</h1>
          {counselor.specialization && <span className="cs-card-badge">{counselor.specialization}</span>}
          {typeof counselor.yearsExperience === 'number' && (
            <p className="cs-card-meta" style={{ marginTop: 8 }}>
              <Award size={13} /> {counselor.yearsExperience} years of experience
            </p>
          )}
          {reviewData?.count > 0 && (
            <p className="cs-card-meta" style={{ marginTop: 6 }}>
              <StarRating value={Math.round(reviewData.avg)} readOnly size={14} />
              {reviewData.avg.toFixed(1)} ({reviewData.count} review{reviewData.count === 1 ? '' : 's'})
            </p>
          )}
        </div>
      </div>

      {counselor.bio && (
        <section className="cp-section">
          <h2 className="cp-section-title">About</h2>
          <p className="cp-bio">{counselor.bio}</p>
        </section>
      )}

      {reviewData?.reviews?.length > 0 && (
        <section className="cp-section">
          <h2 className="cp-section-title">What patients say</h2>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 0, listStyle: 'none', margin: 0 }}>
            {reviewData.reviews.map((r) => (
              <li key={r.id} style={{ paddingBottom: 14, borderBottom: '1px solid var(--color-border-soft)' }}>
                <StarRating value={r.rating} readOnly size={14} />
                {r.comment && <p className="cp-bio" style={{ fontSize: 15, marginTop: 6 }}>{r.comment}</p>}
                <p className="cs-card-meta" style={{ marginTop: 4 }}>{r.anonymous ? 'Anonymous' : (r.userDisplayName || 'Patient')}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="cp-section">
        <h2 className="cp-section-title">Availability</h2>
        {available.length === 0 ? (
          <p className="cp-bio">
            {counselor.displayName.split(' ')[0]} hasn't published any available days yet. You can still
            start a conversation below and they'll reply when they can.
          </p>
        ) : (
          <>
            <p className="cp-bio" style={{ marginBottom: 14 }}>
              The weekly hours {counselor.displayName.split(' ')[0]} takes bookings — pick an exact time on the booking page.
            </p>
            <ul className="cp-avail-list">
              {available.map((d) => (
                <li key={d.key} className="cp-avail-row">
                  <span className="cp-avail-day">{d.label}</span>
                  <span className="cp-avail-time">
                    <Clock size={13} /> {formatTime(d.start)} – {formatTime(d.end)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="cp-section">
        <h2 className="cp-section-title">Get support</h2>
        <p className="cp-bio" style={{ marginBottom: 16 }}>
          Start a private conversation with {counselor.displayName.split(' ')[0]}, or book a scheduled session at a time that works for you. You can choose to stay anonymous either way.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={handleStartConversation}>
            <MessageCircleHeart size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
            Talk to {counselor.displayName.split(' ')[0]}
          </button>
          <Link to={`/counselors/${counselor.id}/book`} className="btn-primary" style={{ background: 'transparent', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>
            <CalendarDays size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
            Book a session
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function CounselorProfilePage() {
  return (
    <AuthGate>
      <CounselorProfileContent />
    </AuthGate>
  );
}
