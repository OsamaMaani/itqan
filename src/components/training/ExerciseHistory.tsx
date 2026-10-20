import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n/react'
import { exerciseHistory, exerciseSeries, personalRecords, type Performance, type SeriesPoint } from '../../lib/training'
import type { ID, Measure } from '../../lib/types'
import { Button, Card, cx, SectionTitle } from '../ui'
import { EffortBadge, useGymFormat, type GymFormat } from './format'
import { useTrainingData } from './useTrainingData'

/** A value on the chart or in a tile, in the unit and language the person reads. */
function useValueText(measure: Measure): (v: number) => string {
  const t = useI18n()
  const fmt = useGymFormat()
  return (v) => (measure === 'weight' ? fmt.weight(v) : measure === 'reps' ? t.n(v) : measure === 'time' ? fmt.clock(v) : fmt.distance(v))
}

/**
 * A small line chart, drawn by hand: one point per workout, oldest to newest, left to right in
 * every language (time does not mirror). Colours are tokens, so it follows light and dark.
 */
function ExerciseChart({ points, text, label }: { points: SeriesPoint[]; text: (v: number) => string; label: string }) {
  const t = useI18n()
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const x = (i: number) => (points.length === 1 ? 50 : 4 + (i / (points.length - 1)) * 92)
  const y = (v: number) => (max === min ? 50 : 12 + (1 - (v - min) / (max - min)) * 76)
  const sameYear = points[0].date.slice(0, 4) === points[points.length - 1].date.slice(0, 4)
  const dateText = (d: string) => t.d(d, sameYear ? 'short' : 'medium')

  return (
    <div dir="ltr" role="img" aria-label={label} className="grid grid-cols-[auto_1fr] gap-x-2">
      <div className="relative w-16 text-end text-[11px] text-muted tabular">
        <span className="absolute end-0 -translate-y-1/2" style={{ top: `${y(max)}%` }}>{text(max)}</span>
        {max !== min && <span className="absolute end-0 -translate-y-1/2" style={{ top: `${y(min)}%` }}>{text(min)}</span>}
      </div>
      <div className="relative h-36">
        <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {[12, 50, 88].map((g) => (
            <line key={g} x1="0" x2="100" y1={g} y2={g} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {points.length > 1 && (
            <polyline
              points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
              fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {points.map((p, i) => (
          <span
            key={p.workoutId}
            title={`${t.d(p.date, 'medium')} · ${text(p.value)}`}
            className={cx('absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-accent', i === points.length - 1 && 'size-3')}
            style={{ left: `${x(i)}%`, top: `${y(p.value)}%` }}
          />
        ))}
      </div>
      <div />
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{dateText(points[0].date)}</span>
        {points.length > 1 && <span>{dateText(points[points.length - 1].date)}</span>}
      </div>
    </div>
  )
}

function Tile({ label, value, date }: { label: string; value: string; date?: string }) {
  return (
    <div className="rounded-xl bg-surface-2/60 px-3 py-2.5">
      <div className="text-[11px] font-semibold text-muted">{label}</div>
      <div className="mt-0.5 text-lg font-extrabold tabular">{value}</div>
      {date && <div className="text-[11px] text-muted">{date}</div>}
    </div>
  )
}

const PAGE = 15

/**
 * Everything about one exercise (ADR-027): records, a chart over time, and every past workout it
 * was in, newest first. `onOpenWorkout` makes a past workout tappable.
 */
export function ExerciseHistory({ exerciseId, onOpenWorkout }: { exerciseId: ID; onOpenWorkout?: (id: ID) => void }) {
  const t = useI18n()
  const { m } = t
  const fmt = useGymFormat()
  const { exercises, workouts, workoutSets } = useTrainingData()
  const exercise = exercises.find((e) => e.id === exerciseId)
  const measure = exercise?.measure ?? 'weight'
  const text = useValueText(measure)
  const [shown, setShown] = useState(PAGE)

  const history = useMemo(() => exerciseHistory(exerciseId, workouts, workoutSets), [exerciseId, workouts, workoutSets])
  const records = useMemo(() => personalRecords(history), [history])
  const series = useMemo(() => exerciseSeries(history, measure), [history, measure])

  if (!exercise) return null
  if (!history.length) return <p className="text-sm text-muted">{m.training.history.exerciseEmpty}</p>

  const r = records
  const d = (rec: { date: string } | null) => (rec ? t.d(rec.date, 'medium') : undefined)
  const tiles: { label: string; value: string; date?: string }[] = []
  if (measure === 'weight' || measure === 'reps') {
    if (r.kg) tiles.push({ label: measure === 'weight' ? m.training.history.heaviest : m.gym.addedWeight, value: fmt.weight(r.kg.value), date: d(r.kg) })
    if (r.reps) tiles.push({ label: m.training.history.mostReps, value: t.p(m.gym.setReps, r.reps.value), date: d(r.reps) })
    if (r.e1rm) tiles.push({ label: m.gym.e1rm, value: fmt.weight(r.e1rm.value), date: d(r.e1rm) })
    if (r.volume) tiles.push({ label: m.training.history.bestVolume, value: fmt.weight(r.volume.value), date: d(r.volume) })
  } else if (measure === 'time') {
    if (r.seconds) tiles.push({ label: m.training.history.longestTime, value: fmt.clock(r.seconds.value), date: d(r.seconds) })
  } else {
    if (r.meters) tiles.push({ label: m.training.history.longestDistance, value: fmt.distance(r.meters.value), date: d(r.meters) })
    if (r.seconds) tiles.push({ label: m.training.history.longestTime, value: fmt.clock(r.seconds.value), date: d(r.seconds) })
  }

  return (
    <div className="space-y-5">
      {tiles.length > 0 && (
        <div>
          <SectionTitle>{m.gym.record}</SectionTitle>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {tiles.map((x) => <Tile key={x.label} {...x} />)}
          </div>
        </div>
      )}
      {series.length > 0 && (
        <div>
          <SectionTitle>{m.training.history.overTime}</SectionTitle>
          <Card className="p-3">
            <ExerciseChart points={series} text={text} label={t.f(m.training.history.chartLabel, { name: exercise.name })} />
          </Card>
        </div>
      )}
      <div>
        <SectionTitle>{m.training.history.pastWorkouts}</SectionTitle>
        <ul className="space-y-2">
          {history.slice(0, shown).map((p) => (
            <li key={p.workout.id}>
              <PerformanceRow performance={p} measure={measure} fmt={fmt} onOpen={onOpenWorkout} />
            </li>
          ))}
        </ul>
        {history.length > shown && (
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setShown((n) => n + PAGE)}>{m.training.history.showMore}</Button>
        )}
      </div>
    </div>
  )
}

function PerformanceRow({ performance: p, measure, fmt, onOpen }: { performance: Performance; measure: Measure; fmt: GymFormat; onOpen?: (id: ID) => void }) {
  const t = useI18n()
  const { m } = t
  const inner = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">{t.d(p.workout.date, 'medium')}</span>
        <span className="min-w-0 truncate text-xs text-muted">{p.workout.name}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {p.sets.map((s) => (
          <span key={s.id} className={cx('inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2 py-1 text-xs tabular', s.warmup && 'text-muted')}>
            {s.warmup && <span className="font-bold" title={m.gym.warmup}>{m.gym.warmupShort}</span>}
            {fmt.set(s, measure)}
            <EffortBadge effort={s.effort} />
          </span>
        ))}
      </div>
    </>
  )
  const box = 'block w-full rounded-xl border border-border px-3 py-2.5 text-start'
  return onOpen ? (
    <button type="button" onClick={() => onOpen(p.workout.id)} className={cx(box, 'transition hover:bg-surface-2/60')}>{inner}</button>
  ) : (
    <div className={box}>{inner}</div>
  )
}
