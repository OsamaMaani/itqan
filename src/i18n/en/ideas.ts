export const ideas = {
  /** {open} ideas still being worked on; {done} that were made real. */
  subtitleCount: '{open} open · {done} made real',
  subtitleEmpty: 'Catch every idea now; decide what to do with it later.',
  capturePlaceholder: 'I have an idea…  (Enter to save)',
  saveIdea: 'Save idea',
  emptyTitle: 'An empty idea box',
  emptyBody: 'Business ideas, things to learn, gifts, trips, projects — write them here in one line. Later, turn the good ones into tasks or goals.',
  /** The stages an idea moves through. */
  status: { new: 'New', exploring: 'Exploring', doing: 'Doing', done: 'Done', dropped: 'Dropped' },
  /** A short line under each stage’s name. */
  hint: { new: 'Just captured', exploring: 'Thinking it through', doing: 'Has real next steps', done: 'Made real' },
  /** The column header: {label} is a stage name, {n} how many ideas are in it. */
  columnCount: '{label} · {n}',
  showDropped: 'Show dropped ideas · {n}',
  hideDropped: 'Hide dropped ideas · {n}',
  /** How long ago an idea was captured, e.g. “3 days old”. */
  age: {
    now: 'less than a minute old',
    minutes: { one: '{n} minute old', other: '{n} minutes old' },
    hours: { one: '{n} hour old', other: '{n} hours old' },
    days: { one: '{n} day old', other: '{n} days old' },
    months: { one: '{n} month old', other: '{n} months old' },
    years: { one: '{n} year old', other: '{n} years old' },
  },
  tasks: 'Tasks',
  /** Button on an idea card: turn it into a task. */
  task: 'Task',
  projectCreated: 'Project created from your idea',
  /** The “next stage” button on an idea card. */
  moveTo: { exploring: 'Move to exploring', doing: 'Move to doing', done: 'Move to done' },
  madeReal: 'Idea made real · +20 XP',
  goalCreated: 'Goal created from your idea',

  toTask: {
    title: 'Turn into a task',
    task: 'Task',
    taskHint: 'make it the very next physical step',
    when: 'When',
    inbox: 'Inbox',
    addTask: 'Add task',
    addedInbox: 'Task added to the Inbox',
    addedToday: 'Task added for today',
    addedTomorrow: 'Task added for tomorrow',
  },

  editor: {
    title: 'Idea',
    deleted: 'Idea deleted',
    notesPlaceholder: 'Why it is interesting, first steps, open questions…',
    stage: 'Stage',
  },
}
