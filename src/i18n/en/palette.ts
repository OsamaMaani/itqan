export const palette = {
  /**
   * Command bar input. {example} is `palette.example` below.
   */
  placeholder: 'Type a task (“{example}”) or a command…',
  /**
   * An example task for the command bar, parsed by quick add — so it must be a real task in this
   * language: use this language's quick-add words from src/i18n/quickAddWords.ts (a day word such as
   * "tonight") and the name of an area from the starter set (m.seed.areas) after the #.
   */
  example: 'Walk tonight #health',
  /** The Esc key cap, shown at the end of the input. */
  escKey: 'Esc',
  /** {text} is what the person typed after the "idea:" prefix, shown in bold. */
  saveIdea: 'Save idea “{text}”',
  /** {title} is the parsed task title, shown in bold. */
  addTask: 'Add task “{title}”',
  /** {text} is what the person typed after the "note:" prefix, shown in bold. */
  saveNote: 'Save note “{text}”',
  /** Toast after saving a note from the command bar. */
  noteSaved: 'Note saved',
  /** Toast after saving an idea from the command bar. */
  ideaSaved: 'Idea saved',
  /** Toast after adding a task from the command bar. */
  taskAdded: 'Added “{title}”',
  /** {page} is the name of a screen, e.g. Habits. */
  goTo: 'Go to {page}',
  /** {n} is the number of minutes, e.g. 25. */
  startFocus: 'Start a {n}-minute focus session',
  /** The name given to a focus session started from here; it is stored and shown in the session list later. */
  focusLabel: 'Focus',
  /** Training (ADR-027). {name} is the workout or routine name. */
  resumeWorkout: 'Resume workout: {name}',
  startRoutine: 'Start workout: {name}',
  startWorkout: 'Start an empty workout',
  newReminder: 'New reminder',
  recordAchievement: 'Record an achievement',
  writeMemory: 'Write a memory',
  newNote: 'New note',
  toggleDark: 'Toggle dark mode',
  downloadBackup: 'Download a backup',
  /**
   * Footer cheat sheet of quick-add syntax. Every {…} is a bold example filled in by the app:
   * {idea} the idea prefix and {note} the note prefix (both shown with ideaToken), {area} #area, {project} +project, {priority} !1–!3,
   * {days} day words joined with " / ", {time} @morning, {estimate} ~30m.
   */
  hint: '{idea} saves an idea · {note} saves a note · {area} · {project} · {priority} priority · {days} · {time} · {estimate}',
  /** A prefix as shown in the footer; {word} is this language's idea or note prefix word. */
  ideaToken: '{word}: …',
}
