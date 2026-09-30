import React, { useMemo, useState } from 'react';
import AuthGate from '../components/AuthGate';
import { useMood } from '../context/MoodContext';
import {
  TrendingUp, Smile, BarChart3, Calendar, Sparkles, Flame, ChevronDown, ChevronUp,
} from 'lucide-react';
import { moodColors, moodLabels } from '../constants/theme';
import MoodFace from '../components/MoodFace';
import './Page.css';
import './MoodInsights.css';

const MOOD_ORDER = ['awful', 'bad', 'meh', 'good', 'rad'];
const MOOD_SCORE = { awful: 0, bad: 1, meh: 2, good: 3, rad: 4 };
const MAX_SCORE = 4;

function dateKey(d) {
  return d.toISOString().split('T')[0];
}

function getDaysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function buildDays(count) {
  const arr = [];
  for (let i = count - 1; i >= 0; i--) arr.push(getDaysAgo(i));
  return arr;
}

function avgScore(items) {
  if (!items.length) return null;
  const sum = items.reduce((a, m) => a + (MOOD_SCORE[m.mood] ?? MAX_SCORE / 2), 0);
  return sum / items.length;
}

function scoreToLabel(score) {
  if (score == null) return null;
  if (score >= 3.5) return { mood: 'rad', label: moodLabels.rad, color: moodColors.rad };
  if (score >= 2.5) return { mood: 'good', label: moodLabels.good, color: moodColors.good };
  if (score >= 1.5) return { mood: 'meh', label: moodLabels.meh, color: moodColors.meh };
  if (score >= 0.5) return { mood: 'bad', label: moodLabels.bad, color: moodColors.bad };
  return { mood: 'awful', label: moodLabels.awful, color: moodColors.awful };
}

function InsightsContent() {
  const { moods, currentStreak, longestStreak, loading } = useMood();
  const [range, setRange] = useState(30);

  const days = useMemo(() => buildDays(range), [range]);
  const byDate = useMemo(() => {
    const map = new Map();
    for (const m of moods) map.set(m.date, m);
    return map;
  }, [moods]);

  const rangeMoods = useMemo(() => moods.filter((m) => {
    const key = m.date;
    return days.some((d) => dateKey(d) === key);
  }), [moods, days]);

  const distribution = useMemo(() => {
    const counts = Object.fromEntries(MOOD_ORDER.map((m) => [m, 0]));
    for (const m of rangeMoods) if (counts[m.mood] != null) counts[m.mood]++;
    return counts;
  }, [rangeMoods]);

  const currentAvg = avgScore(rangeMoods);
  const currentMoodLabel = scoreToLabel(currentAvg);

  const topActivities = useMemo(() => {
    const counter = new Map();
    for (const m of rangeMoods) {
      for (const a of (m.activities || [])) {
        counter.set(a, (counter.get(a) || 0) + 1);
      }
    }
    return [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [rangeMoods]);

  const trend = useMemo(() => {
    if (rangeMoods.length < 4) return null;
    const half = Math.floor(rangeMoods.length / 2);
    const newerScore = avgScore(rangeMoods.slice(0, half));
    const olderScore = avgScore(rangeMoods.slice(half));
    if (newerScore == null || olderScore == null) return null;
    return {
      delta: newerScore - olderScore,
      direction: newerScore >= olderScore ? 'up' : 'down',
    };
  }, [rangeMoods]);

  const chartWidth = 800;
  const chartHeight = 160;
  const paddingLeft = 28;
  const paddingRight = 12;
  const paddingTop = 16;
  const paddingBottom = 44;
  const innerW = chartWidth - paddingLeft - paddingRight;
  const innerH = chartHeight - paddingTop - paddingBottom;
  const barGap = 4;
  const barW = (innerW - barGap * (days.length - 1)) / days.length;
  const baseY = paddingTop + innerH;

  if (loading) return (
    <div className="insights-page">
      <div style={{ padding: '48px 28px', textAlign: 'center' }}>
        <p className="insight-empty-text">Loading your insights…</p>
      </div>
    </div>
  );

  return (
    <div className="insights-page">
      <div className="page-head">
        <div className="page-head-row">
          <div className="page-head-text">
            <div className="page-icon-badge page-icon-primary"><BarChart3 size={16} /></div>
            <div>
              <h1 className="page-title">Mood Insights</h1>
              <p className="page-head-sub">See how you&apos;ve been feeling over time</p>
            </div>
          </div>
          <div className="range-switcher">
            {[7, 30].map((n) => (
              <button
                key={n}
                onClick={() => setRange(n)}
                className={`range-btn ${range === n ? 'range-btn-active' : ''}`}
              >
                <Calendar size={13} />
                {n === 7 ? 'Last 7 days' : 'Last 30 days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="insights-stats">
        <div className="card insight-stat">
          <div className="insight-stat-head">
            <Smile size={14} /> <span>Average mood</span>
          </div>
          {currentMoodLabel ? (
            <p className="insight-stat-big" style={{ color: currentMoodLabel.color }}>
              <MoodFace mood={currentMoodLabel.mood} size={20} /> {currentMoodLabel.label}
            </p>
          ) : (
            <p className="insight-stat-big insight-stat-empty">—</p>
          )}
          <p className="insight-stat-sub">
            {rangeMoods.length} check-in{rangeMoods.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="card insight-stat">
          <div className="insight-stat-head">
            <TrendingUp size={14} /> <span>Trend</span>
          </div>
          {trend ? (
            <p className="insight-stat-big" style={{ color: trend.direction === 'up' ? '#059669' : '#d97706' }}>
              {trend.direction === 'up' ? <ChevronUp size={18} style={{ verticalAlign: -3 }} /> : <ChevronDown size={18} style={{ verticalAlign: -3 }} />}
              {trend.direction === 'up' ? 'Improving' : 'Dipping'}
              <span className="trend-delta"> {trend.delta >= 0 ? '+' : ''}{trend.delta.toFixed(2)}</span>
            </p>
          ) : (
            <p className="insight-stat-big insight-stat-empty">—</p>
          )}
          <p className="insight-stat-sub">First vs second half</p>
        </div>

        <div className="card insight-stat">
          <div className="insight-stat-head">
            <Flame size={14} /> <span>Current streak</span>
          </div>
          <p className="insight-stat-big" style={{ color: '#d97706' }}>
            {currentStreak} day{currentStreak === 1 ? '' : 's'}
          </p>
          <p className="insight-stat-sub">Longest: {longestStreak} days</p>
        </div>

        <div className="card insight-stat">
          <div className="insight-stat-head">
            <Sparkles size={14} /> <span>Check-ins</span>
          </div>
          <p className="insight-stat-big" style={{ color: 'var(--cw-navy-800, #0f1e3d)' }}>
            {rangeMoods.length}
          </p>
          <p className="insight-stat-sub">
            {range === 7 ? '7-day' : '30-day'} window · {
              rangeMoods.length >= range ? '100' : Math.round((rangeMoods.length / range) * 100)
            }%
          </p>
        </div>
      </div>

      <div className="card chart-card">
        <div className="card-head chart-card-head">
          <h2 className="card-title chart-card-title">
            <BarChart3 size={14} style={{ marginRight: 7 }} />
            Daily mood scores
          </h2>
          <div className="chart-legend">
            {MOOD_ORDER.map((m) => (
              <span key={m} className="legend-item">
                <span className="legend-swatch" style={{ background: moodColors[m] }} />
                <MoodFace mood={m} size={16} /> {moodLabels[m]}
              </span>
            ))}
          </div>
        </div>

        <div className="chart-wrap">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="chart-svg" role="img" aria-label={`Daily mood over the last ${range} days`}>
            <line x1={paddingLeft} x2={chartWidth - paddingRight} y1={baseY} y2={baseY} stroke="var(--color-border, #e2e8f0)" strokeWidth={1} />
            {[MAX_SCORE, 3, 2, 1, 0].map((score) => {
              const y = paddingTop + innerH - (score / MAX_SCORE) * innerH;
              return (
                <g key={score}>
                  <line x1={paddingLeft - 4} x2={paddingLeft} y1={y} y2={y} stroke="var(--color-ink-muted, #94a3b8)" strokeWidth={1} />
                  <text x={paddingLeft - 7} y={y + 3} fontSize="10" fill="var(--color-ink-muted, #94a3b8)" textAnchor="end">
                    {score === MAX_SCORE ? '😊' : score === 0 ? '😣' : score}
                  </text>
                </g>
              );
            })}

            {days.map((d, i) => {
              const key = dateKey(d);
              const mood = byDate.get(key);
              const score = mood ? (MOOD_SCORE[mood.mood] ?? MAX_SCORE / 2) : null;
              const pct = score == null ? 0 : score / MAX_SCORE;
              const h = pct * innerH;
              const x = paddingLeft + i * (barW + barGap);
              const y = baseY - h;
              const color = mood ? moodColors[mood.mood] || '#cbd5e1' : '#e5e7eb';
              const isToday = i === days.length - 1;
              const has = score != null;
              return (
                <g key={key}>
                  <rect
                    x={x}
                    y={has ? y : baseY - 4}
                    width={barW}
                    height={has ? h : 3}
                    rx={Math.min(3, barW / 2)}
                    fill={color}
                    opacity={has ? 0.95 : 0.5}
                  />
                  {mood && (
                    <g transform={`translate(${x + barW / 2 - 7}, ${y - 18})`}>
                      <MoodFace mood={mood.mood} size={14} />
                    </g>
                  )}
                  {((range === 7 || i % Math.ceil(range / 7) === 0) || isToday) && (
                    <text
                      x={x + barW / 2}
                      y={baseY + 18}
                      fontSize="10"
                      fill="var(--color-ink-muted, #94a3b8)"
                      textAnchor="middle"
                    >
                      {d.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </text>
                  )}
                  {isToday && (
                    <rect
                      x={x - 2}
                      y={paddingTop}
                      width={barW + 4}
                      height={innerH + 8}
                      rx={3}
                      fill="none"
                      stroke="var(--cw-navy-700, #1e3a5f)"
                      strokeDasharray="3 3"
                      opacity={0.25}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="insights-grid">
        <section className="card insight-card">
          <div className="card-head">
            <h2 className="card-title">Mood distribution</h2>
          </div>
          <div className="card-body" style={{ paddingTop: 4 }}>
            <ul className="distribution-list">
              {MOOD_ORDER.map((m) => {
                const count = distribution[m] || 0;
                const total = rangeMoods.length || 1;
                const pct = (count / total) * 100;
                return (
                  <li key={m} className="dist-row">
                    <span className="dist-mood">
                      <MoodFace mood={m} size={18} className="dist-emoji" />
                      <span className="dist-label">{moodLabels[m]}</span>
                    </span>
                    <div className="dist-bar">
                      <div
                        className="dist-bar-fill"
                        style={{ width: `${pct}%`, background: moodColors[m] }}
                      />
                    </div>
                    <span className="dist-count">{count}</span>
                  </li>
                );
              })}
              {rangeMoods.length === 0 && (
                <li className="insight-empty-state">
                  No check-ins yet. Head over to the Mood page to log your first one!
                </li>
              )}
            </ul>
          </div>
        </section>

        <section className="card insight-card">
          <div className="card-head">
            <h2 className="card-title">Most-tagged activities</h2>
          </div>
          <div className="card-body" style={{ paddingTop: 4 }}>
            {topActivities.length === 0 ? (
              <p className="insight-empty-text">
                Tag activities when you log your mood to see which ones show up most often.
              </p>
            ) : (
              <ul className="activity-list">
                {topActivities.map(([act, count]) => (
                  <li key={act} className="activity-row">
                    <span className="activity-name">{act}</span>
                    <div className="activity-count-wrap">
                      <div
                        className="activity-count-bar"
                        style={{
                          width: `${(count / Math.max(...topActivities.map((a) => a[1]))) * 100}%`,
                        }}
                      />
                      <span className="activity-count">{count}×</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {rangeMoods.length > 0 && (
              <p className="insight-card-sub">
                Based on your last {rangeMoods.length} check-in{rangeMoods.length === 1 ? '' : 's'}.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function MoodInsightsPage() {
  return (
    <AuthGate>
      <InsightsContent />
    </AuthGate>
  );
}
