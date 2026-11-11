/** The Library screen and the PDF reader (ADR-046). */
export const library = {
  /** Under the page title. {reading} is how many books are being read. */
  subtitleCount: { one: '{n} book · {reading} reading', other: '{n} books · {reading} reading' },
  subtitleEmpty: 'Your books, open on the same page on every device.',
  addPdf: 'Add PDF',
  /** On the Add PDF button while files are being read. */
  adding: 'Adding…',
  /** Adds a book with no PDF: a paper book, or one read in another app. */
  addBook: 'Add a book',
  searchPlaceholder: 'Search title or author',
  /** The first filter chip: books of every status. */
  all: 'All',
  status: { want: 'Want to read', reading: 'Reading', finished: 'Finished' },
  /** Heading over the grid of books. */
  shelf: 'Your books',
  continueTitle: 'Continue reading',
  continue: 'Continue',
  pageOf: 'Page {page} of {pages}',
  pageOnly: 'Page {page}',
  /** A book with a known length that has not been started. */
  pagesCount: { one: '{n} page', other: '{n} pages' },
  notStarted: 'Not started',
  /** {date} is the day it was finished. */
  finishedOn: 'Finished {date}',
  /** Accessible names of the PDF icon on a book card. */
  pdfHere: 'PDF on this device',
  pdfElsewhere: 'PDF on another device',
  emptyTitle: 'Your library is empty',
  emptyBody: 'Add a PDF to read it here and pick up on the same page on your other devices. Or add a book you read on paper, and keep your page by hand.',
  noResultsTitle: 'No books match',
  noResultsBody: 'Try other words, or show all books.',
  /** Under the grid: where the files are. */
  privacyNote: 'PDFs stay on the device you add them to. Only your page, bookmarks and reading time sync.',
  added: { one: 'Added {n} book', other: 'Added {n} books' },
  addedOne: 'Added “{title}”',
  /** The same PDF was already in the library (added on another device): it is now readable here. */
  attached: '“{title}” can be read on this device now',
  notPdf: '“{name}” is not a PDF',
  unreadable: '“{name}” could not be opened',
  storageFull: 'There is no room on this device for “{name}”',
  wrongFile: '“{name}” is not the same file this book was added with. Use it for this book anyway?',

  /** Title of the dialog a book card opens. */
  details: 'Book',
  read: 'Read',
  readFrom: 'Continue from page {page}',
  noFileHere: 'This PDF is not on this device yet.',
  /** {page} is where the book was left on another device. */
  noFileHereHint: 'Choose the same file here. Itqan recognises it and opens it on page {page}.',
  pickFile: 'Choose the PDF',
  attachPdf: 'Attach a PDF',
  removeFile: 'Remove PDF from this device',
  removeFileConfirm: 'Remove the PDF from this device? The book, its page and bookmarks stay, and other devices keep their copy.',
  fileRemoved: 'PDF removed from this device',
  /** For a book read outside Itqan: the page you are on now. */
  onPage: 'I’m on page',
  minutesRead: 'Minutes read',
  updatePage: 'Update page',
  pageSaved: 'Saved: page {page}',
  reachedEnd: 'You reached the end of “{title}”.',
  markFinishedAction: 'Mark finished',
  stats: { time: 'Reading time', pages: 'Pages read', days: 'Days read' },
  noBookmarks: 'No bookmarks yet. In the reader, tap the bookmark to mark a page.',
  deleteConfirm: 'Delete “{title}” and its bookmarks? Your reading time stays in your history.',
  deleted: 'Book deleted',

  editor: {
    newTitle: 'Add a book',
    editTitle: 'Edit book',
    create: 'Add book',
    title: 'Title',
    titlePlaceholder: 'e.g. Riyad as-Salihin',
    author: 'Author',
    pages: 'Pages',
    /** Under the fields of a PDF book. */
    fileName: 'File: {name}',
    status: 'Status',
    area: 'Area',
    color: 'Cover colour',
    noColor: 'Area colour',
    notes: 'Notes',
    notesPlaceholder: 'Why you are reading it, who recommended it…',
  },

  reader: {
    back: 'Back to the library',
    loading: 'Opening…',
    error: 'This PDF could not be opened.',
    /** The page indicator in the reader's top bar. */
    pageOfShort: '{page} / {pages}',
    pageOnly: 'Page {page}',
    /** Title of the go-to-page dialog, and the name of the page slider. */
    pageInput: 'Go to page',
    /** Next to the page number in the go-to dialog. */
    ofPages: 'of {pages}',
    go: 'Go',
    bookmarkAdd: 'Bookmark this page',
    bookmarkRemove: 'Remove bookmark',
    marked: 'Bookmarked page {page}',
    bookmarks: 'Bookmarks',
    addNote: 'Add note',
    editNote: 'Edit note',
    notePrompt: 'Note for this bookmark',
    night: 'Night mode',
    day: 'Day mode',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    fitWidth: 'Fit width',
  },
}
