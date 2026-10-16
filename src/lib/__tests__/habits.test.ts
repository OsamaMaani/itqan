import { describe, expect, it } from 'vitest'
import { completionRate, isDueToday, streak } from '../habits'
import type { Habit, HabitLogs } from '../types'

const habit = (schedule: Habit['schedule'], target = 1): Habit => ({
  id: 'h', name: 'H', emoji: '', areaId: null, schedule, target, unit: '', archived: false,
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
