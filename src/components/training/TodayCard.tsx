import { CheckCircle2, Dumbbell, Moon, Play } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useI18n } from '../../i18n/react'
import { useToday } from '../../lib/hooks'
import { navigate } from '../../lib/router'
import { useStore } from '../../lib/store'
import { activeWorkout, dueRoutine, workoutsOn, workoutSummary } from '../../lib/training'
import { Button, Card, SectionTitle } from '../ui'
import { beginWorkout } from './format'

/**
 * Today's training at a glance (ADR-027): resume, start what is due, rest, or what was done.
 * Hidden for anyone who hasn't set Training up — it never nags.
 */
export function TrainingToday() {
  const t = useI18n()
  const { m } = t
  const today = useToday()
  const { program, routines, workouts, sets, exercises } = useStore(useShallow((s) => ({
    program: s.program, routines: s.routines, workouts: s.workouts, sets: s.workoutSets, exercises: s.exercises,
  })))
  const active = activeWorkout(workouts)
  const due = dueRoutine(program, routines, workouts, today)
  const done = workoutsOn(today, workouts)
  if (!active && due.kind === 'none' && !done.length) return null

  const routine = due.kind === 'routine' || due.kind === 'suggest' ? routines.find((r) => r.id === due.routineId) : undefined
  const names = routine?.items.map((i) => exercises.find((e) => e.id === i.exerciseId)?.name).filter(Boolean) as string[] | undefined
  const last = done.at(-1)
  const sum = last ? workoutSummary(last, sets) : null

  let body: React.ReactNode
  if (active) {
    body = (
      <Row icon={<Dumbbell size={18} />} title={t.f(m.today.training.inProgress, { name: active.name })} sub={t.p(m.gym.setsCount, sets.filter((s) => s.workoutId === active.id && !s.warmup).length)}>
        <Button size="sm" variant="primary" onClick={() => navigate('training', 'workout')}><Play size={14} /> {m.today.training.resume}</Button>
      </Row>
    )
  } else if (last && sum) {
    body = (
      <Row
        icon={<CheckCircle2 size={18} />}
        title={t.f(m.today.training.done, { name: last.name })}
        sub={[sum.minutes !== null ? t.dur(sum.minutes) : null, t.p(m.gym.setsCount, sum.sets)].filter(Boolean).join(' · ')}
      >
        <Button size="sm" onClick={() => navigate('training')}>{m.today.training.open}</Button>
      </Row>
    )
  } else if (routine) {
    body = (
      <Row
        icon={<span className="text-lg">{routine.emoji || '🏋️'}</span>}
        title={routine.name}
        sub={due.kind === 'suggest'
          ? (due.lastDone ? t.f(m.today.training.suggested, { when: t.ago(due.lastDone) }) : m.today.training.suggestedNew)
          : names?.length ? names.join(' · ') : t.p(m.gym.exercisesCount, routine.items.length)}
      >
        <Button size="sm" variant="primary" onClick={() => beginWorkout(routine.id, routine.name)}><Play size={14} /> {m.today.training.start}</Button>
      </Row>
    )
  } else {
    body = (
      <Row icon={<Moon size={18} />} title={m.today.training.rest} sub={m.today.training.restSub}>
        <Button size="sm" variant="ghost" onClick={() => navigate('training')}>{m.today.training.open}</Button>
      </Row>
    )
  }

  return (
    <section>
      <SectionTitle right={<button onClick={() => navigate('training')} className="text-xs font-semibold text-accent hover:underline">{m.today.training.all}</button>}>
        {m.nav.training}
      </SectionTitle>
      <Card className="p-3">{body}</Card>
    </section>
  )
}

function Row({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{title}</div>
        <div className="truncate text-[11px] text-muted">{sub}</div>
      </div>
      {children}
    </div>
  )
}
