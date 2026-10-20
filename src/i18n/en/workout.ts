/** The live workout (ADR-027): one exercise at a time, set rows, rest timer, finishing. */
export const workout = {
  title: 'Workout',
  back: 'Back to Training',
  manage: 'Exercises in this workout',
  finish: 'Finish',
  /** An exercise that has since been deleted. */
  unknownExercise: 'Exercise',
  emptyTitle: 'An empty workout',
  emptyBody: 'Add the exercises as you go.',
  addExercise: 'Add exercise',
  previous: 'Previous',
  next: 'Next',
  skip: 'Skip',
  /** Under the current exercise: what comes after it. */
  upNext: 'Next: {name}',
  /** {when} is relative: “3 days ago”. */
  lastTime: 'Last time · {when}',
  firstTime: 'First time — no history yet',
  /** The next-time suggestion; {weight} is formatted with its unit. */
  suggest: {
    up: 'Try {weight} — every set reached the top last time',
    same: 'Stay at {weight}',
    down: 'Try {weight} — sets failed two workouts running',
  },
  addSet: 'Add a set',
  /** A label and its value, e.g. “Reps: 8–10”. */
  labelValue: '{label}: {value}',
  /** Above the effort buttons of a set not yet logged: tapping one logs the set. */
  tapToLog: 'How did it feel? Tap to log the set',
  deleteSet: 'Delete set',
  less: 'Less',
  more: 'More',
  /** Seconds added to or taken off the rest timer; {n} carries its sign: “+15”. */
  secondsShort: '{n} s',
  skipRest: 'Skip',
  discardConfirm: 'Discard this workout and every set logged in it?',
  name: 'Name',
  /** Work sets logged out of planned, in the list of exercises. */
  setsDone: '{done} of {total} sets',
  moveUp: 'Move up',
  moveDown: 'Move down',
  removeExercise: 'Remove from this workout',
  discard: 'Discard workout',
  noExercises: 'No exercises match.',
  goToExercises: 'Manage exercises',
  finishTitle: 'Finish the workout?',
  keepGoing: 'Keep going',
  nothingLogged: 'Nothing is logged yet. Keep going, or discard this workout.',
  setsLogged: { one: '{n} set logged.', other: '{n} sets logged.' },
  setsLeft: { one: '{n} planned set not done — that’s fine.', other: '{n} planned sets not done — that’s fine.' },
  note: 'Note',
  notePlaceholder: 'Slept badly, shoulder felt tight…',
  doneTitle: 'Workout done',
  duration: 'Duration',
  xp: 'XP',
  /** {n} carries its sign: “+40”. */
  xpGained: '{n} XP',
  newRecords: { one: 'A new personal record', other: '{n} new personal records' },
  recordKind: {
    kg: 'Heaviest',
    reps: 'Most reps',
    seconds: 'Longest',
    meters: 'Farthest',
    e1rm: 'Est. 1-rep max',
    volume: 'Total lifted',
    repsAtKg: 'Most reps at this weight',
  },
  /** After finishing: the linked habit was ticked. */
  habitTicked: '{habit} is ticked for the day.',
  noneTitle: 'No workout in progress',
  noneBody: 'Start one from Training — today’s routine, another one, or an empty workout.',
  backToTraining: 'Go to Training',
}
