import {
  addDays, addMonths, addYears, differenceInCalendarDays, differenceInCalendarMonths,
  differenceInCalendarYears,
} from 'date-fns'
import { tx, type I18n } from '../i18n/core'
import { fromKey, toKey } from './date'
import type { ActiveTimer, DateKey, Reminder } from './types'

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

/** Alert choices, in minutes before the reminder. */
export const ALERT_MINUTES = [0, 15, 60, 1440, 4320, 10080]

/** "At the time", "15 min before", "1 day before", "1 week before"… in the interface language. */
export function alertLabel(min: number, allDay: boolean, t: I18n = tx()): string {
  const a = t.m.reminders.alert
  if (min === 0) return allDay ? a.onTheDay : a.atTheTime
  if (min % 10080 === 0) return t.p(a.weeksBefore, min / 10080)
  if (min % 1440 === 0) return t.p(a.daysBefore, min / 1440)
  if (min % 60 === 0) return t.p(a.hoursBefore, min / 60)
  return t.p(a.minutesBefore, min)
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
  if (r.repeat !== 'yearly' || r.countYears === false) return null
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

/**
 * The desktop alert for a running focus or break timer: it fires when the timer runs out, even
 * if Itqan is minimised or closed. A paused timer has no alert; resuming gives a new key, so the
 * helper drops the old end time and fires the new one.
 */
export function timerAlert(timer: ActiveTimer | null, t: I18n = tx()): ScheduledAlert | null {
  if (!timer?.endsAt) return null
  const focus = timer.mode === 'focus'
  return {
    key: `timer|${timer.startedAt}|${timer.endsAt}`,
    fireAt: timer.endsAt,
    title: `${focus ? '🎯' : '☕'} ${t.m.focus.appName}`,
    body: focus ? t.f(t.m.focus.focusDoneNotify, { n: Math.round(timer.totalMs / 60000) }) : t.m.focus.breakOverNotify,
    urgent: false,
  }
}

/** "Tomorrow at 9:00 AM · Sat, Oct 17" in the interface language. */
export function whenText(r: Reminder, occurrence: DateKey, now: Date, t: I18n = tx()): string {
  return `${relWhen(r, occurrence, now, t)} · ${t.d(occurrence, 'weekdayShort')}`
}

function relWhen(r: Reminder, occurrence: DateKey, now: Date, t: I18n): string {
  const rel = t.relDay(differenceInCalendarDays(fromKey(occurrence), now))
  return r.time ? t.f(t.m.reminders.whenAt, { when: rel, time: t.time(r.time) }) : rel
}

/** Every alert due between (now − grace) and (now + horizon), for the desktop helper. */
export function buildSchedule(reminders: Reminder[], now: Date, horizonDays = 400, t: I18n = tx()): ScheduledAlert[] {
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
        const lead = before === 0 ? (r.time ? t.m.reminders.now : t.m.time.today) : relWhen(r, occ, new Date(fireAt), t)
        out.push({
          key: `${r.id}|${occ}|${before}`,
          fireAt,
          title: `${r.emoji ? `${r.emoji} ` : ''}${r.title}`,
          body: [`${lead} · ${t.d(occ, 'weekdayShort')}`, years ? t.p(t.m.reminders.years, years) : '', r.notes].filter(Boolean).join('\n'),
          urgent: r.important,
        })
      }
    }
  }
  return out.sort((a, b) => a.fireAt - b.fireAt)
}
