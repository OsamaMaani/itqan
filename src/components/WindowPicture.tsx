import { Check, Moon, Sun } from 'lucide-react'
import { useI18n } from '../i18n/react'
import { addDaysKey, fromKey } from '../lib/date'
import { prayerTimes, type PrayerTimes } from '../lib/fajr'
import { edgeMs, nextWindow, openingDay, type WindowContext } from '../lib/habitWindows'
import { PRAYERS, type DateKey, type HabitSchedule, type HabitWindow, type WindowEdge } from '../lib/types'
import { cx } from './ui'

/** Roughly where the prayers fall, so the picture can be drawn before a location is set. */
const TYPICAL: Record<keyof PrayerTimes, [number, number]> = {
  fajr: [5, 0], sunrise: [6, 20], dhuhr: [12, 0], asr: [15, 20], maghrib: [17, 45], isha: [19, 5],
}

// The sky, the same in light and dark themes: it is a picture of day and night, not chrome.
const NIGHT = '#28335c'
const TWILIGHT = '#f2a27c'
const DAY = '#c4e4fb'
const MIN = 60_000

/**
 * The window drawn over the days it spans (ADR-043): night and day where the owner is, the window
 * as a band from the moment it opens to the moment it closes, and the day a tick counts for. It is
 * redrawn on every change in the editor, so what a choice does is seen rather than read.
 */
export function WindowPicture({ w, schedule, ctx, today, now, children }: {
  w: HabitWindow; schedule: HabitSchedule; ctx: WindowContext; today: DateKey; now: number
  /** In place of the "Counts for Friday" line: the editor's choice of that day, where there is one. */
  children?: React.ReactNode
}) {
  const t = useI18n()
  const P = t.m.habits.editor.picture
  const rtl = t.dir === 'rtl'

  // The next window that has not closed, or — when it cannot be placed — the next day it counts for.
  const counts = (k: DateKey) => schedule.type !== 'days' || schedule.days.includes(fromKey(k).getDay())
  const count = nextWindow({ schedule, window: w }, now, today, ctx)?.day
    ?? Array.from({ length: 7 }, (_, i) => addDaysKey(today, i)).find(counts) ?? today
  const first = openingDay(w, count)
  const days = Array.from({ length: w.nights + 1 }, (_, i) => addDaysKey(first, i))
  const from = fromKey(first).getTime()
  const to = fromKey(addDaysKey(first, w.nights + 1)).getTime()
  const x = (ms: number) => Math.min(100, Math.max(0, ((ms - from) / (to - from)) * 100))

  const real = !!ctx.place
  const times = (k: DateKey): PrayerTimes => {
    const known = ctx.place ? prayerTimes(k, ctx.place, ctx.asr) : null
    if (known) return known
    const [y, m, d] = k.split('-').map(Number)
    return Object.fromEntries(PRAYERS.map((p) => [p, new Date(y, m - 1, d, ...TYPICAL[p]).getTime()])) as PrayerTimes
  }
  const at = (e: WindowEdge, k: DateKey) => (e.kind === 'time' ? edgeMs(e, k, ctx)! : times(k)[e.prayer] + e.offset * MIN)
  const opens = at(w.start, first)
  const closes = at(w.end, days[days.length - 1])
  const backwards = closes <= opens

  const sky = [`${NIGHT} 0%`]
  for (const k of days) {
    const p = times(k)
    sky.push(`${NIGHT} ${x(p.fajr)}%`, `${TWILIGHT} ${x(p.sunrise)}%`, `${DAY} ${x(p.sunrise + 50 * MIN)}%`,
      `${DAY} ${x(p.maghrib - 50 * MIN)}%`, `${TWILIGHT} ${x(p.maghrib)}%`, `${NIGHT} ${x(p.isha)}%`)
  }
  sky.push(`${NIGHT} 100%`)

  const when = (ms: number) => {
    const time = t.d(new Date(ms), 'time')
    return days.length > 1 ? t.f(t.m.habits.tile.dayTime, { day: t.d(new Date(ms), 'weekdayName'), time }) : time
  }
  const lo = Math.min(x(opens), x(closes))
  const hi = Math.max(x(opens), x(closes))
  const nowX = now >= from && now < to ? x(now) : null

  return (
    <div className="rounded-xl border border-border bg-surface p-3" role="img" aria-label={`${t.f(P.opens, { time: when(opens) })}, ${t.f(P.closes, { time: when(closes) })}. ${t.f(P.countsFor, { day: t.d(count, 'weekday') })}`}>
      <div className="grid text-center text-[11px]" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map((k) => (
          <div key={k} className={cx('truncate pb-1.5', k === count ? 'font-bold text-accent' : 'text-muted')}>
            {k === count && <Check size={11} strokeWidth={3} className="me-0.5 inline align-[-1px]" />}
            {t.d(k, days.length > 3 ? 'weekdayName' : 'weekday')}
          </div>
        ))}
      </div>

      <div className="relative h-11 overflow-hidden rounded-lg" style={{ background: `linear-gradient(to ${rtl ? 'left' : 'right'}, ${sky.join(', ')})` }}>
        {days.map((k, i) => {
          const p = times(k)
          return (
            <span key={k}>
              {i > 0 && <span className="absolute inset-y-0 w-px bg-white/60" style={{ insetInlineStart: `${x(fromKey(k).getTime())}%` }} />}
              <Moon size={12} className="absolute top-1.5 -translate-x-1/2 text-white/70 rtl:translate-x-1/2" style={{ insetInlineStart: `${x((p.fajr + fromKey(k).getTime()) / 2)}%` }} />
              <Sun size={12} className="absolute top-1.5 -translate-x-1/2 text-amber-500 rtl:translate-x-1/2" style={{ insetInlineStart: `${x(p.dhuhr)}%` }} />
              {PRAYERS.map((pr) => (
                <span key={pr} title={`${t.m.habits.window.prayers[pr]} · ${t.d(new Date(p[pr]), 'time')}`} className="absolute bottom-0 h-1.5 w-px bg-white/80" style={{ insetInlineStart: `${x(p[pr])}%` }} />
              ))}
            </span>
          )
        })}
        {/* Outside the window the sky is dimmed; inside it stays bright, framed. */}
        {!backwards && <span className="absolute inset-y-0 start-0 bg-black/45" style={{ width: `${lo}%` }} />}
        {!backwards && <span className="absolute inset-y-0 end-0 bg-black/45" style={{ width: `${100 - hi}%` }} />}
        <span
          className={cx('absolute inset-y-0 rounded-md border-[3px]', backwards ? 'border-dashed border-danger bg-danger/25' : 'border-accent')}
          style={{ insetInlineStart: `${lo}%`, width: `max(${hi - lo}%, 6px)` }}
        />
        {nowX !== null && <span title={P.now} className="absolute -inset-y-0 w-0.5 bg-text/80" style={{ insetInlineStart: `${nowX}%` }} />}
      </div>

      <Pin x={x(opens)} rtl={rtl} className={backwards ? 'text-danger' : 'text-accent'}>{t.f(P.opens, { time: when(opens) })}</Pin>
      <Pin x={x(closes)} rtl={rtl} className={backwards ? 'text-danger' : 'text-accent'}>{t.f(P.closes, { time: when(closes) })}</Pin>

      {children ?? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 font-semibold text-accent">
            <Check size={12} strokeWidth={3} /> {t.f(P.countsFor, { day: t.d(count, 'weekday') })}
          </span>
          {!real && <span className="text-muted">{P.example}</span>}
        </div>
      )}
      {children && !real && <p className="mt-1 text-end text-xs text-muted">{P.example}</p>}
    </div>
  )
}

/** A label under the track, pointing at `x`%; kept inside the picture near its edges. */
function Pin({ x, rtl, className, children }: { x: number; rtl: boolean; className: string; children: string }) {
  const style: React.CSSProperties = x < 18 ? { insetInlineStart: `${x}%` }
    : x > 82 ? { insetInlineEnd: `${100 - x}%` }
    : { insetInlineStart: `${x}%`, transform: `translateX(${rtl ? 50 : -50}%)` }
  const tick = x < 18 ? 'start-0' : x > 82 ? 'end-0' : 'start-1/2'
  return (
    <div className="relative h-5">
      <span className={cx('absolute top-0 whitespace-nowrap pt-1.5 text-[11px] font-semibold tabular', className)} style={style}>
        <span className={cx('absolute top-0 h-1.5 w-0.5 bg-current', tick)} />
        {children}
      </span>
    </div>
  )
}
