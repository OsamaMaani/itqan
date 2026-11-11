import { fold } from './notes'
import type { Book, BookPlace, BookStatus, DateKey, ID, ReadingSession } from './types'

/**
 * The Library (ADR-046): what the Library screen and the reader show and count. Pure, no store,
 * no browser — the reader feeds it what it measured.
 */

/** A page counts as read once it has been the page on screen for this long in one sitting. */
export const READ_PAGE_MS = 10_000
/** Reading time stops counting after this long without a scroll, tap or key. */
export const IDLE_MS = 5 * 60_000

/** The page a book is open at; 0 = never opened and no page set. */
export function placeOf(bookId: ID, places: BookPlace[]): number {
  return places.find((p) => p.id === bookId)?.page ?? 0
}

/**
 * How far through the book, 0–1: a finished book is 1; otherwise the page it is open at over its
 * pages. A book with no page count, or not started, is 0.
 */
export function bookProgress(book: Pick<Book, 'status' | 'pages'>, page: number): number {
  if (book.status === 'finished') return 1
  if (!book.pages || page <= 0) return 0
  return Math.min(1, page / book.pages)
}

/**
 * Pages read in one sitting in the reader: distinct pages that were on screen for at least
 * READ_PAGE_MS in total. Flicking through to find a chapter counts nothing; going back to a page
 * already counted in this sitting counts it once.
 */
export function pagesRead(dwell: ReadonlyMap<number, number>, minMs = READ_PAGE_MS): number {
  let n = 0
  for (const ms of dwell.values()) if (ms >= minMs) n++
  return n
}

/**
 * Reading time to add for the interval since the last tick: the whole interval while the reader is
 * visible and was touched within IDLE_MS, otherwise none. Intervals over a minute (a sleeping
 * laptop, a phone in a pocket) count nothing, so a reader left open overnight adds no hours.
 */
export function activeMs(lastTick: number, now: number, lastInput: number, visible: boolean): number {
  const dt = now - lastTick
  if (!visible || dt <= 0 || dt > 60_000) return 0
  return now - lastInput <= IDLE_MS ? dt : 0
}

/** Pages read when a book read elsewhere moves from one page to another: forward only. */
export function pagesForward(from: number, to: number): number {
  return Math.max(0, Math.round(to) - Math.max(0, Math.round(from)))
}

export interface ReadingTotals {
  minutes: number
  pages: number
  sessions: number
  /** Distinct days with reading */
  days: number
  /** The most recent day read */
  lastDay: DateKey | null
}

/** Totals over sessions — of one book, or all of them when `bookId` is omitted. */
export function readingTotals(sessions: ReadingSession[], bookId?: ID): ReadingTotals {
  const mine = bookId ? sessions.filter((s) => s.bookId === bookId) : sessions
  const days = new Set(mine.map((s) => s.date))
  let lastDay: DateKey | null = null
  for (const d of days) if (!lastDay || d > lastDay) lastDay = d
  return {
    minutes: mine.reduce((n, s) => n + s.minutes, 0),
    pages: mine.reduce((n, s) => n + s.pages, 0),
    sessions: mine.length,
    days: days.size,
    lastDay,
  }
}

export interface LibraryFilter {
  status?: BookStatus | null
  /** Words that must all appear in the title or author (any case, any accents) */
  query?: string
}

/**
 * Books to show, in order: books being read, the most recently opened first; then books to read,
 * newest first; then finished books, the most recently finished first.
 */
export function visibleBooks(books: Book[], places: BookPlace[], f: LibraryFilter = {}): Book[] {
  const terms = fold(f.query ?? '').split(/\s+/).filter(Boolean)
  const at = new Map(places.map((p) => [p.id, p.at]))
  const rank: Record<BookStatus, number> = { reading: 0, want: 1, finished: 2 }
  const recency = (b: Book) =>
    b.status === 'reading' ? (at.get(b.id) ?? b.updatedAt) : b.status === 'finished' ? (b.finishedOn ?? b.updatedAt) : b.createdAt
  return books
    .filter((b) => !f.status || b.status === f.status)
    .filter((b) => { const h = fold(`${b.title}\n${b.author}`); return terms.every((t) => h.includes(t)) })
    .sort((a, b) => rank[a.status] - rank[b.status] || recency(b).localeCompare(recency(a)))
}

/** The book being read that was open most recently — the one to continue. */
export function continueBook(books: Book[], places: BookPlace[]): Book | null {
  return visibleBooks(books, places, { status: 'reading' })[0] ?? null
}

/** A readable title from a file name: "Atomic_Habits-James Clear.pdf" → "Atomic Habits-James Clear". */
export function titleFromFileName(name: string): string {
  return name.replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim() || name
}

/** The book that holds this PDF, if any. */
export function bookWithFile(books: Book[], hash: string): Book | undefined {
  return books.find((b) => b.file?.hash === hash)
}

/** Has the reader reached the end? The last page, or within the last two of a long book (back matter). */
export function atEnd(page: number, pages: number | null): boolean {
  if (!pages) return false
  return page >= pages || (pages > 50 && page >= pages - 1)
}
