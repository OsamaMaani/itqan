import { describe, expect, it } from 'vitest'
import { change, focusStats, focusStreak, habitConsistency, previousRange, tasksDoneByDay } from '../insights'
import type { FocusSession, Habit, Task } from '../types'

/** A session starting at local `day` `hh:mm` — local, so the tests hold in any time zone. */
function session(day: string, hh: number, mm: number, minutes: number, extra: Partial<FocusSession> = {}): FocusSession {
  const [y, mo, d] = day.split('-').map(Number)
  return {
    id: `${day}-${hh}-${mm}`, startedAt: new Date(y, mo - 1, d, hh, mm).toISOString(), minutes, label: 'Study',
    areaId: null, goalId: null, taskId: null, habitId: null, habitAmount: 0, ...extra,
  }
}

describe('periods', () => {
  it('the previous period is the same length, right before', () => {
    expect(previousRange('2026-10-18', '2026-10-24')).toEqual({ from: '2026-10-11', to: '2026-10-17' })
    expect(previousRange('2026-10-01', '2026-10-30')).toEqual({ from: '2026-09-01', to: '2026-09-30' })
  })
  it('a change needs something to compare with', () => {
    expect(change(150, 100)).toBeCloseTo(0.5)
    expect(change(50, 100)).toBeCloseTo(-0.5)
    expect(change(10, 0)).toBeNull()
  })
})

describe('focusStats', () => {
  const sessions = [
    session('2026-10-20', 9, 0, 50, { areaId: 'a1', habitId: 'h1', label: 'Quran' }),
    session('2026-10-20', 21, 40, 50, { areaId: 'a1', habitId: 'h1', label: 'Quran revision' }),
    session('2026-10-22', 14, 0, 25, { areaId: 'a2', label: 'French' }),
    session('2026-10-22', 15, 0, 95, { label: ' french ' }),
    session('2026-10-10', 9, 0, 120), // before the range
    session('2026-10-25', 9, 0, 120), // after it
  ]
  const s = focusStats(sessions, '2026-10-18', '2026-10-24')

  it('totals only the sessions that started inside the range', () => {
    expect(s.days).toBe(7)
    expect(s.sessions).toBe(4)
    expect(s.minutes).toBe(220)
    expect(s.avgSession).toBe(55)
    expect(s.dailyAvg).toBeCloseTo(220 / 7)
    expect(s.focusDays).toBe(2)
  })
  it('a session counts on the local day it started, even late at night', () => {
    const late = focusStats([session('2026-10-20', 23, 50, 40)], '2026-10-20', '2026-10-21')
    expect(late.byDay['2026-10-20']).toEqual({ minutes: 40, sessions: 1 })
    expect(late.byDay['2026-10-21']).toEqual({ minutes: 0, sessions: 0 })
    // …while its minutes after midnight land on the hours they were spent in.
    expect(late.byHour[23]).toBe(10)
    expect(late.byHour[0]).toBe(30)
  })
  it('spreads minutes over the hours from the start', () => {
    expect(s.byHour[9]).toBe(50)
    expect(s.byHour[21]).toBe(20)
    expect(s.byHour[22]).toBe(30)
    expect(s.byHour[15]).toBe(60)
    expect(s.byHour[16]).toBe(35)
    expect(s.byHour.reduce((a, b) => a + b, 0)).toBe(s.minutes)
  })
  it('finds the best day and the longest session', () => {
    expect(s.bestDay).toEqual({ date: '2026-10-22', minutes: 120 })
    expect(s.longest?.minutes).toBe(95)
  })
  it('averages each weekday over every such day, focused or not', () => {
    const two = focusStats([session('2026-10-20', 9, 0, 60)], '2026-10-13', '2026-10-26')
    expect(two.byWeekday[2]).toBe(30) // two Tuesdays, one with an hour
    expect(two.byWeekday[0]).toBe(0)
  })
  it('groups by habit, then goal, then label regardless of case and spaces', () => {
    expect(s.groups.map((g) => [g.key, g.minutes, g.sessions])).toEqual([
      ['label:french', 120, 2],
      ['habit:h1', 100, 2],
    ])
    const g = focusStats([session('2026-10-20', 9, 0, 30, { goalId: 'g1', label: 'A' }), session('2026-10-20', 10, 0, 30, { goalId: 'g1', label: 'B' })], '2026-10-20', '2026-10-20')
    expect(g.groups).toHaveLength(1)
    expect(g.groups[0]).toMatchObject({ key: 'goal:g1', goalId: 'g1', sessions: 2, minutes: 60 })
  })
  it('splits by area, most first, with no area as its own row', () => {
    expect(s.byArea).toEqual([
      { areaId: 'a1', minutes: 100, sessions: 2 },
      { areaId: null, minutes: 95, sessions: 1 },
      { areaId: 'a2', minutes: 25, sessions: 1 },
    ])
  })
  it('bands session lengths at 15, 30, 60 and 90 minutes', () => {
    const b = focusStats([14, 15, 29, 30, 59, 60, 89, 90, 240].map((m, i) => session('2026-10-20', i, 0, m)), '2026-10-20', '2026-10-20')
    expect(b.lengths).toEqual([1, 2, 2, 2, 2])
  })
  it('an empty range is all zeros, not NaN', () => {
    const e = focusStats([], '2026-10-18', '2026-10-24')
    expect([e.minutes, e.sessions, e.avgSession, e.dailyAvg, e.focusDays]).toEqual([0, 0, 0, 0, 0])
    expect(e.bestDay).toBeNull()
    expect(e.longest).toBeNull()
  })
})

describe('focusStreak', () => {
  const days = (...ds: string[]) => ds.map((d) => session(d, 10, 0, 25))
  it('counts back from today', () => {
    expect(focusStreak(days('2026-10-22', '2026-10-23', '2026-10-24'), '2026-10-24').current).toBe(3)
  })
  it('is not broken while today has no session yet', () => {
    expect(focusStreak(days('2026-10-22', '2026-10-23'), '2026-10-24').current).toBe(2)
  })
  it('is broken by a whole day without focus', () => {
    expect(focusStreak(days('2026-10-21', '2026-10-22'), '2026-10-24').current).toBe(0)
  })
  it('remembers the longest run, and several sessions in a day are one day', () => {
    const s = [...days('2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-23', '2026-10-24'), session('2026-10-24', 20, 0, 25)]
    expect(focusStreak(s, '2026-10-24')).toEqual({ current: 2, best: 4 })
  })
  it('a late-night session keeps the run on its own day', () => {
    expect(focusStreak([session('2026-10-23', 23, 55, 30), session('2026-10-24', 8, 0, 30)], '2026-10-24').current).toBe(2)
  })
})

describe('tasksDoneByDay', () => {
  const task = (doneAt: string | null, done = true) => ({ done, doneAt } as Task)
  it('counts by the local day a task was done', () => {
    const r = tasksDoneByDay([
      task(new Date(2026, 9, 20, 23, 59).toISOString()),
      task(new Date(2026, 9, 21, 0, 1).toISOString()),
      task(new Date(2026, 9, 21, 12).toISOString(), false),
      task(null),
    ], '2026-10-20', '2026-10-21')
    expect(r).toEqual({ '2026-10-20': 1, '2026-10-21': 1 })
  })
})

describe('habitConsistency', () => {
  const habit = (id: string, createdAt: Date, archived = false): Habit => ({
    id, name: id, emoji: '', areaId: null, schedule: { type: 'daily' }, target: 1, unit: '', archived, createdAt: createdAt.toISOString(), order: 0,
  })
  const old = habit('old', new Date(2026, 8, 1))
  const fresh = habit('fresh', new Date(2026, 9, 20))
  const logs = { old: { '2026-10-11': 1, '2026-10-12': 1 }, fresh: { '2026-10-20': 1 } }

  it('averages the habits that existed in the range', () => {
    expect(habitConsistency([old, fresh], logs, '2026-10-20', '2026-10-21', '2026-10-24', 1)).toBeCloseTo(0.25)
  })
  it('a habit created later is left out of an earlier range, not counted as 0%', () => {
    expect(habitConsistency([old, fresh], logs, '2026-10-11', '2026-10-14', '2026-10-24', 1)).toBeCloseTo(0.5)
  })
  it('null when there was nothing to measure', () => {
    expect(habitConsistency([fresh], logs, '2026-10-11', '2026-10-14', '2026-10-24', 1)).toBeNull()
    expect(habitConsistency([habit('x', new Date(2026, 8, 1), true)], {}, '2026-10-11', '2026-10-14', '2026-10-24', 1)).toBeNull()
  })
})
