import { addDaysKey, diffDays, toKey } from './date'
import type { Contact, DateKey, Interaction, InteractionKind } from './types'

/**
 * Relationship maths (ADR-018). Pure, tested; screens never compute these themselves.
 *
 * - The **last contact** is the latest logged interaction, or the "last time we talked" date
 *   entered by hand, whichever is later. A person never contacted counts from the day they
 *   were added — so adding 50 people does not make 50 check-ins due today.
 * - The **next check-in** is last contact + rhythm, pushed to the snooze date if later.
 */

export const CADENCES: { days: number; label: string }[] = [
  { days: 7, label: 'Every week' },
  { days: 14, label: 'Every 2 weeks' },
  { days: 30, label: 'Every month' },
  { days: 90, label: 'Every 3 months' },
  { days: 180, label: 'Every 6 months' },
  { days: 365, label: 'Every year' },
]

export function cadenceLabel(days: number | null): string {
  if (!days) return 'No rhythm'
  return CADENCES.find((c) => c.days === days)?.label ?? `Every ${days} days`
}

export const KIND_LABEL: Record<InteractionKind, { label: string; emoji: string }> = {
  call: { label: 'Call', emoji: '📞' },
  message: { label: 'Message', emoji: '💬' },
  meet: { label: 'Met up', emoji: '🤝' },
  email: { label: 'Email', emoji: '✉️' },
  other: { label: 'Other', emoji: '✨' },
}

export function interactionsOf(contactId: string, all: Interaction[]): Interaction[] {
  return all.filter((i) => i.contactId === contactId).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
}

export function lastContact(c: Contact, all: Interaction[]): DateKey | null {
  let last: DateKey | null = c.lastContactManual
  for (const i of all) if (i.contactId === c.id && (!last || i.date > last)) last = i.date
  return last
}

export type CheckInState = 'overdue' | 'today' | 'soon' | 'later' | 'none'

export interface CheckIn {
  due: DateKey | null
  /** due − today, in days (negative = overdue) */
  days: number | null
  state: CheckInState
  last: DateKey | null
}

export function checkIn(c: Contact, all: Interaction[], today: DateKey): CheckIn {
  const last = lastContact(c, all)
  if (!c.cadenceDays || c.archived) return { due: null, days: null, state: 'none', last }
  const base = last ?? toKey(new Date(c.createdAt))
  let due = addDaysKey(base, c.cadenceDays)
  if (c.snoozedUntil && c.snoozedUntil > due) due = c.snoozedUntil
  const days = diffDays(due, today)
  const state: CheckInState = days < 0 ? 'overdue' : days === 0 ? 'today' : days <= 7 ? 'soon' : 'later'
  return { due, days, state, last }
}

export interface ParsedBirthday {
  month: number
  day: number
  year: number | null
}

/** Accepts "YYYY-MM-DD" or "MM-DD". */
export function parseBirthday(b: string): ParsedBirthday | null {
  const full = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b)
  const short = /^(\d{2})-(\d{2})$/.exec(b)
  const [y, m, d] = full ? [Number(full[1]), Number(full[2]), Number(full[3])] : short ? [null, Number(short[1]), Number(short[2])] : [null, 0, 0]
  if (!m || m > 12 || !d || d > 31) return null
  return { month: m, day: d, year: y }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** The next birthday on or after today (29 Feb → 28 Feb in other years), with the age then. */
export function nextBirthday(b: string, today: DateKey): { date: DateKey; days: number; age: number | null } | null {
  const p = parseBirthday(b)
  if (!p) return null
  const y0 = Number(today.slice(0, 4))
  for (const y of [y0, y0 + 1]) {
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
    const day = p.month === 2 && p.day === 29 && !leap ? 28 : p.day
    const date = `${y}-${pad(p.month)}-${pad(day)}`
    if (date >= today) return { date, days: diffDays(date, today), age: p.year ? y - p.year : null }
  }
  return null
}

/** The first date for a yearly birthday reminder: the real birth date, or this year's if no year. */
export function birthdayReminderDate(b: string, today: DateKey): { date: DateKey; countYears: boolean } | null {
  const p = parseBirthday(b)
  if (!p) return null
  if (p.year) return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, countYears: true }
  return { date: `${today.slice(0, 4)}-${pad(p.month)}-${pad(p.day)}`, countYears: false }
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}
