import { tx, type I18n } from '../i18n/core'
import { addDaysKey, dayOf, fromKey } from './date'
import { prayerTimes, type FajrPlaceInfo } from './fajr'
import { isDueOn } from './habits'
import type { DateKey, Habit, HabitLogs, HabitSchedule, HabitWindow, HabitWindowSettings, PrayerSettings, WindowEdge } from './types'

/**
 * Timed habits (ADR-043): a habit done between two prayers or clock times — "Friday between Asr
 * and Maghrib", "Thursday's Asr to Friday's Maghrib". Pure functions of (habit, logs, now, where
 * the owner is), so every screen agrees on when a window is and the edge cases are tested.
 *
 * Rules:
 * - A window belongs to a *count day*: a day the habit's schedule names, whose log a check-in
 *   writes. It opens on that calendar day, or `nights` days before when it counts for the day it
 *   closes. Streaks and history only ever read count days, so a window changes no number.
 * - Prayer edges take that calendar day's prayer time where the owner is; clock edges, that day's
 *   local clock. A window that cannot be placed on a day (no location yet, no sunrise at the pole,
 *   or closing before it opens) is no window that day: the habit behaves like any other.
 * - Ticking is never refused outside a window (the owner, 2026-10-30): you may have done it and
 *   forgotten. The window decides what Today shows and which day a tap there counts for.
 */

/** Where prayer times are reckoned and how; place null = unknown, so prayer edges have no time. */
export interface WindowContext {
  place: FajrPlaceInfo | null
  asr: PrayerSettings['asr']
}

/** The instants a window opens and closes, as epoch ms. */
export interface WindowSpan {
  opens: number
  closes: number
}

export type WindowState = 'upcoming' | 'open' | 'closed'

/** A habit's check-in Today is about: the day it counts for and, if it has one that day, its window. */
export interface Occurrence {
  day: DateKey
  span: WindowSpan | null
  state: WindowState | null
}

export const MAX_NIGHTS = 6

/** The calendar day the window for count day `day` opens on. */
export function openingDay(w: HabitWindow, day: DateKey): DateKey {
  return w.countOn === 'end' ? addDaysKey(day, -w.nights) : day
}

/** The count day of a window opening on calendar day `opening`. */
export function countDay(w: HabitWindow, opening: DateKey): DateKey {
  return w.countOn === 'end' ? addDaysKey(opening, w.nights) : opening
}

/**
 * How many days before its count day a window opens, and how many after it closes — the way the
 * editor puts it ("from Thursday's Maghrib until Friday's", counting Friday). One is always 0.
 */
export function windowDays(w: HabitWindow): { before: number; after: number } {
  return w.countOn === 'end' ? { before: w.nights, after: 0 } : { before: 0, after: w.nights }
}

/** The window opening `before` days ahead of its count day, or closing `after` days later. */
export function withDays(w: HabitWindow, days: { before: number } | { after: number }): HabitWindow {
  if ('before' in days) return days.before > 0 ? { ...w, nights: days.before, countOn: 'end' } : w.countOn === 'end' ? { ...w, nights: 0, countOn: 'start' } : w
  return days.after > 0 ? { ...w, nights: days.after, countOn: 'start' } : w.countOn === 'start' ? { ...w, nights: 0 } : w
}

/**
 * The same window, saved on the other calendar day it touches: the window stays where it is and the
 * schedule's weekdays move with the count day (Thursday Maghrib to Friday Maghrib, counted Friday or
 * Thursday). A window within one day has nothing to choose.
 */
export function recount(schedule: HabitSchedule, w: HabitWindow, on: HabitWindow['countOn']): { schedule: HabitSchedule; window: HabitWindow } {
  if (w.nights === 0 || w.countOn === on) return { schedule, window: w }
  const shift = on === 'end' ? w.nights : -w.nights
  return {
    schedule: schedule.type === 'days' ? { type: 'days', days: schedule.days.map((d) => (((d + shift) % 7) + 7) % 7).sort() } : schedule,
    window: { ...w, countOn: on },
  }
}

/**
 * Does the window open in the evening — at Maghrib or Isha, or a clock time after today's Maghrib
 * (6 PM without a location)? Then, by the Islamic day that begins at Maghrib, it belongs to the next day.
 */
export function opensInEvening(w: HabitWindow, ctx: WindowContext, today: DateKey): boolean {
  if (w.start.kind === 'prayer') return w.start.prayer === 'maghrib' || w.start.prayer === 'isha'
  const opens = edgeMs(w.start, today, ctx)
  const maghrib = ctx.place ? prayerTimes(today, ctx.place, ctx.asr)?.maghrib : null
  const [y, m, d] = today.split('-').map(Number)
  return opens !== null && opens >= (maghrib ?? new Date(y, m - 1, d, 18).getTime())
}

/** The instant an edge falls on calendar day `k`, or null where it has none. */
export function edgeMs(edge: WindowEdge, k: DateKey, ctx: WindowContext): number | null {
  if (edge.kind === 'time') {
    const [hh, mm] = edge.time.split(':').map(Number)
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
    const [y, m, d] = k.split('-').map(Number)
    // Local clock: a time skipped by a daylight-saving change rolls forward, as clocks do.
    return new Date(y, m - 1, d, hh, mm).getTime()
  }
  if (!ctx.place) return null
  const times = prayerTimes(k, ctx.place, ctx.asr)
  return times ? times[edge.prayer] + Math.round(edge.offset) * 60_000 : null
}

/** The window of check-ins counted on `day`, or null where it cannot be placed that day. */
export function windowSpan(w: HabitWindow, day: DateKey, ctx: WindowContext): WindowSpan | null {
  const open = openingDay(w, day)
  const opens = edgeMs(w.start, open, ctx)
  const closes = edgeMs(w.end, addDaysKey(open, w.nights), ctx)
  if (opens === null || closes === null || closes <= opens) return null
  return { opens, closes }
}

export function stateAt(span: WindowSpan, now: number): WindowState {
  return now < span.opens ? 'upcoming' : now < span.closes ? 'open' : 'closed'
}

/** Does any edge need prayer times? */
export function usesPrayers(w: HabitWindow): boolean {
  return w.start.kind === 'prayer' || w.end.kind === 'prayer'
}

/**
 * The check-in Today shows for a habit at `now` — which day a tap counts for — or null when the
 * habit has nothing to show today. A habit without a window: today, when due, as always. With one:
 *  1. a window open now (the unmet one closing first, if windows overlap), else
 *  2. today's own check-in before its window opens, or all day where it has no window today, else
 *  3. a window opening later today that counts for another day ("Thursday's Asr, for Friday"), else
 *  4. today's own check-in after its window closed, for the rest of the day — after 3, so a nightly
 *     window that closed this morning gives way to tonight's.
 * An upcoming window shows only from `showBefore` minutes before it opens (-1: all its day).
 */
export function todayOccurrence(
  h: Habit, logs: HabitLogs, now: number, today: DateKey, weekStartsOn: 0 | 1 | 6, ctx: WindowContext,
  showBefore: HabitWindowSettings['showBefore'],
): Occurrence | null {
  const w = h.window
  if (h.archived) return null
  if (!w) return isDueOn(h, logs, today, weekStartsOn) ? { day: today, span: null, state: null } : null

  const shows = (span: WindowSpan) => showBefore < 0 || span.opens - now <= showBefore * 60_000
  const reach = w.nights + 1
  let open: (Occurrence & { met: boolean })[] = []
  let own: Occurrence | null = null
  let closed: Occurrence | null = null
  let next: Occurrence | null = null
  for (let i = -reach; i <= reach; i++) {
    const day = addDaysKey(today, i)
    if (!isDueOn(h, logs, day, weekStartsOn)) continue
    const span = windowSpan(w, day, ctx)
    if (!span) {
      if (day === today) own = { day, span: null, state: null }
      continue
    }
    const state = stateAt(span, now)
    if (state === 'open') open.push({ day, span, state, met: (logs[h.id]?.[day] ?? 0) >= Math.max(1, h.target) })
    else if (day === today) {
      if (state === 'closed') closed = { day, span, state }
      else if (shows(span)) own = { day, span, state }
    }
    else if (state === 'upcoming' && dayOf(new Date(span.opens)) === today && shows(span) && (!next || span.opens < next.span!.opens)) {
      next = { day, span, state }
    }
  }
  if (open.length) {
    open = open.sort((a, b) => Number(a.met) - Number(b.met) || a.span!.closes - b.span!.closes)
    const { met: _, ...first } = open[0]
    return first
  }
  return own ?? next ?? closed
}

/**
 * How a window fares over the year ahead from `from`, for the editor: whether it needs a location
 * that is not set, and on how many days it closes before it opens (Asr to 4 PM is fine in winter
 * and backwards in summer). Days with no times at all (polar) are not counted as wrong.
 */
export function windowCheck(w: HabitWindow, ctx: WindowContext, from: DateKey): { noPlace: boolean; backwards: number } {
  if (usesPrayers(w) && !ctx.place) return { noPlace: true, backwards: 0 }
  let backwards = 0
  for (let i = 0; i < 366; i++) {
    const open = addDaysKey(from, i)
    const opens = edgeMs(w.start, open, ctx)
    const closes = edgeMs(w.end, addDaysKey(open, w.nights), ctx)
    if (opens !== null && closes !== null && closes <= opens) backwards++
  }
  return { noPlace: false, backwards }
}

/** The next window that has not closed yet, from today, for the editor's example; null if none in two weeks. */
export function nextWindow(
  h: Pick<Habit, 'schedule' | 'window'>, now: number, today: DateKey, ctx: WindowContext,
): (WindowSpan & { day: DateKey }) | null {
  const w = h.window
  if (!w) return null
  for (let i = -w.nights; i <= 14; i++) {
    const day = addDaysKey(today, i)
    if (h.schedule.type === 'days' && !h.schedule.days.includes(fromKey(day).getDay())) continue
    const span = windowSpan(w, day, ctx)
    if (span && span.closes > now) return { ...span, day }
  }
  return null
}

// --- Words ------------------------------------------------------------------------------------

/** "Asr", "15 min after Asr", "3:00 PM". */
export function edgeLabel(edge: WindowEdge, t: I18n = tx()): string {
  const L = t.m.habits.window
  if (edge.kind === 'time') return t.time(edge.time)
  const prayer = L.prayers[edge.prayer]
  if (!edge.offset) return prayer
  return t.f(edge.offset > 0 ? L.after : L.before, { n: Math.abs(edge.offset), prayer })
}

/**
 * "Asr – Maghrib", "Isha – Fajr the next day", "Maghrib the day before – Maghrib". Given the one
 * weekday it counts for, a window across days names its days: "Thu Maghrib – Fri Maghrib".
 */
export function windowLabel(w: HabitWindow, t: I18n = tx(), countWeekday: number | null = null): string {
  const L = t.m.habits.window
  const vars = { start: edgeLabel(w.start, t), end: edgeLabel(w.end, t) }
  if (w.nights === 0) return t.f(L.sameDay, vars)
  const { before, after } = windowDays(w)
  if (countWeekday !== null) {
    const names = t.weekdays('short')
    return t.f(L.named, { ...vars, startDay: names[(((countWeekday - before) % 7) + 7) % 7], endDay: names[(countWeekday + after) % 7] })
  }
  if (before === 1) return t.f(L.dayBefore, vars)
  if (before > 1) return t.p(L.daysBefore, before, vars)
  if (after === 1) return t.f(L.nextDay, vars)
  return t.p(L.laterDays, after, vars)
}

/** A time span in words: "45m", "2h 5m", "1d 3h". Rounded up, so "0m" never shows while time is left. */
export function spanText(ms: number, t: I18n = tx()): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000))
  if (minutes < 1440) return t.dur(minutes)
  return t.f(t.m.time.daysHours, { d: Math.floor(minutes / 1440), h: Math.floor((minutes % 1440) / 60) })
}
