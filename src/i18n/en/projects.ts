export const projects = {
  /** Under the page title when there are projects. */
  subtitleCount: '{n} in progress',
  subtitleEmpty: 'Bigger pieces of work, broken into tasks.',
  newProject: 'New project',
  filter: { current: 'In progress', 'on-hold': 'On hold', done: 'Done', archived: 'Archived' },
  /** A filter tab: {label} is one of the filter names, {n} how many projects are in it. */
  filterCount: '{label} · {n}',
  emptyTitle: 'No projects yet',
  emptyBody: 'A project is anything with several steps: finishing a course, a portfolio site, moving house. Give it a deadline, then add its tasks.',
  filteredEmpty: 'Nothing here',
  status: { planning: 'Planning', active: 'Active', 'on-hold': 'On hold', done: 'Done', archived: 'Archived' },
  /** How a project is doing against its deadline. */
  pace: { ahead: 'Ahead', 'on-track': 'On track', behind: 'Behind', overdue: 'Overdue' },
  progressByHand: 'Progress set by hand',
  /** {done} tasks finished out of {n} in the project. */
  tasksProgress: { one: '{done}/{n} task', other: '{done}/{n} tasks' },
  /** Same, plus how many of them are being worked on right now. */
  tasksProgressDoing: { one: '{done}/{n} task · {doing} doing', other: '{done}/{n} tasks · {doing} doing' },
  noTasksYet: 'No tasks yet',
  /** Label before the title of the project’s next task. */
  nextLabel: 'Next:',
  dueToday: 'Due today',
  daysLeft: { one: '{n} day left', other: '{n} days left' },
  daysLate: { one: '{n} day late', other: '{n} days late' },
  blocked: '{n} blocked',

  notFound: 'Project not found',
  notFoundBody: 'It may have been deleted on another device.',
  pinToToday: 'Pin to Today',
  unpinFromToday: 'Unpin from Today',
  pinnedToast: 'Pinned to Today',
  unpinnedToast: 'Removed from Today',
  editProject: 'Edit project',
  deleteProject: 'Delete project',
  /** {title} is the project’s name; {n} is how many tasks belong to it (they are kept). */
  deleteConfirm: {
    one: 'Delete “{title}” and its updates? Its {n} task is kept, just without a project.',
    other: 'Delete “{title}” and its updates? Its {n} tasks are kept, just without a project.',
  },
  completeToast: 'Project complete: {title}',
  addToAchievements: 'Add to achievements',
  /** Under the deadline figure. {date} is a short date. */
  dueOn: 'due {date}',
  noDeadline: 'no deadline',
  focused: 'focused',
  estimatedLeft: 'estimated left',
  nextAction: 'Next action',
  startAction: 'Start',
  tasksHeading: { one: 'Tasks · {n} open', other: 'Tasks · {n} open' },
  /** {n} tasks open, {blocked} of them blocked. */
  tasksHeadingBlocked: { one: 'Tasks · {n} open · {blocked} blocked', other: 'Tasks · {n} open · {blocked} blocked' },
  view: { list: 'List', board: 'Board' },
  addTaskPlaceholder: 'Add a task…  (add “today” or a day to schedule it)',
  breakItDown: 'Break it down',
  breakItDownBody: 'What is the very first step? Add it above — “today” or “friday” schedules it.',
  allTasksDone: 'All tasks done. Mark the project done, or add the next step.',
  doneHeading: 'Done · {n}',
  updatesActivity: 'Updates & activity',
  links: 'Links',

  progress: {
    fromTasks: 'From tasks',
    manual: 'Manual',
    dragToSet: 'Drag to set progress',
    /** {done} of the project’s {n} tasks are finished. */
    tasksDoneOf: { one: '{done} of {n} task done', other: '{done} of {n} tasks done' },
    addTasksOrManual: 'Add tasks, or switch to manual',
    /** {status} is one of the progress lines above; {pct} is the share of the schedule used up. */
    timePassed: '{status} · {pct} of the time has passed',
    reachedHundred: '100% — mark the project done when you’re ready',
    /** A quick-add button: {pct} is a percentage like 10%. */
    plusPct: '+{pct}',
    sliderLabel: 'Progress',
  },

  board: {
    todo: 'To do',
    doing: 'Doing',
    done: 'Done',
    addCard: 'Add a card…',
    doneEmpty: 'Finished cards land here',
    empty: 'Nothing here',
    blocked: 'Blocked',
    /** Priority badge on a card: P1 is the lowest, P3 the highest. */
    priority: 'P{n}',
    unblock: 'Unblock',
    blockedQuestion: 'Blocked?',
    /** Moves the card to the previous column (the one on the left in left-to-right languages, on the right in right-to-left ones). */
    movePrev: 'Move left',
    /** Moves the card to the next column (on the right in left-to-right languages, on the left in right-to-left ones). */
    moveNext: 'Move right',
  },

  activity: {
    placeholder: 'Post an update: what moved, what’s next, what’s in the way…',
    setProgress: 'Set progress',
    sliderLabel: 'Progress with this update',
    post: 'Post',
    posted: 'Update posted',
    /** An update that also set progress. {pct} is a percentage. */
    progressTo: 'Progress → {pct}',
    taskDone: 'Done:',
    started: 'Project started',
    deleteUpdate: 'Delete update',
    showLess: 'Show less',
    showAll: 'Show all {n}',
  },

  notesPlaceholder: 'Decisions, open questions, what you learned…',
  link: { label: 'Label', urlPlaceholder: 'https://…', remove: 'Remove link' },

  editor: {
    edit: 'Edit project',
    create: 'New project',
    createButton: 'Create project',
    namePlaceholder: 'e.g. Portfolio website',
    description: 'What is it, and what does “done” look like?',
    progress: 'Progress',
    modeTasks: 'From its tasks',
    modeManual: 'I’ll set it by hand',
    start: 'Start',
    deadline: 'Deadline',
    servesGoal: 'Serves a goal',
  },
}
