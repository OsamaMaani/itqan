import { describe, expect, it } from 'vitest'
import { amountBetween, amountTotal, completionRate, historyStart, isCounted, isDueToday, periods, roundFromEditor, roundProgress, streak } from '../habits'
import { addDaysKey } from '../date'
import type { Habit, HabitLogs } from '../types'

const habit = (schedule: Habit['schedule'], target = 1): Habit => ({
  id: 'h', name: 'H', emoji: '', areaId: null, schedule, target, unit: '', round: null, archived: false,
  createdAt: '2026-10-01T08:00:00.000Z', order: 0,
})
const logs = (...days: string[]): HabitLogs => ({ h: Object.fromEntries(days.map((d) => [d, 1])) })

// 2026-10-16 is a Friday.
describe('daily streaks', () => {
  const h = habit({ type: 'daily' })

  it('counts consecutive met days ending today', () => {
    expect(streak(h, logs('2026-10-14', '2026-10-15', '2026-10-16'), '2026-10-16', 6).current).toBe(3)
  })

  it('does not break because today is not done yet', () => {
    expect(streak(h, logs('2026-10-14', '2026-10-15'), '2026-10-16', 6).current).toBe(2)
  })

  it('breaks on a missed past day', () => {
    expect(streak(h, logs('2026-10-13', '2026-10-15'), '2026-10-16', 6).current).toBe(1)
  })

  it('remembers the best run', () => {
    const s = streak(h, logs('2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-15'), '2026-10-16', 6)
    expect(s.best).toBe(4)
    expect(s.current).toBe(1)
  })

  it('needs the full target, not just any amount', () => {
    const h20 = habit({ type: 'daily' }, 20)
    expect(streak(h20, { h: { '2026-10-15': 19 } }, '2026-10-16', 6).current).toBe(0)
    expect(streak(h20, { h: { '2026-10-15': 20 } }, '2026-10-16', 6).current).toBe(1)
  })

  it('counts days logged before the habit was created (backfill)', () => {
    expect(streak(h, logs('2026-09-29', '2026-09-30', '2026-10-01'), '2026-10-01', 6).current).toBe(3)
  })
})

describe('specific-day habits', () => {
  // Sun, Tue, Thu
  const h = habit({ type: 'days', days: [0, 2, 4] })

  it('skips unscheduled days instead of counting them as misses', () => {
    // Sun 11, Tue 13, Thu 15 met; Fri 16 is not scheduled.
    expect(streak(h, logs('2026-10-11', '2026-10-13', '2026-10-15'), '2026-10-16', 6).current).toBe(3)
  })

  it('a missed scheduled day breaks it', () => {
    expect(streak(h, logs('2026-10-11', '2026-10-15'), '2026-10-16', 6).current).toBe(1)
  })

  it('is only due on its days', () => {
    expect(isDueToday(h, {}, '2026-10-16', 6)).toBe(false)
    expect(isDueToday(h, {}, '2026-10-15', 6)).toBe(true)
  })
})

describe('weekly habits', () => {
  const h = habit({ type: 'weekly', times: 2 })

  it('counts weeks that reached the quota; the current week is pending', () => {
    // weeks start Saturday: 3 Oct, 10 Oct. Week of 10 Oct has two met days; current week (from 10th) is the 16th's week.
    const l = logs('2026-10-04', '2026-10-05', '2026-10-11', '2026-10-12')
    const s = streak(h, l, '2026-10-16', 6)
    expect(s.unit).toBe('week')
    expect(s.current).toBe(2)
  })

  it('stays due until the weekly quota is met', () => {
    expect(isDueToday(h, logs('2026-10-11'), '2026-10-16', 6)).toBe(true)
    expect(isDueToday(h, logs('2026-10-11', '2026-10-12'), '2026-10-16', 6)).toBe(false)
  })
})

describe('completion rate', () => {
  it('does not count days before the habit existed as misses', () => {
    const h = { ...habit({ type: 'daily' }), createdAt: '2026-10-16T08:00:00.000Z' }
    expect(completionRate(h, logs('2026-10-16'), '2026-09-17', '2026-10-16', '2026-10-16', 6)).toBe(1)
  })

  it('ignores an unfinished today and future days', () => {
    const h = habit({ type: 'daily' })
    expect(completionRate(h, logs('2026-10-14', '2026-10-15'), '2026-10-14', '2026-10-20', '2026-10-16', 6)).toBe(1)
  })
})

// createdAt is a UTC ISO string; the first day must be the *local* day it was made on.
// 01:00 local is the previous UTC day east of UTC, 23:30 is the next UTC day west of it,
// so on any machine not on UTC one of these fails if the day is sliced off the ISO string.
describe('history start is the local day the habit was created', () => {
  it('a habit made just after midnight starts that day, not the day before', () => {
    const h = { ...habit({ type: 'daily' }), createdAt: new Date(2026, 9, 21, 1, 0).toISOString() }
    expect(historyStart(h, {})).toBe('2026-10-21')
    expect(periods(h, logs('2026-10-21'), '2026-10-22', 6)).toEqual(['met', 'pending'])
    expect(completionRate(h, logs('2026-10-21'), '2026-10-19', '2026-10-21', '2026-10-22', 6)).toBe(1)
  })

  it('a habit made just before midnight starts that day, not the day after', () => {
    const h = { ...habit({ type: 'daily' }), createdAt: new Date(2026, 9, 20, 23, 30).toISOString() }
    expect(historyStart(h, {})).toBe('2026-10-20')
    expect(periods(h, logs('2026-10-21'), '2026-10-21', 6)).toEqual(['missed', 'met'])
  })
})

describe('amounts and rounds (ADR-038)', () => {
  const quran = (round: Habit['round']): Habit => ({ ...habit({ type: 'daily' }, 4), unit: 'pages', round })
  const L = (days: Record<string, number>): HabitLogs => ({ h: days })

  it('a habit is counted when it has a unit or a target above one', () => {
    expect(isCounted({ target: 1, unit: '' })).toBe(false)
    expect(isCounted({ target: 1, unit: 'pages' })).toBe(true)
    expect(isCounted({ target: 20, unit: '' })).toBe(true)
  })

  it('sums amounts in a range, inclusive, and in total up to today', () => {
    const logs = L({ '2026-10-10': 4, '2026-10-11': 6, '2026-10-12': 2, '2026-10-20': 9 })
    expect(amountBetween(logs, 'h', '2026-10-11', '2026-10-12')).toBe(8)
    expect(amountBetween(logs, 'x', '2026-10-01', '2026-10-31')).toBe(0)
    expect(amountTotal(logs, 'h', '2026-10-16')).toBe(12)
  })

  it('no round, no progress', () => {
    expect(roundProgress(quran(null), L({}), '2026-10-16')).toBeNull()
    expect(roundProgress(quran({ size: 0, from: '2026-10-01', done: 0 }), L({}), '2026-10-16')).toBeNull()
  })

  it('counts what was done before plus what is logged from its start — not before', () => {
    const p = roundProgress(quran({ size: 604, from: '2026-10-14', done: 100 }), L({ '2026-10-13': 50, '2026-10-14': 4, '2026-10-15': 6 }), '2026-10-16')!
    expect(p).toMatchObject({ number: 1, into: 110, left: 494, completed: 0 })
  })

  it('a finished round starts the next one — a habit goes on', () => {
    const p = roundProgress(quran({ size: 400, from: '2026-10-01', done: 390 }), L({ '2026-10-15': 20, '2026-10-16': 5 }), '2026-10-16')!
    expect(p).toMatchObject({ number: 2, into: 15, left: 385, completed: 1 })
    const exact = roundProgress(quran({ size: 400, from: '2026-10-01', done: 396 }), L({ '2026-10-16': 4 }), '2026-10-16')!
    expect(exact).toMatchObject({ number: 2, into: 0, left: 400, completed: 1 })
  })

  it('pace is the mean a day lately — whatever round it went to — and the finish follows it', () => {
    // The habit began 10-01; 5 pages every day since. From 10-13 that is 20 → 500 of 600; 100 left at 5 a day.
    const days: Record<string, number> = {}
    for (let k = '2026-10-01'; k <= '2026-10-16'; k = addDaysKey(k, 1)) days[k] = 5
    const p = roundProgress(quran({ size: 600, from: '2026-10-13', done: 480 }), L(days), '2026-10-16')!
    expect(p.perDay).toBe(5)
    expect(p.left).toBe(100)
    expect(p.finishOn).toBe('2026-11-05')
  })

  it('a round set today already has a finish date, from the pace before it', () => {
    const days: Record<string, number> = {}
    for (let k = '2026-10-01'; k <= '2026-10-15'; k = addDaysKey(k, 1)) days[k] = 4
    const p = roundProgress(quran({ size: 604, from: '2026-10-16', done: 250 }), L(days), '2026-10-16')!
    expect(p).toMatchObject({ into: 250, perDay: 4 })
    expect(p.finishOn).toBe(addDaysKey('2026-10-15', Math.ceil(354 / 4)))
  })

  it('today is pending: with nothing logged yet, the pace ends yesterday and the finish counts from today', () => {
    // Nothing before 10-14 although the habit began 10-01: those are days of 0, not skipped.
    const p = roundProgress(quran({ size: 600, from: '2026-10-14', done: 0 }), L({ '2026-10-14': 15, '2026-10-15': 15 }), '2026-10-16')!
    expect(p.perDay).toBe(2)
    expect(p.finishOn).toBe(addDaysKey('2026-10-15', Math.ceil(570 / 2)))
  })

  it('reads the pace over the last four weeks only', () => {
    const logs: Record<string, number> = { '2026-09-01': 1000 }
    for (let i = 0; i < 28; i++) logs[addDaysKey('2026-10-16', -i)] = 2
    const p = roundProgress(quran({ size: 5000, from: '2026-09-01', done: 0 }), L(logs), '2026-10-16')!
    expect(p.perDay).toBe(2)
  })

  it('no pace yet — a round set today with nothing logged — gives no finish date', () => {
    const p = roundProgress(quran({ size: 604, from: '2026-10-16', done: 200 }), L({}), '2026-10-16')!
    expect(p).toMatchObject({ into: 200, perDay: 0, finishOn: null })
  })

  it('a round set to start later counts nothing logged yet', () => {
    const p = roundProgress(quran({ size: 604, from: '2026-10-20', done: 0 }), L({ '2026-10-16': 4 }), '2026-10-16')!
    expect(p).toMatchObject({ into: 0, left: 604 })
  })
})

describe('the round the editor saves (ADR-038)', () => {
  const h = (round: Habit['round']) => ({ id: 'h', round, createdAt: '2026-10-01T08:00:00.000Z' })
  const logs: HabitLogs = { h: { '2026-10-15': 4, '2026-10-16': 4 } }

  it('no size, or 0, means no round', () => {
    expect(roundFromEditor(null, 0, 10, logs, '2026-10-16')).toBeNull()
    expect(roundFromEditor(h({ size: 604, from: '2026-10-01', done: 0 }), NaN, 10, logs, '2026-10-16')).toBeNull()
  })

  it('a new round starts today from where you are, today’s reading not counted twice', () => {
    expect(roundFromEditor(h(null), 604, 124, logs, '2026-10-16')).toEqual({ size: 604, from: '2026-10-16', done: 120 })
    const r = roundFromEditor(h(null), 604, 124, logs, '2026-10-16')!
    expect(roundProgress(h(r), logs, '2026-10-16')!.into).toBe(124)
    // A brand-new habit has no logs of its own yet.
    expect(roundFromEditor(null, 604, 10, logs, '2026-10-16')).toEqual({ size: 604, from: '2026-10-16', done: 10 })
  })

  it('saving with the same answers keeps the stored round exactly', () => {
    const prev = { size: 604, from: '2026-10-01', done: 100 }
    expect(roundFromEditor(h(prev), 604, 108, logs, '2026-10-16')).toBe(prev)
  })

  it('a new copy of the Quran — another size — restarts the count from today at the page given', () => {
    const prev = { size: 604, from: '2026-10-01', done: 100 }
    expect(roundFromEditor(h(prev), 400, 72, logs, '2026-10-16')).toEqual({ size: 400, from: '2026-10-16', done: 68 })
  })
})
