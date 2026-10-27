import { describe, expect, it } from 'vitest'
import { badges, dayStreak, levelInfo, SAVERS, savedJustBefore, totalXp, xpEvents, xpToReach, XP, type XpEvent } from '../gamification'
import { emptyData } from '../seed'
import type { Data, DateKey, Task } from '../types'

const task = (p: Partial<Task>): Task => ({
  id: Math.random().toString(), title: 't', notes: '', areaId: null, goalId: null, projectId: null, stage: 'todo', blocked: false, date: '2026-10-16', timeOfDay: 'anytime',
  priority: 0, estimateMin: null, subtasks: [], done: false, doneAt: null, createdAt: '2026-10-16T08:00:00', order: 0, ...p,
})

describe('levels', () => {
  it('starts at level 1 with nothing', () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, into: 0, needed: 100 })
  })
  it('reaches exactly the level at its threshold', () => {
    expect(levelInfo(xpToReach(2)).level).toBe(2)
    expect(levelInfo(xpToReach(2) - 1).level).toBe(1)
    expect(levelInfo(xpToReach(10)).level).toBe(10)
  })
  it('level thresholds grow', () => {
    expect(xpToReach(3) - xpToReach(2)).toBeGreaterThan(xpToReach(2) - xpToReach(1))
  })
})

describe('xp is derived from history', () => {
  it('a completed task earns XP; undoing it removes it', () => {
    const d: Data = { ...emptyData(), tasks: [task({ done: true, doneAt: '2026-10-16T09:00:00', priority: 2 })] }
    expect(totalXp(xpEvents(d))).toBe(XP.task + 2 * XP.taskPriority)
    d.tasks = [task({ done: false })]
    expect(totalXp(xpEvents(d))).toBe(0)
  })

  it('a habit only earns XP on days its target was met', () => {
    const d: Data = {
      ...emptyData(),
      habits: [{ id: 'h', name: 'h', emoji: '', areaId: null, schedule: { type: 'daily' }, target: 10, unit: 'p', round: null, archived: false, createdAt: '2026-10-01', order: 0 }],
      habitLogs: { h: { '2026-10-15': 10, '2026-10-16': 4 } },
    }
    expect(totalXp(xpEvents(d))).toBe(XP.habitDay)
  })
})

/** One event per [day, xp] pair. */
const ev = (...days: [DateKey, number][]): XpEvent[] => days.map(([date, xp]) => ({ date, xp, kind: 'task' }))
const S = SAVERS.xpPerSaver

describe('day streak', () => {
  it('an empty today does not break it', () => {
    const s = dayStreak(ev(['2026-10-14', 1], ['2026-10-15', 1]), '2026-10-16')
    expect(s).toMatchObject({ current: 2, best: 2, todayActive: false })
  })
  it('a gap breaks it when no saver is held', () => {
    expect(dayStreak(ev(['2026-10-13', 1]), '2026-10-16')).toMatchObject({ current: 0, best: 1, held: 0, used: 0 })
  })
  it('today counts once something is done', () => {
    expect(dayStreak(ev(['2026-10-15', 1], ['2026-10-16', 1]), '2026-10-16')).toMatchObject({ current: 2, todayActive: true })
  })
  it('nothing at all is no streak', () => {
    expect(dayStreak([], '2026-10-16')).toMatchObject({ current: 0, best: 0, held: 0, towardNext: 0, saved: [] })
  })
  it('ignores days after today', () => {
    expect(dayStreak(ev(['2026-10-15', S], ['2026-10-20', S]), '2026-10-16')).toMatchObject({ current: 1, held: 1, towardNext: 0 })
  })
})

describe('streak savers', () => {
  it('one is earned for every SAVERS.xpPerSaver XP, and progress carries over', () => {
    expect(dayStreak(ev(['2026-10-15', S - 1]), '2026-10-15')).toMatchObject({ held: 0, towardNext: S - 1 })
    expect(dayStreak(ev(['2026-10-15', S - 1], ['2026-10-16', 2]), '2026-10-16')).toMatchObject({ held: 1, earned: 1, towardNext: 1 })
  })
  it('at most SAVERS.maxHeld are held; XP while full earns nothing', () => {
    const s = dayStreak(ev(['2026-10-15', S * (SAVERS.maxHeld + 3)]), '2026-10-15')
    expect(s).toMatchObject({ held: SAVERS.maxHeld, earned: SAVERS.maxHeld })
  })
  it('a missed day uses one, and the run survives without counting that day', () => {
    const s = dayStreak(ev(['2026-10-12', S], ['2026-10-13', 1], ['2026-10-15', 1]), '2026-10-15')
    expect(s).toMatchObject({ current: 3, best: 3, held: 0, used: 1, saved: ['2026-10-14'] })
  })
  it('covers yesterday while today is still pending', () => {
    const s = dayStreak(ev(['2026-10-13', S], ['2026-10-14', 1]), '2026-10-16')
    expect(s).toMatchObject({ current: 2, held: 0, used: 1, saved: ['2026-10-15'], todayActive: false })
    expect(savedJustBefore(s, '2026-10-16')).toBe(1)
  })
  it('two savers cover two missed days in a row', () => {
    const s = dayStreak(ev(['2026-10-10', 2 * S], ['2026-10-13', 1]), '2026-10-13')
    expect(s).toMatchObject({ current: 2, best: 2, held: 0, used: 2, saved: ['2026-10-11', '2026-10-12'] })
  })
  it('a gap longer than the savers held ends the run and keeps the savers', () => {
    const s = dayStreak(ev(['2026-10-09', 2 * S], ['2026-10-10', 1], ['2026-10-14', 1]), '2026-10-14')
    expect(s).toMatchObject({ current: 1, best: 2, held: 2, used: 0, saved: [] })
  })
  it('an ongoing gap longer than the savers ends the run today, savers kept', () => {
    const s = dayStreak(ev(['2026-10-09', S], ['2026-10-10', 1]), '2026-10-13')
    expect(s).toMatchObject({ current: 0, held: 1, used: 0 })
  })
  it('savers are not spent when there is no run to save', () => {
    // The run ended on the 12th (gap of 3, one saver); the 13th–14th gap before the next active day
    // happens with a run, so it is covered, and the saver held since the 9th is the one used.
    const s = dayStreak(ev(['2026-10-08', S], ['2026-10-12', 1], ['2026-10-14', 1]), '2026-10-14')
    expect(s).toMatchObject({ current: 2, held: 0, used: 1, saved: ['2026-10-13'] })
  })
  it('a saver earned on a day protects the days after it, not before', () => {
    // The 11th is missed; the saver arrives with the 12th's XP — too late for the 11th.
    const s = dayStreak(ev(['2026-10-10', 1], ['2026-10-12', S]), '2026-10-12')
    expect(s).toMatchObject({ current: 1, best: 1, held: 1, used: 0 })
  })
  it('backfilling a missed day gives its saver back', () => {
    const before = dayStreak(ev(['2026-10-12', S], ['2026-10-14', 1]), '2026-10-14')
    const after = dayStreak(ev(['2026-10-12', S], ['2026-10-13', 1], ['2026-10-14', 1]), '2026-10-14')
    expect(before).toMatchObject({ current: 2, held: 0, used: 1 })
    expect(after).toMatchObject({ current: 3, held: 1, used: 0 })
  })
  it('does not depend on the order events arrive in', () => {
    const days: [DateKey, number][] = [['2026-10-14', 1], ['2026-10-10', S], ['2026-10-12', 3], ['2026-10-10', 7]]
    expect(dayStreak(ev(...days), '2026-10-14')).toEqual(dayStreak(ev(...[...days].reverse()), '2026-10-14'))
  })
})

describe('the active-14 badge', () => {
  it('stays unlocked after the run that earned it ends', () => {
    const d: Data = { ...emptyData(), tasks: Array.from({ length: 14 }, (_, i) => task({ done: true, doneAt: `2026-09-${String(i + 1).padStart(2, '0')}T09:00:00` })) }
    expect(badges(d, '2026-10-16').find((b) => b.id === 'active-14')?.unlocked).toBe(true)
  })
})
