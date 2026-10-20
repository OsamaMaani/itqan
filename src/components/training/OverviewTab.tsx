import { Check, ChevronRight, Dumbbell, Moon, Play } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n/react'
import { prettyDay } from '../../lib/date'
import { useToday } from '../../lib/hooks'
import { navigate } from '../../lib/router'
import { activeWorkout, dueRoutine, weekStats, workoutsOn } from '../../lib/training'
import { MUSCLES, type Routine } from '../../lib/types'
import { Button, Card, EmptyState, ProgressBar, SectionTitle } from '../ui'
import { beginWorkout } from './format'
import { liveRoutines, useTrainingData } from './useTrainingData'
import { WorkoutDetails, WorkoutFacts, WorkoutRow } from './WorkoutDetails'

/** What the person sees first: what to do today, how the week is going, what they did lately. */
export function OverviewTab() {
  const t = useI18n()
  const { m } = t
  const today = useToday()
  const { exercises, routines, program, workouts, workoutSets, weekStartsOn } = useTrainingData()
  const [openId, setOpenId] = useState<string | null>(null)
  const [anyway, setAnyway] = useState(false)

  const names = useMemo(() => new Map(exercises.map((e) => [e.id, e.name])), [exercises])
  const live = useMemo(() => liveRoutines(routines), [routines])
  const active = activeWorkout(workouts)
  const due = dueRoutine(program, routines, workouts, today)
  const dueRoutineObj = due.kind === 'routine' ? live.find((r) => r.id === due.routineId) : undefined
  const doneToday = workoutsOn(today, workouts)
  const week = useMemo(
    () => weekStats(today, weekStartsOn, program, routines, workouts, workoutSets, exercises),
    [today, weekStartsOn, program, routines, workouts, workoutSets, exercises],
  )
  const recent = useMemo(
    () => workouts.filter((w) => w.finishedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 5),
    [workouts],
  )

  if (!exercises.length) {
    return (
      <EmptyState emoji="🏋️" title={m.training.overview.noExercisesTitle}>
        <p>{m.training.overview.noExercisesBody}</p>
        <Button variant="primary" className="mt-4" onClick={() => navigate('training', 'exercises')}>{m.training.exercises.addCommon}</Button>
      </EmptyState>
    )
  }

  const exerciseLine = (r: Routine) => t.list(r.items.map((i) => names.get(i.exerciseId)).filter((n): n is string => !!n))
  const showStarters = !active && (due.kind !== 'rest' || anyway)
  const pickable = live.filter((r) => r.id !== dueRoutineObj?.id)
  const muscles = MUSCLES.filter((x) => (week.setsByMuscle[x] ?? 0) > 0)

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        {active && (
          <Card className="border-accent/40 bg-accent-soft p-5">
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="font-bold">{t.f(m.training.overview.inProgress, { name: active.name })}</div>
                <div className="mt-0.5 text-sm text-muted">{m.training.overview.inProgressHint}</div>
              </div>
              <Button variant="primary" onClick={() => navigate('training', 'workout')}><Play size={16} className="rtl:-scale-x-100" /> {m.training.overview.resume}</Button>
            </div>
          </Card>
        )}

        {!active && (
          <Card className="p-5">
            <SectionTitle>{m.training.overview.todayTitle}</SectionTitle>
            {doneToday.length > 0 && (
              <div className="mb-4 space-y-1 rounded-xl bg-accent-soft px-3 py-2.5">
                {doneToday.map((w) => (
                  <div key={w.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-accent">
                      <Check size={15} /> {t.f(m.training.overview.doneToday, { name: w.name })}
                    </span>
                    <WorkoutFacts workout={w} sets={workoutSets} />
                  </div>
                ))}
              </div>
            )}
            {dueRoutineObj && (
              <div className="flex items-center gap-4">
                <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-surface-2 text-3xl">{dueRoutineObj.emoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-extrabold">{dueRoutineObj.name}</div>
                  <div className="text-sm text-muted">{t.p(m.gym.exercisesCount, dueRoutineObj.items.length)}</div>
                  {dueRoutineObj.items.length > 0 && <div className="mt-0.5 line-clamp-2 text-xs text-muted">{exerciseLine(dueRoutineObj)}</div>}
                </div>
              </div>
            )}
            {dueRoutineObj && (
              <Button variant="primary" className="mt-4 h-12 w-full text-base" onClick={() => beginWorkout(dueRoutineObj.id, dueRoutineObj.name)}>
                <Play size={18} className="rtl:-scale-x-100" /> {m.training.overview.start}
              </Button>
            )}
            {due.kind === 'rest' && (
              <div className="flex items-center gap-4">
                <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-surface-2 text-muted"><Moon size={26} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-extrabold">{m.training.overview.restTitle}</div>
                  <div className="text-sm text-muted">{m.training.overview.restBody}</div>
                </div>
              </div>
            )}
            {due.kind === 'rest' && !anyway && (
              <Button variant="ghost" className="mt-3" onClick={() => setAnyway(true)}>{m.training.overview.trainAnyway}</Button>
            )}
            {due.kind === 'none' && (
              <div>
                <div className="font-semibold">{m.training.overview.noProgramTitle}</div>
                <p className="mt-1 text-sm text-muted">{m.training.overview.noProgramBody}</p>
                <Button variant="soft" className="mt-3" onClick={() => navigate('training', 'routines')}>{m.training.overview.openRoutines}</Button>
              </div>
            )}
          </Card>
        )}

        {showStarters && (
          <div>
            {pickable.length > 0 && (
              <>
                <SectionTitle>{dueRoutineObj ? m.training.overview.otherRoutines : m.training.overview.pickRoutine}</SectionTitle>
                <Card className="mb-3 divide-y divide-border">
                  {pickable.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => beginWorkout(r.id, r.name)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-start transition first:rounded-t-2xl last:rounded-b-2xl hover:bg-surface-2/60"
                    >
                      <span className="text-xl">{r.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{r.name}</span>
                        <span className="block text-xs text-muted">{t.p(m.gym.exercisesCount, r.items.length)}</span>
                      </span>
                      <Play size={15} className="shrink-0 text-muted rtl:-scale-x-100" />
                    </button>
                  ))}
                </Card>
              </>
            )}
            <button
              type="button"
              onClick={() => beginWorkout(null, m.training.overview.emptyWorkoutName)}
              className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-3 text-start transition hover:bg-surface-2/60"
            >
              <Dumbbell size={20} className="text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{m.training.overview.emptyWorkout}</span>
                <span className="block text-xs text-muted">{m.training.overview.emptyWorkoutHint}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-muted rtl:-scale-x-100" />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-5">
        <Card className="p-5">
          <SectionTitle>{m.training.overview.weekTitle}</SectionTitle>
          {week.planned > 0 ? (
            <>
              <div className="mb-2 text-sm font-semibold tabular">{t.p(m.training.overview.weekPlanned, week.planned, { done: week.done })}</div>
              <ProgressBar value={week.done / week.planned} />
            </>
          ) : (
            <div className="text-sm font-semibold tabular">{t.p(m.gym.workoutsCount, week.done)}</div>
          )}
          {muscles.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-muted">{m.training.overview.weekMuscles}</div>
              <div className="flex flex-wrap gap-1.5">
                {muscles.map((x) => (
                  <span key={x} className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2 py-1 text-xs font-semibold">
                    {m.gym.muscle[x]}
                    <span className="text-accent tabular">{t.n(week.setsByMuscle[x] ?? 0)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div>
          <SectionTitle>{m.training.overview.recent}</SectionTitle>
          {recent.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">{m.training.overview.noRecent}</p>
          ) : (
            <Card className="divide-y divide-border p-1">
              {recent.map((w) => (
                <WorkoutRow key={w.id} workout={w} sets={workoutSets} dateLabel={prettyDay(w.date, today, t)} onOpen={setOpenId} />
              ))}
            </Card>
          )}
        </div>
      </div>

      <WorkoutDetails workoutId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
