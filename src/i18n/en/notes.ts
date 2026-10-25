/** The Notes screen (ADR-035): Keep-style notes and checklists. */
export const notes = {
  /** Under the page title: how many notes there are (not archived). */
  subtitleCount: { one: '{n} note', other: '{n} notes' },
  subtitleEmpty: 'Write it down now; find it in a second later.',
  capturePlaceholder: 'Take a note…  (Enter to save)',
  saveNote: 'Save note',
  newNote: 'New note',
  newChecklist: 'New checklist',
  searchPlaceholder: 'Search notes',
  /** The two views of the screen; {n} is how many notes are in each. */
  view: { notes: 'Notes · {n}', archive: 'Archive · {n}' },
  /** The first label filter chip: notes with any label or none. */
  allLabels: 'All',
  /** Section headings when some notes are pinned. */
  pinnedHeading: 'Pinned',
  othersHeading: 'Others',
  emptyTitle: 'No notes yet',
  emptyBody: 'Shopping lists, things to remember, quotes from a book, meeting notes — write them here. Pin what matters, label it, and turn any line into a task.',
  noResultsTitle: 'Nothing matches',
  noResultsBody: 'Try other words, or show all labels.',
  archiveEmptyTitle: 'The archive is empty',
  archiveEmptyBody: 'Archive the notes you are finished with. They stay here and in search, out of your way.',
  /** Shown in place of a title when a note has none. */
  untitled: 'Untitled note',
  /** Under a shortened checklist on a card. */
  moreItems: { one: 'and {n} more item', other: 'and {n} more items' },
  pin: 'Pin',
  unpin: 'Unpin',
  archivedToast: 'Note archived',
  unarchivedToast: 'Note moved back to your notes',
  deletedToast: 'Note deleted',
  /** The small mark on a checklist line that was made into a task. */
  madeTask: 'Made into a task',
  /** “Edited Oct 17”; {date} is a short date. */
  edited: 'Edited {date}',

  editor: {
    titlePlaceholder: 'Title',
    bodyPlaceholder: 'Write your note…',
    checklist: 'Checklist',
    addItem: 'Add an item',
    /** Turns each line of the text into a checklist line. */
    toChecklist: 'Make a checklist',
    /** Turns the checklist back into plain lines of text. */
    toText: 'Make plain text',
    removeItem: 'Remove item',
    itemToTask: 'Make this line a task',
    colour: 'Colour',
    noColour: 'No colour',
    labels: 'Labels',
    labelsPlaceholder: 'work, books, recipes',
    labelsHint: 'separate with commas',
    /** Above the labels already used on other notes, to add one with a tap. */
    labelsUsed: 'Used before',
    makeTask: 'Make a task',
  },

  toTask: {
    title: 'Make a task',
    task: 'Task',
    taskHint: 'make it the very next physical step',
    when: 'When',
    inbox: 'Inbox',
    addTask: 'Add task',
    addedInbox: 'Task added to the Inbox',
    addedToday: 'Task added for today',
    addedTomorrow: 'Task added for tomorrow',
  },

  /** The notes section on a project page and in a goal’s details. */
  linked: {
    add: 'Add a note',
    empty: 'No notes here yet.',
  },
}
