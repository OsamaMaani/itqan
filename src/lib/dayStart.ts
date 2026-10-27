import { format } from 'date-fns'
import { tx, type I18n } from '../i18n/core'
import { fajrOn, fajrSpanAt, todayKey, toKey } from './date'
import { useStore } from './store'
import { toast } from './toast'
import type { DateKey } from './types'

/**
 * The notice after completing a task or habit while a day starts at Fajr (ADR-041): which day it
 * counted for, and — between midnight and Fajr, when that is not the calendar day — why. Null when
 * there is nothing to say: the rule is off, the notice is off, or the day written is not today
 * (a past day ticked on purpose needs no telling).
 */
export function countedForMessage(day: DateKey, now: Date = new Date(), t: I18n = tx()): string | null {
  const span = fajrSpanAt(now.getTime())
  if (!span || !useStore.getState().settings.fajr.announce || day !== todayKey(now)) return null
  const L = t.m.settings.dayStart
  const calendar = toKey(now)
  if (day === calendar) return t.f(L.countedFor, { day: t.d(day, 'full') })
  const fajr = fajrOn(calendar, span)
  return t.f(L.countedBeforeFajr, { day: t.d(day, 'full'), time: fajr === null ? '' : t.time(format(new Date(fajr), 'HH:mm')) })
}

/** Shows that notice, if there is one. Call it right after a task or habit is completed. */
export function announceCounted(day: DateKey = todayKey()): void {
  const message = countedForMessage(day)
  if (message) toast({ emoji: day === toKey(new Date()) ? '🌅' : '🌙', message }, 5000)
}
