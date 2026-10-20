import { useState } from 'react'
import { useI18n } from '../../i18n/react'
import { DEFAULT_INCREMENT } from '../../lib/trainingStarter'
import { useStore } from '../../lib/store'
import { toast } from '../../lib/toast'
import { EQUIPMENT, MEASURES, MUSCLES, type Equipment, type Exercise, type ID, type Measure, type Muscle } from '../../lib/types'
import { Button, Input, Label, Modal, Select, Textarea } from '../ui'
import { useGymFormat } from './format'
import { NumField } from './NumField'

interface Draft {
  name: string
  equipment: Equipment
  measure: Measure
  muscle: Muscle | null
  incrementKg: number
  notes: string
}

const draftOf = (e: Exercise): Draft => ({ name: e.name, equipment: e.equipment, measure: e.measure, muscle: e.muscle, incrementKg: e.incrementKg, notes: e.notes })

const blank: Draft = { name: '', equipment: 'barbell', measure: 'weight', muscle: null, incrementKg: DEFAULT_INCREMENT.barbell, notes: '' }

/** Create or edit an exercise. `onCreated` hears the new id after it is saved. */
export function ExerciseEditor({ open, onClose, exercise, onCreated }: {
  open: boolean
  onClose: () => void
  exercise?: Exercise
  onCreated?: (id: ID) => void
}) {
  // Mounted only while open, so the form always starts from the exercise it was opened for.
  return open ? <ExerciseForm onClose={onClose} exercise={exercise} onCreated={onCreated} /> : null
}

function ExerciseForm({ onClose, exercise, onCreated }: { onClose: () => void; exercise?: Exercise; onCreated?: (id: ID) => void }) {
  const t = useI18n()
  const { m } = t
  const fmt = useGymFormat()
  const add = useStore((s) => s.addExercise)
  const update = useStore((s) => s.updateExercise)
  const remove = useStore((s) => s.deleteExercise)
  const [d, setD] = useState<Draft>(() => (exercise ? draftOf(exercise) : blank))
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  const save = () => {
    const name = d.name.trim()
    if (!name) return
    const clean = { ...d, name, incrementKg: Math.max(0, d.incrementKg) }
    if (exercise) update(exercise.id, clean)
    else {
      const id = add(clean)
      onCreated?.(id)
    }
    onClose()
  }

  const onDelete = () => {
    if (!exercise) return
    if (!confirm(t.f(m.training.exerciseEditor.deleteConfirm, { name: exercise.name }))) return
    const result = remove(exercise.id)
    toast({ emoji: result === 'archived' ? '📦' : '🗑️', message: t.f(result === 'archived' ? m.training.exerciseEditor.archivedToast : m.training.exerciseEditor.deletedToast, { name: exercise.name }) })
    onClose()
  }

  const setEquipment = (equipment: Equipment) =>
    // A new exercise starts from the usual step for its equipment; an existing one keeps its own.
    setD((x) => ({ ...x, equipment, incrementKg: exercise ? x.incrementKg : DEFAULT_INCREMENT[equipment] }))

  return (
    <Modal
      open
      onClose={onClose}
      title={exercise ? m.training.exerciseEditor.editTitle : m.training.exerciseEditor.newTitle}
      footer={
        <>
          {exercise && <Button variant="danger" className="me-auto" onClick={onDelete}>{m.common.delete}</Button>}
          <Button variant="ghost" onClick={onClose}>{m.common.cancel}</Button>
          <Button variant="primary" onClick={save} disabled={!d.name.trim()}>{exercise ? m.common.save : m.common.create}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>{m.training.exerciseEditor.name}</Label>
          <Input autoFocus placeholder={m.training.exerciseEditor.namePlaceholder} value={d.name} onChange={(e) => set('name', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{m.training.exerciseEditor.equipment}</Label>
            <Select value={d.equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
              {EQUIPMENT.map((x) => <option key={x} value={x}>{m.gym.equipment[x]}</option>)}
            </Select>
          </div>
          <div>
            <Label>{m.training.exerciseEditor.muscle}</Label>
            <Select value={d.muscle ?? ''} onChange={(e) => set('muscle', (e.target.value || null) as Muscle | null)}>
              <option value="">{m.training.exerciseEditor.noMuscle}</option>
              {MUSCLES.map((x) => <option key={x} value={x}>{m.gym.muscle[x]}</option>)}
            </Select>
          </div>
        </div>
        <div>
          <Label>{m.training.exerciseEditor.measure}</Label>
          <Select value={d.measure} onChange={(e) => set('measure', e.target.value as Measure)}>
            {MEASURES.map((x) => <option key={x} value={x}>{m.gym.measure[x]}</option>)}
          </Select>
          <p className="mt-1.5 text-xs text-muted">{m.gym.measureHint[d.measure]}</p>
        </div>
        {d.measure === 'weight' && (
          <div>
            <Label hint={fmt.unitLabel}>{m.training.exerciseEditor.step}</Label>
            <NumField
              key={exercise ? 'step' : d.equipment}
              decimal
              className="w-28"
              value={fmt.toUnit(d.incrementKg)}
              onChange={(v) => set('incrementKg', fmt.fromUnit(v ?? 0))}
            />
            <p className="mt-1.5 text-xs text-muted">{m.training.exerciseEditor.stepHint}</p>
          </div>
        )}
        <div>
          <Label>{m.common.notes}</Label>
          <Textarea placeholder={m.training.exerciseEditor.notesPlaceholder} value={d.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
