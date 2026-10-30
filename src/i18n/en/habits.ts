export const habits = {
  everyDay: 'Every day',
  timesAWeek: { one: '{n}× a week', other: '{n}× a week' },
  subtitle: 'Small, consistent actions. Tap any day to check it off — you can fill in days you forgot.',
  newHabit: 'New habit',
  emptyTitle: 'No habits yet',
  emptyBody: 'Start with one you can do even on a bad day — 5 minutes of French, 1 page of Quran.',
  editHabit: 'Edit habit',
  focusOnThis: 'Focus on this habit',
  /** {target} is a number, {unit} is the unit the owner typed (pages, min…). */
  targetPerDay: '{target} {unit}/day',
  /** Label under the current-streak number on a habit card; must read right under any number (1, 2, 11…). */
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
  /** A counted habit's round (ADR-038): round {n}, {into} of {size}; {unit} is the owner's unit. */
  roundLine: 'Round {n} · {into}/{size} {unit}',
  /** After roundLine: when the round should end at the recent pace; {date} is like "Nov 30". */
  roundFinish: 'ends around {date}',
  /** Timed habits (ADR-043): a habit done between two prayers or clock times. */
  window: {
    /** The prayers, as they are usually named in the language. */
    prayers: { fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' },
    /** {n} minutes after a prayer; {prayer} is its name. */
    after: '{n} min after {prayer}',
    before: '{n} min before {prayer}',
    /** A window: {start} and {end} are a prayer (“Asr”, “15 min after Asr”) or a clock time. */
    sameDay: '{start} – {end}',
    nextDay: '{start} – {end} the next day',
    laterDays: { one: '{start} – {end}, {n} day later', other: '{start} – {end}, {n} days later' },
    countsOpen: 'counts for the day it opens',
    countsClose: 'counts for the day it closes',
  },
  tile: {
    /** A timed habit before it opens, counting down: {span} like “1h 20m”, {time} a clock time (or “Fri 3:12 PM”). */
    opensIn: 'Opens in {span} · {time}',
    opensAt: 'Opens at {time}',
    /** While it is open, counting down. */
    left: '{span} left · until {time}',
    openUntil: 'Open until {time}',
    closedAt: 'Closed at {time}',
    /** A clock time on another day: {day} is a short weekday (“Fri”), {time} the time. */
    dayTime: '{day} {time}',
    /** A timed habit that counts for another day than today; {day} is a weekday (“Friday”). */
    forDay: 'For {day}',
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
    /** Optional size of a whole round of a counted habit (ADR-038). */
    round: 'Full round',
    roundHint: 'optional — the whole of it, e.g. 604 pages of the Quran',
    roundSizePlaceholder: 'size',
    /** Where the owner is now in the round, e.g. page 120. */
    roundAt: 'Where you are in it now',
    /** Timed habits (ADR-043). */
    timed: 'Only at certain times',
    timedHint: 'Tie it to prayers or clock times — e.g. Friday between Asr and Maghrib.',
    opens: 'Opens',
    closes: 'Closes',
    /** In the list of prayers: a clock time instead. */
    setTime: 'A set time',
    /** Offsets from a prayer: exactly at it, {n} minutes after or before. */
    onTime: 'on time',
    offsetAfter: '{n} min after',
    offsetBefore: '{n} min before',
    /** When it closes, after “Closes … on”. */
    closesSameDay: 'the same day',
    closesNextDay: 'the next day',
    closesLater: { one: '{n} day later', other: '{n} days later' },
    countsFor: 'Count it as done on',
    countsForHint: 'It spans more than one day — which day should it count for?',
    dayItOpens: 'The day it opens',
    dayItCloses: 'The day it closes',
    /** {day} is a weekday, e.g. “Thursday”. */
    dayItOpensNamed: 'The day it opens ({day})',
    dayItClosesNamed: 'The day it closes ({day})',
    openingDaysHint: 'Pick the days it opens on.',
    countdown: 'Count down on Today',
    /** The next window, as an example: {opens} and {closes} are like “Thu, Oct 29, 3:12 PM”. */
    next: 'Next: {opens} → {closes}',
    /** {link} is a link whose text is noPlaceLink. */
    noPlace: 'Prayer times need your location: set it in {link}.',
    noPlaceLink: 'Settings → Day and prayers',
    backwards: {
      one: 'On {n} day of the coming year it closes before it opens; that day it is an ordinary habit.',
      other: 'On {n} days of the coming year it closes before it opens; those days it is an ordinary habit.',
    },
    backwardsAlways: 'It closes before it opens. Choose a later time, or close it the next day.',
  },
}
