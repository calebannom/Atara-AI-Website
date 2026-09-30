import React, { useEffect, useRef, useState } from 'react';
import AuthGate from '../components/AuthGate';
import { useAuth } from '../context/AuthContext';
import { useCounselor } from '../context/CounselorContext';
import {
  DAYS, EMPTY_AVAILABILITY, APPOINTMENT_DURATION_MIN,
  normalizeAvailability, invalidDays,
} from '../constants/availability';
import { CalendarClock, Check } from 'lucide-react';
import './Page.css';
import './CounselorAvailability.css';

function CounselorAvailabilityContent() {
  const { user } = useAuth();
  const { getCounselorProfile, updateAvailability } = useCounselor();
  const ownProfile = user ? getCounselorProfile(user.uid) : null;

  const [availability, setAvailability] = useState(EMPTY_AVAILABILITY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [hydrated, setHydrated] = useState(false);
  // Flipped the instant the counselor touches a toggle or a time input.
  // The stored availability only arrives once the directory listener
  // resolves, which can land *after* editing has already started —
  // hydrating on top of those edits silently reverted them, and the save
  // that followed then wrote the reverted week back to Firestore. Edits win.
  const hasEdited = useRef(false);

  // Sync in the counselor's real saved availability once it arrives from
  // the directory listener — once only, and never over live edits.
  useEffect(() => {
    if (hydrated || hasEdited.current || !ownProfile) return;
    setAvailability(normalizeAvailability(ownProfile.availability));
    setHydrated(true);
  }, [ownProfile, hydrated]);

  const updateDay = (key, patch) => {
    hasEdited.current = true;
    setAvailability((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    setSaved(false);
    setError('');
  };

  const handleSave = async () => {
    // A window shorter than one session saves fine but leaves patients with
    // zero bookable slots — which reads as "the save didn't work".
    const tooShort = invalidDays(availability);
    if (tooShort.length > 0) {
      setSaved(false);
      setError(
        `${tooShort.join(', ')}: the end time needs to be at least ${APPOINTMENT_DURATION_MIN} minutes after the start time, otherwise no session can be booked.`
      );
      return;
    }

    setSaving(true);
    setError('');
    try {
      const stored = await updateAvailability(availability);
      // Show exactly what was written, so the screen matches what patients see.
      setAvailability(stored);
      hasEdited.current = false;
      setHydrated(true);
      setSaved(true);
    } catch (err) {
      setSaved(false);
      setError(err?.message || 'We could not save your availability. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cav-page">
      <div className="page-head-row">
        <div className="page-head-text">
          <div className="page-icon-badge page-icon-primary"><CalendarClock size={18} /></div>
          <div>
            <h1 className="page-title" style={{ fontSize: 30 }}>Availability</h1>
            <p className="page-head-sub">Set the hours patients can book you for a chat session</p>
          </div>
        </div>
      </div>

      {!hydrated && !hasEdited.current && (
        <p className="cav-note">Loading your saved availability…</p>
      )}

      <div className="cav-list">
        {DAYS.map((d) => {
          const day = availability[d.key] || { enabled: false, start: '09:00', end: '17:00' };
          return (
            <div key={d.key} className={`cav-row ${day.enabled ? 'cav-row-active' : ''}`}>
              <label className="cav-day-toggle">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={(e) => updateDay(d.key, { enabled: e.target.checked })}
                />
                <span>{d.label}</span>
              </label>
              {day.enabled && (
                <div className="cav-time-inputs">
                  <input
                    type="time"
                    value={day.start}
                    onChange={(e) => updateDay(d.key, { start: e.target.value })}
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={day.end}
                    onChange={(e) => updateDay(d.key, { end: e.target.value })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="cav-error" role="alert">{error}</p>}

      <button className="btn-primary" style={{ marginTop: 24 }} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : saved ? <><Check size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> Saved</> : 'Save availability'}
      </button>

      {saved && (
        <p className="cav-note">
          Saved. Patients can now see these days and times on your profile and when booking a session.
        </p>
      )}
    </div>
  );
}

export default function CounselorAvailabilityPage() {
  return (
    <AuthGate>
      <CounselorAvailabilityContent />
    </AuthGate>
  );
}
