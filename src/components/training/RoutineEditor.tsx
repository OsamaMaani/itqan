import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '../../i18n/react'
import { uid } from '../../lib/id'
import { useStore } from '../../lib/store'
import type { Exercise, ID, Routine, RoutineItem } from '../../lib/types'
import { EmojiInput } from '../EmojiInput'
import { Button, IconButton, Input, Label, Modal, Select, Textarea } from '../ui'
import { ExerciseEditor } from './ExerciseEditor'
import { useGymFormat } from './format'
import { NumField } from './NumField'
import { useTrainingData } from './useTrainingData'

const NEW_EXERCISE = '__new__'

/** The targets that suit how an exercise is measured; sets, warm-ups and rest carry over. */
function targets(measure: Exercise['measure']): Pick<RoutineItem, 'repsMin' | 'repsMax' | 'kg' | 'seconds' | 'meters'> {
  return {
    repsMin: measure === 'weight' || measure === 'reps' ? 8 : null,
    repsMax: measure === 'weight' || measure === 'reps' ? 12 : null,
    kg: null,
    seconds: measure === 'time' ? 60 : null,
    meters: null,
  }
}

const newItem = (e: Exercise): RoutineItem => ({ id: uid(), exerciseId: e.id, sets: 3, warmupSets: 0, restSec: 90, ...targets(e.measure) })

/** The item pointed at another exercise: same slot, new targets only when the measure differs. */
const retarget = (item: RoutineItem, to: Exercise, from?: Exercise): RoutineItem =>
  ({ ...item, exerciseId: to.id, ...(from?.measure === to.measure ? {} : targets(to.measure)) })

interface Draft { name: string; emoji: string; notes: string; items: RoutineItem[] }

/** Create or edit a routine: its name, emoji, notes and ordered exercises with targets. */
export function RoutineEditor({ open, onClose, routine }: { open: boolean; onClose: () => void; routine?: Routine }) {
  // Mounted only while open, so the form always starts from the routine it was opened for.
  return open ? <RoutineForm onClose={onClose} routine={routine} /> : null
}

function RoutineForm({ onClose, routine }: { onClose: () => void; routine?: Routine }) {
  const t = useI18n()
  const { m } = t
  const { exercises } = useTrainingData()
  const addRoutine = useStore((s) => s.addRoutine)
  const updateRoutine = useStore((s) => s.updateRoutine)
  const removeRoutine = useStore((s) => s.deleteRoutine)
  const [d, setD] = useState<Draft>(() => ({
    name: routine?.name ?? '', emoji: routine?.emoji ?? '🏋️', notes: routine?.notes ?? '', items: routine ? routine.items.map((i) => ({ ...i })) : [],
  }))
  // Creating an exercise from here: for which item (or 'append' = a new one at the end).
  const [creating, setCreating] = useState<ID | 'append' | null>(null)

  const byId = new Map(exercises.map((e) => [e.id, e]))
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const patchItem = (id: ID, patch: Partial<RoutineItem>) => set('items', d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  const move = (from: number, by: number) => {
    const items = [...d.items]
    const [it] = items.splice(from, 1)
    items.splice(from + by, 0, it)
    set('items', items)
  }
  const pickFor = (itemId: ID, exerciseId: string) => {
    if (exerciseId === NEW_EXERCISE) return setCreating(itemId)
    const to = byId.get(exerciseId)
    const item = d.items.find((i) => i.id === itemId)
    if (to && item) set('items', d.items.map((i) => (i.id === itemId ? retarget(i, to, byId.get(item.exerciseId)) : i)))
  }
  const appendExercise = (exerciseId: string) => {
    if (exerciseId === NEW_EXERCISE) return setCreating('append')
    const e = byId.get(exerciseId)
    if (e) set('items', [...d.items, newItem(e)])
  }
  const onExerciseCreated = (id: ID) => {
    const ex = useStore.getState().exercises.find((e) => e.id === id)
    if (!ex) return
    if (creating === 'append') set('items', [...d.items, newItem(ex)])
    else if (creating) set('items', d.items.map((i) => (i.id === creating ? retarget(i, ex, byId.get(i.exerciseId)) : i)))
  }

  const save = () => {
    const name = d.name.trim()
    if (!name) return
    const items = d.items
      .filter((i) => byId.has(i.exerciseId))
      .map((i) => {
        const swap = i.repsMin !== null && i.repsMax !== null && i.repsMax < i.repsMin
        return {
          ...i,
          sets: Math.max(1, Math.round(i.sets || 1)),
          warmupSets: Math.max(0, Math.round(i.warmupSets || 0)),
          restSec: Math.max(0, Math.round(i.restSec || 0)),
          repsMin: swap ? i.repsMax : i.repsMin,
          repsMax: swap ? i.repsMin : i.repsMax,
        }
      })
    const body = { name, emoji: d.emoji, notes: d.notes.trim(), items }
    if (routine) updateRoutine(routine.id, body)
    else addRoutine(body)
    onClose()
  }

  const onDelete = () => {
    if (!routine || !confirm(t.f(m.training.routines.deleteConfirm, { name: routine.name }))) return
    removeRoutine(routine.id)
    onClose()
  }

  const choices = exercises.filter((e) => !e.archived).sort((a, b) => a.name.localeCompare(b.name, t.locale))

  return (
    <>
      <Modal
        open={creating === null}
        onClose={onClose}
        wide
        title={routine ? m.training.routineEditor.editTitle : m.training.routineEditor.newTitle}
        footer={
          <>
            {routine && <Button variant="danger" className="me-auto" onClick={onDelete}>{m.common.delete}</Button>}
            <Button variant="ghost" onClick={onClose}>{m.common.cancel}</Button>
            <Button variant="primary" onClick={save} disabled={!d.name.trim()}>{routine ? m.common.save : m.common.create}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <EmojiInput value={d.emoji} onChange={(v) => set('emoji', v)} />
            <Input autoFocus={!routine} placeholder={m.training.routineEditor.namePlaceholder} aria-label={m.training.routineEditor.name} value={d.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div>
            <Label>{m.common.notes}</Label>
            <Textarea className="min-h-16" placeholder={m.training.routineEditor.notesPlaceholder} value={d.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          <div>
            <Label>{m.training.routineEditor.exercises}</Label>
            {d.items.length === 0 && <p className="mb-3 text-sm text-muted">{m.training.routineEditor.noItems}</p>}
            <div className="space-y-3">
              {d.items.map((item, i) => (
                <ItemEditor
                  key={item.id}
                  item={item}
                  exercise={byId.get(item.exerciseId)}
                  choices={choices}
                  first={i === 0}
                  last={i === d.items.length - 1}
                  onPatch={(patch) => patchItem(item.id, patch)}
                  onPick={(id) => pickFor(item.id, id)}
                  onMove={(by) => move(i, by)}
                  onRemove={() => set('items', d.items.filter((x) => x.id !== item.id))}
                />
              ))}
            </div>
            <div className="mt-3">
              <Select aria-label={m.training.routineEditor.addExercise} value="" onChange={(e) => appendExercise(e.target.value)}>
                <option value="">{m.training.routineEditor.addExercise}</option>
                {choices.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                <option value={NEW_EXERCISE}>{m.training.routineEditor.newExercise}</option>
              </Select>
            </div>
          </div>
        </div>
      </Modal>
      <ExerciseEditor open={creating !== null} onClose={() => setCreating(null)} onCreated={onExerciseCreated} />
    </>
  )
}

function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label hint={hint}>{label}</Label>
      {children}
    </div>
  )
}

function ItemEditor({ item, exercise, choices, first, last, onPatch, onPick, onMove, onRemove }: {
  item: RoutineItem
  exercise: Exercise | undefined
  choices: Exercise[]
  first: boolean
  last: boolean
  onPatch: (patch: Partial<RoutineItem>) => void
  onPick: (exerciseId: string) => void
  onMove: (by: number) => void
  onRemove: () => void
}) {
  const { m } = useI18n()
  const fmt = useGymFormat()
  const measure = exercise?.measure ?? 'weight'
  // An archived exercise stays selectable where it already is.
  const options = exercise && exercise.archived ? [exercise, ...choices] : choices
  const [distUnit, setDistUnit] = useState<'km' | 'm'>(item.meters !== null && item.meters < 1000 ? 'm' : 'km')
  const [dist, setDist] = useState<number | null>(item.meters === null ? null : distUnit === 'km' ? item.meters / 1000 : item.meters)
  const setMeters = (value: number | null, unit: 'km' | 'm') => {
    setDist(value)
    onPatch({ meters: value === null ? null : Math.round(unit === 'km' ? value * 1000 : value) })
  }
  const kgField = (label: string) => (
    <Field label={label} hint={fmt.unitLabel}>
      <NumField decimal value={item.kg === null ? null : fmt.toUnit(item.kg)} onChange={(v) => onPatch({ kg: v === null ? null : fmt.fromUnit(v) })} />
    </Field>
  )
  const arrow = 'disabled:pointer-events-none disabled:opacity-30'

  return (
    <div className="rounded-2xl border border-border bg-surface-2/30 p-3">
      <div className="mb-3 flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <Select aria-label={m.training.routineEditor.exercise} value={item.exerciseId} onChange={(e) => onPick(e.target.value)}>
            {!exercise && <option value={item.exerciseId}>{m.training.details.unknownExercise}</option>}
            {options.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            <option value={NEW_EXERCISE}>{m.training.routineEditor.newExercise}</option>
          </Select>
        </div>
        <IconButton label={m.training.routineEditor.moveUp} className={arrow} disabled={first} onClick={() => onMove(-1)}><ChevronUp size={18} /></IconButton>
        <IconButton label={m.training.routineEditor.moveDown} className={arrow} disabled={last} onClick={() => onMove(1)}><ChevronDown size={18} /></IconButton>
        <IconButton label={m.common.remove} onClick={onRemove}><X size={18} /></IconButton>
      </div>
      <div key={measure} className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
        <Field label={m.gym.sets}>
          <NumField value={item.sets} onChange={(v) => onPatch({ sets: v ?? 0 })} />
        </Field>
        <Field label={m.training.routineEditor.warmupSets}>
          <NumField value={item.warmupSets} onChange={(v) => onPatch({ warmupSets: v ?? 0 })} />
        </Field>
        {(measure === 'weight' || measure === 'reps') && (
          <Field label={m.gym.reps} className="col-span-2">
            <div className="flex items-center gap-2">
              <NumField value={item.repsMin} placeholder={m.training.routineEditor.min} aria-label={m.training.routineEditor.min} onChange={(v) => onPatch({ repsMin: v })} />
              <span aria-hidden="true" className="text-muted">–</span>
              <NumField value={item.repsMax} placeholder={m.training.routineEditor.max} aria-label={m.training.routineEditor.max} onChange={(v) => onPatch({ repsMax: v })} />
            </div>
          </Field>
        )}
        {measure === 'weight' && kgField(m.gym.weight)}
        {measure === 'reps' && kgField(m.gym.addedWeight)}
        {measure === 'time' && (
          <Field label={m.gym.time} hint={m.gym.seconds}>
            <NumField value={item.seconds} onChange={(v) => onPatch({ seconds: v })} />
          </Field>
        )}
        {measure === 'distance' && (
          <>
            <Field label={m.gym.distance} className="col-span-2">
              <div className="flex items-center gap-2">
                <NumField decimal value={dist} onChange={(v) => setMeters(v, distUnit)} />
                <div className="w-24 shrink-0">
                  <Select
                    aria-label={m.gym.distance}
                    value={distUnit}
                    onChange={(e) => { const u = e.target.value as 'km' | 'm'; setDistUnit(u); setMeters(dist, u) }}
                  >
                    <option value="km">{m.training.routineEditor.unitKm}</option>
                    <option value="m">{m.training.routineEditor.unitM}</option>
                  </Select>
                </div>
              </div>
            </Field>
            <Field label={m.gym.time} hint={m.gym.seconds}>
              <NumField value={item.seconds} onChange={(v) => onPatch({ seconds: v })} />
            </Field>
          </>
        )}
        <Field label={m.gym.rest} hint={m.gym.seconds}>
          <NumField value={item.restSec} onChange={(v) => onPatch({ restSec: v ?? 0 })} />
        </Field>
      </div>
    </div>
  )
}
