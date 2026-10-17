export const goals = {
  /** {n} active goals, {avg} is a percentage like "42%". */
  subtitleActive: '{n} active · {avg} average progress',
  subtitleEmpty: 'Your long-term objectives — what all the daily work is for.',
  newGoal: 'New goal',
  tabs: {
    /** {n} is the number of goals in the tab. */
    active: 'Active · {n}',
    paused: 'Paused · {n}',
    done: 'Achieved · {n}',
  },
  emptyDoneTitle: 'No goals achieved yet',
  emptyTitle: 'Nothing here',
  emptyActive: 'A good goal is specific and measurable: “Finish 12 modules by December”, not “study more”.',
  emptyDone: 'Your first one is closer than it looks.',
  emptyPaused: 'Paused goals wait here without nagging you.',
  pace: { ahead: 'Ahead', 'on-track': 'On track', behind: 'Behind', overdue: 'Overdue' },
  paused: 'Paused',
  logProgress: 'Log progress',
  /** Toast when a goal is completed; {title} is the goal's title. */
  complete: 'Goal complete: {title}',
  addToAchievements: 'Add to achievements',
  log: {
    /** Button in the log dialog: {amount} is a number, {unit} the owner's unit. */
    button: 'Log {amount} {unit}',
    howMuch: 'How much did you do?',
    note: 'Note',
    day: 'Day',
  },
  card: {
    /** Numeric goal: {cur} of {target}, both already formatted, {unit} is the owner's unit. */
    progressNumeric: '{cur} / {target} {unit}',
    /** Milestone goal: {cur} done of {n} milestones. */
    progressMilestones: { one: '{cur} / {n} milestone', other: '{cur} / {n} milestones' },
    /** {n} days until the deadline. */
    daysLeft: { one: '{n}d left', other: '{n}d left' },
    /** {n} days past the deadline. */
    daysOver: { one: '{n}d over', other: '{n}d over' },
    /** {amount} is a number, {unit} the owner's unit. */
    needsPerDay: 'needs {amount} {unit}/day',
    openTasks: { one: '{n} open task', other: '{n} open tasks' },
    history: 'History',
    pause: 'Pause',
    resume: 'Resume',
    markComplete: 'Mark complete',
    reopen: 'Reopen',
    /** {title} is the goal's title. */
    deleteConfirm: 'Delete “{title}” and its progress history?',
  },
  editor: {
    editTitle: 'Edit goal',
    newTitle: 'New goal',
    create: 'Create goal',
    titlePlaceholder: 'e.g. Finish “Atomic Habits”',
    why: 'Why it matters',
    whyHint: 'you will see this when motivation dips',
    whyPlaceholder: 'Because…',
    measureBy: 'Measure progress by',
    aNumber: 'A number',
    milestones: 'Milestones',
    alreadyDone: 'Already done',
    target: 'Target',
    unit: 'Unit',
    unitPlaceholder: 'pages',
    addMilestone: 'Add a milestone',
    start: 'Start',
    deadline: 'Deadline',
  },
}
