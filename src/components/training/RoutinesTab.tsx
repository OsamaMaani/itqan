import { ChevronDown, ChevronRight, ChevronUp, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n/react'
import { useStore } from '../../lib/store'
import type { ID, Routine, TrainingProgram } from '../../lib/types'
import { Button, Card, EmptyState, IconButton, Label, SectionTitle, Segmented, Select } from '../ui'
import { NumField } from './NumField'
import { RoutineEditor } from './RoutineEditor'
import { liveRoutines, useTrainingData } from './useTrainingData'

/** What the program looks like before the first save (the store creates it on the first change). */
const NO_PROGRAM: TrainingProgram = {
  mode: 'weekdays', weekdays: [null, null, null, null, null, null, null], rotation: [], perWeek: 3, habitId: null, updatedAt: '',
}

/** The program (when to train what) and the routines themselves. */
export function RoutinesTab() {
  const t = useI18n()
  const { m } = t
  const { exercises, routines, program } = useTrainingData()
  const habits = useStore((s) => s.habits)
  const [editing, setEditing] = useState<Routine | 'new' | null>(null)

  const live = useMemo(() => liveRoutines(routines), [routines])
  const names = useMemo(() => new Map(exercises.map((e) => [e.id, e.name])), [exercises])

  return (
    <div className="space-y-6">
      <ProgramCard program={program ?? NO_PROGRAM} routines={routines} live={live} habits={habits.filter((h) => !h.archived)} />

      <div>
        <SectionTitle right={<Button variant="primary" size="sm" onClick={() => setEditing('new')}><Plus size={15} /> {m.training.routines.newRoutine}</Button>}>
          {m.training.routines.title}
        </SectionTitle>
        {live.length === 0 ? (
          <EmptyState emoji="📋" title={m.training.routines.emptyTitle}>
            {exercises.length ? m.training.routines.emptyBody : m.training.routines.emptyNoExercises}
          </EmptyState>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {live.map((r) => {
              const list = t.list(r.items.map((i) => names.get(i.exerciseId)).filter((n): n is string => !!n))
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setEditing(r)}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface/80 p-4 text-start transition hover:bg-surface-2/60"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-2xl">{r.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{r.name}</span>
                    <span className="block text-xs text-muted">{t.p(m.gym.exercisesCount, r.items.length)}</span>
                    {r.items.length > 0 && <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{list}</span>}
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-muted rtl:-scale-x-100" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      <RoutineEditor open={editing !== null} routine={editing && editing !== 'new' ? editing : undefined} onClose={() => setEditing(null)} />
    </div>
  )
}

function ProgramCard({ program, routines, live, habits }: {
  program: TrainingProgram
  routines: Routine[]
  live: Routine[]
  habits: { id: ID; name: string; emoji: string }[]
}) {
  const t = useI18n()
  const { m } = t
  const update = useStore((s) => s.updateProgram)
  const weekStartsOn = useStore((s) => s.settings.weekStartsOn)
  const dayNames = t.weekdays('long')
  const order = Array.from({ length: 7 }, (_, i) => (weekStartsOn + i) % 7)
  const byId = new Map(routines.map((r) => [r.id, r]))
  const label = (r: Routine) => `${r.emoji} ${r.name}`

  // A routine that is archived but still scheduled stays visible, so it can be changed.
  const optionsFor = (current: ID | null) => (current && !live.some((r) => r.id === current) && byId.has(current) ? [byId.get(current)!, ...live] : live)

  const setDay = (day: number, id: string) => {
    const weekdays = Array.from({ length: 7 }, (_, i) => (i === day ? id || null : program.weekdays[i] ?? null))
    update({ weekdays })
  }
  const moveRotation = (i: number, by: number) => {
    const rotation = [...program.rotation]
    const [x] = rotation.splice(i, 1)
    rotation.splice(i + by, 0, x)
    update({ rotation })
  }

  return (
    <Card className="p-5">
      <SectionTitle>{m.training.program.title}</SectionTitle>
      <Segmented
        value={program.mode}
        onChange={(mode) => update({ mode })}
        options={[
          { value: 'weekdays', label: m.training.program.fixedDays },
          { value: 'rotation', label: m.training.program.rotation },
        ]}
      />
      <p className="mt-2 text-xs text-muted">{program.mode === 'weekdays' ? m.training.program.fixedDaysHint : m.training.program.rotationHint}</p>

      {program.mode === 'weekdays' ? (
        <div className="mt-4 space-y-2">
          {order.map((day) => (
            <div key={day} className="grid grid-cols-[6.5rem_1fr] items-center gap-3 sm:grid-cols-[9rem_1fr]">
              <span className="truncate text-sm font-semibold">{dayNames[day]}</span>
              <Select aria-label={dayNames[day]} value={program.weekdays[day] ?? ''} onChange={(e) => setDay(day, e.target.value)}>
                <option value="">{m.training.program.rest}</option>
                {optionsFor(program.weekdays[day] ?? null).map((r) => <option key={r.id} value={r.id}>{label(r)}</option>)}
              </Select>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {program.rotation.length === 0 && <p className="text-sm text-muted">{m.training.program.rotationEmpty}</p>}
          <ol className="space-y-2">
            {program.rotation.map((id, i) => {
              const r = byId.get(id)
              return (
                <li key={`${id}-${i}`} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
                  <span className="w-5 shrink-0 text-xs font-bold text-muted tabular">{t.n(i + 1)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r ? label(r) : m.training.program.unknownRoutine}</span>
                  <IconButton label={m.training.routineEditor.moveUp} className="disabled:pointer-events-none disabled:opacity-30" disabled={i === 0} onClick={() => moveRotation(i, -1)}><ChevronUp size={18} /></IconButton>
                  <IconButton label={m.training.routineEditor.moveDown} className="disabled:pointer-events-none disabled:opacity-30" disabled={i === program.rotation.length - 1} onClick={() => moveRotation(i, 1)}><ChevronDown size={18} /></IconButton>
                  <IconButton label={m.common.remove} onClick={() => update({ rotation: program.rotation.filter((_, k) => k !== i) })}><X size={18} /></IconButton>
                </li>
              )
            })}
          </ol>
          <Select aria-label={m.training.program.addToRotation} value="" onChange={(e) => e.target.value && update({ rotation: [...program.rotation, e.target.value] })}>
            <option value="">{m.training.program.addToRotation}</option>
            {live.map((r) => <option key={r.id} value={r.id}>{label(r)}</option>)}
          </Select>
          <div>
            <Label hint={m.training.program.perWeekHint}>{m.training.program.perWeek}</Label>
            <NumField
              className="w-24"
              value={program.perWeek}
              onChange={(v) => v !== null && update({ perWeek: Math.min(7, Math.max(1, Math.round(v))) })}
            />
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <Label>{m.training.program.habit}</Label>
        <Select value={program.habitId ?? ''} onChange={(e) => update({ habitId: e.target.value || null })}>
          <option value="">{m.training.program.noHabit}</option>
          {habits.map((h) => <option key={h.id} value={h.id}>{h.emoji} {h.name}</option>)}
          {program.habitId && !habits.some((h) => h.id === program.habitId) && <option value={program.habitId}>{m.training.program.archivedHabit}</option>}
        </Select>
        <p className="mt-1.5 text-xs text-muted">{m.training.program.habitHint}</p>
      </div>
    </Card>
  )
}
