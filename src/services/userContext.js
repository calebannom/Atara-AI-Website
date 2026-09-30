// Turns a mood code into a short human word the model can use naturally.
const MOOD_WORDS = {
  rad: 'great',
  good: 'good',
  meh: 'okay/neutral',
  bad: 'low',
  awful: 'very low',
};

/**
 * Builds a short, privacy-conscious summary of the user's recent app activity
 * to give the AI companion context. This is NOT the full journal/mood history —
 * only a compact snapshot, kept short on purpose to protect user privacy and
 * keep the prompt token-efficient.
 */
export function buildUserContextSummary(moods, journals, goals, currentStreak) {
  const lines = [];

  // --- Mood snapshot (last entry + short recent trend, not full history) ---
  if (moods.length > 0) {
    const latest = moods[0];
    const moodWord = MOOD_WORDS[latest.mood] ?? latest.mood;
    lines.push(`Most recent logged mood: ${moodWord}${latest.activities?.length ? ` (activities: ${latest.activities.join(', ')})` : ''}.`);

    const last5 = moods.slice(0, 5).map(m => MOOD_WORDS[m.mood] ?? m.mood);
    lines.push(`Mood trend over last ${last5.length} check-ins: ${last5.join(' → ')}.`);
  }

  if (currentStreak > 0) {
    lines.push(`Current mood check-in streak: ${currentStreak} day(s).`);
  }

  // --- Journal: only a short snippet of the MOST RECENT entry, not full text ---
  if (journals.length > 0) {
    const latestJournal = journals[0];
    const snippet = latestJournal.body.length > 140
      ? latestJournal.body.slice(0, 140) + '…'
      : latestJournal.body;
    lines.push(`Most recent journal entry ("${latestJournal.title}", mood: ${MOOD_WORDS[latestJournal.mood] ?? latestJournal.mood}): "${snippet}"`);
  }

  // --- Goals: only active (incomplete) ones, with progress ---
  const activeGoals = goals.filter(g => !g.completed);
  if (activeGoals.length > 0) {
    const goalLines = activeGoals
      .slice(0, 3)
      .map(g => `${g.title} (${g.progress}/${g.target} ${g.unit})`);
    lines.push(`Active goals: ${goalLines.join('; ')}.`);
  }

  if (lines.length === 0) {
    return '';
  }

  return (
    `Here is some brief, recent context about this user from the app (use it only if naturally relevant — ` +
    `don't recite it back verbatim or bring it up unprompted every message):\n` +
    lines.map(l => `- ${l}`).join('\n')
  );
}
