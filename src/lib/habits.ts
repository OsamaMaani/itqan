import { tx, type I18n } from '../i18n/core'
import { addDaysKey, dayOfWeek, diffDays, rangeKeys, toKey, weekStartKey } from './date'
import type { DateKey, Habit, HabitLogs, HabitRound } from './types'

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

/** The first day this habit's history should be read from: the local day it was created, or its earliest log. */
export function historyStart(h: Pick<Habit, 'id' | 'createdAt'>, logs: HabitLogs): DateKey {
  let start = toKey(new Date(h.createdAt))
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

/** Unit names that mean minutes, in every interface language (lower-cased, trailing dot dropped). */
const MINUTE_UNITS = new Set([
  'min', 'mins', 'minute', 'minutes', 'mn', 'minuto', 'minutos', 'دقيقة', 'دقيقه', 'دقائق', 'د', '分钟', '分',
])

/** Is this habit counted in minutes ("Meditate 10 min")? Then a focus session can count its minutes toward it. */
export function countsMinutes(h: Pick<Habit, 'unit'>): boolean {
  return MINUTE_UNITS.has(h.unit.trim().toLowerCase().replace(/\.$/, ''))
}

/**
 * What a finished focus session adds to its habit's log (ADR-029): its minutes when the habit is
 * counted in minutes, otherwise one check-in.
 */
export function focusHabitAmount(h: Pick<Habit, 'unit'>, minutes: number): number {
  return countsMinutes(h) ? minutes : 1
}

// --- amounts and rounds (ADR-038) -------------------------------------------------------

/** Is this habit counted in amounts — pages, minutes, reps — rather than simply done or not? */
export function isCounted(h: Pick<Habit, 'target' | 'unit'>): boolean {
  return h.target > 1 || h.unit.trim() !== ''
}

/** Everything logged for the habit from `from` to `to`, inclusive. */
export function amountBetween(logs: HabitLogs, habitId: string, from: DateKey, to: DateKey): number {
  let n = 0
  for (const [k, v] of Object.entries(logs[habitId] ?? {})) if (k >= from && k <= to) n += v
  return n
}

/** Everything ever logged for the habit up to `today`. */
export function amountTotal(logs: HabitLogs, habitId: string, today: DateKey): number {
  let n = 0
  for (const [k, v] of Object.entries(logs[habitId] ?? {})) if (k <= today) n += v
  return n
}

/** The days the pace is read over: the last four weeks, never before the habit began. */
export const PACE_DAYS = 28

export interface RoundProgress {
  size: number
  /** The round under way, from 1. A round finished exactly today shows as the next one, at 0. */
  number: number
  /** Done in the round under way, 0 … size − 1. */
  into: number
  /** Still to do in it. */
  left: number
  /** Rounds finished so far. */
  completed: number
  /** Mean amount a day lately — over the last PACE_DAYS days, never before the habit began; 0 with none. */
  perDay: number
  /** When the round under way should end at that pace; null without a pace. */
  finishOn: DateKey | null
}

/**
 * Where a counted habit is in its round (ADR-038): what was done before the round was set, plus
 * everything logged since, wrapped into rounds — a finished round simply starts the next.
 * The pace is how much you have been doing lately, whatever round it went to, so a round set
 * today already has a finish date. Today is pending, as for streaks: until something is logged
 * today, the pace reads up to yesterday and the finish counts from today.
 */
export function roundProgress(h: Pick<Habit, 'id' | 'round' | 'createdAt'>, logs: HabitLogs, today: DateKey): RoundProgress | null {
  const r = h.round
  if (!r || r.size <= 0) return null
  const size = r.size
  const total = Math.max(0, r.done) + (r.from <= today ? amountBetween(logs, h.id, r.from, today) : 0)
  const completed = Math.floor(total / size)
  const into = total - completed * size
  const left = size - into

  const end = amountOn(logs, h.id, today) > 0 ? today : addDaysKey(today, -1)
  const start = [historyStart(h, logs), addDaysKey(end, -(PACE_DAYS - 1))].sort()[1]
  const days = end >= start ? diffDays(end, start) + 1 : 0
  const perDay = days ? amountBetween(logs, h.id, start, end) / days : 0
  const finishOn = perDay > 0 ? addDaysKey(end, Math.ceil(left / perDay)) : null
  return { size, number: completed + 1, into, left, completed, perDay, finishOn }
}

/**
 * The round to save from the editor (ADR-038), which asks two things: how big a round is, and
 * where you are in it now — "page 120", today's reading included. Unchanged answers keep the
 * stored round as it is, so saving a habit never moves its start; changed ones restart the count
 * from today, with today's logged amount taken out of `done` so it isn't counted twice.
 * A size of 0 (or empty) removes the round.
 */
export function roundFromEditor(
  h: Pick<Habit, 'id' | 'round' | 'createdAt'> | null, size: number, at: number, logs: HabitLogs, today: DateKey,
): HabitRound | null {
  size = Math.floor(size)
  if (!(size > 0)) return null
  at = Math.max(0, Math.floor(at) || 0)
  const prev = h?.round ?? null
  if (h && prev && prev.size === size && roundProgress(h, logs, today)?.into === at) return prev
  return { size, from: today, done: Math.max(0, at - (h ? amountOn(logs, h.id, today) : 0)) }
}
