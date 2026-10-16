import { describe, expect, it } from 'vitest'
import { activeStreak, levelInfo, totalXp, xpEvents, xpToReach, XP } from '../gamification'
import { emptyData } from '../seed'
import type { Data, Task } from '../types'

const task = (p: Partial<Task>): Task => ({
  id: Math.random().toString(), title: 't', notes: '', areaId: null, goalId: null, date: '2026-10-16', timeOfDay: 'anytime',
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
      habits: [{ id: 'h', name: 'h', emoji: '', areaId: null, schedule: { type: 'daily' }, target: 10, unit: 'p', archived: false, createdAt: '2026-10-01', order: 0 }],
      habitLogs: { h: { '2026-10-15': 10, '2026-10-16': 4 } },
    }
    expect(totalXp(xpEvents(d))).toBe(XP.habitDay)
  })
})

describe('active streak', () => {
  it('an empty today does not break it', () => {
    const ev = [{ date: '2026-10-14', xp: 1, kind: 'task' as const }, { date: '2026-10-15', xp: 1, kind: 'task' as const }]
    expect(activeStreak(ev, '2026-10-16')).toBe(2)
  })
  it('a gap breaks it', () => {
    expect(activeStreak([{ date: '2026-10-13', xp: 1, kind: 'task' }], '2026-10-16')).toBe(0)
  })
})
