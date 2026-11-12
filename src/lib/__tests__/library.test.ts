import { beforeEach, describe, expect, it } from 'vitest'
import { activeMs, atEnd, bookProgress, continueBook, IDLE_MS, pagesForward, pagesRead, placeOf, readingTotals, titleFromFileName, visibleBooks } from '../library'
import { booksToward, goalCurrent } from '../goals'
import { bookPace, dayPart, isTimed, minutesLeft, minutesPerPage, pagesPerHour, readingSpeed, readingStats } from '../insights'
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

  it('deleting a book and keeping its reading leaves a past book that names it; Insights is unchanged', () => {
    const s = useStore.getState()
    const habit = s.addHabit({ name: 'Read', emoji: '📚', areaId: null, schedule: { type: 'daily' }, target: 10, unit: 'pages' })
    const id = s.addBook({ title: 'Deep Work', author: 'Cal Newport' })
    s.updateBook(id, { pages: 300, habit: { habitId: habit, counts: 'pages' } })
    s.setBookStatus(id, 'finished')
    s.saveReadingSession({ id: 'r', bookId: id, date: '2026-11-11', startedAt: '2026-11-11T10:00:00.000Z', minutes: 20, fromPage: 1, toPage: 13, pages: 12 })
    const before = readingStats(useStore.getState().readingSessions, [...useStore.getState().books, ...useStore.getState().pastBooks], '2026-11-01', '2026-11-30')
    s.deleteBook(id)
    const st = useStore.getState()
    expect(st.books).toEqual([])
    expect(st.readingSessions).toHaveLength(1)
    expect(st.pastBooks).toEqual([expect.objectContaining({ id, title: 'Deep Work', author: 'Cal Newport', pages: 300, finishedOn: st.pastBooks[0].finishedOn })])
    expect(st.pastBooks[0].finishedOn).not.toBeNull()
    expect(readingStats(st.readingSessions, [...st.books, ...st.pastBooks], '2026-11-01', '2026-11-30')).toEqual(before)
    expect(st.habitLogs[habit]['2026-11-11']).toBe(12)
  })

  it('deleting a book with its reading removes its sittings but keeps the habit days they counted', () => {
    const s = useStore.getState()
    const habit = s.addHabit({ name: 'Read', emoji: '📚', areaId: null, schedule: { type: 'daily' }, target: 10, unit: 'pages' })
    const id = s.addBook({ title: 'Gone' })
    const other = s.addBook({ title: 'Other' })
    s.updateBook(id, { habit: { habitId: habit, counts: 'pages' } })
    s.saveReadingSession({ id: 'r1', bookId: id, date: '2026-11-11', startedAt: '2026-11-11T10:00:00.000Z', minutes: 20, fromPage: 1, toPage: 13, pages: 12 })
    s.saveReadingSession({ id: 'r2', bookId: other, date: '2026-11-11', startedAt: '2026-11-11T11:00:00.000Z', minutes: 5, fromPage: 1, toPage: 4, pages: 3 })
    s.deleteBook(id, false)
    const st = useStore.getState()
    expect(st.readingSessions.map((r) => r.id)).toEqual(['r2'])
    expect(st.pastBooks).toEqual([])
    expect(st.habitLogs[habit]['2026-11-11']).toBe(12)
  })

  it('keeping the reading of a book never read nor finished leaves nothing behind', () => {
    const s = useStore.getState()
    const id = s.addBook({ title: 'Someday' })
    s.deleteBook(id)
    expect(useStore.getState().pastBooks).toEqual([])
    s.deleteBook('no-such-book')
    expect(useStore.getState().pastBooks).toEqual([])
  })

  it('a past book syncs like any other record', () => {
    const d = {
      ...emptyData(),
      pastBooks: [{ id: 'b', title: 'Deep Work', author: '', pages: 300, startedOn: '2026-11-01', finishedOn: '2026-11-10', createdAt: '2026-11-01T10:00:00.000Z', deletedAt: '2026-11-12T10:00:00.000Z' }],
    }
    const e = toEntities(d)
    expect(e['pastBooks:b']).toEqual(d.pastBooks[0])
    expect(fromEntities(e, emptyData()).pastBooks).toEqual(d.pastBooks)
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

describe('links (ADR-047)', () => {
  beforeEach(() => useStore.setState({ ...emptyData() }))
  const habit = (unit = 'pages') => useStore.getState().addHabit({ name: 'Read', emoji: '📚', areaId: null, schedule: { type: 'daily' }, target: 10, unit })
  const sit = (id: string, bookId: string, minutes: number, pages: number, date = '2026-11-11') =>
    useStore.getState().saveReadingSession({ id, bookId, date, startedAt: `${date}T10:00:00.000Z`, minutes, fromPage: 1, toPage: 1 + pages, pages })

  it('a sitting adds its pages to the linked habit, by the difference on every save, and deleting it takes them back', () => {
    const h = habit()
    const s = useStore.getState()
    s.setHabitAmount(h, '2026-11-11', 3) // ticked by hand earlier that day
    const b = s.addBook({ title: 'B', habit: { habitId: h, counts: 'pages' } })
    sit('r', b, 5, 4)
    expect(useStore.getState().habitLogs[h]['2026-11-11']).toBe(7)
    sit('r', b, 12, 10)
    expect(useStore.getState().habitLogs[h]['2026-11-11']).toBe(13)
    expect(useStore.getState().readingSessions[0]).toMatchObject({ habitId: h, habitAmount: 10 })
    useStore.getState().deleteReadingSession('r')
    expect(useStore.getState().habitLogs[h]['2026-11-11']).toBe(3)
  })

  it('minutes count instead when the link says so; unlinked reading touches no habit', () => {
    const h = habit('min')
    const s = useStore.getState()
    const linked = s.addBook({ title: 'L', habit: { habitId: h, counts: 'minutes' } })
    const free = s.addBook({ title: 'F' })
    sit('a', linked, 25, 8)
    sit('b', free, 40, 20)
    expect(useStore.getState().habitLogs[h]).toEqual({ '2026-11-11': 25 })
    expect(useStore.getState().readingSessions.find((r) => r.id === 'b')).toMatchObject({ habitId: null, habitAmount: 0 })
  })

  it('a link changed mid-sitting applies to the next sitting; the running one keeps what it added and adds no more', () => {
    const h1 = habit(); const h2 = habit()
    const s = useStore.getState()
    const b = s.addBook({ title: 'B', habit: { habitId: h1, counts: 'pages' } })
    sit('r', b, 5, 4)
    s.updateBook(b, { habit: { habitId: h2, counts: 'pages' } })
    sit('r', b, 9, 6)
    const logs = useStore.getState().habitLogs
    expect(logs[h1]?.['2026-11-11']).toBe(4)
    expect(logs[h2]?.['2026-11-11']).toBeUndefined()
    sit('next', b, 3, 2)
    expect(useStore.getState().habitLogs[h2]['2026-11-11']).toBe(2)
  })

  it('a task is completed when the book reaches its page, once; going back never re-opens it', () => {
    const s = useStore.getState()
    const t = s.addTask({ title: 'Read to 50' })
    const b = s.addBook({ title: 'B', task: { taskId: t, untilPage: 50 } })
    s.setBookPlace(b, 49)
    expect(useStore.getState().tasks[0].done).toBe(false)
    s.setBookPlace(b, 52)
    expect(useStore.getState().tasks[0].done).toBe(true)
    s.toggleTask(t) // re-opened by hand
    s.setBookPlace(b, 30)
    expect(useStore.getState().tasks[0].done).toBe(false)
  })

  it('a task with no page is completed when the book is finished', () => {
    const s = useStore.getState()
    const t = s.addTask({ title: 'Finish it' })
    const b = s.addBook({ title: 'B', pages: 100, task: { taskId: t, untilPage: null } })
    s.setBookPlace(b, 100)
    expect(useStore.getState().tasks[0].done).toBe(false)
    s.setBookStatus(b, 'finished')
    expect(useStore.getState().tasks[0].done).toBe(true)
  })

  it('finishing ticks the linked milestone; un-finishing leaves it', () => {
    const s = useStore.getState()
    const g = s.addGoal({ title: 'Read the six books', why: '', areaId: null, kind: 'milestones', startValue: 0, target: 0, unit: '', startDate: '2026-11-01', deadline: null,
      milestones: [{ id: 'm1', title: 'Book one', done: false, doneAt: null }, { id: 'm2', title: 'Book two', done: false, doneAt: null }] })
    const b = s.addBook({ title: 'One', goal: { goalId: g, kind: 'milestone', milestoneId: 'm1' } })
    s.setBookStatus(b, 'finished')
    expect(useStore.getState().goals[0].milestones.map((m) => m.done)).toEqual([true, false])
    s.setBookStatus(b, 'reading')
    expect(useStore.getState().goals[0].milestones[0].done).toBe(true)
  })

  it('numeric goals: a finished book adds its amount, a pages book adds its page, and the goal completes when reached', () => {
    const s = useStore.getState()
    const g = s.addGoal({ title: 'Read 2 books', why: '', areaId: null, kind: 'numeric', startValue: 0, target: 2, unit: 'books', startDate: '2026-11-01', deadline: null, milestones: [] })
    const a = s.addBook({ title: 'A', goal: { goalId: g, kind: 'finished', amount: 1 } })
    const b = s.addBook({ title: 'B', goal: { goalId: g, kind: 'finished', amount: 1 } })
    s.setBookStatus(a, 'finished')
    expect(useStore.getState().goals[0].status).toBe('active')
    s.setBookStatus(b, 'finished')
    expect(useStore.getState().goals[0].status).toBe('done')

    const pagesGoal = s.addGoal({ title: 'Read 500 pages', why: '', areaId: null, kind: 'numeric', startValue: 20, target: 500, unit: 'pages', startDate: '2026-11-01', deadline: null, milestones: [] })
    const c = s.addBook({ title: 'C', pages: 300, goal: { goalId: pagesGoal, kind: 'pages' } })
    s.setBookPlace(c, 120)
    const st = useStore.getState()
    expect(goalCurrent(st.goals.find((x) => x.id === pagesGoal)!, st)).toBe(140)
    s.setBookStatus(c, 'finished')
    const st2 = useStore.getState()
    expect(goalCurrent(st2.goals.find((x) => x.id === pagesGoal)!, st2)).toBe(320)
  })

  it('booksToward ignores other goals and unfinished "finished" links; no book sources means nothing', () => {
    const books = [
      book({ id: 'x', status: 'reading', goal: { goalId: 'g', kind: 'finished', amount: 5 } }),
      book({ id: 'y', status: 'finished', goal: { goalId: 'other', kind: 'finished', amount: 5 } }),
      book({ id: 'z', status: 'finished', pages: 80, goal: { goalId: 'g', kind: 'pages' } }),
    ]
    expect(booksToward('g', books, [{ id: 'z', page: 40, at: '' }])).toBe(80)
    expect(booksToward('g')).toBe(0)
  })
})

describe('reading in Insights (ADR-047)', () => {
  it('sums the range by day and by book, splits habit from general reading, counts books finished in it', () => {
    const rs = [
      session({ id: '1', bookId: 'a', date: '2026-11-09', minutes: 20, pages: 10, habitId: 'h', habitAmount: 10 }),
      session({ id: '2', bookId: 'b', date: '2026-11-10', minutes: 30, pages: 12 }),
      session({ id: '3', bookId: 'a', date: '2026-11-10', minutes: 10, pages: 4, habitId: 'h', habitAmount: 4 }),
      session({ id: 'out', bookId: 'a', date: '2026-11-01', minutes: 99, pages: 99 }),
    ]
    const r = readingStats(rs, [{ id: 'a', finishedOn: '2026-11-10' }, { id: 'b', finishedOn: '2026-10-01' }], '2026-11-09', '2026-11-11')
    expect(r).toMatchObject({ minutes: 60, pages: 26, sessions: 3, readingDays: 2, days: 3, habitMinutes: 30, generalMinutes: 30, finished: 1 })
    expect(r.byDay['2026-11-10']).toEqual({ minutes: 40, pages: 16 })
    expect(r.byDay['2026-11-11']).toEqual({ minutes: 0, pages: 0 })
    expect(r.byBook.map((b) => [b.bookId, b.minutes, b.sessions])).toEqual([['a', 30, 2], ['b', 30, 1]])
  })
})

describe('reading speed (ADR-050)', () => {
  /** An ISO instant at a local hour, so the part of day holds in any time zone. */
  const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 15).toISOString()

  it('parts of the day by local hour', () => {
    expect([4, 5, 11, 12, 16, 17, 20, 21, 0].map(dayPart)).toEqual(
      ['night', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'night', 'night'])
  })

  it('only sittings with both pages and minutes say how fast', () => {
    expect(isTimed({ pages: 10, minutes: 20 })).toBe(true)
    expect(isTimed({ pages: 10, minutes: 0 })).toBe(false)
    expect(isTimed({ pages: 0, minutes: 20 })).toBe(false)
  })

  it('pages an hour is total pages over total minutes, not an average of sittings', () => {
    expect(pagesPerHour({ pages: 30, minutes: 60, sessions: 2 })).toBe(30)
    expect(pagesPerHour({ pages: 0, minutes: 0, sessions: 0 })).toBeNull()
    expect(minutesPerPage({ pages: 30, minutes: 60, sessions: 2 })).toBe(2)
    expect(minutesPerPage({ pages: 0, minutes: 10, sessions: 1 })).toBeNull()
  })

  it('by day, by part of day and by book, in the range only', () => {
    const rs = [
      session({ id: '1', bookId: 'a', date: '2026-11-10', startedAt: at(10, 8), minutes: 30, pages: 15 }),
      session({ id: '2', bookId: 'a', date: '2026-11-10', startedAt: at(10, 22), minutes: 30, pages: 5 }),
      session({ id: '3', bookId: 'b', date: '2026-11-11', startedAt: at(11, 9), minutes: 10, pages: 10 }),
      // A page update with no minutes: counts as reading, not as speed.
      session({ id: '4', bookId: 'b', date: '2026-11-11', startedAt: at(11, 13), minutes: 0, pages: 40 }),
      // Out of range.
      session({ id: '5', bookId: 'a', date: '2026-11-08', startedAt: at(8, 8), minutes: 60, pages: 60 }),
    ]
    const r = readingSpeed(rs, '2026-11-09', '2026-11-11')
    expect(r.all).toEqual({ pages: 30, minutes: 70, sessions: 3 })
    expect(Object.keys(r.byDay)).toEqual(['2026-11-09', '2026-11-10', '2026-11-11'])
    expect(r.byDay['2026-11-09']).toEqual({ pages: 0, minutes: 0, sessions: 0 })
    expect(pagesPerHour(r.byDay['2026-11-10'])).toBe(20)
    expect(pagesPerHour(r.byDay['2026-11-11'])).toBe(60)
    expect(r.byPart.morning).toEqual({ pages: 25, minutes: 40, sessions: 2 })
    expect(r.byPart.night).toEqual({ pages: 5, minutes: 30, sessions: 1 })
    expect(r.byPart.afternoon.sessions).toBe(0)
    expect(r.byBook).toEqual({ a: { pages: 20, minutes: 60, sessions: 2 }, b: { pages: 10, minutes: 10, sessions: 1 } })
  })

  it('a sitting is placed on its own date, even read past midnight', () => {
    const r = readingSpeed([session({ id: '1', date: '2026-11-10', startedAt: at(11, 0), minutes: 20, pages: 10 })], '2026-11-10', '2026-11-11')
    expect(r.byDay['2026-11-10'].pages).toBe(10)
    expect(r.byDay['2026-11-11'].pages).toBe(0)
    expect(r.byPart.night.pages).toBe(10)
  })

  it("a book's pace and the time left at it", () => {
    const rs = [
      session({ id: '1', bookId: 'a', minutes: 20, pages: 10 }),
      session({ id: '2', bookId: 'a', minutes: 0, pages: 50 }),
      session({ id: '3', bookId: 'b', minutes: 5, pages: 50 }),
    ]
    const p = bookPace(rs, 'a')
    expect(p).toEqual({ pages: 10, minutes: 20, sessions: 1 })
    expect(minutesLeft(100, p)).toBe(200)
    expect(minutesLeft(3, { pages: 2, minutes: 10, sessions: 1 })).toBe(15)
    // Too little timed reading to promise a time, nothing left, or nothing timed.
    expect(minutesLeft(100, bookPace(rs, 'b'))).toBeNull()
    expect(minutesLeft(0, p)).toBeNull()
    expect(minutesLeft(100, bookPace(rs, 'c'))).toBeNull()
  })
})
