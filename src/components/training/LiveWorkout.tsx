import {
  ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Flag, ListOrdered, Minus, Plus, Search, Timer, Trash2, TrendingDown, TrendingUp, Trophy,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useShallow } from 'zustand/react/shallow'
import { useI18n } from '../../i18n/react'
import { celebrate } from '../../lib/celebrate'
import { XP } from '../../lib/gamification'
import { useTick } from '../../lib/hooks'
import { navigate } from '../../lib/router'
import { useStore } from '../../lib/store'
import {
  activeWorkout, exerciseHistory, lastTime, newRecords, prefillSet, suggestNext, workoutSummary,
  type NewRecord, type SetValues, type Suggestion,
} from '../../lib/training'
import { EFFORTS, type Effort, type Exercise, type ID, type RoutineItem, type Workout, type WorkoutSet } from '../../lib/types'
import { Button, Card, cx, EmptyState, IconButton, Input, Label, Modal, ProgressBar, Textarea } from '../ui'
import { EFFORT_CLASS, EffortBadge, useGymFormat, type GymFormat } from './format'
import { useRest } from './rest'

/**
 * The live workout (ADR-027, memory/11-training.md §4): one exercise at a time, with today's
 * target, last time, and set rows prefilled so "done as planned" is one tap on how it felt.
 * Every set is saved the moment it is logged; reopening Itqan comes back here.
 */
export function LiveWorkout() {
  const [finished, setFinished] = useState<ID | null>(null)
  const active = useStore((s) => activeWorkout(s.workouts))
  if (finished) return <FinishSummary workoutId={finished} />
  if (!active) return <NoWorkout />
  return <Live key={active.id} workout={active} onFinished={setFinished} />
}

const byCreated = (a: WorkoutSet, b: WorkoutSet) => a.createdAt.localeCompare(b.createdAt)

function Live({ workout: w, onFinished }: { workout: Workout; onFinished: (id: ID) => void }) {
  const t = useI18n()
  const { m } = t
  const { workouts, allSets, exercises } = useStore(useShallow((s) => ({ workouts: s.workouts, allSets: s.workoutSets, exercises: s.exercises })))
  const exMap = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])
  const mine = useMemo(() => allSets.filter((s) => s.workoutId === w.id).sort(byCreated), [allSets, w.id])
  const loggedOf = (itemId: ID) => mine.filter((s) => s.itemId === itemId)
  const workDone = (it: RoutineItem) => loggedOf(it.id).filter((s) => !s.warmup).length >= it.sets

  // Open on the first exercise that still has sets to do (also after a reload).
  const [idx, setIdx] = useState(() => {
    const k = w.items.findIndex((it) => !workDone(it))
    return k < 0 ? Math.max(0, w.items.length - 1) : k
  })
  const [sheet, setSheet] = useState(false)
  const [picking, setPicking] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const now = useTick(1000)
  useWakeLock()

  const i = Math.min(idx, Math.max(0, w.items.length - 1))
  const item = w.items[i] as RoutineItem | undefined
  const go = (k: number) => { setIdx(k); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const elapsed = Math.max(0, (now - Date.parse(w.startedAt)) / 1000)
  const fmt = useGymFormat()

  return (
    <div className="pb-28">
      <div className="mb-4 flex items-center gap-2">
        <IconButton label={m.workout.back} onClick={() => navigate('training')}><ChevronLeft size={20} className="rtl:-scale-x-100" /></IconButton>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">{w.name}</h1>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Timer size={12} />
            <span className="tabular" dir="ltr">{fmt.clock(elapsed)}</span>
            <span>·</span>
            <span>{t.p(m.gym.setsCount, mine.filter((s) => !s.warmup).length)}</span>
          </div>
        </div>
        <IconButton label={m.workout.manage} onClick={() => setSheet(true)}><ListOrdered size={18} /></IconButton>
        <Button variant="primary" onClick={() => setFinishing(true)}><Flag size={16} /> {m.workout.finish}</Button>
      </div>

      {w.items.length > 0 && (
        <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {w.items.map((it, k) => {
            const done = workDone(it)
            return (
              <button
                key={it.id}
                onClick={() => go(k)}
                className={cx(
                  'flex shrink-0 items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition',
                  k === i ? 'bg-accent text-accent-fg' : done ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted',
                )}
              >
                {done ? <Check size={12} /> : <span className="tabular">{t.n(k + 1)}</span>}
                <span className="max-w-[9rem] truncate">{exMap.get(it.exerciseId)?.name ?? m.workout.unknownExercise}</span>
              </button>
            )
          })}
        </div>
      )}

      {!item ? (
        <EmptyState emoji="🏋️" title={m.workout.emptyTitle}>
          <p>{m.workout.emptyBody}</p>
          <Button variant="primary" className="mt-3" onClick={() => setPicking(true)}><Plus size={16} /> {m.workout.addExercise}</Button>
        </EmptyState>
      ) : (
        <ExercisePanel
          key={item.id}
          workout={w}
          item={item}
          exercise={exMap.get(item.exerciseId)}
          logged={loggedOf(item.id)}
          workouts={workouts}
          allSets={allSets}
          isLast={i === w.items.length - 1}
          footer={
            <div className="mt-5 flex items-center gap-2">
              <Button disabled={i === 0} onClick={() => go(i - 1)}><ChevronLeft size={16} className="rtl:-scale-x-100" /> {m.workout.previous}</Button>
              <div className="min-w-0 flex-1 truncate text-center text-xs text-muted">
                {i < w.items.length - 1 && t.f(m.workout.upNext, { name: exMap.get(w.items[i + 1].exerciseId)?.name ?? m.workout.unknownExercise })}
              </div>
              {i < w.items.length - 1 ? (
                <Button variant={workDone(item) ? 'primary' : 'soft'} onClick={() => go(i + 1)}>
                  {workDone(item) ? m.workout.next : m.workout.skip} <ChevronRight size={16} className="rtl:-scale-x-100" />
                </Button>
              ) : (
                <Button variant={workDone(item) ? 'primary' : 'soft'} onClick={() => setFinishing(true)}><Flag size={16} /> {m.workout.finish}</Button>
              )}
            </div>
          }
        />
      )}

      <RestBar />
      <ManageSheet
        open={sheet}
        onClose={() => setSheet(false)}
        workout={w}
        exMap={exMap}
        loggedOf={loggedOf}
        current={i}
        onGo={(k) => { go(k); setSheet(false) }}
        onAdd={() => { setSheet(false); setPicking(true) }}
      />
      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        exercises={exercises}
        onPick={(e) => {
          useStore.getState().addWorkoutItem(w.id, { exerciseId: e.id })
          setPicking(false)
          go(w.items.length) // the new item is appended
        }}
      />
      <FinishDialog open={finishing} onClose={() => setFinishing(false)} workout={w} logged={mine} onFinished={onFinished} />
    </div>
  )
}

// --- one exercise ------------------------------------------------------------------------------

function ExercisePanel({ workout: w, item, exercise, logged, workouts, allSets, isLast, footer }: {
  workout: Workout
  item: RoutineItem
  exercise: Exercise | undefined
  logged: WorkoutSet[]
  workouts: Workout[]
  allSets: WorkoutSet[]
  isLast: boolean
  footer: React.ReactNode
}) {
  const t = useI18n()
  const { m } = t
  const fmt = useGymFormat()
  const measure = exercise?.measure ?? 'weight'
  const history = useMemo(() => (exercise ? exerciseHistory(exercise.id, workouts, allSets, w) : []), [exercise, workouts, allSets, w])
  const last = useMemo(() => (exercise ? lastTime(exercise.id, workouts, allSets, w, item.id) : null), [exercise, workouts, allSets, w, item.id])
  const sug: Suggestion = exercise ? suggestNext(item, exercise, history) : { kind: 'none' }
  const [extra, setExtra] = useState(0)
  const [open, setOpen] = useState<string | null>(null) // null = the first set still to do

  const warm = logged.filter((s) => s.warmup)
  const work = logged.filter((s) => !s.warmup)
  const rows: { key: string; warmup: boolean; n: number; set?: WorkoutSet }[] = [
    ...Array.from({ length: Math.max(item.warmupSets, warm.length) }, (_, n) => ({ key: `w${n}`, warmup: true, n, set: warm[n] })),
    ...Array.from({ length: Math.max(item.sets, work.length) + extra }, (_, n) => ({ key: `s${n}`, warmup: false, n, set: work[n] })),
  ]
  const firstPending = rows.find((r) => !r.set)?.key ?? null
  const expanded = open ?? firstPending
  const step = exercise && exercise.incrementKg > 0 ? exercise.incrementKg : 2.5

  const log = (warmup: boolean, v: SetValues, effort: Effort) => {
    if (!exercise) return
    useStore.getState().logSet({ workoutId: w.id, itemId: item.id, exerciseId: exercise.id, warmup, ...v, effort })
    celebrate.tick()
    setOpen(null)
    const remaining = rows.filter((r) => !r.set).length - 1
    if (!(isLast && remaining <= 0)) useRest.getState().start(item.restSec)
  }

  const target = targetChips(item, measure, fmt, t)

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold leading-tight sm:text-xl">{exercise?.name ?? m.workout.unknownExercise}</h2>
          {exercise && (
            <div className="mt-0.5 text-xs text-muted">
              {[m.gym.equipment[exercise.equipment], ...(exercise.muscle ? [m.gym.muscle[exercise.muscle]] : [])].join(' · ')}
            </div>
          )}
        </div>
      </div>
      {exercise?.notes && <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">{exercise.notes}</p>}

      {target.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {target.map((c) => <span key={c} className="rounded-lg bg-surface-2 px-2 py-1 text-xs font-semibold">{c}</span>)}
        </div>
      )}

      <div className="mt-3 rounded-xl border border-border px-3 py-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
          {last ? t.f(m.workout.lastTime, { when: t.ago(last.workout.date) }) : m.workout.firstTime}
        </div>
        {last && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {last.sets.map((s) => (
              <span key={s.id} className={cx('inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold tabular', s.warmup ? 'text-muted' : 'bg-surface-2')}>
                {s.warmup && <span>{m.gym.warmupShort}</span>}
                {fmt.set(s, measure)}
                <EffortBadge effort={s.effort} />
              </span>
            ))}
          </div>
        )}
        {sug.kind !== 'none' && (
          <div className={cx('mt-2 flex items-center gap-1.5 text-sm font-semibold', sug.kind === 'up' ? 'text-accent' : sug.kind === 'down' ? 'text-gold' : 'text-muted')}>
            {sug.kind === 'up' ? <TrendingUp size={15} /> : sug.kind === 'down' ? <TrendingDown size={15} /> : null}
            {t.f(m.workout.suggest[sug.kind], { weight: fmt.weight(sug.kg) })}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {rows.map((r) => {
          const prefill = r.set ? null : prefillSet(item, r.warmup, r.n, logged, last, sug)
          const label = r.warmup ? `${m.gym.warmupShort}${t.n(r.n + 1)}` : t.n(r.n + 1)
          return (
            <SetRow
              key={`${r.key}-${r.set?.id ?? JSON.stringify(prefill)}`}
              label={label}
              warmup={r.warmup}
              measure={measure}
              set={r.set}
              prefill={prefill}
              expanded={expanded === r.key}
              step={step}
              onExpand={() => setOpen(expanded === r.key ? '' : r.key)}
              onLog={(v, e) => log(r.warmup, v, e)}
              onUpdate={(v, e) => { useStore.getState().updateSet(r.set!.id, { ...v, effort: e }); setOpen(null) }}
              onDelete={() => { useStore.getState().deleteSet(r.set!.id); setOpen(null) }}
            />
          )
        })}
      </div>
      <Button size="sm" className="mt-2" onClick={() => { setExtra((x) => x + 1); setOpen(null) }}><Plus size={14} /> {m.workout.addSet}</Button>
      {footer}
    </Card>
  )
}

function targetChips(item: RoutineItem, measure: Exercise['measure'], fmt: GymFormat, t: ReturnType<typeof useI18n>): string[] {
  const { m } = t
  const lv = (label: string, value: string) => t.f(m.workout.labelValue, { label, value })
  const out = [t.p(m.gym.setsCount, item.sets)]
  if (item.warmupSets) out.push(lv(m.gym.warmup, t.n(item.warmupSets)))
  if ((measure === 'weight' || measure === 'reps') && (item.repsMin !== null || item.repsMax !== null)) {
    const a = item.repsMin ?? item.repsMax!
    const b = item.repsMax ?? item.repsMin!
    out.push(lv(m.gym.reps, a === b ? t.n(a) : t.f(m.gym.repRange, { min: t.n(a), max: t.n(b) })))
  }
  if (item.kg !== null && (measure === 'weight' || measure === 'reps')) out.push(lv(measure === 'reps' ? m.gym.addedWeight : m.gym.weight, fmt.weight(item.kg)))
  if (item.meters !== null && measure === 'distance') out.push(lv(m.gym.distance, fmt.distance(item.meters)))
  if (item.seconds !== null && (measure === 'time' || measure === 'distance')) out.push(lv(m.gym.time, fmt.clock(item.seconds)))
  if (item.restSec > 0) out.push(lv(m.gym.rest, fmt.clock(item.restSec)))
  return out
}

// --- one set -----------------------------------------------------------------------------------

/** "1:30" → 90, "1:02:05" → 3725; a plain number is seconds (or minutes, for a run's time). */
function parseClock(s: string, plain: 'sec' | 'min'): number | null {
  const v = s.trim().replace(',', '.')
  if (!v) return null
  if (v.includes(':')) {
    const parts = v.split(':').map(Number)
    if (parts.some((x) => !Number.isFinite(x) || x < 0)) return null
    return parts.reduce((acc, x) => acc * 60 + x, 0)
  }
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(plain === 'min' ? n * 60 : n)
}

const num = (s: string): number | null => {
  const v = s.trim().replace(',', '.')
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function SetRow({ label, warmup, measure, set, prefill, expanded, step, onExpand, onLog, onUpdate, onDelete }: {
  label: string
  warmup: boolean
  measure: Exercise['measure']
  set?: WorkoutSet
  prefill: SetValues | null
  expanded: boolean
  step: number
  onExpand: () => void
  onLog: (v: SetValues, e: Effort) => void
  onUpdate: (v: SetValues, e: Effort) => void
  onDelete: () => void
}) {
  const t = useI18n()
  const { m } = t
  const fmt = useGymFormat()
  const start = set ?? prefill ?? { reps: null, kg: null, seconds: null, meters: null }
  const show = (x: number | null, f: (v: number) => string) => (x === null ? '' : f(x))
  const [reps, setReps] = useState(show(start.reps, String))
  const [kg, setKg] = useState(show(start.kg, (v) => String(fmt.toUnit(v))))
  const [time, setTime] = useState(show(start.seconds, fmt.clock))
  const [km, setKm] = useState(show(start.meters, (v) => String(Math.round(v) / 1000)))

  const values = (): SetValues => {
    const w = num(kg)
    const d = num(km)
    return {
      reps: measure === 'weight' || measure === 'reps' ? (num(reps) === null ? null : Math.round(num(reps)!)) : null,
      kg: (measure === 'weight' || measure === 'reps') && w !== null && w > 0 ? fmt.fromUnit(w) : measure === 'weight' && w === 0 ? 0 : null,
      seconds: measure === 'time' || measure === 'distance' ? parseClock(time, measure === 'distance' ? 'min' : 'sec') : null,
      meters: measure === 'distance' && d !== null ? Math.round(d * 1000) : null,
    }
  }
  const text = fmt.set(set ?? values(), measure)

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onExpand}
        className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition', set ? 'bg-surface-2/70' : 'border border-dashed border-border')}
      >
        <span className={cx('grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold', set ? 'bg-accent text-accent-fg' : 'border border-border text-muted')}>
          {set ? <Check size={13} /> : null}
        </span>
        <span className={cx('w-7 shrink-0 text-xs font-bold tabular', warmup ? 'text-muted' : '')}>{label}</span>
        <span className={cx('min-w-0 flex-1 truncate font-semibold tabular', !set && 'text-muted')}>{text}</span>
        {set && <EffortBadge effort={set.effort} />}
      </button>
    )
  }

  const bump = (s: string, by: number, set_: (v: string) => void, min = 0) => {
    const v = Math.max(min, Math.round(((num(s) ?? 0) + by) * 100) / 100)
    set_(String(v))
  }
  const unitStep = fmt.unit === 'lb' ? 5 : step

  return (
    <div className="rounded-2xl border border-accent/50 bg-surface p-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-bold text-muted">
        <span className="tabular">{label}</span>
        {warmup && <span>{m.gym.warmup}</span>}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(measure === 'weight' || measure === 'reps') && (
          <Field label={m.gym.reps} value={reps} onChange={setReps} inputMode="numeric" onStep={(d) => bump(reps, d, setReps)} m={m} />
        )}
        {(measure === 'weight' || measure === 'reps') && (
          <Field
            label={`${measure === 'reps' ? m.gym.addedWeight : m.gym.weight} (${fmt.unitLabel})`}
            value={kg}
            onChange={setKg}
            inputMode="decimal"
            onStep={(d) => bump(kg, d * unitStep, setKg)}
            m={m}
          />
        )}
        {measure === 'distance' && <Field label={`${m.gym.distance} (${m.gym.unitKm})`} value={km} onChange={setKm} inputMode="decimal" m={m} />}
        {(measure === 'time' || measure === 'distance') && (
          <Field label={m.gym.time} value={time} onChange={setTime} inputMode="text" placeholder={measure === 'time' ? '0:45' : '28:30'} m={m} ltr />
        )}
      </div>
      <div className="mt-3 text-[11px] font-bold uppercase tracking-wider text-muted">{set ? m.gym.effortLabel : m.workout.tapToLog}</div>
      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        {EFFORTS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => (set ? onUpdate(values(), e) : onLog(values(), e))}
            className={cx(
              'rounded-xl py-3 text-sm font-bold transition active:scale-95',
              EFFORT_CLASS[e],
              set?.effort === e && 'ring-2 ring-current',
            )}
          >
            {m.gym.effort[e]}
          </button>
        ))}
      </div>
      {set && (
        <div className="mt-2 flex items-center justify-between">
          <Button size="sm" variant="ghost" className="text-danger" onClick={onDelete}><Trash2 size={14} /> {m.workout.deleteSet}</Button>
          <Button size="sm" onClick={onExpand}>{m.common.cancel}</Button>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, inputMode, onStep, placeholder, ltr, m }: {
  label: string
  value: string
  onChange: (v: string) => void
  inputMode: 'numeric' | 'decimal' | 'text'
  onStep?: (dir: number) => void
  placeholder?: string
  ltr?: boolean
  m: ReturnType<typeof useI18n>['m']
}) {
  return (
    <div className="min-w-0">
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        {onStep && <IconButton label={m.workout.less} onClick={() => onStep(-1)} className="shrink-0"><Minus size={16} /></IconButton>}
        <Input
          className="min-w-0 text-center text-lg font-bold tabular sm:text-base"
          value={value}
          placeholder={placeholder}
          inputMode={inputMode}
          dir={ltr ? 'ltr' : undefined}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.select()}
        />
        {onStep && <IconButton label={m.workout.more} onClick={() => onStep(1)} className="shrink-0"><Plus size={16} /></IconButton>}
      </div>
    </div>
  )
}

// --- rest timer --------------------------------------------------------------------------------

function RestBar() {
  const t = useI18n()
  const { m } = t
  const fmt = useGymFormat()
  const { endsAt, totalMs, add, stop } = useRest()
  const now = useTick(250, !!endsAt)
  const left = endsAt ? Math.max(0, endsAt - now) : 0

  useEffect(() => {
    if (endsAt && now >= endsAt) {
      stop()
      celebrate.timerDone()
      navigator.vibrate?.([200, 100, 200])
    }
  }, [endsAt, now, stop])

  if (!endsAt) return null
  const sec = (n: number) => t.f(m.workout.secondsShort, { n: t.n(n, { signDisplay: 'always' }) })
  return createPortal(
    <div className="fixed inset-x-3 bottom-[calc(84px+env(safe-area-inset-bottom))] z-40 rounded-2xl border border-border bg-surface/95 p-3 shadow-xl backdrop-blur-xl lg:inset-x-auto lg:bottom-6 lg:end-6 lg:w-96">
      <div className="flex items-center gap-3">
        <Timer size={18} className="shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{m.gym.rest}</div>
          <div className="text-2xl font-extrabold leading-none tabular" dir="ltr">{fmt.clock(Math.ceil(left / 1000))}</div>
        </div>
        <Button size="sm" onClick={() => add(-15)}><bdi>{sec(-15)}</bdi></Button>
        <Button size="sm" onClick={() => add(15)}><bdi>{sec(15)}</bdi></Button>
        <Button size="sm" variant="primary" onClick={stop}>{m.workout.skipRest}</Button>
      </div>
      <ProgressBar className="mt-2" value={totalMs ? 1 - left / totalMs : 0} height={4} />
    </div>,
    document.body,
  )
}

/** Keeps the phone's screen on during a workout, where the browser allows it. Best-effort. */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    let gone = false
    const request = async () => {
      try { lock = (await navigator.wakeLock?.request('screen')) ?? null } catch { /* not allowed: fine */ }
    }
    void request()
    const onVisible = () => { if (!gone && document.visibilityState === 'visible') void request() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      gone = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [])
}

// --- managing the workout ----------------------------------------------------------------------

function ManageSheet({ open, onClose, workout: w, exMap, loggedOf, current, onGo, onAdd }: {
  open: boolean
  onClose: () => void
  workout: Workout
  exMap: Map<ID, Exercise>
  loggedOf: (itemId: ID) => WorkoutSet[]
  current: number
  onGo: (k: number) => void
  onAdd: () => void
}) {
  const t = useI18n()
  const { m } = t
  const [name, setName] = useState(w.name)
  const update = useStore((s) => s.updateWorkout)
  const move = (k: number, by: number) => {
    const items = [...w.items]
    const [it] = items.splice(k, 1)
    items.splice(k + by, 0, it)
    update(w.id, { items })
  }
  const discard = () => {
    if (!confirm(m.workout.discardConfirm)) return
    useRest.getState().stop()
    useStore.getState().deleteWorkout(w.id)
    onClose()
    navigate('training')
  }

  return (
    <Modal open={open} onClose={onClose} title={m.workout.manage}>
      <Label>{m.workout.name}</Label>
      <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== w.name && update(w.id, { name: name.trim() })} />
      <div className="mt-4 space-y-1.5">
        {w.items.map((it, k) => {
          const logged = loggedOf(it.id).filter((s) => !s.warmup).length
          return (
            <div key={it.id} className={cx('flex items-center gap-2 rounded-xl px-2 py-1.5', k === current ? 'bg-accent-soft' : 'bg-surface-2')}>
              <button type="button" className="min-w-0 flex-1 text-start" onClick={() => onGo(k)}>
                <div className="truncate text-sm font-semibold">{exMap.get(it.exerciseId)?.name ?? m.workout.unknownExercise}</div>
                <div className="text-xs text-muted">{t.f(m.workout.setsDone, { done: t.n(logged), total: t.n(it.sets) })}</div>
              </button>
              <IconButton label={m.workout.moveUp} disabled={k === 0} onClick={() => move(k, -1)}><ArrowUp size={15} /></IconButton>
              <IconButton label={m.workout.moveDown} disabled={k === w.items.length - 1} onClick={() => move(k, 1)}><ArrowDown size={15} /></IconButton>
              {loggedOf(it.id).length === 0 && (
                <IconButton label={m.workout.removeExercise} onClick={() => update(w.id, { items: w.items.filter((x) => x.id !== it.id) })}><Trash2 size={15} /></IconButton>
              )}
            </div>
          )
        })}
      </div>
      <Button className="mt-3 w-full" onClick={onAdd}><Plus size={16} /> {m.workout.addExercise}</Button>
      <div className="mt-6 border-t border-border pt-4">
        <Button variant="ghost" className="text-danger" onClick={discard}><Trash2 size={16} /> {m.workout.discard}</Button>
      </div>
    </Modal>
  )
}

function ExercisePicker({ open, onClose, exercises, onPick }: {
  open: boolean
  onClose: () => void
  exercises: Exercise[]
  onPick: (e: Exercise) => void
}) {
  const t = useI18n()
  const { m } = t
  const [q, setQ] = useState('')
  const list = exercises
    .filter((e) => !e.archived && e.name.toLocaleLowerCase().includes(q.trim().toLocaleLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, t.locale))
  return (
    <Modal open={open} onClose={onClose} title={m.workout.addExercise}>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input className="ps-9" value={q} placeholder={m.common.search} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-3 space-y-1">
        {list.map((e) => (
          <button key={e.id} type="button" onClick={() => { onPick(e); setQ('') }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-surface-2">
            <span className="min-w-0 flex-1 truncate font-semibold">{e.name}</span>
            <span className="shrink-0 text-xs text-muted">{e.muscle ? m.gym.muscle[e.muscle] : m.gym.equipment[e.equipment]}</span>
          </button>
        ))}
        {list.length === 0 && (
          <div className="py-6 text-center text-sm text-muted">
            <p>{m.workout.noExercises}</p>
            <Button size="sm" className="mt-2" onClick={() => { onClose(); navigate('training', 'exercises') }}>{m.workout.goToExercises}</Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

// --- finishing ---------------------------------------------------------------------------------

function FinishDialog({ open, onClose, workout: w, logged, onFinished }: {
  open: boolean
  onClose: () => void
  workout: Workout
  logged: WorkoutSet[]
  onFinished: (id: ID) => void
}) {
  const t = useI18n()
  const { m } = t
  const [note, setNote] = useState(w.note)
  const work = logged.filter((s) => !s.warmup)
  const left = w.items.reduce((n, it) => n + Math.max(0, it.sets - work.filter((s) => s.itemId === it.id).length), 0)

  const finish = () => {
    const s = useStore.getState()
    if (note !== w.note) s.updateWorkout(w.id, { note })
    s.finishWorkout(w.id)
    useRest.getState().stop()
    onClose()
    onFinished(w.id)
  }
  const discard = () => {
    useRest.getState().stop()
    useStore.getState().deleteWorkout(w.id)
    onClose()
    navigate('training')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={m.workout.finishTitle}
      footer={work.length === 0 ? (
        <>
          <Button onClick={onClose}>{m.workout.keepGoing}</Button>
          <Button variant="danger" onClick={discard}>{m.workout.discard}</Button>
        </>
      ) : (
        <>
          <Button onClick={onClose}>{m.workout.keepGoing}</Button>
          <Button variant="primary" onClick={finish}><Flag size={16} /> {m.workout.finish}</Button>
        </>
      )}
    >
      {work.length === 0 ? (
        <p className="text-sm text-muted">{m.workout.nothingLogged}</p>
      ) : (
        <>
          <p className="text-sm">{t.p(m.workout.setsLogged, work.length)}</p>
          {left > 0 && <p className="mt-1 text-sm text-gold">{t.p(m.workout.setsLeft, left)}</p>}
          <div className="mt-4"><Label hint={m.common.optional}>{m.workout.note}</Label></div>
          <Textarea rows={3} value={note} placeholder={m.workout.notePlaceholder} onChange={(e) => setNote(e.target.value)} />
        </>
      )}
    </Modal>
  )
}

function FinishSummary({ workoutId }: { workoutId: ID }) {
  const t = useI18n()
  const { m } = t
  const fmt = useGymFormat()
  const { workouts, sets, exercises, habits } = useStore(useShallow((s) => ({ workouts: s.workouts, sets: s.workoutSets, exercises: s.exercises, habits: s.habits })))
  const w = workouts.find((x) => x.id === workoutId)
  // Computed once, for the workout as it was finished — later edits elsewhere don't change the moment.
  const [records] = useState<NewRecord[]>(() => (w ? newRecords(w, workouts, sets) : []))
  useEffect(() => {
    if (records.length) celebrate.goal()
    else celebrate.allDone()
  }, [records.length])
  if (!w) return <NoWorkout />

  const sum = workoutSummary(w, sets)
  const exName = (id: ID) => exercises.find((e) => e.id === id)?.name ?? m.workout.unknownExercise
  const habit = w.tickedHabitId ? habits.find((h) => h.id === w.tickedHabitId) : undefined
  const xp = XP.workout + Math.min(3, records.length) * XP.record
  const recordText = (r: NewRecord) => {
    switch (r.kind) {
      case 'kg': case 'e1rm': case 'volume': return fmt.weight(r.value)
      case 'reps': return t.p(m.gym.setReps, r.value)
      case 'seconds': return fmt.clock(r.value)
      case 'meters': return fmt.distance(r.value)
      case 'repsAtKg': return t.f(m.gym.setWeight, { reps: t.n(r.value), weight: fmt.weight(r.kg ?? 0) })
    }
  }

  return (
    <div className="mx-auto max-w-xl py-4 text-center">
      <div className="text-5xl">🎉</div>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{m.workout.doneTitle}</h1>
      <p className="mt-1 text-sm text-muted">{w.name}</p>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={m.workout.duration} value={sum.minutes !== null ? t.dur(sum.minutes) : '—'} />
        <Stat label={m.gym.sets} value={t.n(sum.sets)} />
        <Stat label={m.gym.volume} value={fmt.weight(sum.volumeKg)} />
        <Stat label={m.workout.xp} value={<bdi>{t.f(m.workout.xpGained, { n: t.n(xp, { signDisplay: 'always' }) })}</bdi>} />
      </div>
      {records.length > 0 && (
        <Card className="mt-5 p-4 text-start">
          <div className="flex items-center gap-2 text-sm font-bold text-gold"><Trophy size={16} /> {t.p(m.workout.newRecords, records.length)}</div>
          <ul className="mt-2 space-y-1.5">
            {records.map((r, k) => (
              <li key={k} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span className="font-semibold">{exName(r.exerciseId)}</span>
                <span className="text-muted">{t.f(m.workout.labelValue, { label: m.workout.recordKind[r.kind], value: recordText(r) })}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {habit && <p className="mt-4 text-sm text-muted">{t.f(m.workout.habitTicked, { habit: `${habit.emoji} ${habit.name}`.trim() })}</p>}
      <Button variant="primary" className="mt-6" onClick={() => navigate('training')}>{m.common.done}</Button>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="p-3">
      <div className="text-lg font-extrabold tabular">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
    </Card>
  )
}

function NoWorkout() {
  const { m } = useI18n()
  return (
    <div className="mx-auto max-w-md py-8">
      <EmptyState emoji="🏋️" title={m.workout.noneTitle}>
        <p>{m.workout.noneBody}</p>
        <Button className="mt-3" onClick={() => navigate('training')}>{m.workout.backToTraining}</Button>
      </EmptyState>
    </div>
  )
}
