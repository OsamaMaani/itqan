import { diffDays } from './date'
import type { DateKey, Goal, GoalLog } from './types'

export function goalCurrent(g: Goal, logs: GoalLog[]): number {
  if (g.kind === 'milestones') return g.milestones.filter((m) => m.done).length
  return g.startValue + logs.filter((l) => l.goalId === g.id).reduce((s, l) => s + l.amount, 0)
}

export function goalTarget(g: Goal): number {
  return g.kind === 'milestones' ? g.milestones.length : g.target
}

/** 0..1 */
export function goalProgress(g: Goal, logs: GoalLog[]): number {
  if (g.status === 'done') return 1
  const t = goalTarget(g)
  if (t <= 0) return 0
  return Math.min(1, Math.max(0, goalCurrent(g, logs) / t))
}

export type Pace = 'ahead' | 'on-track' | 'behind' | 'overdue' | 'none'

export interface PaceInfo {
  pace: Pace
  expected: number // 0..1 where you "should" be by now on a straight line
  daysLeft: number | null
  perDay: number | null // amount needed per day to finish on time
}

export function goalPace(g: Goal, logs: GoalLog[], today: DateKey): PaceInfo {
  const progress = goalProgress(g, logs)
  if (!g.deadline || g.status !== 'active') {
    return { pace: 'none', expected: 0, daysLeft: null, perDay: null }
  }
  const total = Math.max(1, diffDays(g.deadline, g.startDate))
  const elapsed = Math.min(total, Math.max(0, diffDays(today, g.startDate)))
  const expected = elapsed / total
  const daysLeft = diffDays(g.deadline, today)
  const remaining = Math.max(0, goalTarget(g) - goalCurrent(g, logs))
  const perDay = daysLeft > 0 ? remaining / daysLeft : null

  let pace: Pace
  if (progress >= 1) pace = 'ahead'
  else if (daysLeft < 0) pace = 'overdue'
  else if (progress >= expected + 0.1) pace = 'ahead'
  else if (progress >= expected - 0.1) pace = 'on-track'
  else pace = 'behind'
  return { pace, expected, daysLeft, perDay }
}
