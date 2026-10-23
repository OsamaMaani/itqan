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
}
