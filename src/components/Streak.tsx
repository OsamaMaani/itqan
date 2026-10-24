import { Flame, Shield } from 'lucide-react'
import { useMemo } from 'react'
import { useI18n } from '../i18n/react'
import { addDaysKey, dayOfWeek, rangeKeys, weekStartKey } from '../lib/date'
import { SAVERS, savedJustBefore } from '../lib/gamification'
import { useProgress, useToday } from '../lib/hooks'
import { useStore } from '../lib/store'
import { Card, cx, Modal, ProgressBar } from './ui'

/**
 * The day streak and its streak savers (ADR-034). Every number here comes from `dayStreak()` in
 * lib/gamification.ts — this file only shows it.
 */

/** The flame on Today: the streak, and the savers held. Opens the streak dialog. */
export function StreakButton({ onClick }: { onClick: () => void }) {
  const t = useI18n()
  const { m } = t
  const { day } = useProgress()
  return (
    <button
      onClick={onClick}
      title={m.today.streakTitle}
      className="flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-sm font-bold text-gold transition hover:border-gold/50 hover:bg-surface"
    >
      <Flame size={15} fill="currentColor" />
      <bdi className="text-text tabular">{t.p(m.today.streakDays, day.current)}</bdi>
      <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />
      <span className="flex items-center gap-1 text-ice" title={t.p(m.streak.saverCount, day.held)}>
        <Shield size={14} fill={day.held ? 'currentColor' : 'none'} />
        <span className="tabular">{t.n(day.held)}</span>
      </span>
    </button>
  )
}

/**
 * A line on Today while nothing is done yet today: savers just covered the days before it, or —
 * in the evening, with none left — the streak ends tonight. Otherwise nothing; Itqan doesn't nag.
 */
export function StreakBanner({ onOpen }: { onOpen: () => void }) {
  const t = useI18n()
  const { m } = t
  const today = useToday()
  const { day } = useProgress()
  if (day.todayActive || day.current === 0) return null
  const covered = savedJustBefore(day, today)
  const evening = new Date().getHours() >= 18
  if (!covered && (day.held > 0 || !evening)) return null
  return (
    <button
      onClick={onOpen}
      className={cx(
        'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-start text-sm font-semibold transition hover:brightness-105',
        covered ? 'border-ice/30 bg-ice/10' : 'border-gold/30 bg-gold/10',
      )}
    >
      {covered
        ? <Shield size={18} fill="currentColor" className="shrink-0 text-ice" />
        : <Flame size={18} fill="currentColor" className="shrink-0 text-gold" />}
      <span>{covered ? t.p(m.streak.savedBanner, covered) : m.streak.atRisk}</span>
    </button>
  )
}

export function StreakDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useI18n()
  const { m } = t
  const ms = m.streak
  const today = useToday()
  const { day, events } = useProgress()
  const wso = useStore((s) => s.settings.weekStartsOn)

  // Four weeks, aligned to the week start, ending with the week that holds today.
  const cells = useMemo(() => {
    const active = new Set(events.map((e) => e.date))
    const saved = new Set(day.saved)
    const first = events.reduce<string | null>((a, e) => (a === null || e.date < a ? e.date : a), null)
    const start = weekStartKey(addDaysKey(today, -21), wso)
    return rangeKeys(start, addDaysKey(start, 27)).map((k) => ({
      k,
      state: k > today ? 'future'
        : active.has(k) ? 'active'
          : saved.has(k) ? 'saved'
            : k === today ? 'today'
              : first !== null && k > first ? 'missed' : 'none',
    }))
  }, [events, day.saved, today, wso])
  const names = t.weekdays('narrow')

  const status = day.todayActive ? ms.todayDone
    : day.current === 0 ? ms.todayStart
      : day.held > 0 ? ms.todaySafe : ms.todayBare

  return (
    <Modal open={open} onClose={onClose} title={ms.title}>
      <div className="space-y-4">
        {/* The streak */}
        <div className="flex items-center gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gold/15 text-gold">
            <Flame size={34} fill="currentColor" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tabular">{t.n(day.current)}</span>
              <span className="font-bold text-muted">{t.p(ms.inARow, day.current)}</span>
            </div>
            <div className="text-xs font-semibold text-muted">{t.p(ms.best, day.best)}</div>
          </div>
        </div>
        <p className={cx('rounded-xl px-3 py-2 text-sm font-semibold', day.todayActive ? 'bg-accent-soft text-accent' : 'bg-surface-2')}>{status}</p>

        {/* The savers */}
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold">{ms.savers}</span>
            <span className="text-xs font-semibold text-muted tabular">{t.f(ms.held, { held: t.n(day.held), max: t.n(SAVERS.maxHeld) })}</span>
          </div>
          <div className="mt-3 flex gap-2" aria-label={t.p(ms.saverCount, day.held)}>
            {Array.from({ length: SAVERS.maxHeld }, (_, i) => (
              <div
                key={i}
                className={cx(
                  'grid size-12 place-items-center rounded-xl border',
                  i < day.held ? 'border-ice/40 bg-ice/15 text-ice' : 'border-dashed border-border text-muted/40',
                )}
              >
                <Shield size={22} fill={i < day.held ? 'currentColor' : 'none'} />
              </div>
            ))}
          </div>
          {day.held < SAVERS.maxHeld ? (
            <div className="mt-3">
              <ProgressBar value={day.towardNext / SAVERS.xpPerSaver} color="var(--ice)" height={6} />
              <div className="mt-1.5 text-xs text-muted tabular">{t.f(ms.toNext, { xp: t.n(SAVERS.xpPerSaver - day.towardNext) })}</div>
            </div>
          ) : (
            <div className="mt-3 text-xs text-muted">{ms.full}</div>
          )}
          {day.used > 0 && <div className="mt-1 text-xs text-muted">{t.p(ms.used, day.used)}</div>}
        </Card>

        {/* The last four weeks */}
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{ms.lastWeeks}</div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.slice(0, 7).map(({ k }) => (
              <div key={`h${k}`} className="text-center text-[10px] font-bold text-muted">{names[dayOfWeek(k)]}</div>
            ))}
            {cells.map(({ k, state }) => (
              <div
                key={k}
                title={t.d(k, 'short')}
                className={cx(
                  'grid h-8 place-items-center rounded-lg text-[11px] font-semibold tabular',
                  state === 'active' && 'bg-gold/20 text-gold',
                  state === 'saved' && 'bg-ice/20 text-ice',
                  state === 'missed' && 'bg-surface-2 text-muted',
                  state === 'today' && 'border border-dashed border-gold text-text',
                  state === 'none' && 'bg-surface-2/50 text-muted/50',
                  state === 'future' && 'text-muted/30',
                )}
              >
                {state === 'active' ? <Flame size={14} fill="currentColor" />
                  : state === 'saved' ? <Shield size={14} fill="currentColor" />
                    : t.n(Number(k.slice(8)))}
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-muted">
            <span className="flex items-center gap-1"><Flame size={11} fill="currentColor" className="text-gold" />{ms.legend.active}</span>
            <span className="flex items-center gap-1"><Shield size={11} fill="currentColor" className="text-ice" />{ms.legend.saved}</span>
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-surface-2 ring-1 ring-border" />{ms.legend.missed}</span>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-2xl bg-surface-2 p-4 text-sm">
          <div className="mb-2 font-bold">{ms.howTitle}</div>
          <ul className="list-disc space-y-1.5 ps-5 text-muted">
            <li>{t.f(ms.howEarn, { xp: t.n(SAVERS.xpPerSaver), max: t.n(SAVERS.maxHeld) })}</li>
            <li>{ms.howUse}</li>
            <li>{ms.howKeep}</li>
            <li>{ms.howBackfill}</li>
          </ul>
        </div>
      </div>
    </Modal>
  )
}
