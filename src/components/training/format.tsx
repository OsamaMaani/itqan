import { useI18n } from '../../i18n/react'
import type { I18n } from '../../i18n/core'
import { navigate } from '../../lib/router'
import { useStore } from '../../lib/store'
import { activeWorkout, fromUnit, toUnit } from '../../lib/training'
import type { Effort, Exercise, GoalMetric, ID, WeightUnit, WorkoutSet } from '../../lib/types'
import { cx } from '../ui'

/**
 * Display helpers shared by every Training view (ADR-027). Stored values are kg / metres /
 * seconds; this is the only place they become text in the person's unit and language.
 */
export interface GymFormat {
  unit: WeightUnit
  unitLabel: string
  /** kg → number in the person's unit (for inputs) */
  toUnit: (kg: number) => number
  /** typed number in the person's unit → kg */
  fromUnit: (v: number) => number
  /** kg → "40 kg" / "88.2 lb" */
  weight: (kg: number) => string
  /** seconds → "0:45", "1:30", "1:02:05" */
  clock: (seconds: number) => string
  /** metres → "800 m" / "5.2 km" */
  distance: (meters: number) => string
  /** One set as text: "8 × 40 kg", "12 reps", "10 reps + 10 kg", "1:00", "5 km in 28:30" */
  set: (s: Pick<WorkoutSet, 'reps' | 'kg' | 'seconds' | 'meters'>, measure: Exercise['measure']) => string
  /** A goal metric's stored value as text: weight, reps, time or distance */
  metric: (metric: GoalMetric, v: number) => string
  /** Stored value → the number a person types (kg → their unit, metres → km) */
  metricIn: (metric: GoalMetric, v: number) => number
  /** Typed number → stored value */
  metricOut: (metric: GoalMetric, v: number) => number
  /** The unit shown next to a metric input */
  metricUnit: (metric: GoalMetric) => string
}

export function gymFormat(t: I18n, unit: WeightUnit): GymFormat {
  const { m } = t
  const num = (x: number) => t.n(x, { maximumFractionDigits: 1 })
  const weight = (kg: number) => t.f(unit === 'lb' ? m.gym.lb : m.gym.kg, { n: num(toUnit(kg, unit)) })
  const clock = (sec: number) => {
    const s = Math.max(0, Math.round(sec))
    const h = Math.floor(s / 3600)
    const mm = Math.floor((s % 3600) / 60)
    const ss = String(s % 60).padStart(2, '0')
    return h ? `${h}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`
  }
  const distance = (meters: number) =>
    meters >= 1000 ? t.f(m.gym.km, { n: t.n(meters / 1000, { maximumFractionDigits: 2 }) }) : t.f(m.gym.meters, { n: t.n(Math.round(meters)) })
  return {
    unit,
    unitLabel: unit === 'lb' ? m.gym.unitLb : m.gym.unitKg,
    toUnit: (kg) => toUnit(kg, unit),
    fromUnit: (v) => fromUnit(v, unit),
    weight,
    clock,
    distance,
    set: (s, measure) => {
      if (measure === 'time') return clock(s.seconds ?? 0)
      if (measure === 'distance') {
        const d = distance(s.meters ?? 0)
        return s.seconds ? t.f(m.gym.setDistance, { distance: d, time: clock(s.seconds) }) : d
      }
      const reps = t.p(m.gym.setReps, s.reps ?? 0)
      if (measure === 'reps') return s.kg ? t.f(m.gym.setRepsPlus, { reps, weight: weight(s.kg) }) : reps
      return s.kg !== null ? t.f(m.gym.setWeight, { reps: t.n(s.reps ?? 0), weight: weight(s.kg) }) : reps
    },
    metric: (metric, v) =>
      metric === 'kg' ? weight(v) : metric === 'reps' ? t.p(m.gym.setReps, v) : metric === 'seconds' ? clock(v) : distance(v),
    metricIn: (metric, v) => (metric === 'kg' ? toUnit(v, unit) : metric === 'meters' ? v / 1000 : v),
    metricOut: (metric, v) => (metric === 'kg' ? fromUnit(v, unit) : metric === 'meters' ? v * 1000 : v),
    metricUnit: (metric) => (metric === 'kg' ? (unit === 'lb' ? m.gym.unitLb : m.gym.unitKg) : metric === 'meters' ? m.gym.unitKm : metric === 'seconds' ? m.gym.seconds : m.gym.reps),
  }
}

export function useGymFormat(): GymFormat {
  const t = useI18n()
  const unit = useStore((s) => s.settings.weightUnit)
  return gymFormat(t, unit)
}

const EFFORT_CLASS: Record<Effort, string> = {
  easy: 'bg-accent-soft text-accent',
  good: 'bg-surface-2 text-text',
  hard: 'bg-gold/15 text-gold',
  failed: 'bg-danger/15 text-danger',
}

/** A small coloured label for how a set felt. */
export function EffortBadge({ effort, className }: { effort: Effort | null; className?: string }) {
  const { m } = useI18n()
  if (!effort) return null
  return <span className={cx('rounded-md px-1.5 py-0.5 text-[11px] font-bold', EFFORT_CLASS[effort], className)}>{m.gym.effort[effort]}</span>
}

export { EFFORT_CLASS }

/**
 * Opens the live workout: resumes the one in progress if there is one (never two at once),
 * otherwise starts this routine (or an empty workout) on today's local day.
 */
export function beginWorkout(routineId: ID | null, name: string): void {
  const s = useStore.getState()
  if (!activeWorkout(s.workouts)) s.startWorkout(routineId, name)
  navigate('training', 'workout')
}
