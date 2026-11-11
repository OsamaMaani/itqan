export const focus = {
  /** The app name, in the browser tab title and notification titles. */
  appName: 'Itqan',
  /** Browser tab title while a timer runs. {icon} is ▶ or ⏸, {time} the remaining mm:ss, {mode} the current state, {app} the app name. */
  tabTitle: '{icon} {time} · {mode} — {app}',
  subtitle: 'One thing at a time. Sessions are logged automatically and earn XP.',
  /** Small caption above the timer. */
  state: { break: 'Break', focus: 'Focus', ready: 'Ready' },
  /** Under the timer when nothing is typed yet. */
  idleLabel: 'What will you work on?',
  /** The name given to a session when the person types none; it is stored and shown in the session list later. */
  defaultLabel: 'Focus',
  /** The name given to a break; it is stored in the session history. */
  breakLabel: 'Break',
  labelPlaceholder: 'What are you working on?',
  task: 'Task',
  habit: 'Habit',
  /** Under the habit picker: finishing the session adds its minutes to the habit. {name} is the habit's name. */
  habitAddsMinutes: 'Counts its minutes toward “{name}”',
  /** Under the habit picker: finishing the session checks the habit in once. {name} is the habit's name. */
  habitChecksIn: 'Checks in “{name}” when you finish',
  start: 'Start focus',
  /** Button: start a break. */
  takeBreak: 'Break',
  pause: 'Pause',
  resume: 'Resume',
  finish: 'Finish',
  finishTitle: 'Stop and save the minutes so far',
  discard: 'Discard',
  thisWeek: 'This week',
  weekByArea: 'This week by area',
  todaysSessions: 'Today’s sessions',
  noSessionsTitle: 'No sessions yet',
  noSessionsBody: 'Your first 25 minutes are the hardest. Start small.',
  deleteSession: 'Delete session',
  /** System notification when a focus session ends. {n} is the minutes. */
  focusDoneNotify: 'Focus done — {n} min. Take a break.',
  breakOverNotify: 'Break over. Ready for the next one?',
  /** Under Start, until notifications are allowed (ADR-031). {link} is a button with notifyHintLink. */
  notifyHint: 'Want a notification when it ends? {link}',
  notifyHintLink: 'Turn them on in Settings',
  /** Toast when a focus session ends. */
  focusLogged: { one: '{n} minute of focus logged', other: '{n} minutes of focus logged' },
  startBreak: 'Start break',
  breakFinished: 'Break finished',
  /** Focus cycles (ADR-049): sessions and breaks one after another. */
  cycle: {
    /** The two ways to start, as a switch above the timer settings. */
    mode: { single: 'One session', cycle: 'Cycle' },
    /** Ready-made plans. */
    presets: { classic: 'Classic', deep: 'Deep work', marathon: 'Marathon' },
    /** A plan's shape on its chip. {n} sessions, {focus} and {brk} minutes. */
    shape: '{n} × {focus} / {brk} min',
    sessions: 'Sessions',
    focusLength: 'Focus (min)',
    breakLength: 'Break (min)',
    longBreak: 'Long break (min)',
    /** Select: after how many sessions the long break comes. */
    longBreakEvery: 'Long break after',
    /** Option when the long break comes after every single session (exactly one — its own message). */
    longBreakEveryOne: 'every session',
    longBreakEveryN: { one: 'every {n} session', other: 'every {n} sessions' },
    noLongBreak: 'No long break',
    steps: 'Steps',
    /** A step in the list. {n} is its number among the sessions. */
    session: 'Session {n}',
    longBreak2: 'Long break',
    /** A break inserted for a prayer. {prayer} is the prayer's name. */
    prayerBreak: '{prayer} break',
    prayers: { fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' },
    /** Select on a session step: what it is for. */
    stepFor: 'For',
    sameAsCycle: 'Same as the cycle',
    removeStep: 'Remove step',
    /** Under the steps. {focus} is total focus time, {time} the clock time it ends. */
    total: '{focus} of focus · ends around {time}',
    /** A warning: a session runs into a prayer. {n} session number, {prayer} name, {time} prayer time. */
    crossing: 'Session {n} runs into {prayer} at {time}.',
    /** Button on that warning: stop for the prayer. */
    fitPrayer: 'Break for {prayer}',
    templates: 'Your templates',
    saveTemplate: 'Save as template',
    templateName: 'Template name',
    save: 'Save',
    templateSaved: 'Template saved',
    deleteTemplate: 'Delete template',
    start: 'Start cycle',
    /** Above the timer while a session runs. */
    progress: 'Session {n} of {total}',
    /** Above the timer during a break. */
    breakProgress: 'Next: session {n} of {total}',
    doneEarly: 'Done early',
    skipBreak: 'Skip break',
    endCycle: 'End cycle',
    endCycleConfirm: 'End the cycle? The focus so far is saved.',
    /** While paused. */
    whyPause: 'What interrupted you?',
    reasons: { call: 'Call', person: 'Someone', distraction: 'Distraction', prayer: 'Prayer', other: 'Other' },
    /** Paused during a break: two ways on. {time} is the break time left, {n} the next session's number. */
    continueBreak: 'Continue break · {time} left',
    startNextNow: 'Start session {n} now',
    /** When a step ends and the cycle waits. */
    focusDoneTitle: 'Session {n} of {total} done',
    lastDoneTitle: 'All {total} sessions done',
    breakDoneTitle: 'Break over',
    /** Under those titles: how long it has been waiting. {time} is mm:ss. */
    waiting: 'Waiting {time}',
    /** Buttons (with a play icon). startBreakN: {name} is the break's own name (“Break”, “Long break”, “Asr break”), {n} its minutes. startSessionN: {n} the session's number, {m} its minutes. */
    startBreakN: '{name} · {n} min',
    startSessionN: 'Start session {n} · {m} min',
    /** Small buttons that add minutes to the step that just ended. {n} is a signed number like “+5” (formatted by the app). */
    extend: '{n} min',
    keepGoing: 'Keep going',
    moreBreak: 'Longer break',
    finishCycle: 'Finish cycle',
    /** On the waiting prompt: the next session would run into a prayer. */
    nextCrossesPrayer: 'The next session runs into {prayer} at {time}.',
    openFocus: 'Open Focus',
    /** Notifications. {n} session number, {total} sessions, {m} minutes. */
    notifyFocusDone: 'Session {n} of {total} done — {m} min. Break, or keep going?',
    notifyLastDone: 'All {total} sessions done 🎉 Finish the cycle?',
    notifyBreakDone: 'Break over — session {n} of {total} is next.',
    notifyNudge: 'Still there? Your focus cycle is waiting for you.',
    /** The summary when a cycle ends. */
    summaryDone: 'Cycle complete',
    summaryEnded: 'Cycle ended',
    summarySessions: '{n} of {total} sessions',
    summaryFocus: 'of focus',
    summaryExtended: 'extended',
    summaryPauses: { one: '{n} pause', other: '{n} pauses' },
    summaryNoPauses: 'no pauses',
    dismiss: 'Done',
    /** Tag on a session in today's list that was part of a cycle. */
    tag: 'Cycle',
  },
}
