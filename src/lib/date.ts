import {
  addDays, differenceInCalendarDays, format, parseISO, startOfWeek,
} from 'date-fns'
import { tx, type I18n } from '../i18n/core'
import { fajrMs } from './fajr'
import type { DateKey, FajrSpan } from './types'

/** Local-time day key. Never derive one from toISOString(): that is UTC and shifts the day. */
export function toKey(d: Date): DateKey {
  return format(d, 'yyyy-MM-dd')
}

export function fromKey(k: DateKey): Date {
  return parseISO(k)
}

// --- When a day starts (ADR-041) -------------------------------------------------------------
// By default at midnight. While the owner has a day start at Fajr, a moment after midnight but
// before Fajr belongs to the day before. The rule is the stored spans of time it was on, so the
// day of any moment is a pure function of the data: switching never moves the past.

let spans: { from: number; to: number; span: FajrSpan }[] = []

/** Installs the owner's Fajr spans (the store does this whenever they change). */
export function setDayRule(list: readonly FajrSpan[]): void {
  spans = list
    .map((span) => ({ from: Date.parse(span.from), to: span.to ? Date.parse(span.to) : Infinity, span }))
    .filter((x) => Number.isFinite(x.from) && x.to > x.from)
    .sort((a, b) => a.from - b.from)
}

/** The span in force at a moment (the latest to start, if two devices overlapped), else null. */
export function fajrSpanAt(ms: number): FajrSpan | null {
  for (let i = spans.length - 1; i >= 0; i--) {
    const x = spans[i]
    if (x.from <= ms && ms < x.to) return x.span
  }
  return null
}

/** Fajr of local day `k` under a span, as epoch ms; null where there is none (polar day/night). */
export function fajrOn(k: DateKey, span: Pick<FajrSpan, 'lat' | 'lng' | 'angle'>): number | null {
  return fajrMs(k, span.lat, span.lng, span.angle)
}

/**
 * The day a moment belongs to: its local calendar day, or the day before when it falls after
 * midnight but before Fajr while the day starts at Fajr. Every "which day did this happen" goes
 * through here (or todayKey) — never toKey(new Date(iso)), which ignores the rule.
 */
export function dayOf(at: Date | string): DateKey {
  const d = typeof at === 'string' ? new Date(at) : at
  const k = toKey(d)
  const span = fajrSpanAt(d.getTime())
  if (!span) return k
  const fajr = fajrOn(k, span)
  return fajr !== null && d.getTime() < fajr ? toKey(addDays(fromKey(k), -1)) : k
}

/**
 * The date on the wall calendar at a moment, ignoring when a day starts. Only for clock times —
 * whether a time shown needs its weekday, which date a prayer time is on — never for which day
 * something counts for: that is dayOf.
 */
export function calendarKey(ms: number): DateKey {
  return toKey(new Date(ms))
}

/** The day it is now — the day a check-in, a finished task or a new entry counts for. */
export function todayKey(now: Date = new Date()): DateKey {
  return dayOf(now)
}

export function addDaysKey(k: DateKey, n: number): DateKey {
  return toKey(addDays(fromKey(k), n))
}

export function diffDays(a: DateKey, b: DateKey): number {
  return differenceInCalendarDays(fromKey(a), fromKey(b))
}

export function weekStartKey(k: DateKey, weekStartsOn: 0 | 1 | 6): DateKey {
  return toKey(startOfWeek(fromKey(k), { weekStartsOn }))
}

export function weekDays(k: DateKey, weekStartsOn: 0 | 1 | 6): DateKey[] {
  const start = weekStartKey(k, weekStartsOn)
  return Array.from({ length: 7 }, (_, i) => addDaysKey(start, i))
}

/** Inclusive range of day keys from a to b. */
export function rangeKeys(a: DateKey, b: DateKey): DateKey[] {
  const n = diffDays(b, a)
  return Array.from({ length: Math.max(0, n + 1) }, (_, i) => addDaysKey(a, i))
}

export function dayOfWeek(k: DateKey): number {
  return fromKey(k).getDay()
}

/** "Today", "Tomorrow", a weekday this week, else "Sat, Oct 17" — in the interface language. */
export function prettyDay(k: DateKey, today: DateKey = todayKey(), t: I18n = tx()): string {
  const d = diffDays(k, today)
  if (d >= -1 && d <= 1) return t.relDay(d)
  if (d > 1 && d < 7) return t.d(k, 'weekday', true)
  return t.d(k, 'weekdayShort', true)
}

/** Which greeting fits the hour; the words are `m.today.greeting[key]`. */
export type GreetingKey = 'late' | 'morning' | 'afternoon' | 'evening'

export function greetingKey(d: Date = new Date()): GreetingKey {
  const h = d.getHours()
  if (h < 5) return 'late'
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
