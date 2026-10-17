export const tasks = {
  /** The place for tasks without a day; also a chip on a task with no date. */
  inbox: 'Inbox',
  /** Priority chip. {n} is 1, 2 or 3 (1 is lowest). */
  priority: 'P{n}',
  /** Part of the day a task is meant for. */
  timeOfDay: { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', anytime: 'Anytime' },
  /** Task status chip: being worked on now. */
  doing: 'Doing',
  /** Task chip: waiting on something else. */
  blocked: 'Blocked',
  focusOnThis: 'Focus on this',
  moveToTomorrow: 'Move to tomorrow',
  /** Toast after deleting a task; {title} is the task. */
  deleted: 'Deleted “{title}”',
  editor: {
    editTitle: 'Edit task',
    newTitle: 'New task',
    saveChanges: 'Save changes',
    addTask: 'Add task',
    titlePlaceholder: 'What needs doing?',
    when: 'When',
    timeOfDay: 'Time of day',
    /** A choice among morning / afternoon / evening: no particular time of day. */
    anyTime: 'Any',
    priority: 'Priority',
    estimate: 'Estimate',
    /** Unit note next to the Estimate label. */
    minutesHint: 'minutes',
    estimatePlaceholder: 'e.g. 30',
    goal: 'Moves a goal forward',
    /** A choice between To do / Doing. */
    todo: 'To do',
    steps: 'Steps',
    addStep: 'Add a step',
    notesPlaceholder: 'Anything worth remembering',
  },
}
