import { describe, expect, it } from 'vitest'
import { boardColumns, nextAction, projectPace, projectProgress } from '../projects'
import type { Project, Task } from '../types'

const p = (x: Partial<Project> = {}): Project => ({
  id: 'p', title: 'P', emoji: '', description: '', areaId: null, goalId: null, status: 'active', startDate: '2026-10-01',
  dueDate: null, notes: '', links: [], progressMode: 'tasks', manualProgress: 0, view: 'list', pinned: false,
  createdAt: '2026-10-01T08:00:00', updatedAt: '', ...x,
})
let n = 0
const t = (x: Partial<Task> = {}): Task => ({
  id: `t${++n}`, title: 't', notes: '', areaId: null, goalId: null, projectId: 'p', date: null, timeOfDay: 'anytime',
  priority: 0, estimateMin: null, subtasks: [], done: false, doneAt: null, stage: 'todo', blocked: false,
  createdAt: '', order: n, ...x,
})

describe('project progress', () => {
  it('from tasks: done ÷ all, ignoring other projects', () => {
    expect(projectProgress(p(), [t({ done: true }), t(), t(), t({ done: true }), t({ projectId: 'other', done: true })])).toBe(0.5)
  })
  it('manual: the number you set, clamped to 0–100 %', () => {
    expect(projectProgress(p({ progressMode: 'manual', manualProgress: 40 }), [t({ done: true })])).toBe(0.4)
    expect(projectProgress(p({ progressMode: 'manual', manualProgress: 140 }), [])).toBe(1)
  })
  it('a done project is 100 % whatever the mode', () => {
    expect(projectProgress(p({ status: 'done', progressMode: 'manual', manualProgress: 10 }), [])).toBe(1)
    expect(projectProgress(p({ status: 'done' }), [t()])).toBe(1)
  })
  it('no tasks yet is 0 %, not NaN', () => {
    expect(projectProgress(p(), [])).toBe(0)
  })
})

describe('project pace', () => {
  const due = p({ startDate: '2026-10-01', dueDate: '2026-10-31' }) // 30 days
  it('half the time gone and half done is on track', () => {
    expect(projectPace(due, 0.5, '2026-10-16').pace).toBe('on-track')
  })
  it('well behind or ahead of the straight line', () => {
    expect(projectPace(due, 0.1, '2026-10-16').pace).toBe('behind')
    expect(projectPace(due, 0.9, '2026-10-16').pace).toBe('ahead')
  })
  it('past the deadline and unfinished is overdue', () => {
    expect(projectPace(due, 0.9, '2026-11-02')).toMatchObject({ pace: 'overdue', daysLeft: -2 })
  })
  it('no deadline, or done, has no pace', () => {
    expect(projectPace(p(), 0.2, '2026-10-16').pace).toBe('none')
    expect(projectPace({ ...due, status: 'done' }, 1, '2026-10-16').pace).toBe('none')
  })
})

describe('board', () => {
  it('splits by stage, with done as the single source of truth', () => {
    const tasks = [t({ title: 'a' }), t({ title: 'b', stage: 'doing' }), t({ title: 'c', stage: 'doing', done: true, doneAt: '2026-10-16T09:00' })]
    const cols = boardColumns(tasks)
    expect(cols.todo.map((x) => x.title)).toEqual(['a'])
    expect(cols.doing.map((x) => x.title)).toEqual(['b'])
    expect(cols.done.map((x) => x.title)).toEqual(['c'])
  })
  it('the next action prefers work in progress, and skips blocked tasks', () => {
    expect(nextAction(p(), [t({ title: 'todo' }), t({ title: 'doing', stage: 'doing' })])?.title).toBe('doing')
    expect(nextAction(p(), [t({ title: 'stuck', stage: 'doing', blocked: true }), t({ title: 'free' })])?.title).toBe('free')
    expect(nextAction(p(), [t({ done: true })])).toBeNull()
  })
})
