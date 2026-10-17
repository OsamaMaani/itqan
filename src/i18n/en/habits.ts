export const habits = {
  everyDay: 'Every day',
  timesAWeek: { one: '{n}× a week', other: '{n}× a week' },
  subtitle: 'Small, consistent actions. Tap any day to check it off — you can fill in days you forgot.',
  newHabit: 'New habit',
  emptyTitle: 'No habits yet',
  emptyBody: 'Start with one you can do even on a bad day — 5 minutes of French, 1 page of Quran.',
  editHabit: 'Edit habit',
  /** {target} is a number, {unit} is the unit the owner typed (pages, min…). */
  targetPerDay: '{target} {unit}/day',
  dayStreak: 'day streak',
  weekStreak: 'week streak',
  best: 'best',
  last30: '30 days',
  /** Tooltip on a day button: {date} is like "Sat, Oct 17". */
  dayTip: '{date}',
  /** Tooltip on a day button that has progress: {amount} is a number, {unit} is the owner's unit. */
  dayTipAmount: '{date} — {amount} {unit}',
  /** Tooltip on a heatmap square: {amount} is a number, {unit} is the owner's unit. */
  heatTip: '{date}: {amount} {unit}',
  tile: {
    done: 'Done',
    tapToComplete: 'Tap to complete',
    /** Progress on a counted habit: {amount} of {target}, {unit} is the owner's unit. */
    progress: '{amount}/{target} {unit}',
    /** Weekly habits: {met} days met out of {times} needed. */
    thisWeek: '{met}/{times} this week',
    /** Tooltip on the flame: a streak of {n} days. */
    streakDays: '{n}-day streak',
    /** Tooltip on the flame: a streak of {n} weeks. */
    streakWeeks: '{n}-week streak',
  },
  editor: {
    editTitle: 'Edit habit',
    newTitle: 'New habit',
    create: 'Create habit',
    /** {name} is the habit's name. */
    deleteConfirm: 'Delete “{name}” and all its history?',
    namePlaceholder: 'e.g. Revise Quran',
    howOften: 'How often',
    specificDays: 'Specific days',
    xTimesAWeek: 'X times a week',
    /** Follows a number input: "[3] times per week". */
    timesPerWeek: 'times per week',
    dailyTarget: 'Daily target',
    targetHint: 'leave 1 for a simple check-off',
    unitPlaceholder: 'unit (pages, min, juz…)',
  },
}
