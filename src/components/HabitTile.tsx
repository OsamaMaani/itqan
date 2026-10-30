import { motion } from 'motion/react'
import { Clock, Flame, Minus, Plus } from 'lucide-react'
import { useI18n } from '../i18n/react'
import type { I18n } from '../i18n/core'
import { celebrate } from '../lib/celebrate'
import { calendarKey } from '../lib/date'
import { announceCounted } from '../lib/dayStart'
import { amountOn, metDaysInWeek, streak } from '../lib/habits'
import { spanText, type Occurrence } from '../lib/habitWindows'
import { areaHex, useAreaMap } from '../lib/hooks'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import type { DateKey, Habit } from '../lib/types'
import { cx, ProgressRing } from './ui'

/**
 * A habit on Today. A timed habit (ADR-043) also says when it opens or closes — counting down if
 * the owner wants — and, when it counts for another day than today, which one.
 */
export function HabitTile({ habit, day, today = day, occ, now = Date.now(), onChanged }: {
  habit: Habit
  /** The day a tap counts for */
  day: DateKey
  /** Today, for the streak: a tap counted for tomorrow does not make today a miss. */
  today?: DateKey
  occ?: Occurrence
  now?: number
  onChanged?: () => void
}) {
  const t = useI18n()
  const { m } = t
  const logs = useStore((s) => s.habitLogs)
  const weekStartsOn = useStore((s) => s.settings.weekStartsOn)
  const setAmount = useStore((s) => s.setHabitAmount)
  const areas = useAreaMap()
  const color = areaHex(habit.areaId ? areas.get(habit.areaId) : null)

  const amount = amountOn(logs, habit.id, day)
  const target = Math.max(1, habit.target)
  const met = amount >= target
  const st = streak(habit, logs, day < today ? day : today, weekStartsOn)
  const step = target >= 10 ? 5 : 1
  const weekly = habit.schedule.type === 'weekly' ? habit.schedule.times : 0
  const weekMet = weekly ? metDaysInWeek(habit, logs, day, weekStartsOn) : 0
  const elsewhere = day !== today

  const change = (next: number) => {
    const wasMet = met
    setAmount(habit.id, day, Math.max(0, next))
    if (!wasMet && next >= target) {
      celebrate.tick()
      // A timed habit's day is the window's, not the clock's: say which, since it is not today.
      if (elsewhere) toast({ emoji: '🕰️', message: t.f(m.settings.dayStart.countedFor, { day: t.d(day, 'full') }) }, 5000)
      else announceCounted(day)
    }
    onChanged?.()
  }

  const upcoming = occ?.state === 'upcoming' && !met
  // While an unmet window is open and counting down, a thin bar along the bottom shows how much of it is left.
  const prefs = useStore((s) => s.settings.habitWindows)
  const left = occ?.span && occ.state === 'open' && !met && habit.window?.countdown !== false && prefs.countdownLeft
    ? (occ.span.closes - now) / (occ.span.closes - occ.span.opens) : null

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.97 }}
      onClick={() => change(met ? 0 : target)}
      className={cx(
        'group relative flex cursor-pointer select-none items-center gap-3 overflow-hidden rounded-2xl border p-3 transition',
        met ? 'border-transparent' : 'border-border bg-surface/80 hover:border-text/20',
        upcoming && 'opacity-75',
      )}
      style={met ? { background: `linear-gradient(135deg, ${color}26, ${color}0d)` } : undefined}
    >
      <ProgressRing value={amount / target} size={46} stroke={5} color={color}>
        <span className="text-lg">{habit.emoji}</span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <div className={cx('truncate text-sm font-semibold', met && 'opacity-80')}>{habit.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
          {target > 1 || habit.unit ? <span className="tabular">{t.f(m.habits.tile.progress, { amount, target, unit: habit.unit })}</span> : <span>{met ? m.habits.tile.done : m.habits.tile.tapToComplete}</span>}
          {weekly > 0 && <span className="tabular">· {t.f(m.habits.tile.thisWeek, { met: weekMet, times: weekly })}</span>}
          {elsewhere && <span className="rounded-md bg-surface-2 px-1.5 py-px font-semibold text-text/80">{t.f(m.habits.tile.forDay, { day: t.d(day, 'weekday') })}</span>}
        </div>
        {occ?.span && <WindowLine habit={habit} occ={occ} now={now} met={met} t={t} />}
      </div>
      {st.current > 0 && (
        <div className="flex items-center gap-0.5 text-xs font-bold text-gold" title={t.f(st.unit === 'week' ? m.habits.tile.streakWeeks : m.habits.tile.streakDays, { n: st.current })}>
          <Flame size={14} fill="currentColor" />
          {t.n(st.current)}
        </div>
      )}
      {left !== null && (
        <span className="absolute inset-x-0 bottom-0 h-[3px] bg-surface-2" aria-hidden>
          <span className="block h-full" style={{ width: `${Math.max(1, left * 100)}%`, background: color }} />
        </span>
      )}
      {target > 1 && (
        <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button aria-label={m.common.add} onClick={() => change(amount + step)} className="grid size-6 place-items-center rounded-md bg-surface-2 text-muted hover:text-text"><Plus size={12} /></button>
          <button aria-label={m.common.remove} onClick={() => change(amount - step)} className="grid size-6 place-items-center rounded-md bg-surface-2 text-muted hover:text-text"><Minus size={12} /></button>
        </div>
      )}
    </motion.div>
  )
}

/** "Opens in 1h 20m · 3:12 PM", "45m left · until 5:01 PM", "Closed at 5:01 PM". */
function WindowLine({ habit, occ, now, met, t }: { habit: Habit; occ: Occurrence; now: number; met: boolean; t: I18n }) {
  const L = t.m.habits.tile
  const prefs = useStore((s) => s.settings.habitWindows)
  const { opens, closes } = occ.span!
  const counting = habit.window?.countdown !== false
  // A clock time on another calendar day than now carries its weekday: "Fri 5:01 PM".
  const when = (ms: number) => {
    const time = t.d(new Date(ms), 'time')
    return calendarKey(ms) === calendarKey(now) ? time : t.f(L.dayTime, { day: t.d(new Date(ms), 'weekdayName'), time })
  }
  let text: string
  if (occ.state === 'upcoming') text = counting && prefs.countdownStart ? t.f(L.opensIn, { span: spanText(opens - now, t), time: when(opens) }) : t.f(L.opensAt, { time: when(opens) })
  else if (occ.state === 'open') text = counting && prefs.countdownLeft ? t.f(L.left, { span: spanText(closes - now, t), time: when(closes) }) : t.f(L.openUntil, { time: when(closes) })
  else text = t.f(L.closedAt, { time: when(closes) })
  const live = occ.state === 'open' && !met
  return (
    <div className={cx('mt-1 flex items-center gap-1 text-[11px] font-medium', live ? 'text-accent' : 'text-muted')}>
      <Clock size={11} className="shrink-0" />
      <span className="tabular truncate">{text}</span>
    </div>
  )
}
