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
    /** Shown in a goal's details when no progress has been logged yet. */
    noHistory: 'Nothing logged yet.',
    pause: 'Pause',
    resume: 'Resume',
    markComplete: 'Mark complete',
    reopen: 'Reopen',
    /** {title} is the goal's title. */
    deleteConfirm: 'Delete “{title}” and its progress history?',
  },
  editor: {
    /** The goal helper (ADR-039): advice, never a rule. */
    helper: {
      toggle: 'How to set a good goal',
      intro: 'A few things make a goal much easier to keep. All of it is optional — it’s your goal.',
      do: 'Do',
      avoid: 'Avoid',
      dos: [
        'Be specific: “Read 12 books”, not “read more”.',
        'Make it measurable: a number to reach, or milestones to tick off.',
        'Give it a deadline: a date turns a wish into a plan.',
        'Keep it realistic: a stretch, not a strain — something you can still do in a busy week.',
        'Write down why: it carries you when motivation dips.',
        'Feed it every day: a habit or tasks that move it forward.',
      ],
      donts: [
        'Vague words — “more”, “better”, “try”.',
        'Too many goals at once: two or three you keep beat ten you drop.',
        'Goals that depend on other people’s choices — aim at what you control.',
      ],
      /** The live checklist under the title. */
      checks: { specific: 'Specific', measurable: 'Measurable', timeBound: 'Deadline', why: 'Why' },
      /** Shown under the deadline: {amount} is a number, {unit} the goal's unit (may be empty). */
      perWeek: 'That’s about {amount} {unit} a week. Does that fit your weeks?',
      /** {days} is a number of days. */
      perMilestone: 'That’s about {days} days for each milestone left.',
      far: 'That’s more than a year away — a nearer goal on the way there is easier to keep.',
    },
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
    /** Where a numeric goal's progress comes from (Training, ADR-027). */
    source: 'Progress comes from',
    sourceCheckins: 'What I log',
    sourceExercise: 'My best on an exercise',
    sourceWorkouts: 'Workouts I finish',
    exercise: 'Exercise',
    metric: 'Best',
    metrics: { kg: 'Heaviest weight', reps: 'Most reps', seconds: 'Longest time', meters: 'Farthest distance' },
    exerciseHint: 'Fills in by itself from your workouts. Warm-ups don’t count.',
    workoutsHint: 'Counts every workout you finish from the start day.',
    /** For an exercise goal: the best before you started logging it in Itqan. */
    bestBefore: 'Best so far',
    /** Target with its unit: “Target (kg)”. */
    targetIn: 'Target ({unit})',
  },
  /** A goal whose progress comes from Training. */
  linked: {
    exercise: 'Follows {exercise} — {metric}',
    workouts: 'Counts your finished workouts',
    workoutsUnit: 'workouts',
    open: 'Open Training',
  },
}
