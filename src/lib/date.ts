import {
  addDays, differenceInCalendarDays, format, parseISO, startOfWeek,
} from 'date-fns'
import { tx, type I18n } from '../i18n/core'
import type { DateKey } from './types'

/** Local-time day key. Never derive one from toISOString(): that is UTC and shifts the day. */
export function toKey(d: Date): DateKey {
  return format(d, 'yyyy-MM-dd')
}

export function fromKey(k: DateKey): Date {
  return parseISO(k)
}

export function todayKey(now: Date = new Date()): DateKey {
  return toKey(now)
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
