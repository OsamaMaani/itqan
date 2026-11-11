import { beforeEach, describe, expect, it } from 'vitest'
import { activeMs, atEnd, bookProgress, continueBook, IDLE_MS, pagesForward, pagesRead, placeOf, readingTotals, titleFromFileName, visibleBooks } from '../library'
import { emptyData } from '../seed'
import { useStore } from '../store'
import { fromEntities, toEntities } from '../sync/entities'
import { merge, stamp } from '../sync/merge'
import type { Book, BookPlace, ReadingSession } from '../types'

const book = (b: Partial<Book> & { id: string }): Book => ({
  title: b.id, author: '', file: null, pages: null, status: 'want', startedOn: null, finishedOn: null, areaId: null, color: null,
  notes: '', habit: null, task: null, goal: null, createdAt: '2026-11-01T10:00:00.000Z', updatedAt: '2026-11-01T10:00:00.000Z', ...b,
})

const session = (r: Partial<ReadingSession> & { id: string }): ReadingSession => ({
  bookId: 'b', date: '2026-11-11', startedAt: '2026-11-11T10:00:00.000Z', minutes: 0, fromPage: 1, toPage: 1, pages: 0, habitId: null, habitAmount: 0, ...r,
})

describe('how far through a book', () => {
  it('is the page it is open at over its pages, never above 1', () => {
    expect(bookProgress({ status: 'reading', pages: 200 }, 50)).toBe(0.25)
    expect(bookProgress({ status: 'reading', pages: 200 }, 250)).toBe(1)
  })
  it('a finished book is 1 wherever its page is; an unknown length or no page is 0', () => {
    expect(bookProgress({ status: 'finished', pages: 200 }, 3)).toBe(1)
    expect(bookProgress({ status: 'finished', pages: null }, 0)).toBe(1)
    expect(bookProgress({ status: 'reading', pages: null }, 80)).toBe(0)
    expect(bookProgress({ status: 'want', pages: 300 }, 0)).toBe(0)
  })
  it('the end is the last page, or the last two of a long book', () => {
    expect(atEnd(10, 10)).toBe(true)
    expect(atEnd(9, 10)).toBe(false)
    expect(atEnd(299, 300)).toBe(true)
    expect(atEnd(298, 300)).toBe(false)
    expect(atEnd(500, null)).toBe(false)
  })
})

describe('pages read in one sitting', () => {
  it('counts distinct pages that stayed on screen 10 seconds or more', () => {
    expect(pagesRead(new Map([[1, 12_000], [2, 9_999], [3, 10_000], [40, 60_000]]))).toBe(3)
  })
  it('flicking through counts nothing', () => {
    const dwell = new Map<number, number>()
    for (let p = 1; p <= 200; p++) dwell.set(p, 300)
    expect(pagesRead(dwell)).toBe(0)
  })
  it('a page read and then returned to counts once (one entry per page)', () => {
    expect(pagesRead(new Map([[5, 25_000]]))).toBe(1)
  })
})

describe('active reading time', () => {
  const t0 = 1_000_000
  it('counts the interval while visible and recently touched', () => {
    expect(activeMs(t0, t0 + 1000, t0, true)).toBe(1000)
    expect(activeMs(t0, t0 + 1000, t0 + 1000 - IDLE_MS, true)).toBe(1000)
  })
  it('counts nothing when idle, hidden, or after a long gap (a sleeping laptop)', () => {
    expect(activeMs(t0, t0 + 1000, t0 + 999 - IDLE_MS, true)).toBe(0)
    expect(activeMs(t0, t0 + 1000, t0 + 1000, false)).toBe(0)
    expect(activeMs(t0, t0 + 8 * 3600_000, t0 + 8 * 3600_000, true)).toBe(0)
    expect(activeMs(t0, t0 - 5, t0, true)).toBe(0)
  })
})

describe('a book read elsewhere', () => {
  it('pages read are pages moved forward; going back reads nothing', () => {
    expect(pagesForward(120, 135)).toBe(15)
    expect(pagesForward(0, 20)).toBe(20)
    expect(pagesForward(135, 100)).toBe(0)
  })
})

describe('reading totals', () => {
  const rs = [
    session({ id: '1', minutes: 20, pages: 10, date: '2026-11-09' }),
    session({ id: '2', minutes: 15, pages: 6, date: '2026-11-11' }),
    session({ id: '3', minutes: 5, pages: 2, date: '2026-11-11' }),
    session({ id: '4', bookId: 'other', minutes: 60, pages: 30, date: '2026-11-12' }),
  ]
  it('per book: minutes, pages, sittings, distinct days, last day', () => {
    expect(readingTotals(rs, 'b')).toEqual({ minutes: 40, pages: 18, sessions: 3, days: 2, lastDay: '2026-11-11' })
  })
  it('across books when no book is given; nothing read is all zero', () => {
    expect(readingTotals(rs).minutes).toBe(100)
    expect(readingTotals([], 'b')).toEqual({ minutes: 0, pages: 0, sessions: 0, days: 0, lastDay: null })
  })
})

describe('the shelf', () => {
  const books = [
    book({ id: 'want-old', status: 'want', createdAt: '2026-10-01T10:00:00.000Z' }),
    book({ id: 'want-new', status: 'want', createdAt: '2026-11-01T10:00:00.000Z', title: 'Café society', author: 'Émile' }),
    book({ id: 'read-a', status: 'reading' }),
    book({ id: 'read-b', status: 'reading' }),
    book({ id: 'done', status: 'finished', finishedOn: '2026-11-02' }),
  ]
  const places: BookPlace[] = [
    { id: 'read-a', page: 10, at: '2026-11-10T10:00:00.000Z' },
    { id: 'read-b', page: 10, at: '2026-11-11T10:00:00.000Z' },
  ]
  it('reading first (last opened first), then to read (newest first), then finished', () => {
    expect(visibleBooks(books, places).map((b) => b.id)).toEqual(['read-b', 'read-a', 'want-new', 'want-old', 'done'])
  })
  it('continue = the reading book opened last', () => {
    expect(continueBook(books, places)?.id).toBe('read-b')
    expect(continueBook(books.filter((b) => b.status !== 'reading'), places)).toBeNull()
  })
  it('filters by status and by words in the title or author, ignoring case and accents', () => {
    expect(visibleBooks(books, places, { status: 'finished' }).map((b) => b.id)).toEqual(['done'])
    expect(visibleBooks(books, places, { query: 'cafe emile' }).map((b) => b.id)).toEqual(['want-new'])
  })
  it('a file name becomes a readable title', () => {
    expect(titleFromFileName('Atomic_Habits-James Clear.PDF')).toBe('Atomic Habits-James Clear')
    expect(titleFromFileName('.pdf')).toBe('.pdf')
  })
})

describe('library actions', () => {
  beforeEach(() => useStore.setState({ ...emptyData() }))

  it('a new book starts "want to read" with no links; status sets the days it was started and finished', () => {
    const s = useStore.getState()
    const id = s.addBook({ title: 'Deep Work', pages: 300 })
    expect(useStore.getState().books[0]).toMatchObject({ status: 'want', startedOn: null, finishedOn: null, habit: null, task: null, goal: null, file: null })
    s.setBookStatus(id, 'reading')
    const started = useStore.getState().books[0].startedOn
    expect(started).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    s.setBookStatus(id, 'finished')
    expect(useStore.getState().books[0]).toMatchObject({ status: 'finished', startedOn: started })
    expect(placeOf(id, useStore.getState().bookPlaces)).toBe(300)
    s.setBookStatus(id, 'reading')
    expect(useStore.getState().books[0].finishedOn).toBeNull()
  })

  it('the place is one per book, replaced by the newest page', () => {
    const s = useStore.getState()
    s.setBookPlace('b', 10)
    s.setBookPlace('b', 37.4)
    expect(useStore.getState().bookPlaces).toHaveLength(1)
    expect(placeOf('b', useStore.getState().bookPlaces)).toBe(37)
    expect(placeOf('none', useStore.getState().bookPlaces)).toBe(0)
  })

  it('a session is saved again under the same id as it grows; an empty one is not kept', () => {
    const s = useStore.getState()
    s.saveReadingSession({ id: 'r', bookId: 'b', date: '2026-11-11', startedAt: '2026-11-11T23:50:00.000Z', minutes: 0, fromPage: 1, toPage: 1, pages: 0 })
    expect(useStore.getState().readingSessions).toEqual([])
    s.saveReadingSession({ id: 'r', bookId: 'b', date: '2026-11-11', startedAt: '2026-11-11T23:50:00.000Z', minutes: 3, fromPage: 1, toPage: 4, pages: 2 })
    // Saved again after midnight: the sitting keeps the day it started on.
    s.saveReadingSession({ id: 'r', bookId: 'b', date: '2026-11-12', startedAt: '2026-11-11T23:50:00.000Z', minutes: 15, fromPage: 1, toPage: 9, pages: 7 })
    expect(useStore.getState().readingSessions).toEqual([session({ id: 'r', startedAt: '2026-11-11T23:50:00.000Z', minutes: 15, fromPage: 1, toPage: 9, pages: 7 })])
  })

  it('deleting a book removes its place and bookmarks but keeps its reading history', () => {
    const s = useStore.getState()
    const id = s.addBook({ title: 'Gone' })
    const keep = s.addBook({ title: 'Kept' })
    s.setBookPlace(id, 5); s.setBookPlace(keep, 9)
    s.addBookmark(id, 3); s.addBookmark(keep, 4, 'note')
    s.saveReadingSession({ id: 'r', bookId: id, date: '2026-11-11', startedAt: '2026-11-11T10:00:00.000Z', minutes: 10, fromPage: 1, toPage: 5, pages: 4 })
    s.deleteBook(id)
    const st = useStore.getState()
    expect(st.books.map((b) => b.title)).toEqual(['Kept'])
    expect(st.bookPlaces.map((p) => p.id)).toEqual([keep])
    expect(st.bookmarks.map((m) => m.bookId)).toEqual([keep])
    expect(st.readingSessions).toHaveLength(1)
  })

  it('deleting a habit, goal or area unlinks books without touching anything else', () => {
    const s = useStore.getState()
    const area = s.addArea({ name: 'Books', emoji: '📚', color: 'amber' })
    const habit = s.addHabit({ name: 'Read', emoji: '📚', areaId: null, schedule: { type: 'daily' }, target: 10, unit: 'pages' })
    const id = s.addBook({ title: 'Linked', areaId: area, habit: { habitId: habit, counts: 'pages' }, goal: { goalId: 'g', kind: 'pages' } })
    s.saveReadingSession({ id: 'r', bookId: id, date: '2026-11-11', startedAt: '2026-11-11T10:00:00.000Z', minutes: 10, fromPage: 1, toPage: 5, pages: 4 })
    useStore.setState({ readingSessions: useStore.getState().readingSessions.map((r) => ({ ...r, habitId: habit, habitAmount: 4 })) })
    s.deleteHabit(habit)
    s.deleteArea(area)
    useStore.setState({ goals: [{ id: 'g' } as never] })
    s.deleteGoal('g')
    const st = useStore.getState()
    expect(st.books[0]).toMatchObject({ title: 'Linked', habit: null, goal: null, areaId: null })
    expect(st.readingSessions[0]).toMatchObject({ habitId: null, habitAmount: 0, minutes: 10, pages: 4 })
  })
})

describe('sync (ADR-016) carries the library', () => {
  it('books, places, bookmarks and sessions survive the round trip through entities', () => {
    const d = {
      ...emptyData(),
      books: [book({ id: 'b', title: 'Deep Work', file: { hash: 'h1', name: 'dw.pdf', size: 9 } })],
      bookPlaces: [{ id: 'b', page: 50, at: '2026-11-11T10:00:00.000Z' }],
      bookmarks: [{ id: 'm', bookId: 'b', page: 12, note: '', createdAt: '2026-11-11T10:00:00.000Z' }],
      readingSessions: [session({ id: 'r', minutes: 5 })],
    }
    const e = toEntities(d)
    expect(Object.keys(e)).toEqual(expect.arrayContaining(['books:b', 'bookPlaces:b', 'bookmarks:m', 'readingSessions:r']))
    expect(fromEntities(e, emptyData())).toMatchObject({ books: d.books, bookPlaces: d.bookPlaces, bookmarks: d.bookmarks, readingSessions: d.readingSessions })
  })

  it('reading on the phone and renaming the book on the laptop both survive; the newest place wins', () => {
    const base = { ...emptyData(), books: [book({ id: 'b', title: 'Old title' })], bookPlaces: [{ id: 'b', page: 10, at: '2026-11-11T08:00:00.000Z' }] }
    const baseE = toEntities(base)
    const meta0 = stamp({}, baseE, {}, 1000)

    const laptop = { ...base, books: [{ ...base.books[0], title: 'New title' }] }
    const laptopE = toEntities(laptop)
    const laptopMeta = stamp(baseE, laptopE, meta0, 2000)

    const phone = { ...base, bookPlaces: [{ id: 'b', page: 50, at: '2026-11-11T09:00:00.000Z' }] }
    const phoneE = toEntities(phone)
    const phoneMeta = stamp(baseE, phoneE, meta0, 3000)

    const m = merge({ entities: laptopE, meta: laptopMeta }, { entities: phoneE, meta: phoneMeta })
    const out = fromEntities(m.entities, laptop)
    expect(out.books[0].title).toBe('New title')
    expect(out.bookPlaces[0].page).toBe(50)
  })

  it('bookmarks made on two devices before syncing are both kept', () => {
    const base = { ...emptyData(), books: [book({ id: 'b' })] }
    const baseE = toEntities(base)
    const meta0 = stamp({}, baseE, {}, 1000)
    const a = { ...base, bookmarks: [{ id: 'm1', bookId: 'b', page: 3, note: '', createdAt: '2026-11-11T08:00:00.000Z' }] }
    const b = { ...base, bookmarks: [{ id: 'm2', bookId: 'b', page: 9, note: '', createdAt: '2026-11-11T09:00:00.000Z' }] }
    const aE = toEntities(a); const bE = toEntities(b)
    const m = merge({ entities: aE, meta: stamp(baseE, aE, meta0, 2000) }, { entities: bE, meta: stamp(baseE, bE, meta0, 3000) })
    expect(fromEntities(m.entities, a).bookmarks.map((x) => x.page).sort()).toEqual([3, 9])
  })
})
