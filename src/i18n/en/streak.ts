/** The day streak and its streak savers (ADR-034): the flame on Today and the dialog it opens. */
export const streak = {
  title: 'Your streak',
  /** Under the big number of days. */
  inARow: { one: 'day in a row', other: 'days in a row' },
  best: { one: 'Best: {n} day', other: 'Best: {n} days' },
  todayDone: 'Today counts. Well done.',
  todayStart: 'Do one thing today to start a streak.',
  todaySafe: 'Do one thing today to add to it. If today slips, a saver keeps it alive.',
  todayBare: 'Do one thing today to keep it. You have no savers left.',
  savers: 'Streak savers',
  /** How many savers are held, out of the most that can be: "1 of 2". */
  held: '{held} of {max}',
  /** On the Today button and in Insights. */
  saverCount: { one: '{n} streak saver', other: '{n} streak savers' },
  toNext: '{xp} XP to your next saver',
  full: 'Full. Use one and the next starts filling.',
  used: { one: 'Savers have covered {n} day so far.', other: 'Savers have covered {n} days so far.' },
  lastWeeks: 'Last four weeks',
  legend: { active: 'Active', saved: 'Saved', missed: 'Missed' },
  howTitle: 'How savers work',
  howEarn: 'Every {xp} XP you earn gives you a streak saver. You can hold {max} at a time.',
  howUse: 'Miss a day and a saver covers it by itself. The streak lives on; a covered day just doesn’t add to it.',
  howKeep: 'Miss more days in a row than you have savers and the streak starts over, but your savers are kept.',
  howBackfill: 'Log a missed day later and its saver comes back.',
  /** Today, when savers covered the day(s) just before today and nothing is done yet today. */
  savedBanner: {
    one: 'A streak saver covered yesterday. Your streak is safe; do one thing today to keep it going.',
    other: '{n} streak savers covered the days you missed. Your streak is safe; do one thing today to keep it going.',
  },
  /** Today, in the evening, with a streak, no savers and nothing done yet today. */
  atRisk: 'No savers left: do one thing today to keep your streak.',
  /** Toast when XP earns a new saver. */
  earned: 'Streak saver earned. You hold {held} of {max}.',
}
