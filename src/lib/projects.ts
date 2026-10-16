import { diffDays } from './date'
import type { DateKey, Data, Project, Task } from './types'

/**
 * Project maths (ADR-020). Pure and tested; screens never compute these themselves.
 * - Progress comes from the tasks (done ÷ all) or from a number set by hand; a project marked
 *   done is always 100 %.
 * - Pace compares progress with the share of time elapsed between start and deadline, like goals.
 */

export function projectTasks(p: Project, tasks: Task[]): Task[] {
  return tasks.filter((t) => t.projectId === p.id)
}

/** 0..1 */
export function projectProgress(p: Project, tasks: Task[]): number {
  if (p.status === 'done') return 1
  if (p.progressMode === 'manual') return Math.min(1, Math.max(0, p.manualProgress / 100))
  const mine = projectTasks(p, tasks)
  return mine.length ? mine.filter((t) => t.done).length / mine.length : 0
}

export interface ProjectStats {
  total: number
  done: number
  open: number
  doing: number
  blocked: number
  progress: number
  focusMin: number
  estimateMin: number
}

export function projectStats(p: Project, d: Pick<Data, 'tasks' | 'focusSessions'>): ProjectStats {
  const mine = projectTasks(p, d.tasks)
  const open = mine.filter((t) => !t.done)
  const ids = new Set(mine.map((t) => t.id))
  return {
    total: mine.length,
    done: mine.length - open.length,
    open: open.length,
    doing: open.filter((t) => t.stage === 'doing').length,
    blocked: open.filter((t) => t.blocked).length,
    progress: projectProgress(p, d.tasks),
    focusMin: d.focusSessions.filter((f) => f.taskId && ids.has(f.taskId)).reduce((s, f) => s + f.minutes, 0),
    estimateMin: open.reduce((s, t) => s + (t.estimateMin ?? 0), 0),
  }
}

export type ProjectPace = 'ahead' | 'on-track' | 'behind' | 'overdue' | 'none'

export function projectPace(p: Project, progress: number, today: DateKey): { pace: ProjectPace; expected: number; daysLeft: number | null } {
  if (!p.dueDate || p.status === 'done' || p.status === 'archived') return { pace: 'none', expected: 0, daysLeft: null }
  const daysLeft = diffDays(p.dueDate, today)
  if (progress >= 1) return { pace: 'ahead', expected: 1, daysLeft }
  if (daysLeft < 0) return { pace: 'overdue', expected: 1, daysLeft }
  const start = p.startDate ?? p.createdAt.slice(0, 10)
  const total = Math.max(1, diffDays(p.dueDate, start))
  const expected = Math.min(1, Math.max(0, diffDays(today, start) / total))
  const pace: ProjectPace = progress >= expected + 0.1 ? 'ahead' : progress >= expected - 0.1 ? 'on-track' : 'behind'
  return { pace, expected, daysLeft }
}

/** Tasks in board order: priority first, then the earliest date, then creation order. */
export function byBoardOrder(a: Task, b: Task): number {
  return b.priority - a.priority || (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.order - b.order
}

export interface BoardColumns { todo: Task[]; doing: Task[]; done: Task[] }

export function boardColumns(tasks: Task[]): BoardColumns {
  return {
    todo: tasks.filter((t) => !t.done && t.stage !== 'doing').sort(byBoardOrder),
    doing: tasks.filter((t) => !t.done && t.stage === 'doing').sort(byBoardOrder),
    done: tasks.filter((t) => t.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')),
  }
}

/** The one thing to do next: something already in progress and not blocked, else the top of "to do". */
export function nextAction(p: Project, tasks: Task[]): Task | null {
  const cols = boardColumns(projectTasks(p, tasks))
  return cols.doing.find((t) => !t.blocked) ?? cols.todo.find((t) => !t.blocked) ?? cols.doing[0] ?? cols.todo[0] ?? null
}
