import { addDaysKey, dayOf, dayOfWeek, rangeKeys } from './date'
import { amountBetween, amountTotal, completionRate, historyStart, isCounted, roundProgress, type RoundProgress } from './habits'
import type { DateKey, FocusSession, Habit, HabitLogs, ID, Task } from './types'

// Insights maths (ADR-032). Every number the Insights screen shows comes from here, tested —
// the screen only lays them out. A session belongs to the local day it started on, like
// everywhere else (the Focus screen, the habit it checks in).

/** The day a session started on (ADR-041: before Fajr may be the day before). */
export function sessionDay(f: FocusSession): DateKey {
  return dayOf(f.startedAt)
}

/** The same number of days immediately before `from…to`: what a period is compared against. */
export function previousRange(from: DateKey, to: DateKey): { from: DateKey; to: DateKey } {
  const n = rangeKeys(from, to).length
  return { from: addDaysKey(from, -n), to: addDaysKey(from, -1) }
}

/** Relative change from `prev` to `cur` (0.25 = +25%); null when there is nothing to compare with. */
export function change(cur: number, prev: number): number | null {
  if (prev <= 0) return null
  return (cur - prev) / prev
}

/** Session lengths are counted in these bands: under 15, 15–29, 30–59, 60–89, 90 and over (minutes). */
export const LENGTH_BANDS = [0, 15, 30, 60, 90] as const

export interface FocusGroup {
  /** What groups the sessions: `habit:<id>`, `goal:<id>`, or `label:<lower-cased label>`. */
  key: string
  label: string
  habitId: ID | null
  goalId: ID | null
  minutes: number
  sessions: number
}

export interface FocusStats {
  days: number
  minutes: number
  sessions: number
  /** Mean minutes per session (0 with no sessions). */
  avgSession: number
  /** Mean minutes per day of the range, counting days with no focus. */
  dailyAvg: number
  /** Days of the range with at least one session. */
  focusDays: number
  longest: FocusSession | null
  /** The day with the most minutes; the earlier one on a tie. */
  bestDay: { date: DateKey; minutes: number } | null
  /** Minutes and sessions per day of the range, keyed by day. */
  byDay: Record<DateKey, { minutes: number; sessions: number }>
  /**
   * Minutes per hour of the day, 0–23. A session's minutes are laid out from its start, so a
   * 21:40 session of 50 minutes gives 20 to 21h and 30 to 22h. Pauses are not recorded, so this
   * is when the focus most likely happened, not a timesheet.
   */
  byHour: number[]
  /** Mean minutes on each weekday of the range (0 = Sunday), over every such day, focused or not. */
  byWeekday: number[]
  /** Minutes and sessions per area (null = no area), most first. */
  byArea: { areaId: ID | null; minutes: number; sessions: number }[]
  /** What the time went to — by habit, else goal, else the label — most first. */
  groups: FocusGroup[]
  /** Session counts per band of LENGTH_BANDS. */
  lengths: number[]
}

/** Everything the Insights screen says about focus between `from` and `to`, inclusive. */
export function focusStats(sessions: FocusSession[], from: DateKey, to: DateKey): FocusStats {
  const keys = rangeKeys(from, to)
  const inRange = sessions.filter((f) => { const k = sessionDay(f); return k >= from && k <= to })

  const byDay: FocusStats['byDay'] = {}
  for (const k of keys) byDay[k] = { minutes: 0, sessions: 0 }
  const byHour = Array<number>(24).fill(0)
  const lengths = Array<number>(LENGTH_BANDS.length).fill(0)
  const areas = new Map<ID | null, { minutes: number; sessions: number }>()
  const groups = new Map<string, FocusGroup>()
  let minutes = 0
  let longest: FocusSession | null = null

  for (const f of inRange) {
    minutes += f.minutes
    const day = byDay[sessionDay(f)]
    day.minutes += f.minutes
    day.sessions++
    if (!longest || f.minutes > longest.minutes) longest = f

    const start = new Date(f.startedAt)
    let hour = start.getHours()
    let left = f.minutes
    let room = 60 - start.getMinutes()
    while (left > 0) {
      const part = Math.min(left, room)
      byHour[hour] += part
      left -= part
      hour = (hour + 1) % 24
      room = 60
    }

    let band = 0
    while (band + 1 < LENGTH_BANDS.length && f.minutes >= LENGTH_BANDS[band + 1]) band++
    lengths[band]++

    const a = areas.get(f.areaId) ?? { minutes: 0, sessions: 0 }
    a.minutes += f.minutes
    a.sessions++
    areas.set(f.areaId, a)

    const label = f.label.trim()
    const key = f.habitId ? `habit:${f.habitId}` : f.goalId ? `goal:${f.goalId}` : `label:${label.toLocaleLowerCase()}`
    const g = groups.get(key) ?? { key, label, habitId: f.habitId, goalId: f.habitId ? null : f.goalId, minutes: 0, sessions: 0 }
    g.minutes += f.minutes
    g.sessions++
    groups.set(key, g)
  }

  let bestDay: FocusStats['bestDay'] = null
  for (const k of keys) if (byDay[k].minutes > 0 && (!bestDay || byDay[k].minutes > bestDay.minutes)) bestDay = { date: k, minutes: byDay[k].minutes }

  const wdMinutes = Array<number>(7).fill(0)
  const wdCount = Array<number>(7).fill(0)
  for (const k of keys) { const w = dayOfWeek(k); wdMinutes[w] += byDay[k].minutes; wdCount[w]++ }

  return {
    days: keys.length,
    minutes,
    sessions: inRange.length,
    avgSession: inRange.length ? minutes / inRange.length : 0,
    dailyAvg: keys.length ? minutes / keys.length : 0,
    focusDays: keys.filter((k) => byDay[k].sessions > 0).length,
    longest,
    bestDay,
    byDay,
    byHour,
    byWeekday: wdMinutes.map((m, i) => (wdCount[i] ? m / wdCount[i] : 0)),
    byArea: [...areas.entries()].map(([areaId, v]) => ({ areaId, ...v })).sort((x, y) => y.minutes - x.minutes),
    groups: [...groups.values()].sort((x, y) => y.minutes - x.minutes || y.sessions - x.sessions),
    lengths,
  }
}

/**
 * Days in a row with at least one focus session. The current run counts back from today, or from
 * yesterday while today has none yet — a run is not broken until a whole day passes without focus.
 */
export function focusStreak(sessions: FocusSession[], today: DateKey): { current: number; best: number } {
  const days = new Set(sessions.map(sessionDay))
  let current = 0
  let k = days.has(today) ? today : addDaysKey(today, -1)
  while (days.has(k)) { current++; k = addDaysKey(k, -1) }
  let best = 0
  for (const d of days) {
    if (d > today || days.has(addDaysKey(d, -1))) continue // only start counting at the first day of a run
    let n = 0
    let x = d
    while (days.has(x) && x <= today) { n++; x = addDaysKey(x, 1) }
    best = Math.max(best, n)
  }
  return { current, best: Math.max(best, current) }
}

/** Tasks completed on each local day of the range. */
export function tasksDoneByDay(tasks: Task[], from: DateKey, to: DateKey): Record<DateKey, number> {
  const out: Record<DateKey, number> = {}
  for (const k of rangeKeys(from, to)) out[k] = 0
  for (const t of tasks) {
    if (!t.done || !t.doneAt) continue
    const k = dayOf(t.doneAt)
    if (k >= from && k <= to) out[k]++
  }
  return out
}

/**
 * Mean completion rate of the habits that existed during the range; null when none did. A habit
 * created after the range ends is left out rather than counted as 0%, so a new habit never makes
 * last month look worse.
 */
export function habitConsistency(
  habits: Habit[], logs: HabitLogs, from: DateKey, to: DateKey, today: DateKey, weekStartsOn: 0 | 1 | 6,
): number | null {
  const live = habits.filter((h) => !h.archived && historyStart(h, logs) <= to)
  if (!live.length) return null
  return live.reduce((s, h) => s + completionRate(h, logs, from, to, today, weekStartsOn), 0) / live.length
}

export interface HabitAmount {
  habit: Habit
  /** Logged in the period, and in the same number of days before it. */
  amount: number
  prev: number
  /** Mean a day over the period's days since the habit began (0 when it began after the period). */
  perDay: number
  /** Everything ever logged, up to today. */
  all: number
  round: RoundProgress | null
}

/**
 * The totals of every counted habit (pages, minutes, reps — ADR-038) over `from…to`, compared with
 * the period before, in the habits' own order. Archived habits are left out.
 */
export function habitAmounts(habits: Habit[], logs: HabitLogs, from: DateKey, to: DateKey, today: DateKey): HabitAmount[] {
  const prev = previousRange(from, to)
  return habits
    .filter((h) => !h.archived && isCounted(h))
    .sort((a, b) => a.order - b.order)
    .map((h) => {
      const amount = amountBetween(logs, h.id, from, to)
      const start = [from, historyStart(h, logs)].sort()[1]
      const days = start <= to ? rangeKeys(start, to).length : 0
      return {
        habit: h,
        amount,
        prev: amountBetween(logs, h.id, prev.from, prev.to),
        perDay: days ? amount / days : 0,
        all: amountTotal(logs, h.id, today),
        round: roundProgress(h, logs, today),
      }
    })
}

