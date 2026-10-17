import { differenceInMonths, differenceInYears } from 'date-fns'
import type { DateKey, UiLanguage } from '../lib/types'
import { en } from './en'

/**
 * Interface language (ADR-024). Messages live in one typed catalog per language, split by screen
 * (`src/i18n/<lang>/`); English is the source and is always loaded, the others load on demand.
 * Dates, numbers and plurals go through Intl, so word order, digits and plural forms follow the
 * language rather than English. This module has no React and no store import, so lib code can
 * use `tx()` without import cycles.
 */

export type Lang = UiLanguage

export const LANG_INFO: Record<Lang, { name: string; dir: 'ltr' | 'rtl'; locale: string }> = {
  en: { name: 'English', dir: 'ltr', locale: 'en-US' },
  // Western digits in the Arabic interface (the owner's choice, 2026-10-17); Quran verse numbers
  // keep Arabic-Indic digits in the daily card.
  ar: { name: 'العربية', dir: 'rtl', locale: 'ar-u-nu-latn' },
  fr: { name: 'Français', dir: 'ltr', locale: 'fr-FR' },
  zh: { name: '简体中文', dir: 'ltr', locale: 'zh-CN' },
  es: { name: 'Español', dir: 'ltr', locale: 'es-ES' },
}

/** A message whose form depends on a count. Keys are Intl plural categories; `other` is required. */
export type Plural = { other: string; zero?: string; one?: string; two?: string; few?: string; many?: string }

type PluralKey = keyof Plural

/** A catalog's shape: strings, string lists, plurals (objects keyed only by plural categories), or nested groups. */
type Shape<T> = T extends string ? string
  : T extends readonly string[] ? string[]
  : T extends { other: string } ? ([Exclude<keyof T, PluralKey>] extends [never] ? Plural : { [K in keyof T]: Shape<T[K]> })
  : { [K in keyof T]: Shape<T[K]> }

export type Vars = Record<string, string | number>

export type DatePreset =
  | 'full' | 'long' | 'medium' | 'short' | 'weekdayShort' | 'weekday' | 'weekdayName'
  | 'month' | 'monthShort' | 'monthName' | 'day' | 'time' | 'year'

const PRESETS: Record<DatePreset, Intl.DateTimeFormatOptions> = {
  full: { weekday: 'long', month: 'long', day: 'numeric' }, // Saturday, October 17
  long: { month: 'long', day: 'numeric', year: 'numeric' }, // October 17, 2026
  medium: { month: 'short', day: 'numeric', year: 'numeric' }, // Oct 17, 2026
  short: { month: 'short', day: 'numeric' }, // Oct 17
  weekdayShort: { weekday: 'short', month: 'short', day: 'numeric' }, // Sat, Oct 17
  weekday: { weekday: 'long' }, // Saturday
  weekdayName: { weekday: 'short' }, // Sat
  month: { month: 'long', year: 'numeric' }, // October 2026
  monthShort: { month: 'short' }, // Oct
  monthName: { month: 'long' }, // October
  day: { day: 'numeric' }, // 17
  time: { hour: 'numeric', minute: '2-digit' }, // 9:30 AM
  year: { year: 'numeric' }, // 2026
}

const fromKey = (k: DateKey) => {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export interface I18n {
  lang: Lang
  m: Messages
  dir: 'ltr' | 'rtl'
  locale: string
  /** Fill `{name}` placeholders; numbers are formatted for the language. */
  f: (s: string, vars?: Vars) => string
  /** The plural form for `n`, with `{n}` (and any other vars) filled. */
  p: (pl: Plural, n: number, vars?: Vars) => string
  n: (x: number, opts?: Intl.NumberFormatOptions) => string
  pct: (ratio: number) => string
  /** A date (Date or local DateKey) in a preset style; `cap` capitalises it for the start of a line. */
  d: (date: Date | DateKey, preset: DatePreset, cap?: boolean) => string
  /** "09:30" (a stored HH:mm) in the language's clock style. */
  time: (hhmm: string) => string
  hijri: (date: Date) => string
  /** Weekday names, index 0 = Sunday. */
  weekdays: (style: 'long' | 'short' | 'narrow') => string[]
  /** "a, b and c" in the language. */
  list: (items: string[]) => string
  /** Today / Tomorrow / In 3 days / 2 days ago… for a day offset. */
  relDay: (days: number) => string
  /** 25 min, 1 h 20 min… */
  dur: (minutes: number) => string
  /** "5 minutes ago", "2 years ago" — from a Date, an ISO instant or a DateKey, up to `now`. */
  ago: (from: Date | string, now?: Date) => string
  cap: (s: string) => string
}

let currentLang: Lang = 'en'
const catalogs: Partial<Record<Lang, Messages>> = {}
const built = new Map<Lang, I18n>()
const listeners = new Set<() => void>()

export function registerCatalog(lang: Lang, m: Messages) {
  catalogs[lang] = m
  built.delete(lang)
  listeners.forEach((l) => l())
}

export function hasCatalog(lang: Lang): boolean {
  return !!catalogs[lang]
}

export function subscribeCatalogs(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Set by the app whenever the language setting changes; read by lib code through `tx()`. */
export function setCurrentLang(lang: Lang) {
  currentLang = lang
}

/** The translator for the current interface language (English until its catalog has loaded). */
export function tx(): I18n {
  return i18nFor(currentLang)
}

export function i18nFor(lang: Lang): I18n {
  const have = catalogs[lang] ? lang : 'en'
  let t = built.get(have)
  if (!t) {
    t = build(have, catalogs[have]!)
    built.set(have, t)
  }
  return t
}

function build(lang: Lang, m: Messages): I18n {
  const { dir, locale } = LANG_INFO[lang]
  const numFmt = new Intl.NumberFormat(locale)
  const rules = new Intl.PluralRules(locale)
  const cap = (s: string) => (lang === 'en' || lang === 'fr' || lang === 'es' ? s.charAt(0).toLocaleUpperCase(locale) + s.slice(1) : s)
  const dateFmts = new Map<DatePreset, Intl.DateTimeFormat>()
  const dateFmt = (p: DatePreset) => {
    let fmt = dateFmts.get(p)
    if (!fmt) { fmt = new Intl.DateTimeFormat(locale, PRESETS[p]); dateFmts.set(p, fmt) }
    return fmt
  }
  const n = (x: number, opts?: Intl.NumberFormatOptions) => (opts ? new Intl.NumberFormat(locale, opts).format(x) : numFmt.format(x))
  const f = (s: string, vars?: Vars) =>
    vars ? s.replace(/\{(\w+)\}/g, (all, k: string) => (k in vars ? (typeof vars[k] === 'number' ? n(vars[k] as number) : String(vars[k])) : all)) : s
  const p = (pl: Plural, count: number, vars?: Vars) => f(pl[rules.select(count) as keyof Plural] ?? pl.other, { n: count, ...vars })
  const d = (date: Date | DateKey, preset: DatePreset, capital = false) => {
    const s = dateFmt(preset).format(typeof date === 'string' ? fromKey(date) : date)
    return capital ? cap(s) : s
  }
  const sunday = new Date(2026, 9, 18) // a Sunday
  const weekdayCache = new Map<string, string[]>()
  return {
    lang, m, dir, locale, f, p, n, d, cap,
    pct: (ratio) => n(ratio, { style: 'percent', maximumFractionDigits: 0 }),
    time: (hhmm) => {
      const [h, mi] = hhmm.split(':').map(Number)
      return dateFmt('time').format(new Date(2026, 0, 1, h, mi))
    },
    hijri: (date) => {
      try {
        const tag = locale.includes('-u-') ? locale.replace('-u-', '-u-ca-islamic-umalqura-') : `${locale}-u-ca-islamic-umalqura`
        return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
      } catch {
        return ''
      }
    },
    weekdays: (style) => {
      let w = weekdayCache.get(style)
      if (!w) {
        const fmt = new Intl.DateTimeFormat(locale, { weekday: style })
        w = Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2026, 9, sunday.getDate() + i)))
        weekdayCache.set(style, w)
      }
      return w
    },
    list: (items) => new Intl.ListFormat(locale, { type: 'conjunction' }).format(items),
    relDay: (days) => {
      if (days === 0) return m.time.today
      if (days === 1) return m.time.tomorrow
      if (days === -1) return m.time.yesterday
      return days > 0 ? p(m.time.inDays, days) : p(m.time.daysAgo, -days)
    },
    ago: (from, now = new Date()) => {
      // A DateKey is a whole day: count calendar days to today, and say "yesterday" rather than "1 day ago".
      const day = typeof from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(from)
      const a = typeof from !== 'string' ? from : day ? fromKey(from) : new Date(from)
      const end = day ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : now
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: day ? 'auto' : 'always' })
      const secs = Math.max(0, Math.floor((end.getTime() - a.getTime()) / 1000))
      if (!day && secs < 60) return rtf.format(-secs, 'second')
      if (!day && secs < 3600) return rtf.format(-Math.floor(secs / 60), 'minute')
      if (!day && secs < 86400) return rtf.format(-Math.floor(secs / 3600), 'hour')
      const days = Math.round(secs / 86400) // round: a daylight-saving day is 23 or 25 hours
      if (days < 30) return rtf.format(-days, 'day')
      const months = differenceInMonths(end, a)
      if (months < 12) return rtf.format(-Math.max(1, months), 'month')
      return rtf.format(-differenceInYears(end, a), 'year')
    },
    dur: (minutes) => {
      const h = Math.floor(minutes / 60)
      const mi = Math.round(minutes % 60)
      if (!h) return f(m.time.minutes, { m: mi })
      if (!mi) return f(m.time.hours, { h })
      return f(m.time.hoursMinutes, { h, m: mi })
    },
  }
}

// The English catalog is the source of the Messages type and is always present.
export type Messages = Shape<typeof en>
registerCatalog('en', en)
