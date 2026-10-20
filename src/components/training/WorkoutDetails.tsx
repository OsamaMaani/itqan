import { ChevronRight, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { useI18n } from '../../i18n/react'
import { navigate } from '../../lib/router'
import { useStore } from '../../lib/store'
import { newRecords, workoutSummary } from '../../lib/training'
import type { ID, Workout, WorkoutSet } from '../../lib/types'
import { Button, cx, Modal } from '../ui'
import { EffortBadge, useGymFormat } from './format'
import { useTrainingData } from './useTrainingData'

/** Duration, sets and total lifted of one workout, as small facts side by side. */
export function WorkoutFacts({ workout, sets, className }: { workout: Workout; sets: WorkoutSet[]; className?: string }) {
  const t = useI18n()
  const { m } = t
  const fmt = useGymFormat()
  const sum = workoutSummary(workout, sets)
  return (
    <div className={cx('flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted', className)}>
      {sum.minutes !== null && <span className="tabular">{t.dur(sum.minutes)}</span>}
      <span className="tabular">{t.p(m.gym.setsCount, sum.sets)}</span>
      {sum.volumeKg > 0 && <span className="tabular">{fmt.weight(sum.volumeKg)}</span>}
    </div>
  )
}

/** One workout in a list: its name, an optional date line and its facts. Opens the details. */
export function WorkoutRow({ workout, sets, dateLabel, onOpen }: { workout: Workout; sets: WorkoutSet[]; dateLabel?: string; onOpen: (id: ID) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(workout.id)}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition hover:bg-surface-2"
    >
      <div className="min-w-0 flex-1">
        {dateLabel && <div className="text-xs font-semibold text-muted">{dateLabel}</div>}
        <div className="truncate text-sm font-semibold">{workout.name}</div>
        <WorkoutFacts workout={workout} sets={sets} className="mt-0.5" />
      </div>
      <ChevronRight size={16} className="shrink-0 text-muted rtl:-scale-x-100" />
    </button>
  )
}

interface Group { key: ID; exerciseId: ID; sets: WorkoutSet[] }

/** The workout's sets under the exercise they belong to, in the workout's own order. */
function groupSets(workout: Workout, all: WorkoutSet[]): Group[] {
  const mine = all.filter((s) => s.workoutId === workout.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const known = new Set(workout.items.map((i) => i.id))
  const groups: Group[] = workout.items
    .map((item) => ({ key: item.id, exerciseId: item.exerciseId, sets: mine.filter((s) => s.itemId === item.id) }))
    .filter((g) => g.sets.length)
  // A set whose slot is no longer in the workout still happened: keep it, under its exercise.
  const orphans = mine.filter((s) => !known.has(s.itemId))
  for (const exerciseId of new Set(orphans.map((s) => s.exerciseId))) {
    groups.push({ key: `orphan-${exerciseId}`, exerciseId, sets: orphans.filter((s) => s.exerciseId === exerciseId) })
  }
  return groups
}

/** Everything that happened in one workout: every set with its effort, records, note. */
export function WorkoutDetails({ workoutId, onClose }: { workoutId: ID | null; onClose: () => void }) {
  const t = useI18n()
  const { m } = t
  const fmt = useGymFormat()
  const { exercises, workouts, workoutSets } = useTrainingData()
  const remove = useStore((s) => s.deleteWorkout)
  const workout = workoutId ? workouts.find((w) => w.id === workoutId) : undefined

  const byId = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises])
  const groups = useMemo(() => (workout ? groupSets(workout, workoutSets) : []), [workout, workoutSets])
  const records = useMemo(
    () => (workout?.finishedAt ? new Set(newRecords(workout, workouts, workoutSets).map((r) => r.exerciseId)) : new Set<ID>()),
    [workout, workouts, workoutSets],
  )

  const onDelete = () => {
    if (!workout) return
    if (!confirm(t.f(m.training.details.deleteConfirm, { name: workout.name, date: t.d(workout.date, 'long') }))) return
    remove(workout.id)
    onClose()
  }

  return (
    <Modal
      open={!!workout}
      onClose={onClose}
      wide
      title={workout?.name ?? ''}
      footer={workout && (
        <>
          <Button variant="danger" className="me-auto" onClick={onDelete}>{m.training.details.delete}</Button>
          {!workout.finishedAt && (
            <Button variant="primary" onClick={() => { onClose(); navigate('training', 'workout') }}>{m.training.overview.resume}</Button>
          )}
        </>
      )}
    >
      {workout && (
        <div className="space-y-4">
          <div>
            <div className="text-sm font-semibold">{t.d(workout.date, 'full', true)}</div>
            <WorkoutFacts workout={workout} sets={workoutSets} className="mt-1" />
            {!workout.finishedAt && <div className="mt-1 text-xs font-semibold text-gold">{m.training.details.unfinished}</div>}
          </div>
          {workout.note && <p className="whitespace-pre-wrap rounded-xl bg-surface-2/60 px-3 py-2 text-sm">{workout.note}</p>}
          {groups.length === 0 && <p className="text-sm text-muted">{m.training.details.noSets}</p>}
          {groups.map((g) => {
            const ex = byId.get(g.exerciseId)
            let n = 0
            return (
              <section key={g.key}>
                <div className="mb-1.5 flex items-center gap-2">
                  <h4 className="min-w-0 truncate text-sm font-bold">{ex?.name ?? m.training.details.unknownExercise}</h4>
                  {records.has(g.exerciseId) && (
                    <span title={m.gym.record} className="inline-flex items-center gap-1 rounded-md bg-gold/15 px-1.5 py-0.5 text-[11px] font-bold text-gold">
                      <Trophy size={11} /> {m.gym.recordShort}
                    </span>
                  )}
                </div>
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {g.sets.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="w-6 shrink-0 text-xs font-bold text-muted tabular" title={s.warmup ? m.gym.warmup : undefined}>
                        {s.warmup ? m.gym.warmupShort : t.n(++n)}
                      </span>
                      <span className="min-w-0 flex-1 tabular">{fmt.set(s, ex?.measure ?? 'weight')}</span>
                      <EffortBadge effort={s.effort} />
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
