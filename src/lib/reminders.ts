import {
  addDays, addMonths, addYears, differenceInCalendarDays, differenceInCalendarMonths,
  differenceInCalendarYears, format,
} from 'date-fns'
import { fromKey, toKey } from './date'
import type { DateKey, Reminder } from './types'

/**
 * Reminder maths: when a reminder occurs, and when its alerts fire. Pure and tested — the
 * desktop helper only fires the flat list `buildSchedule` produces, so this is the single
 * place the rules live (ADR-013).
 *
 * Rules:
 * - Monthly on the 29th–31st falls on the last day of shorter months; yearly on 29 Feb falls on
 *   28 Feb in other years (date-fns clamping, always counted from the original date).
 * - All-day reminders alert at REMINDER_ALL_DAY_TIME.
 * - A one-off reminder marked done never alerts again.
 */

export const REMINDER_ALL_DAY_TIME = '09:00'
/** A missed alert (computer asleep or off) still fires if it is at most this late. */
export const GRACE_MS = 12 * 60 * 60 * 1000

export const ALERT_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 0, label: 'At the time' },
  { minutes: 15, label: '15 min before' },
  { minutes: 60, label: '1 hour before' },
  { minutes: 1440, label: '1 day before' },
  { minutes: 4320, label: '3 days before' },
  { minutes: 10080, label: '1 week before' },
]

export function alertLabel(min: number, allDay: boolean): string {
  if (min === 0) return allDay ? 'On the day' : 'At the time'
  return ALERT_OPTIONS.find((o) => o.minutes === min)?.label ?? `${min} min before`
}

export const REPEAT_LABEL: Record<Reminder['repeat'], string> = {
  none: 'Once', daily: 'Every day', weekly: 'Every week', monthly: 'Every month', yearly: 'Every year',
}

/** The local Date of the reminder on a given day. */
export function at(r: Reminder, day: DateKey): Date {
  const [h, m] = (r.time ?? REMINDER_ALL_DAY_TIME).split(':').map(Number)
  const d = fromKey(day)
  d.setHours(h, m, 0, 0)
  return d
}

function nth(r: Reminder, n: number): DateKey {
  const start = fromKey(r.date)
  switch (r.repeat) {
    case 'daily': return toKey(addDays(start, n))
    case 'weekly': return toKey(addDays(start, 7 * n))
    case 'monthly': return toKey(addMonths(start, n))
    case 'yearly': return toKey(addYears(start, n))
    default: return r.date
  }
}

/** Index of the last occurrence starting before `day` (a safe place to start iterating). */
function startIndex(r: Reminder, day: DateKey): number {
  const a = fromKey(day)
  const s = fromKey(r.date)
  const raw = r.repeat === 'daily' ? differenceInCalendarDays(a, s)
    : r.repeat === 'weekly' ? Math.floor(differenceInCalendarDays(a, s) / 7)
    : r.repeat === 'monthly' ? differenceInCalendarMonths(a, s)
    : r.repeat === 'yearly' ? differenceInCalendarYears(a, s)
    : 0
  return Math.max(0, raw - 1)
}

/** Occurrence days in [from, to] (inclusive), oldest first. */
export function occurrencesBetween(r: Reminder, from: DateKey, to: DateKey, limit = 1000): DateKey[] {
  if (r.repeat === 'none') return r.date >= from && r.date <= to ? [r.date] : []
  const out: DateKey[] = []
  for (let n = startIndex(r, from); out.length < limit; n++) {
    const k = nth(r, n)
    if (k > to) break
    if (k >= from) out.push(k)
  }
  return out
}

/**
 * The next occurrence that is not over yet: for an all-day reminder, today still counts all
 * day; for a timed one, it must not have passed. A one-off in the past returns its date (overdue).
 */
export function nextOccurrence(r: Reminder, now: Date): DateKey {
  const today = toKey(now)
  if (r.repeat === 'none') return r.date
  for (const k of occurrencesBetween(r, today, toKey(addYears(now, 2)), 3)) {
    if (r.time === null || at(r, k).getTime() >= now.getTime()) return k
  }
  return r.date
}

/** "turns 30", "5 years" — for yearly dates with a real original year. */
export function yearsOn(r: Reminder, occurrence: DateKey): number | null {
  if (r.repeat !== 'yearly') return null
  const n = Number(occurrence.slice(0, 4)) - Number(r.date.slice(0, 4))
  return n > 0 ? n : null
}

export interface ScheduledAlert {
  /** Stable id: reminder | occurrence day | minutes before. The helper fires each key once. */
  key: string
  fireAt: number
  title: string
  body: string
  urgent: boolean
}

export function whenText(r: Reminder, occurrence: DateKey, now: Date): string {
  const days = differenceInCalendarDays(fromKey(occurrence), now)
  const time = r.time ? ` at ${r.time}` : ''
  const rel = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days === -1 ? 'Yesterday'
    : days > 1 ? `In ${days} days` : `${-days} days ago`
  return `${rel}${time} · ${format(fromKey(occurrence), 'EEE, MMM d')}`
}

/** Every alert due between (now − grace) and (now + horizon), for the desktop helper. */
export function buildSchedule(reminders: Reminder[], now: Date, horizonDays = 400): ScheduledAlert[] {
  const t0 = now.getTime() - GRACE_MS
  const t1 = now.getTime() + horizonDays * 86_400_000
  const out: ScheduledAlert[] = []
  for (const r of reminders) {
    if (r.done && r.repeat === 'none') continue
    const alerts = r.alerts.length ? r.alerts : [0]
    const maxBefore = Math.max(...alerts)
    const from = toKey(new Date(t0))
    const to = toKey(new Date(t1 + maxBefore * 60_000))
    for (const occ of occurrencesBetween(r, from, to, 500)) {
      const base = at(r, occ).getTime()
      for (const before of alerts) {
        const fireAt = base - before * 60_000
        if (fireAt < t0 || fireAt > t1) continue
        // Never "catch up" on alerts from before the reminder existed.
        if (fireAt < Date.parse(r.createdAt)) continue
        const years = yearsOn(r, occ)
        const lead = before === 0 ? (r.time ? 'Now' : 'Today') : whenText(r, occ, new Date(fireAt)).split(' · ')[0]
        out.push({
          key: `${r.id}|${occ}|${before}`,
          fireAt,
          title: `${r.emoji ? `${r.emoji} ` : ''}${r.title}`,
          body: [`${lead}${r.time && before !== 0 ? ` at ${r.time}` : ''} · ${format(fromKey(occ), 'EEE, MMM d')}`,
            years ? `${years} year${years === 1 ? '' : 's'}` : '', r.notes].filter(Boolean).join('\n'),
          urgent: r.important,
        })
      }
    }
  }
  return out.sort((a, b) => a.fireAt - b.fireAt)
}
