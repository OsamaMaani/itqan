import { AnimatePresence, motion } from 'motion/react'
import { Bell, Coffee, Moon, Pause, Play, Save, SkipForward, Square, Target, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useI18n } from '../../i18n/react'
import { deviceZone, prayerTimes, resolveFajr, type PrayerTimes } from '../../lib/fajr'
import {
  buildSteps, clampPlan, CYCLE_PRESETS, fitPrayer, LIMITS, prayerCrossings, sessionCount, sessionNumber, setStepMinutes, stepTimes,
} from '../../lib/focusCycle'
import { useData, useTick } from '../../lib/hooks'
import { navigate, useRoute } from '../../lib/router'
import { useStore } from '../../lib/store'
import { toast } from '../../lib/toast'
import type { ActiveCycle, CyclePlan, CycleStep, FocusCycle, ID, InterruptionReason } from '../../lib/types'
import { INTERRUPTION_REASONS } from '../../lib/types'
import { mmss, remainingMs } from '../TimerWatcher'
import { Button, Card, cx, IconButton, Input, Label, Select } from '../ui'

/** A local calendar day's prayer times where the owner is, or null while the place is unknown. */
export function usePrayerLookup(): (k: string) => PrayerTimes | null {
  const fajr = useStore((s) => s.settings.fajr)
  const asr = useStore((s) => s.settings.prayer.asr)
  return useMemo(() => {
    const place = resolveFajr(fajr, deviceZone())
    return (k: string) => (place ? prayerTimes(k, place, asr) : null)
  }, [fajr, asr])
}

/** True when the timer is a cycle's step that ran out and the cycle waits for an answer. */
export function isWaiting(timer: { cycleId: ID | null; endsAt: number | null } | null, now: number): boolean {
  return !!timer?.cycleId && timer.endsAt !== null && timer.endsAt <= now
}

/** A step's name: "Session 2", "Break", "Long break", "Asr break". */
function useStepName() {
  const t = useI18n()
  const mc = t.m.focus.cycle
  return useCallback((steps: readonly CycleStep[], i: number) => {
    const s = steps[i]
    if (s.kind === 'focus') return t.f(mc.session, { n: sessionNumber(steps, i) })
    if (s.tag === 'prayer' && s.prayer) return t.f(mc.prayerBreak, { prayer: mc.prayers[s.prayer] })
    return s.tag === 'long' ? mc.longBreak2 : t.m.focus.breakLabel
  }, [t, mc])
}

function StepIcon({ step, size = 14 }: { step: CycleStep; size?: number }) {
  if (step.kind === 'focus') return <Target size={size} />
  return step.tag === 'prayer' ? <Moon size={size} /> : <Coffee size={size} />
}

// --- planning ---------------------------------------------------------------------------------

interface For { label: string; areaId: ID | null; goalId: ID | null; taskId: ID | null; habitId: ID | null }

/** Plans a cycle on Focus: a template or the simple shape, then each step, prayers, and Start. */
export function CyclePlanner({ what, tasks, habits }: { what: For; tasks: { id: ID; title: string }[]; habits: { id: ID; name: string; emoji: string }[] }) {
  const t = useI18n()
  const { m } = t
  const mc = m.focus.cycle
  const d = useData()
  const now = useTick(30_000)
  const timesFor = usePrayerLookup()
  const stepName = useStepName()
  const { startCycle, saveCycleTemplate, deleteCycleTemplate } = useStore.getState()

  const [plan, setPlan] = useState<CyclePlan>(() => clampPlan({ sessions: 4, focusMinutes: d.settings.focusMinutes, breakMinutes: d.settings.breakMinutes, longBreakMinutes: 0, longBreakEvery: 0 }))
  const [steps, setSteps] = useState<CycleStep[]>(() => buildSteps(plan))
  const [naming, setNaming] = useState<string | null>(null)

  const apply = (p: CyclePlan) => { const c = clampPlan(p); setPlan(c); setSteps(buildSteps(c)) }
  const field = (k: keyof CyclePlan, v: string) => apply({ ...plan, [k]: Number(v) })

  const times = stepTimes(steps, 0, now)
  const focusMin = steps.reduce((s, x) => s + (x.kind === 'focus' ? x.minutes : 0), 0)
  const end = times.at(-1)?.end ?? now
  const crossings = prayerCrossings(steps, 0, now, timesFor)
  const same = (p: CyclePlan) => (Object.keys(LIMITS) as (keyof CyclePlan)[]).every((k) => p[k] === plan[k])

  const setFor = (i: number, v: string) => {
    const [kind, id] = v.split(':')
    setSteps(steps.map((s, j) => (j === i ? { ...s, taskId: kind === 'task' ? id : null, habitId: kind === 'habit' ? id : null } : s)))
  }

  const start = () => startCycle({ steps, ...what })

  const saveTemplate = () => {
    if (!naming?.trim()) return
    saveCycleTemplate({ name: naming.trim(), ...plan })
    setNaming(null)
    toast({ emoji: '💾', message: mc.templateSaved })
  }

  const chip = (key: string, label: string, p: CyclePlan, onDelete?: () => void) => (
    <span key={key} className={cx('group inline-flex items-center rounded-xl text-xs font-semibold transition', same(p) ? 'bg-gradient-accent text-accent-fg' : 'bg-surface-2 text-muted hover:text-text')}>
      <button type="button" className="px-3 py-2 text-start" onClick={() => apply(p)}>
        {label} <span dir="ltr" className="opacity-75">· {t.f(mc.shape, { n: p.sessions, focus: p.focusMinutes, brk: p.breakMinutes })}</span>
      </button>
      {onDelete && (
        <button type="button" aria-label={mc.deleteTemplate} title={mc.deleteTemplate} className="pe-2 opacity-60 hover:opacity-100" onClick={onDelete}><X size={12} /></button>
      )}
    </span>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {d.cycleTemplates.map((x) => chip(x.id, x.name, x, () => deleteCycleTemplate(x.id)))}
        {CYCLE_PRESETS.map((p) => chip(p.key, mc.presets[p.key], p))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div><Label>{mc.sessions}</Label><Input type="number" min={1} max={12} value={plan.sessions} onChange={(e) => field('sessions', e.target.value)} /></div>
        <div><Label>{mc.focusLength}</Label><Input type="number" min={1} max={240} value={plan.focusMinutes} onChange={(e) => field('focusMinutes', e.target.value)} /></div>
        <div><Label>{mc.breakLength}</Label><Input type="number" min={1} max={90} value={plan.breakMinutes} onChange={(e) => field('breakMinutes', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>{mc.longBreakEvery}</Label>
          <Select value={plan.longBreakEvery} onChange={(e) => apply({ ...plan, longBreakEvery: Number(e.target.value), longBreakMinutes: plan.longBreakMinutes || 15 })}>
            <option value={0}>{mc.noLongBreak}</option>
            {Array.from({ length: Math.max(0, plan.sessions - 1) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n === 1 ? mc.longBreakEveryOne : t.p(mc.longBreakEveryN, n)}</option>
            ))}
          </Select>
        </div>
        {plan.longBreakEvery > 0 && (
          <div><Label>{mc.longBreak}</Label><Input type="number" min={1} max={90} value={plan.longBreakMinutes} onChange={(e) => field('longBreakMinutes', e.target.value)} /></div>
        )}
      </div>

      <div>
        <Label>{mc.steps}</Label>
        <ol className="space-y-1.5">
          {steps.map((s, i) => (
            <li key={i} className={cx('flex flex-wrap items-center gap-2 rounded-xl px-3 py-2', s.kind === 'focus' ? 'bg-accent-soft/60' : 'bg-surface-2/70')}>
              <span className={cx('grid size-6 place-items-center rounded-lg', s.kind === 'focus' ? 'text-accent' : s.tag === 'prayer' ? 'text-emerald-500' : 'text-sky-500')}><StepIcon step={s} /></span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{stepName(steps, i)}</span>
              <span dir="ltr" className="text-xs text-muted tabular">{t.d(new Date(times[i].start), 'time')}</span>
              <Input
                type="number" min={1} max={s.kind === 'focus' ? 240 : 90} value={s.minutes} aria-label={stepName(steps, i)}
                onChange={(e) => setSteps(setStepMinutes(steps, i, Number(e.target.value)))} className="h-8 w-16 text-center text-sm"
              />
              {steps.length > 1 && !(s.kind === 'focus' && sessionCount(steps) === 1) && (
                <IconButton label={mc.removeStep} className="size-7 hover:text-danger" onClick={() => setSteps(steps.filter((_, j) => j !== i))}><X size={13} /></IconButton>
              )}
              {s.kind === 'focus' && (tasks.length > 0 || habits.length > 0) && (
                <Select
                  aria-label={mc.stepFor} className="h-8 basis-full text-xs sm:basis-auto sm:max-w-44"
                  value={s.taskId ? `task:${s.taskId}` : s.habitId ? `habit:${s.habitId}` : ''} onChange={(e) => setFor(i, e.target.value)}
                >
                  <option value="">{mc.sameAsCycle}</option>
                  {habits.length > 0 && <optgroup label={m.focus.habit}>{habits.map((h) => <option key={h.id} value={`habit:${h.id}`}>{h.emoji} {h.name}</option>)}</optgroup>}
                  {tasks.length > 0 && <optgroup label={m.focus.task}>{tasks.map((x) => <option key={x.id} value={`task:${x.id}`}>{x.title}</option>)}</optgroup>}
                </Select>
              )}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-muted">{t.f(mc.total, { focus: t.dur(focusMin), time: t.d(new Date(end), 'time') })}</p>
      </div>

      {crossings.map((c) => (
        <div key={`${c.index}-${c.prayer}`} className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
          <Moon size={15} className="shrink-0 text-emerald-500" />
          <span className="min-w-0 flex-1">{t.f(mc.crossing, { n: sessionNumber(steps, c.index), prayer: mc.prayers[c.prayer], time: t.d(new Date(c.at), 'time') })}</span>
          <Button size="sm" variant="outline" onClick={() => setSteps(fitPrayer(steps, c, 0))}>{t.f(mc.fitPrayer, { prayer: mc.prayers[c.prayer] })}</Button>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <Button variant="primary" className="h-12 px-8 text-base" onClick={start}><Play size={18} fill="currentColor" /> {mc.start}</Button>
        {naming === null ? (
          <Button variant="ghost" className="h-12" onClick={() => setNaming('')}><Save size={16} /> {mc.saveTemplate}</Button>
        ) : (
          <div className="flex items-center gap-2">
            <Input autoFocus placeholder={mc.templateName} value={naming} onChange={(e) => setNaming(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveTemplate(); if (e.key === 'Escape') setNaming(null) }} className="w-40" />
            <Button onClick={saveTemplate} disabled={!naming.trim()}>{mc.save}</Button>
          </div>
        )}
      </div>
    </div>
  )
}

// --- running ----------------------------------------------------------------------------------

/** The steps as a strip of segments, the current one highlighted; with "Session 2 of 4" above. */
export function CycleStrip({ cycle, mode }: { cycle: ActiveCycle; mode: 'focus' | 'break' }) {
  const t = useI18n()
  const mc = t.m.focus.cycle
  const total = sessionCount(cycle.steps)
  const n = sessionNumber(cycle.steps, cycle.index)
  const sum = cycle.steps.reduce((s, x) => s + x.minutes, 0) || 1
  return (
    <div className="mb-5 w-full max-w-md">
      <div className="mb-2 text-center text-sm font-semibold text-muted">
        {mode === 'focus' ? t.f(mc.progress, { n, total }) : t.f(mc.breakProgress, { n: Math.min(total, n + 1), total })}
      </div>
      <div className="flex h-2 gap-1" dir="ltr">
        {cycle.steps.map((s, i) => (
          <div
            key={i} style={{ flexGrow: Math.max(s.minutes, sum / 60) }}
            className={cx(
              'rounded-full transition-colors',
              i < cycle.index && (s.kind === 'focus' ? 'bg-accent' : 'bg-sky-400/70'),
              i === cycle.index && (s.kind === 'focus' ? 'bg-gradient-accent animate-pulse' : 'bg-sky-400 animate-pulse'),
              i > cycle.index && 'bg-surface-2',
            )}
          />
        ))}
      </div>
    </div>
  )
}

/** What a cycle waiting at the end of a step offers: the next step, more minutes, or the end. */
export function CycleChoices({ compact = false, onEnded }: { compact?: boolean; onEnded?: (r: FocusCycle | null) => void }) {
  const t = useI18n()
  const { m } = t
  const mc = m.focus.cycle
  const cycle = useStore((s) => s.cycle)
  const timer = useStore((s) => s.timer)
  const now = useTick(1000, !!timer)
  const timesFor = usePrayerLookup()
  const stepName = useStepName()
  if (!cycle || !timer || !isWaiting(timer, now)) return null
  const { nextStep, extendStep, endCycle, setCycleSteps } = useStore.getState()

  const step = cycle.steps[cycle.index]
  const next = cycle.steps[cycle.index + 1] as CycleStep | undefined
  const total = sessionCount(cycle.steps)
  const n = sessionNumber(cycle.steps, cycle.index)
  const focus = step.kind === 'focus'
  const title = focus ? (next ? t.f(mc.focusDoneTitle, { n, total }) : t.f(mc.lastDoneTitle, { total })) : mc.breakDoneTitle
  // The next session, if a prayer falls in it when it starts now (or after the break before it).
  const crossing = prayerCrossings(cycle.steps, cycle.index + 1, now, timesFor).find((c) => cycle.steps.slice(cycle.index + 1, c.index).every((s) => s.kind === 'break'))

  const finish = (r: FocusCycle | null) => { onEnded?.(r) }
  const go = () => finish(nextStep())
  const skipBreak = () => { nextStep(); finish(nextStep()) }

  return (
    <div className={cx('w-full space-y-3', compact ? '' : 'max-w-md')}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Bell size={18} /></span>
        <div className="min-w-0">
          <div className="font-bold">{title}</div>
          <div className="text-xs text-muted tabular">{t.f(mc.waiting, { time: mmss(now - timer.endsAt!) })}</div>
        </div>
      </div>

      {crossing && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs">
          <Moon size={14} className="text-emerald-500" />
          <span className="flex-1">{t.f(mc.nextCrossesPrayer, { prayer: mc.prayers[crossing.prayer], time: t.d(new Date(crossing.at), 'time') })}</span>
          <Button size="sm" variant="outline" onClick={() => setCycleSteps(fitPrayer(cycle.steps, crossing, cycle.index + 1))}>{t.f(mc.fitPrayer, { prayer: mc.prayers[crossing.prayer] })}</Button>
        </div>
      )}

      <Button variant="primary" className="h-11 w-full" onClick={go}>
        {next ? <Play size={16} fill="currentColor" /> : <Square size={15} />}
        {!next ? mc.finishCycle
          : next.kind === 'break' ? t.f(mc.startBreakN, { name: stepName(cycle.steps, cycle.index + 1), n: next.minutes })
          : t.f(mc.startSessionN, { n: n + 1, m: next.minutes })}
      </Button>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted">{focus ? mc.keepGoing : mc.moreBreak}</span>
        {[5, 10, 15].map((x) => (
          <Button key={x} size="sm" variant="soft" onClick={() => extendStep(x)}>{t.f(mc.extend, { n: t.n(x, { signDisplay: 'always' }) })}</Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {focus && next?.kind === 'break' && cycle.steps[cycle.index + 2] && (
          <Button size="sm" variant="ghost" onClick={skipBreak}><SkipForward size={14} className="rtl:-scale-x-100" /> {mc.skipBreak}</Button>
        )}
        {next && <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => finish(endCycle())}><Square size={13} /> {mc.endCycle}</Button>}
        {compact && <Button size="sm" variant="ghost" className="ms-auto" onClick={() => navigate('focus')}>{mc.openFocus}</Button>}
      </div>
    </div>
  )
}

/** While paused: one tap to say what interrupted. Tapping the chosen one again clears it. */
export function PauseReasons({ id }: { id: ID }) {
  const t = useI18n()
  const mc = t.m.focus.cycle
  const reason = useStore((s) => s.interruptions.find((x) => x.id === id)?.reason ?? null)
  const set = (r: InterruptionReason) => useStore.getState().setInterruptionReason(id, reason === r ? null : r)
  const emoji: Record<InterruptionReason, string> = { call: '📞', person: '🗣️', distraction: '📱', prayer: '🕌', other: '✳️' }
  return (
    <div className="w-full max-w-md text-center">
      <div className="mb-2 text-xs font-semibold text-muted">{mc.whyPause}</div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {INTERRUPTION_REASONS.map((r) => (
          <button
            key={r} type="button" onClick={() => set(r)}
            className={cx('rounded-xl px-3 py-1.5 text-xs font-semibold transition', reason === r ? 'bg-gradient-accent text-accent-fg' : 'bg-surface-2 text-muted hover:text-text')}
          >
            {emoji[r]} {mc.reasons[r]}
          </button>
        ))}
      </div>
    </div>
  )
}

/** The buttons under the timer while a cycle's step runs or is paused. */
export function CycleControls() {
  const t = useI18n()
  const { m } = t
  const mc = m.focus.cycle
  const cycle = useStore((s) => s.cycle)
  const timer = useStore((s) => s.timer)
  const now = useTick(250, !!timer?.endsAt)
  if (!cycle || !timer) return null
  const { pauseTimer, resumeTimer, endStepNow, nextStep, endCycle } = useStore.getState()
  const isBreak = timer.mode === 'break'
  const n = sessionNumber(cycle.steps, cycle.index)
  const hasNext = cycle.index + 1 < cycle.steps.length
  const end = () => { if (confirm(mc.endCycleConfirm)) endCycle() }

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      {!timer.endsAt && timer.pauseId && <PauseReasons id={timer.pauseId} />}
      <div className="flex flex-wrap justify-center gap-3">
        {timer.endsAt ? (
          <Button variant="soft" className="h-12 px-6" onClick={pauseTimer}><Pause size={18} /> {m.focus.pause}</Button>
        ) : isBreak && hasNext ? (
          <>
            <Button variant="primary" className="h-12 px-5" onClick={resumeTimer}><Coffee size={17} /> {t.f(mc.continueBreak, { time: mmss(remainingMs(timer, now)) })}</Button>
            <Button variant="soft" className="h-12 px-5" onClick={() => nextStep()}><Play size={16} fill="currentColor" /> {t.f(mc.startNextNow, { n: n + 1 })}</Button>
          </>
        ) : (
          <Button variant="primary" className="h-12 px-6" onClick={resumeTimer}><Play size={18} fill="currentColor" /> {m.focus.resume}</Button>
        )}
        {timer.endsAt && (isBreak
          ? hasNext && <Button variant="soft" className="h-12 px-6" onClick={() => nextStep()}><SkipForward size={16} className="rtl:-scale-x-100" /> {mc.skipBreak}</Button>
          : <Button variant="soft" className="h-12 px-6" onClick={endStepNow}><Square size={15} /> {mc.doneEarly}</Button>)}
        <Button variant="ghost" className="h-12" onClick={end}>{mc.endCycle}</Button>
      </div>
    </div>
  )
}

/** The summary of a cycle that just ended. */
export function CycleSummary({ record, onClose }: { record: FocusCycle; onClose: () => void }) {
  const t = useI18n()
  const mc = t.m.focus.cycle
  const stat = (value: string, label: string) => (
    <div className="rounded-xl bg-surface-2/70 p-3 text-center">
      <div className="text-xl font-extrabold tabular"><bdi>{value}</bdi></div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{record.completed ? '🏁' : '⏹️'}</span>
        <div className="flex-1 font-bold">{record.completed ? mc.summaryDone : mc.summaryEnded}</div>
        <IconButton label={mc.dismiss} onClick={onClose}><X size={16} /></IconButton>
      </div>
      <div className="text-sm text-muted">{t.f(mc.summarySessions, { n: record.sessions, total: record.plannedSessions })}</div>
      <div className="grid grid-cols-3 gap-2">
        {stat(t.dur(record.focusMinutes), mc.summaryFocus)}
        {stat(`+${t.dur(record.extendedMinutes)}`, mc.summaryExtended)}
        <div className="grid place-items-center rounded-xl bg-surface-2/70 p-3 text-center text-sm font-bold">
          {record.pauses ? t.p(mc.summaryPauses, record.pauses) : mc.summaryNoPauses}
        </div>
      </div>
      <Button className="w-full" onClick={onClose}>{mc.dismiss}</Button>
    </motion.div>
  )
}

/** On any other screen, the question a waiting cycle asks — floating above the content. */
export function CyclePrompt() {
  const t = useI18n()
  const route = useRoute()
  const timer = useStore((s) => s.timer)
  const now = useTick(1000, !!timer?.cycleId && !!timer.endsAt)
  const show = route !== 'focus' && isWaiting(timer, now)
  const ended = (r: FocusCycle | null) => {
    if (r) toast({ emoji: r.completed ? '🏁' : '⏹️', message: r.completed ? t.m.focus.cycle.summaryDone : t.m.focus.cycle.summaryEnded, action: { label: t.m.focus.cycle.openFocus, run: () => navigate('focus') } }, 8000)
  }
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
          className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[55] flex justify-center px-4 lg:inset-x-auto lg:bottom-6 lg:end-6"
        >
          <Card className="w-full max-w-sm p-4 shadow-2xl"><CycleChoices compact onEnded={ended} /></Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
