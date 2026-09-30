import React, { useState } from 'react';
import AuthGate from '../components/AuthGate';
import { useMood } from '../context/MoodContext';
import { moodLabels, moodColors, ACTIVITIES } from '../constants/theme';
import MoodFace from '../components/MoodFace';
import { Smile, Flame, Trophy, CalendarCheck, CheckCircle } from 'lucide-react';
import './Page.css';
import './Mood.css';

const MOOD_ORDER = ['awful', 'bad', 'meh', 'good', 'rad'];

function MoodContent() {
  const { moods, addMood, currentStreak, longestStreak, loading: moodLoading } = useMood();
  const [selectedMood, setSelectedMood] = useState(null);
  const [activities, setActivities] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [saveError, setSaveError] = useState('');

  const toggleActivity = (a) => {
    setActivities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  const handleSave = async () => {
    if (!selectedMood || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await addMood(selectedMood, activities, notes);
      setSaved(true);
      setSelectedMood(null);
      setActivities([]);
      setNotes('');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err?.message || 'Could not save your check-in. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mood-page">
      <div className="page-head">
        <div className="page-head-row">
          <div className="page-head-text">
            <div className="page-icon-badge page-icon-primary"><Smile size={16} /></div>
            <div>
              <h1 className="page-title">Mood Check-in</h1>
              <p className="page-head-sub">Track how you&apos;re feeling each day</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mood-stats-row">
        <div className="mood-stat-card">
          <Flame size={14} className="mood-stat-icon mood-icon-flame" />
          <div>
            <span className="mood-stat-num">{currentStreak}</span>
            <span className="mood-stat-label">Day streak</span>
          </div>
        </div>
        <div className="mood-stat-card">
          <Trophy size={14} className="mood-stat-icon mood-icon-trophy" />
          <div>
            <span className="mood-stat-num">{longestStreak}</span>
            <span className="mood-stat-label">Longest streak</span>
          </div>
        </div>
        <div className="mood-stat-card">
          <CalendarCheck size={14} className="mood-stat-icon mood-icon-check" />
          <div>
            <span className="mood-stat-num">{moods.length}</span>
            <span className="mood-stat-label">Total check-ins</span>
          </div>
        </div>
      </div>

      <div className="card mood-checkin-card">
        <div className="card-head">
          <h2 className="card-title">How are you feeling right now?</h2>
        </div>
        <div className="card-body">
          <div className="mood-picker">
            {MOOD_ORDER.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMood(m)}
                className={`mood-option ${selectedMood === m ? 'mood-option-active' : ''}`}
                disabled={saving}
              >
                <MoodFace mood={m} size={40} className="mood-emoji" />
                <span className="mood-label" style={selectedMood === m ? { color: moodColors[m] } : undefined}>
                  {moodLabels[m]}
                </span>
                {selectedMood === m && <span className="mood-option-bar" style={{ background: moodColors[m] }} />}
              </button>
            ))}
          </div>

          <div className="mood-section">
            <p className="mood-section-label">What&apos;s contributing to this?</p>
            <div className="mood-activities">
              {ACTIVITIES.map((a) => (
                <button
                  key={a}
                  onClick={() => toggleActivity(a)}
                  className={`activity-chip ${activities.includes(a) ? 'activity-chip-active' : ''}`}
                  disabled={saving}
                >
                  {activities.includes(a) && <CheckCircle size={11} />}
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div className="mood-section">
            <label className="form-label mood-textarea-label">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything you want to note about today? (optional)"
              rows={3}
              className="form-input mood-textarea"
              disabled={saving}
            />
          </div>

          <div className="mood-actions-row">
            <button
              onClick={handleSave}
              disabled={!selectedMood || saving}
              className="btn-primary mood-save-btn"
            >
              {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save check-in'}
            </button>
            {saved && (
              <span className="mood-saved-hint">Your check-in has been logged.</span>
            )}
            {saveError && (
              <span className="mood-saved-hint" style={{ color: 'var(--color-danger, #dc2626)' }}>{saveError}</span>
            )}
          </div>
        </div>
      </div>

      <div className="card mood-history-card">
        <div className="card-head">
          <h2 className="card-title">Recent check-ins</h2>
          <span className="mood-history-count">{Math.min(10, moods.length)} of {moods.length}</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {moodLoading ? (
            <div style={{ padding: '28px', textAlign: 'center' }}>
              <p className="mood-empty-text">Loading check-ins…</p>
            </div>
          ) : moods.length === 0 ? (
            <div style={{ padding: '28px', textAlign: 'center' }}>
              <p className="mood-empty-text">No check-ins yet — log your first mood above.</p>
            </div>
          ) : (
            <ul className="mood-history-list">
              {moods.slice(0, 10).map((m) => (
                <li key={m.id} className="mood-history-row">
                  <div className="mood-history-emoji-wrap">
                    <MoodFace mood={m.mood} size={32} className="mood-history-emoji" label />
                  </div>
                  <div className="mood-history-main">
                    <div className="mood-history-toprow">
                      <span className="mood-history-label" style={moodColors[m.mood] ? { color: moodColors[m.mood] } : undefined}>
                        {moodLabels[m.mood]}
                      </span>
                      {m.activities && m.activities.length > 0 && (
                        <div className="mood-history-chips">
                          {m.activities.slice(0, 3).map((a) => (
                            <span key={a} className="mood-mini-chip">{a}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {m.notes && <p className="mood-history-notes">{m.notes}</p>}
                  </div>
                  <span className="mood-history-date">{m.date}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MoodPage() {
  return (
    <AuthGate>
      <MoodContent />
    </AuthGate>
  );
}
