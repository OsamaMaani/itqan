export const insights = {
  subtitle: 'Where your time and energy went — and how far you’ve come.',
  /** Range chooser: {n} days, shown as "14d". */
  rangeShort: { one: '{n}d', other: '{n}d' },
  /** Under the title: {from} and {to} are dates like "Sep 25"; changes are measured against the {n} days before. */
  rangeCaption: { one: '{from} – {to} · compared with the day before', other: '{from} – {to} · compared with the previous {n} days' },
  /** Section headings. */
  section: { overview: 'Overview', focus: 'Focus', habits: 'Habits and areas', progress: 'Progress' },
  level: 'Level',
  /** {into} and {needed} XP in this level, {total} XP overall. */
  levelProgress: '{into} / {needed} XP · {total} XP total',
  /** Footer of the level card: days in a row with any activity. */
  activeStreak: { one: '{n} active day in a row', other: '{n} active days in a row' },
  /** Footer of the level card: the longest run of any habit. */
  bestHabitStreak: { one: 'Best habit streak: {n} day', other: 'Best habit streak: {n} days' },
  /** Footer of the level card: XP earned today. */
  xpToday: '{xp} XP today',
  /** Labels of the headline numbers for the chosen period. */
  kpi: { xp: 'XP earned', tasks: 'Tasks completed', focus: 'Focus time', consistency: 'Habit consistency' },
  /** Under a headline number: its total since the start. {value} is formatted. */
  allTime: '{value} all time',
  /** Next to a change like "+12%": what it is compared with. */
  vsPrevious: 'vs previous period',
  /** A change in percentage points, e.g. "+5 pts" for 60% → 65%. {value} carries its sign. */
  points: '{value} pts',
  /** Under habit consistency when nothing was scheduled. */
  noHabitData: 'No habits to measure yet',
  xpPerDay: 'XP per day',
  /** {xp} earned over the last {n} days. */
  xpInRange: { one: '{xp} XP in {n} day', other: '{xp} XP in {n} days' },
  /** Tooltip on a bar: {date} is like "Sat, Oct 17". */
  xpTip: '{date} · {xp} XP',
  /** A chart's average line: {value} is formatted, like "42m" or "35". */
  average: 'avg {value}',
  balance: 'Balance across areas',
  noAreas: 'Create areas in Settings to see your balance.',
  /** One area's totals, joined by dots: {tasks} "3 tasks", {habitDays} "5 habit days", {focus} "1h 20m". */
  areaLine: '{tasks} · {habitDays} · {focus}',
  tasks: { one: '{n} task', other: '{n} tasks' },
  habitDays: { one: '{n} habit day', other: '{n} habit days' },
  consistency: 'Habit consistency',
  noHabits: 'No habits yet.',
  /** Totals of habits counted in pages, minutes… (ADR-038). */
  amounts: 'Amounts',
  amountsEmpty: 'Habits counted in pages, minutes or reps show their totals here.',
  /** Mean a day over the period: {n} is formatted, {unit} is the owner's unit. */
  amountPerDay: '{n} {unit}/day',
  /** Everything ever logged: {n} {unit}. */
  amountAll: '{n} {unit} in all',
  activity: 'Activity · last 6 months',
  /** The activity calendar shows either measure. */
  activityShow: { xp: 'XP', focus: 'Focus' },
  /** Tooltip on a heatmap square. */
  activityTip: '{date}: {xp} XP',
  /** Tooltip on a heatmap square showing focus: {time} like "1h 20m". */
  activityFocusTip: '{date}: {time}',
  /** {unlocked} of {total} badges. */
  badges: 'Badges · {unlocked}/{total}',
  focus: {
    open: 'Open Focus',
    total: 'Total focus',
    sessions: 'Sessions',
    avgSession: 'Average session',
    dailyAvg: 'Daily average',
    focusDays: 'Focus days',
    /** Under focus days: {focused} days with focus out of the {n} days of the period. */
    focusDaysOf: { one: '{focused} of {n} day', other: '{focused} of {n} days' },
    streak: 'Focus streak',
    /** A count of days, shown as a big number with its unit. */
    days: { one: '{n} day', other: '{n} days' },
    /** Under the focus streak: the longest run ever. */
    streakBest: { one: 'Best: {n} day', other: 'Best: {n} days' },
    /** Under the average session: the number of sessions per focus day. {value} like "2.5". */
    perFocusDay: '{value} per focus day',
    /** Under the daily average: how much of the period's days it is spread over. */
    acrossAllDays: 'Across every day of the period',
    perDay: 'Focus time per day',
    /** Tooltip on a day's bar: {date} "Sat, Oct 17", {time} "1h 20m", {sessions} "3 sessions". */
    dayTip: '{date} · {time} · {sessions}',
    sessionCount: { one: '{n} session', other: '{n} sessions' },
    timeOfDay: 'When you focus',
    /** The hour with the most focus: {from} and {to} are clock times like "9:00 AM". */
    peak: 'Peak hour: {from} – {to}',
    /** Tooltip on an hour's bar. */
    hourTip: '{from} – {to} · {time}',
    weekday: 'By weekday',
    /** Under the weekday chart's title. */
    weekdayNote: 'Average focus on each day of the week',
    /** The weekday with the highest average: {day} like "Tuesday". */
    bestWeekday: 'Strongest day: {day}',
    /** Tooltip on a weekday's bar: {day} "Tuesday", {time} "45m". */
    weekdayTip: '{day} · {time} on average',
    byArea: 'By area',
    /** Column headings of the area table. */
    col: { area: 'Area', time: 'Time', share: 'Share', sessions: 'Sessions', activity: 'Activity' },
    top: 'What you focused on',
    lengths: 'Session length',
    /** Bands of session length, in minutes. */
    band: { under15: 'Under 15m', b15: '15–29m', b30: '30–59m', b60: '60–89m', over90: '90m and over' },
    records: 'Records in this period',
    longest: 'Longest session',
    bestDay: 'Best day',
    /** Under a record: what it was and when. {label} the session's name, {date} like "Sat, Oct 17". */
    recordSub: '{label} · {date}',
    /** Under the best day: how many sessions it had. */
    bestDaySub: '{date} · {sessions}',
    emptyTitle: 'No focus sessions in this period',
    emptyBody: 'Sessions you finish on Focus show up here — time, rhythm and where it went.',
    start: 'Start a session',
    /** Pauses logged on Focus (ADR-049). */
    interruptions: 'Interruptions',
    interruptionsNote: 'Pauses in sessions and breaks, and what caused them',
    pauses: { one: '{n} pause', other: '{n} pauses' },
    /** Under the pause count: time spent paused. {time} like "1h 20m". */
    pausedFor: '{time} paused',
    /** Under the pause count: how many paused a focus session (not a break). */
    duringFocus: { one: '{n} during focus', other: '{n} during focus' },
    noReason: 'No reason given',
    noInterruptions: 'No pauses in this period.',
    /** Focus cycles in the period (ADR-049). */
    cycles: 'Focus cycles',
    /** Under the cycle count. {done} finished in full, out of {n}. */
    cyclesSub: '{done} of {n} finished in full',
  },

  /** The Reading section (ADR-047): every sitting, linked to a habit or not. */
  reading: {
    title: 'Reading',
    open: 'Library',
    time: 'Reading time',
    pages: 'Pages read',
    days: 'Reading days',
    daysOf: { one: '{read} of {n} day', other: '{read} of {n} days' },
    finished: 'Books finished',
    perDay: 'Minutes per day',
    /** {pages} is already a full phrase: "12 pages". */
    dayTip: '{date}: {time} · {pages}',
    forHabits: 'Toward habits',
    general: 'General reading',
    forHabitsValue: 'Toward habits: {time}',
    generalValue: 'General reading: {time}',
    byBook: 'By book',
    deletedBook: 'A deleted book',
    pagesCount: { one: '{n} page', other: '{n} pages' },
    speed: {
      title: 'Reading speed',
      /** {n} is a number already formatted: "32", "7.5". */
      perHour: '{n} pages an hour',
      perHourShort: '{n} pages/h',
      perMinute: '{n} pages a minute',
      minutesPerPage: '{n} min a page',
      /** {pages} is a full phrase ("120 pages"), {time} a duration. */
      from: { one: 'From {n} timed sitting: {pages} in {time}', other: 'From {n} timed sittings: {pages} in {time}' },
      before: 'Period before: {n} pages an hour',
      byDay: 'Speed by day',
      dayTip: '{date}: {speed} · {pages} in {time}',
      dayTipNone: '{date}: no timed reading',
      byDayNote: 'Pages an hour on each day you read with the time counted; the line is your pace over the whole period.',
      byPart: 'By time of day',
      parts: { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', night: 'Night' },
      fastest: 'Fastest',
      noneYet: 'No timed reading',
      byPartNote: 'By the hour a sitting started: morning from 5:00, afternoon from 12:00, evening from 17:00, night from 21:00.',
      empty: 'Speed shows once a sitting has both pages and minutes — read in the Library’s reader, or add the minutes when you update a page.',
    },
    emptyTitle: 'No reading in this period',
    emptyBody: 'Read a PDF in the Library, or update the page of a book you read on paper, and it shows here.',
  },
}
