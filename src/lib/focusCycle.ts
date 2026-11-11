import { calendarKey, dayOf } from './date'
import type { PrayerTimes } from './fajr'
import type { CyclePlan, CycleStep, FocusCycle, Interruption, InterruptionReason, Prayer } from './types'

/**
 * Focus cycles (ADR-049): sessions and breaks one after another, planned from a simple shape and
 * editable step by step. Pure functions, tested, so the Focus screen, the prompt and the
 * notifications agree on what comes next and when.
 */

/** Ready-made plans offered beside the owner's saved templates. Their names are `m.focus.cycle.presets[key]`. */
export const CYCLE_PRESETS = [
  { key: 'classic', sessions: 4, focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 0, longBreakEvery: 0 },
  { key: 'deep', sessions: 3, focusMinutes: 50, breakMinutes: 10, longBreakMinutes: 0, longBreakEvery: 0 },
  { key: 'marathon', sessions: 6, focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 20, longBreakEvery: 3 },
] as const satisfies readonly (CyclePlan & { key: string })[]

export type PresetKey = (typeof CYCLE_PRESETS)[number]['key']

export const LIMITS = {
  sessions: [1, 12], focusMinutes: [1, 240], breakMinutes: [1, 90], longBreakMinutes: [0, 90], longBreakEvery: [0, 12],
} as const satisfies Record<keyof CyclePlan, readonly [number, number]>

/** How long a break made for a prayer is, at least. */
export const PRAYER_BREAK_MIN = 15

/** Prayers a cycle is checked against (sunrise is no prayer to stop for). */
const CHECKED: Prayer[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

const clamp = (x: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(x) ? x : lo)))

export function clampPlan(p: CyclePlan): CyclePlan {
  return {
    sessions: clamp(p.sessions, LIMITS.sessions),
    focusMinutes: clamp(p.focusMinutes, LIMITS.focusMinutes),
    breakMinutes: clamp(p.breakMinutes, LIMITS.breakMinutes),
    longBreakMinutes: clamp(p.longBreakMinutes, LIMITS.longBreakMinutes),
    longBreakEvery: clamp(p.longBreakEvery, LIMITS.longBreakEvery),
  }
}

export function focusStep(minutes: number): CycleStep {
  return { kind: 'focus', minutes, tag: null, prayer: null, taskId: null, habitId: null }
}

export function breakStep(minutes: number, tag: CycleStep['tag'] = null, prayer: Prayer | null = null): CycleStep {
  return { kind: 'break', minutes, tag, prayer, taskId: null, habitId: null }
}

/**
 * Session, break, session … session. No break after the last session: the cycle ends there.
 * Every `longBreakEvery`-th break is the long one, when both are set.
 */
export function buildSteps(plan: CyclePlan): CycleStep[] {
  const p = clampPlan(plan)
  const out: CycleStep[] = []
  for (let i = 1; i <= p.sessions; i++) {
    out.push(focusStep(p.focusMinutes))
    if (i === p.sessions) break
    const long = p.longBreakEvery > 0 && p.longBreakMinutes > 0 && i % p.longBreakEvery === 0
    out.push(long ? breakStep(p.longBreakMinutes, 'long') : breakStep(p.breakMinutes))
  }
  return out
}

export function sessionCount(steps: readonly CycleStep[]): number {
  return steps.filter((s) => s.kind === 'focus').length
}

/** 1-based number of the session at `index` (or of the last one before it, for a break). */
export function sessionNumber(steps: readonly CycleStep[], index: number): number {
  return sessionCount(steps.slice(0, index + 1))
}

/** Total planned minutes of the steps from `from` on. */
export function minutesFrom(steps: readonly CycleStep[], from: number): number {
  return steps.slice(from).reduce((s, x) => s + x.minutes, 0)
}

export interface StepTime { index: number; start: number; end: number }

/** When each step from `from` on starts and ends, if the first starts at `startMs` and none is extended or paused. */
export function stepTimes(steps: readonly CycleStep[], from: number, startMs: number): StepTime[] {
  const out: StepTime[] = []
  let t = startMs
  for (let i = Math.max(0, from); i < steps.length; i++) {
    const end = t + steps[i].minutes * 60_000
    out.push({ index: i, start: t, end })
    t = end
  }
  return out
}

export interface Crossing {
  /** The focus step the prayer falls in. */
  index: number
  prayer: Prayer
  at: number
  /** When that step would start. */
  stepStart: number
}

/**
 * Focus steps from `from` on that a prayer time falls inside, if the first starts at `startMs`.
 * `timesFor` gives a local calendar day's prayer times (null where unknown — then nothing is found).
 * A prayer exactly at a step's start or end is no crossing: the break is already there.
 */
export function prayerCrossings(
  steps: readonly CycleStep[], from: number, startMs: number, timesFor: (k: string) => PrayerTimes | null,
): Crossing[] {
  const out: Crossing[] = []
  for (const st of stepTimes(steps, from, startMs)) {
    if (steps[st.index].kind !== 'focus') continue
    const days = new Set([calendarKey(st.start), calendarKey(st.end)])
    const found: { prayer: Prayer; at: number }[] = []
    for (const k of days) {
      const times = timesFor(k)
      if (!times) continue
      for (const p of CHECKED) if (times[p] > st.start && times[p] < st.end) found.push({ prayer: p, at: times[p] })
    }
    found.sort((a, b) => a.at - b.at)
    if (found[0]) out.push({ index: st.index, ...found[0], stepStart: st.start })
  }
  return out
}

/**
 * Makes room for a prayer that falls inside a focus step: the session stops at the prayer, a
 * prayer break follows, and the rest of the session comes after it. Under 5 minutes before the
 * prayer, the break comes first instead (the break just before becomes it, if there is one from
 * `from` on); under 5 minutes after it, those few minutes are dropped rather than made a session.
 * Steps before `from` (done, or running) are never touched.
 */
export function fitPrayer(steps: readonly CycleStep[], c: Crossing, from: number, breakMinutes = PRAYER_BREAK_MIN): CycleStep[] {
  const step = steps[c.index]
  if (!step || step.kind !== 'focus' || c.index < from) return [...steps]
  const before = Math.round((c.at - c.stepStart) / 60_000)
  const after = step.minutes - before
  const pray = breakStep(breakMinutes, 'prayer', c.prayer)
  const out = [...steps]
  const asPrayer = (b: CycleStep) => breakStep(Math.max(b.minutes, breakMinutes), 'prayer', c.prayer)
  if (before < 5) {
    const prev = out[c.index - 1]
    if (c.index - 1 >= from && prev?.kind === 'break') out[c.index - 1] = asPrayer(prev)
    else out.splice(c.index, 0, pray)
    return out
  }
  if (after < 5) {
    out[c.index] = { ...step, minutes: before }
    const next = out[c.index + 1]
    if (next?.kind === 'break') out[c.index + 1] = asPrayer(next)
    else out.splice(c.index + 1, 0, pray)
    return out
  }
  out.splice(c.index, 1, { ...step, minutes: before }, pray, { ...step, minutes: after })
  return out
}

/** Replaces one step's length, within its kind's limits. */
export function setStepMinutes(steps: readonly CycleStep[], index: number, minutes: number): CycleStep[] {
  const lim = steps[index]?.kind === 'focus' ? LIMITS.focusMinutes : ([1, LIMITS.breakMinutes[1]] as const)
  return steps.map((s, i) => (i === index ? { ...s, minutes: clamp(minutes, lim) } : s))
}

// --- Insights -------------------------------------------------------------------------------

export interface InterruptionStats {
  count: number
  /** Pauses of focus (not of breaks). */
  duringFocus: number
  /** Minutes spent paused. */
  minutes: number
  /** Most frequent first; `null` = no reason given. */
  byReason: { reason: InterruptionReason | null; count: number; minutes: number }[]
}

/** Pauses between `from` and `to` (the day each started on, as every day in Itqan is read). */
export function interruptionStats(list: readonly Interruption[], from: string, to: string): InterruptionStats {
  const inRange = list.filter((x) => { const k = dayOf(x.at); return k >= from && k <= to })
  const by = new Map<InterruptionReason | null, { count: number; seconds: number }>()
  for (const x of inRange) {
    const r = by.get(x.reason) ?? { count: 0, seconds: 0 }
    by.set(x.reason, { count: r.count + 1, seconds: r.seconds + x.seconds })
  }
  return {
    count: inRange.length,
    duringFocus: inRange.filter((x) => x.during === 'focus').length,
    minutes: Math.round(inRange.reduce((s, x) => s + x.seconds, 0) / 60),
    byReason: [...by.entries()]
      .map(([reason, v]) => ({ reason, count: v.count, minutes: Math.round(v.seconds / 60) }))
      .sort((a, b) => b.count - a.count || b.minutes - a.minutes),
  }
}

export interface CycleStats { cycles: number; completed: number; sessions: number; focusMinutes: number }

export function cycleStats(list: readonly FocusCycle[], from: string, to: string): CycleStats {
  const inRange = list.filter((c) => { const k = dayOf(c.startedAt); return k >= from && k <= to })
  return {
    cycles: inRange.length,
    completed: inRange.filter((c) => c.completed).length,
    sessions: inRange.reduce((s, c) => s + c.sessions, 0),
    focusMinutes: inRange.reduce((s, c) => s + c.focusMinutes, 0),
  }
}
