import { tx, type I18n } from '../i18n/core'
import { addDaysKey, dayOfWeek, diffDays, rangeKeys, weekStartKey } from './date'
import type { DateKey, Habit, HabitLogs } from './types'

/**
 * Habit maths. Pure functions of (habit, logs, today) — no store access — so they are
 * testable and every screen agrees on what a streak is. See memory/04-decisions.md ADR-006.
 *
 * Rules:
 * - A day (or week, for weekly habits) is **met** when the logged amount reaches the target.
 * - Today / this week is **pending** until met: an unfinished today never breaks a streak.
 * - Days a habit is not scheduled on are skipped, never counted as misses.
 */

export function amountOn(logs: HabitLogs, habitId: string, day: DateKey): number {
  return logs[habitId]?.[day] ?? 0
}

export function isScheduled(h: Habit, day: DateKey): boolean {
  if (h.schedule.type === 'days') return h.schedule.days.includes(dayOfWeek(day))
  return true
}

export function isMetOn(h: Habit, logs: HabitLogs, day: DateKey): boolean {
  return amountOn(logs, h.id, day) >= Math.max(1, h.target)
}

/** Days in the week containing `day` on which the habit was met. */
export function metDaysInWeek(h: Habit, logs: HabitLogs, day: DateKey, weekStartsOn: 0 | 1 | 6): number {
  const start = weekStartKey(day, weekStartsOn)
  let n = 0
  for (let i = 0; i < 7; i++) if (isMetOn(h, logs, addDaysKey(start, i))) n++
  return n
}

/** The first day this habit's history should be read from. */
export function historyStart(h: Habit, logs: HabitLogs): DateKey {
  let start = h.createdAt.slice(0, 10)
  for (const k of Object.keys(logs[h.id] ?? {})) if (k < start) start = k
  return start
}

export type PeriodState = 'met' | 'missed' | 'pending'

/** Scheduled periods from the habit's start up to today, oldest first. */
export function periods(h: Habit, logs: HabitLogs, today: DateKey, weekStartsOn: 0 | 1 | 6): PeriodState[] {
  const start = historyStart(h, logs)
  if (start > today) return []

  if (h.schedule.type === 'weekly') {
    const times = Math.max(1, h.schedule.times)
    const out: PeriodState[] = []
    let w = weekStartKey(start, weekStartsOn)
    const current = weekStartKey(today, weekStartsOn)
    while (w <= current) {
      const met = metDaysInWeek(h, logs, w, weekStartsOn) >= times
      out.push(met ? 'met' : w === current ? 'pending' : 'missed')
      w = addDaysKey(w, 7)
    }
    return out
  }

  const out: PeriodState[] = []
  for (const k of rangeKeys(start, today)) {
    if (!isScheduled(h, k)) continue
    const met = isMetOn(h, logs, k)
    out.push(met ? 'met' : k === today ? 'pending' : 'missed')
  }
  return out
}

export interface StreakInfo {
  current: number
  best: number
  unit: 'day' | 'week'
}

export function streak(h: Habit, logs: HabitLogs, today: DateKey, weekStartsOn: 0 | 1 | 6): StreakInfo {
  const ps = periods(h, logs, today, weekStartsOn)
  let best = 0
  let run = 0
  for (const p of ps) {
    if (p === 'met') { run++; best = Math.max(best, run) }
    else if (p === 'missed') run = 0
  }
  let current = 0
  for (let i = ps.length - 1; i >= 0; i--) {
    if (ps[i] === 'pending') continue
    if (ps[i] === 'met') current++
    else break
  }
  return { current, best, unit: h.schedule.type === 'weekly' ? 'week' : 'day' }
}

/** Share of scheduled, non-pending days in [from, to] that were met. Weekly habits use weeks. */
export function completionRate(
  h: Habit, logs: HabitLogs, from: DateKey, to: DateKey, today: DateKey, weekStartsOn: 0 | 1 | 6,
): number {
  // Days before the habit existed are not misses.
  const start = historyStart(h, logs)
  if (from < start) from = start
  if (h.schedule.type === 'weekly') {
    const times = Math.max(1, h.schedule.times)
    let total = 0
    let met = 0
    let w = weekStartKey(from, weekStartsOn)
    while (w <= to) {
      const m = metDaysInWeek(h, logs, w, weekStartsOn) >= times
      const pending = w === weekStartKey(today, weekStartsOn) && !m
      if (!pending) { total++; if (m) met++ }
      w = addDaysKey(w, 7)
    }
    return total ? met / total : 0
  }
  let total = 0
  let met = 0
  for (const k of rangeKeys(from, to)) {
    if (!isScheduled(h, k)) continue
    const m = isMetOn(h, logs, k)
    if (k === today && !m) continue
    if (diffDays(k, today) > 0) continue
    total++
    if (m) met++
  }
  return total ? met / total : 0
}

/** Should this habit appear in today's list? Weekly habits stay until the week's quota is met. */
export function isDueToday(h: Habit, logs: HabitLogs, today: DateKey, weekStartsOn: 0 | 1 | 6): boolean {
  if (h.archived) return false
  if (h.schedule.type === 'weekly') {
    return metDaysInWeek(h, logs, today, weekStartsOn) < h.schedule.times || isMetOn(h, logs, today)
  }
  return isScheduled(h, today)
}

/** "Every day", "4× a week", "Mon · Wed · Fri" in the interface language. */
export function scheduleLabel(h: Habit, t: I18n = tx()): string {
  const s = h.schedule
  if (s.type === 'daily' || (s.type === 'days' && s.days.length === 7)) return t.m.habits.everyDay
  if (s.type === 'weekly') return t.p(t.m.habits.timesAWeek, s.times)
  const names = t.weekdays('short')
  return [...s.days].sort().map((d) => names[d]).join(' · ')
}
