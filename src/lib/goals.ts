import { diffDays } from './date'
import { exerciseBest } from './training'
import type { Data, DateKey, Goal } from './types'

/** What goal progress is read from: check-ins, or Training for a linked goal (ADR-027). */
export type GoalSources = Pick<Data, 'goalLogs' | 'workouts' | 'workoutSets'>

export function goalCurrent(g: Goal, src: GoalSources): number {
  if (g.kind === 'milestones') return g.milestones.filter((m) => m.done).length
  const link = g.link
  // An exercise goal follows its best — `startValue` is the best from before Itqan knew about it.
  if (link?.kind === 'exercise') return Math.max(g.startValue, exerciseBest(link.exerciseId, link.metric, src.workoutSets))
  // A workouts goal counts finished workouts from the goal's start day.
  if (link?.kind === 'workouts') return g.startValue + src.workouts.filter((w) => w.finishedAt && w.date >= g.startDate).length
  return g.startValue + src.goalLogs.filter((l) => l.goalId === g.id).reduce((s, l) => s + l.amount, 0)
}

export function goalTarget(g: Goal): number {
  return g.kind === 'milestones' ? g.milestones.length : g.target
}

/** 0..1 */
export function goalProgress(g: Goal, src: GoalSources): number {
  if (g.status === 'done') return 1
  const t = goalTarget(g)
  if (t <= 0) return 0
  return Math.min(1, Math.max(0, goalCurrent(g, src) / t))
}

export type Pace = 'ahead' | 'on-track' | 'behind' | 'overdue' | 'none'

export interface PaceInfo {
  pace: Pace
  expected: number // 0..1 where you "should" be by now on a straight line
  daysLeft: number | null
  perDay: number | null // amount needed per day to finish on time
}

export function goalPace(g: Goal, src: GoalSources, today: DateKey): PaceInfo {
  const progress = goalProgress(g, src)
  if (!g.deadline || g.status !== 'active') {
    return { pace: 'none', expected: 0, daysLeft: null, perDay: null }
  }
  const total = Math.max(1, diffDays(g.deadline, g.startDate))
  const elapsed = Math.min(total, Math.max(0, diffDays(today, g.startDate)))
  const expected = elapsed / total
  const daysLeft = diffDays(g.deadline, today)
  const remaining = Math.max(0, goalTarget(g) - goalCurrent(g, src))
  const perDay = daysLeft > 0 ? remaining / daysLeft : null

  let pace: Pace
  if (progress >= 1) pace = 'ahead'
  else if (daysLeft < 0) pace = 'overdue'
  else if (progress >= expected + 0.1) pace = 'ahead'
  else if (progress >= expected - 0.1) pace = 'on-track'
  else pace = 'behind'
  return { pace, expected, daysLeft, perDay }
}

// --- the goal helper (ADR-039) ----------------------------------------------------------

/** Words in a title, in any script: Chinese has no spaces, so it is segmented, not split. */
export function wordCount(text: string, locale = 'en'): number {
  const s = text.trim()
  if (!s) return 0
  try {
    let n = 0
    for (const seg of new Intl.Segmenter(locale, { granularity: 'word' }).segment(s)) if (seg.isWordLike) n++
    return n
  } catch {
    return s.split(/\s+/).length
  }
}

export interface GoalChecks {
  /** Says what exactly — three words or more ("Read 12 books", not "Reading"). */
  specific: boolean
  /** Has something to count: a target above what's done, or two milestones or more. */
  measurable: boolean
  /** Has a deadline, on or after its start and not already past. */
  timeBound: boolean
  /** Says why it matters. */
  why: boolean
  /** A numeric goal with a deadline: what it takes a week, from today (or its start) to the deadline. */
  perWeek: number | null
  /** A milestone goal with a deadline: days available for each milestone left. */
  daysPerMilestone: number | null
  /** The deadline is more than a year away: worth splitting into a nearer goal. */
  far: boolean
}

type GoalDraft = Pick<Goal, 'title' | 'why' | 'kind' | 'startValue' | 'target' | 'startDate' | 'deadline' | 'milestones'>

/**
 * The goal editor's gentle checklist (ADR-039): what makes a goal easy to keep — specific,
 * measurable, with a deadline and a reason — and the pace the deadline asks for, so the owner can
 * judge whether it is realistic. Advice only: nothing here ever blocks saving.
 */
export function goalChecks(d: GoalDraft, today: DateKey, locale = 'en'): GoalChecks {
  const from = d.startDate > today ? d.startDate : today
  const days = d.deadline ? diffDays(d.deadline, from) + 1 : 0
  const left = d.milestones.filter((m) => !m.done).length
  return {
    specific: wordCount(d.title, locale) >= 3,
    measurable: d.kind === 'milestones' ? d.milestones.length >= 2 : d.target > d.startValue,
    timeBound: !!d.deadline && d.deadline >= d.startDate && d.deadline >= today,
    why: d.why.trim().length > 0,
    perWeek: d.kind === 'numeric' && days > 0 && d.target > d.startValue ? ((d.target - d.startValue) / days) * 7 : null,
    daysPerMilestone: d.kind === 'milestones' && days > 0 && left > 0 ? days / left : null,
    far: !!d.deadline && diffDays(d.deadline, from) > 366,
  }
}
