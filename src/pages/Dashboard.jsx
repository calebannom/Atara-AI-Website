import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthGate from '../components/AuthGate';
import { useAuth } from '../context/AuthContext';
import { useMood } from '../context/MoodContext';
import { useGoals } from '../context/GoalContext';
import { useJournal } from '../context/JournalContext';
import { useAppointments } from '../context/AppointmentContext';
import { moodLabels } from '../constants/theme';
import MoodFace from '../components/MoodFace';
import { CounselScene, ListeningMark } from '../components/illustrations/Scenes';
import {
  Flame, Target, ArrowRight, Smile, MessageSquare, Users, CalendarDays,
  BarChart3, BookOpen, Clock, Check, Sparkles, ChevronRight, Compass,
} from 'lucide-react';
import ConfirmDialog, { useConfirm } from '../components/ConfirmDialog';
import './Dashboard.css';

const MOODS = ['rad', 'good', 'meh', 'bad', 'awful'];

const AFTER_CHECKIN = {
  rad: 'Logged. Worth remembering what today had in it.',
  good: 'Logged. Steady days are the ones that add up.',
  meh: 'Logged. Flat is allowed.',
  bad: 'Logged. Be gentle with the rest of today.',
  awful: 'Logged. That took something. Atara is here if you want to talk.',
};

/* Counts a number up once, when the tile first appears. */
function useCountUp(target, ms = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!target) { setN(0); return undefined; }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setN(target);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / ms);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

function Ring({ value, max, color, size = 52, children }) {
  const r = (size - 7) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="dash-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="var(--color-border-soft)" strokeWidth="5" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 900ms var(--ease-out)' }}
        />
      </svg>
      <span className="dash-ring-mid">{children}</span>
    </div>
  );
}

export function DashboardContent() {
  const { user } = useAuth();
  const { moods, currentStreak, addMood, loading: moodLoading } = useMood();
  const { goals, loading: goalsLoading } = useGoals();
  const { journals, loading: journalLoading } = useJournal();
  const { userAppointments, loading: apptLoading } = useAppointments();
  const { Dialog } = useConfirm();

  const [saving, setSaving] = useState(false);
  const [justLogged, setJustLogged] = useState(null);
  const shellRef = useRef(null);

  const isLoading = moodLoading || goalsLoading || journalLoading || apptLoading;
  const today = new Date().toISOString().split('T')[0];
  const todayMood = moods.find((m) => m.date === today);
  const latestMood = moods[0];
  const activeGoals = goals.filter((g) => !g.completed);
  const doneGoals = goals.filter((g) => g.completed);
  const upcoming = userAppointments
    .filter((a) => a.status === 'confirmed')
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];

  const firstName = user?.displayName?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const dateLabel = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  const streakN = useCountUp(currentStreak);
  const journalN = useCountUp(journals.length);

  const handleCheckIn = async (mood) => {
    if (saving) return;
    setSaving(true);
    try {
      await addMood(mood, [], '');
      setJustLogged(mood);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return undefined;
    const items = Array.from(el.querySelectorAll('.reveal'));
    if (!('IntersectionObserver' in window)) {
      items.forEach((i) => i.classList.add('is-in'));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.05 });
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
  }, [isLoading]);

  const actions = [
    { Icon: MessageSquare, tone: 'brand', label: 'Talk to Atara', sub: 'Any hour', to: '/chat' },
    { Icon: Users, tone: 'navy', label: 'Find a counsellor', sub: 'Real people', to: '/counselors' },
    { Icon: CalendarDays, tone: 'teal', label: 'Book a session', sub: 'Pick a time', to: '/counselors' },
    { Icon: BarChart3, tone: 'violet', label: 'Mood insights', sub: 'Your patterns', to: '/mood/insights' },
    { Icon: BookOpen, tone: 'amber', label: 'Journal', sub: 'Write it out', to: '/journal' },
    { Icon: Compass, tone: 'navy', label: 'Discover', sub: 'Reading', to: '/discover' },
  ];

  if (isLoading) {
    return (
      <div className="dash">
        <div className="dash-skeleton">
          <div className="sk sk-hero" />
          <div className="sk-row">
            <div className="sk sk-tile" /><div className="sk sk-tile" />
            <div className="sk sk-tile" /><div className="sk sk-tile" />
          </div>
          <div className="sk sk-block" />
        </div>
      </div>
    );
  }

  return (
    <div className="dash" ref={shellRef}>
      {/* ── Greeting + inline check-in ───────────────────────────────── */}
      <section className="dash-hero reveal">
        <div className="dash-hero-copy">
          <p className="dash-eyebrow"><Sparkles size={13} /> {dateLabel}</p>
          <h1 className="dash-title">{greeting}, {firstName}.</h1>

          {todayMood || justLogged ? (
            <div className="dash-logged">
              <MoodFace mood={justLogged || todayMood.mood} size={40} label />
              <div>
                <p className="dash-logged-title">
                  Today: {moodLabels[justLogged || todayMood.mood]}
                </p>
                <p className="dash-logged-sub">
                  {justLogged ? AFTER_CHECKIN[justLogged] : 'Checked in already. You can update it any time.'}
                </p>
              </div>
              <Link to="/mood" className="dash-logged-link">
                Add detail <ChevronRight size={14} />
              </Link>
            </div>
          ) : (
            <div className="dash-checkin">
              <p className="dash-checkin-q">How are you feeling today?</p>
              <div className="dash-checkin-row">
                {MOODS.map((m) => (
                  <button
                    key={m}
                    className="dash-checkin-btn"
                    onClick={() => handleCheckIn(m)}
                    disabled={saving}
                    title={moodLabels[m]}
                  >
                    <MoodFace mood={m} size={38} label />
                    <span>{moodLabels[m]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="dash-hero-art" aria-hidden="true">
          <CounselScene className="dash-scene" />
        </div>
      </section>

      {/* ── Stat tiles ───────────────────────────────────────────────── */}
      <section className="dash-tiles">
        <article className="dash-tile reveal">
          <Ring value={Math.min(currentStreak, 7)} max={7} color="var(--brand)">
            <Flame size={17} />
          </Ring>
          <div>
            <p className="dash-tile-label">Check-in streak</p>
            <p className="dash-tile-value">{streakN}<span> day{streakN === 1 ? '' : 's'}</span></p>
          </div>
        </article>

        <article className="dash-tile reveal" style={{ transitionDelay: '60ms' }}>
          <span className="dash-tile-face">
            {latestMood
              ? <MoodFace mood={latestMood.mood} size={44} />
              : <Smile size={22} className="dash-tile-blank" />}
          </span>
          <div>
            <p className="dash-tile-label">Latest mood</p>
            <p className="dash-tile-value dash-tile-value-sm">
              {latestMood ? moodLabels[latestMood.mood] : 'Not yet'}
            </p>
          </div>
        </article>

        <article className="dash-tile reveal" style={{ transitionDelay: '120ms' }}>
          <Ring value={doneGoals.length} max={goals.length || 1} color="var(--teal)">
            <Target size={17} />
          </Ring>
          <div>
            <p className="dash-tile-label">Goals</p>
            <p className="dash-tile-value">
              {activeGoals.length}<span> active</span>
            </p>
          </div>
        </article>

        <article className="dash-tile reveal" style={{ transitionDelay: '180ms' }}>
          <span className="dash-tile-face dash-tile-amber"><BookOpen size={20} /></span>
          <div>
            <p className="dash-tile-label">Journal entries</p>
            <p className="dash-tile-value">{journalN}</p>
          </div>
        </article>
      </section>

      {/* ── Quick actions ────────────────────────────────────────────── */}
      <section className="dash-block reveal">
        <div className="dash-block-head">
          <h2 className="dash-h2">Where would you like to go?</h2>
        </div>
        <div className="dash-actions">
          {actions.map(({ Icon, label, sub, to, tone }) => (
            <Link key={label} to={to} className={`dash-action tone-${tone}`}>
              <span className="dash-action-icon"><Icon size={19} /></span>
              <span className="dash-action-text">
                <span className="dash-action-label">{label}</span>
                <span className="dash-action-sub">{sub}</span>
              </span>
              <ArrowRight size={15} className="dash-action-arrow" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Recent + next session ────────────────────────────────────── */}
      <section className="dash-split">
        <div className="dash-panel reveal">
          <div className="dash-block-head">
            <h2 className="dash-h2">Recently</h2>
            <Link to="/mood" className="dash-quiet-link">All check-ins <ChevronRight size={13} /></Link>
          </div>
          {moods.length === 0 && journals.length === 0 ? (
            <div className="dash-empty">
              <ListeningMark size={54} />
              <p className="dash-empty-title">Nothing here yet</p>
              <p className="dash-empty-sub">
                Your first check-in takes about ten seconds, and it is what everything
                else on this page is built from.
              </p>
              <Link to="/mood" className="dash-btn">Log your first mood</Link>
            </div>
          ) : (
            <ul className="dash-feed">
              {moods.slice(0, 3).map((m) => (
                <li key={m.id}>
                  <Link to="/mood" className="dash-feed-row">
                    <MoodFace mood={m.mood} size={30} />
                    <span className="dash-feed-main">
                      <span className="dash-feed-title">Mood check-in — {moodLabels[m.mood]}</span>
                      {m.activities?.length > 0 && (
                        <span className="dash-feed-sub">{m.activities.slice(0, 3).join(' · ')}</span>
                      )}
                    </span>
                    <span className="dash-feed-time">{m.date}</span>
                  </Link>
                </li>
              ))}
              {journals.slice(0, 2).map((j) => (
                <li key={j.id}>
                  <Link to="/journal" className="dash-feed-row">
                    <span className="dash-feed-icon"><BookOpen size={15} /></span>
                    <span className="dash-feed-main">
                      <span className="dash-feed-title">{j.title || 'Journal entry'}</span>
                      <span className="dash-feed-sub">{(j.body || '').slice(0, 68)}…</span>
                    </span>
                    <span className="dash-feed-time">{j.date}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="dash-panel reveal" style={{ transitionDelay: '80ms' }}>
          <div className="dash-block-head">
            <h2 className="dash-h2">Your next session</h2>
          </div>
          {upcoming ? (
            <div className="dash-next">
              <div className="dash-next-when">
                <p className="dash-next-time">{upcoming.time}</p>
                <p className="dash-next-date">
                  {new Date(`${upcoming.date}T00:00:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="dash-next-body">
                <p className="dash-next-who">{upcoming.counselorName || 'Your counsellor'}</p>
                <p className="dash-next-meta"><Clock size={12} /> 50 minutes</p>
                {upcoming.subject && <p className="dash-next-subject">“{upcoming.subject}”</p>}
              </div>
              <Link to={`/appointments/${upcoming.id}`} className="dash-btn dash-btn-block">
                Open session
              </Link>
            </div>
          ) : (
            <div className="dash-cta-card">
              <ListeningMark size={58} />
              <p className="dash-cta-title">Talk to a real person</p>
              <p className="dash-cta-sub">
                Browse verified counsellors, see when they are free, and book —
                anonymously if you would rather.
              </p>
              <Link to="/counselors" className="dash-btn dash-btn-block">
                Find a counsellor <ArrowRight size={15} />
              </Link>
            </div>
          )}

          <div className="dash-goals">
            <p className="dash-mini-head">
              <Target size={13} /> Active goals
            </p>
            {activeGoals.length === 0 ? (
              <p className="dash-mini-empty">
                No goals yet. <Link to="/goals">Set a small one</Link>.
              </p>
            ) : (
              <ul className="dash-goal-list">
                {activeGoals.slice(0, 3).map((g) => {
                  const pct = g.target ? Math.min(100, Math.round((g.progress / g.target) * 100)) : 0;
                  return (
                    <li key={g.id}>
                      <div className="dash-goal-top">
                        <span className="dash-goal-title">{g.title}</span>
                        <span className="dash-goal-count">{g.progress}/{g.target}</span>
                      </div>
                      <div className="dash-goal-bar">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </section>

      {Dialog}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardContent />
    </AuthGate>
  );
}
