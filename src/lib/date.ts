import {
  addDays, differenceInCalendarDays, format, parseISO, startOfWeek,
} from 'date-fns'
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

export function prettyDay(k: DateKey, today: DateKey = todayKey()): string {
  const d = diffDays(k, today)
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  if (d === -1) return 'Yesterday'
  if (d > 1 && d < 7) return format(fromKey(k), 'EEEE')
  return format(fromKey(k), 'EEE, MMM d')
}

export function hijri(d: Date): string {
  try {
    return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(d)
  } catch {
    return ''
  }
}

export function greeting(d: Date = new Date()): string {
  const h = d.getHours()
  if (h < 5) return 'Up late'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
