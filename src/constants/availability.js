// Shared helpers for counselor availability + appointment slot generation.

export const DAYS = [
  { key: 'sun', label: 'Sunday' },
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
];

const DAY_KEYS_BY_INDEX = DAYS.map((d) => d.key);

// A counselor's availability is stored as:
// { mon: { enabled: true, start: '09:00', end: '16:00' }, tue: {...}, ... }
export const EMPTY_AVAILABILITY = DAYS.reduce((acc, d) => {
  acc[d.key] = { enabled: false, start: '09:00', end: '17:00' };
  return acc;
}, {});

export const APPOINTMENT_DURATION_MIN = 50;

export function dayKeyForDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return DAY_KEYS_BY_INDEX[d.getDay()];
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Returns an array of "HH:MM" start times for a given day's availability window,
// spaced by APPOINTMENT_DURATION_MIN, minus any already-booked times.
export function generateSlotsForDay(availability, dateStr, bookedTimes = []) {
  const dayKey = dayKeyForDate(dateStr);
  const dayAvail = availability?.[dayKey];
  if (!dayAvail?.enabled || !dayAvail.start || !dayAvail.end) return [];

  const startMin = toMinutes(dayAvail.start);
  const endMin = toMinutes(dayAvail.end);

  // If the requested date is today, don't offer slots that have already
  // started (or start within the next hour — not enough notice to prep).
  const now = new Date();
  const isToday = dateStr === now.toISOString().split('T')[0];
  const cutoffMin = isToday ? (now.getHours() * 60 + now.getMinutes() + 60) : -1;

  const slots = [];
  for (let t = startMin; t + APPOINTMENT_DURATION_MIN <= endMin; t += APPOINTMENT_DURATION_MIN) {
    if (t < cutoffMin) continue;
    const slot = toHHMM(t);
    if (!bookedTimes.includes(slot)) slots.push(slot);
  }
  return slots;
}

// Next N calendar dates (including today) as { dateStr, label } for the date picker.
export function nextDates(count = 14) {
  const out = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    out.push({
      dateStr,
      label: d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
    });
  }
  return out;
}

export function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Coerces whatever the availability editor is holding into a complete,
// Firestore-safe record for all seven days. setDoc(..., { merge: true })
// merges nested maps key-by-key, so a partial/missing day would silently
// leave whatever was stored before in place — this makes every save a
// full, unambiguous statement of the week.
export function normalizeAvailability(availability) {
  return DAYS.reduce((acc, d) => {
    const day = availability?.[d.key] || {};
    acc[d.key] = {
      enabled: day.enabled === true,
      start: TIME_RE.test(day.start) ? day.start : '09:00',
      end: TIME_RE.test(day.end) ? day.end : '17:00',
    };
    return acc;
  }, {});
}

// Enabled days only, in week order — used by the counselor editor to
// validate before saving and by the patient-facing profile to list the
// days/times a counselor can actually be booked for.
export function enabledDays(availability) {
  return DAYS.filter((d) => availability?.[d.key]?.enabled).map((d) => ({
    key: d.key,
    label: d.label,
    start: availability[d.key].start,
    end: availability[d.key].end,
  }));
}

// Returns the labels of enabled days whose window can't hold a session,
// so the editor can say why nothing would ever be bookable.
export function invalidDays(availability) {
  return enabledDays(availability)
    .filter((d) => toMinutes(d.end) - toMinutes(d.start) < APPOINTMENT_DURATION_MIN)
    .map((d) => d.label);
}
