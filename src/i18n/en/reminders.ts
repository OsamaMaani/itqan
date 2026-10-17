export const reminders = {
  /** {when} is Today / Tomorrow / In 3 days…; {time} is a clock time. */
  whenAt: '{when} at {time}',
  now: 'Now',
  years: { one: '{n} year', other: '{n} years' },
  alert: {
    atTheTime: 'At the time',
    onTheDay: 'On the day',
    minutesBefore: { one: '{n} min before', other: '{n} min before' },
    hoursBefore: { one: '{n} hour before', other: '{n} hours before' },
    daysBefore: { one: '{n} day before', other: '{n} days before' },
    weeksBefore: { one: '{n} week before', other: '{n} weeks before' },
  },
  repeat: { none: 'Once', daily: 'Every day', weekly: 'Every week', monthly: 'Every month', yearly: 'Every year' },

  title: 'Reminders',
  subtitle: 'Important dates and things not to forget — with desktop notifications.',
  addAll: 'Add all to Calendar',
  addAllHint: 'Adds all reminders to your phone or computer calendar, with alerts',
  newReminder: 'New reminder',
  /** Quick-start buttons above the list; each creates a reminder with sensible defaults. */
  templates: {
    birthday: 'Birthday',
    anniversary: 'Anniversary',
    deadline: 'Deadline',
    bill: 'Monthly bill',
    call: 'Call someone',
  },
  emptyTitle: 'Nothing to remember yet',
  emptyBody: 'Birthdays, anniversaries, deadlines, bills, appointments — add them once and Itqan will remind you, every year if needed.',
  sections: { overdue: 'Overdue', today: 'Today', week: 'Next 7 days', later: 'Later' },
  /** {title} is a section name, {n} how many reminders it holds. */
  sectionTitle: '{title} · {n}',
  showDone: 'Show done · {n}',
  hideDone: 'Hide done · {n}',

  notifier: {
    test: 'Test',
    testShownInside: 'Shown inside Itqan only — desktop alerts need the helper',
    onTitle: 'Desktop notifications are on',
    onBody: 'They arrive even when Itqan is closed.',
    /** {when} is a date and time, e.g. “Sat, Oct 17 · 9:30 AM”. */
    onBodyNext: 'They arrive even when Itqan is closed. Next alert: {when}.',
    offlineTitle: 'The notification helper is not running',
    rejectedTitle: 'The notification helper rejected this app',
    /** {script} is a file path to a script. */
    helperBody: 'Run {script} once to (re)install it. Until then, alerts show only while Itqan is open.',
    checking: 'Connecting to desktop notifications…',
    iphoneTitle: 'On iPhone, let Calendar remind you',
    /** {button} is the label of the “Add all to Calendar” button. */
    iphoneBody: 'Tap “{button}” — your iPhone’s Calendar then alerts you even when Itqan is closed. Add new reminders later with the calendar button on each one.',
    openTitle: 'Alerts show while Itqan is open',
    openBody: 'Desktop notifications when the app is closed come with the installed local app.',
    allowBrowser: 'Allow browser notifications',
  },

  row: {
    /** The unit under the big day count on a reminder row. */
    daysUnit: { one: 'day', other: 'days' },
    markNotDone: 'Mark not done',
    markDone: 'Mark done',
    addToCalendar: 'Add to Calendar',
    /** {title} is the title of the reminder that was deleted. */
    deleted: 'Deleted “{title}”',
  },

  editor: {
    editTitle: 'Edit reminder',
    newTitle: 'New reminder',
    addButton: 'Add reminder',
    /** {title} is what the person asked to be reminded of. */
    added: "I'll remind you: {title}",
    titlePlaceholderYearly: 'e.g. Mum’s birthday',
    titlePlaceholder: 'What should I remind you of?',
    repeats: 'Repeats',
    dateHintYearly: 'the original date, e.g. birth year',
    allDay: 'All day',
    /** {date} is the next date this yearly reminder falls on. */
    next: 'Next: {date}',
    remindMe: 'Remind me',
    /** {time} is the clock time all-day reminders alert at. */
    allDayNote: 'All-day reminders alert at {time}.',
    countYears: 'Count the years (“30 years”) — untick if the year is unknown',
    aboutSomeone: 'About someone',
    nobody: 'Nobody in particular',
    important: 'Important',
    importantBody: 'The notification stays on screen until you dismiss it.',
    notesPlaceholder: 'Gift idea, address, what to prepare…',
  },
}
