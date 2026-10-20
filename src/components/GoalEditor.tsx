import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/react'
import { useToday } from '../lib/hooks'
import { uid } from '../lib/id'
import { useStore } from '../lib/store'
import { metricFor } from '../lib/training'
import { GOAL_METRICS, type Goal, type GoalLink, type GoalMetric, type Milestone } from '../lib/types'
import { AreaPicker } from './AreaPicker'
import { useGymFormat } from './training/format'
import { Button, Input, Label, Modal, Segmented, Select, Textarea } from './ui'

type Draft = Pick<Goal, 'title' | 'why' | 'areaId' | 'kind' | 'startValue' | 'target' | 'unit' | 'startDate' | 'deadline' | 'milestones' | 'link'>

export function GoalEditor({ open, onClose, goal, defaults, onCreated }: {
  open: boolean
  onClose: () => void
  goal?: Goal
  defaults?: Partial<Draft>
  onCreated?: (id: string) => void
}) {
  const t = useI18n()
  const { m: msg } = t
  const today = useToday()
  const add = useStore((s) => s.addGoal)
  const update = useStore((s) => s.updateGoal)
  const exercises = useStore((s) => s.exercises)
  const fmt = useGymFormat()
  const blank: Draft = { title: '', why: '', areaId: null, kind: 'numeric', startValue: 0, target: 10, unit: '', startDate: today, deadline: null, milestones: [], link: null }
  const [d, setD] = useState<Draft>(blank)
  const [m, setM] = useState('')

  useEffect(() => { if (open) setD(goal ? { ...goal } : { ...blank, ...defaults }) /* eslint-disable-next-line */ }, [open, goal])
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  // Progress from Training (ADR-027): an exercise's best, or the number of workouts.
  const pickable = exercises.filter((e) => !e.archived || (d.link?.kind === 'exercise' && d.link.exerciseId === e.id))
  const setSource = (v: string) => {
    const first = pickable.find((e) => !e.archived)
    const link: GoalLink | null =
      v === 'workouts' ? { kind: 'workouts' }
        : v === 'exercise' && first ? { kind: 'exercise', exerciseId: first.id, metric: metricFor(first.measure) }
          : null
    setD((x) => ({ ...x, link, startValue: 0 }))
  }
  const metric = d.link?.kind === 'exercise' ? d.link.metric : null
  const shown = (v: number) => (metric ? Math.round(fmt.metricIn(metric, v) * 100) / 100 : v)
  const stored = (v: number) => (metric ? fmt.metricOut(metric, v) : v)

  const addMilestone = () => {
    if (!m.trim()) return
    const ms: Milestone = { id: uid(), title: m.trim(), done: false, doneAt: null }
    set('milestones', [...d.milestones, ms])
    setM('')
  }

  const valid = d.title.trim() && (d.kind === 'milestones' ? d.milestones.length > 0 : d.target > 0)
  const save = () => {
    if (!valid) return
    const link = d.kind === 'numeric' ? d.link : null
    const clean = { ...d, title: d.title.trim(), link, unit: link ? '' : d.unit }
    if (goal) update(goal.id, clean)
    else {
      // Create first, then notify: inside an optional call the argument is skipped when there is
      // no onCreated, so the Goals page used to create nothing (2026-10-19, sourceGuards.test.ts).
      const id = add(clean)
      onCreated?.(id)
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? msg.goals.editor.editTitle : msg.goals.editor.newTitle}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{msg.common.cancel}</Button>
          <Button variant="primary" onClick={save} disabled={!valid}>{goal ? msg.common.save : msg.goals.editor.create}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input autoFocus placeholder={msg.goals.editor.titlePlaceholder} value={d.title} onChange={(e) => set('title', e.target.value)} className="h-12 text-base font-semibold" />
        <div>
          <Label hint={msg.goals.editor.whyHint}>{msg.goals.editor.why}</Label>
          <Textarea placeholder={msg.goals.editor.whyPlaceholder} value={d.why} onChange={(e) => set('why', e.target.value)} className="min-h-16" />
        </div>
        <div>
          <Label>{msg.common.area}</Label>
          <AreaPicker value={d.areaId} onChange={(v) => set('areaId', v)} />
        </div>
        <div>
          <Label>{msg.goals.editor.measureBy}</Label>
          <Segmented value={d.kind} onChange={(v) => set('kind', v)} options={[{ value: 'numeric', label: msg.goals.editor.aNumber }, { value: 'milestones', label: msg.goals.editor.milestones }]} />
        </div>
        {d.kind === 'numeric' ? (
          <>
            <div>
              <Label>{msg.goals.editor.source}</Label>
              <Select value={d.link?.kind ?? 'checkins'} onChange={(e) => setSource(e.target.value)}>
                <option value="checkins">{msg.goals.editor.sourceCheckins}</option>
                <option value="exercise" disabled={!pickable.some((e) => !e.archived)}>{msg.goals.editor.sourceExercise}</option>
                <option value="workouts">{msg.goals.editor.sourceWorkouts}</option>
              </Select>
              {d.link?.kind === 'exercise' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Select
                    aria-label={msg.goals.editor.exercise}
                    value={d.link.exerciseId}
                    onChange={(e) => {
                      const ex = exercises.find((x) => x.id === e.target.value)
                      if (ex) set('link', { kind: 'exercise', exerciseId: ex.id, metric: metricFor(ex.measure) })
                    }}
                  >
                    {pickable.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </Select>
                  <Select aria-label={msg.goals.editor.metric} value={d.link.metric} onChange={(e) => d.link?.kind === 'exercise' && set('link', { ...d.link, metric: e.target.value as GoalMetric })}>
                    {GOAL_METRICS.map((x) => <option key={x} value={x}>{msg.goals.editor.metrics[x]}</option>)}
                  </Select>
                </div>
              )}
              {d.link && <p className="mt-1.5 text-xs text-muted">{d.link.kind === 'exercise' ? msg.goals.editor.exerciseHint : msg.goals.editor.workoutsHint}</p>}
            </div>
            <div className={d.link ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-3 gap-2'}>
              <div>
                <Label>{d.link?.kind === 'exercise' ? msg.goals.editor.bestBefore : msg.goals.editor.alreadyDone}</Label>
                <Input type="number" min={0} inputMode="decimal" value={shown(d.startValue)} onChange={(e) => set('startValue', stored(Number(e.target.value)))} />
              </div>
              <div>
                <Label>{metric ? t.f(msg.goals.editor.targetIn, { unit: fmt.metricUnit(metric) }) : msg.goals.editor.target}</Label>
                <Input type="number" min={1} inputMode="decimal" value={shown(d.target)} onChange={(e) => set('target', stored(Number(e.target.value)))} />
              </div>
              {!d.link && <div><Label>{msg.goals.editor.unit}</Label><Input placeholder={msg.goals.editor.unitPlaceholder} value={d.unit} onChange={(e) => set('unit', e.target.value)} /></div>}
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            {d.milestones.map((x, i) => (
              <div key={x.id} className="flex items-center gap-2 rounded-lg bg-surface-2/60 px-3 py-1.5 text-sm">
                <span className="text-xs font-bold text-muted">{i + 1}</span>
                <input className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm" value={x.title} onChange={(e) => set('milestones', d.milestones.map((y) => (y.id === x.id ? { ...y, title: e.target.value } : y)))} />
                <button type="button" aria-label={msg.common.remove} onClick={() => set('milestones', d.milestones.filter((y) => y.id !== x.id))} className="text-muted hover:text-danger"><X size={14} /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder={msg.goals.editor.addMilestone} value={m} onChange={(e) => setM(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMilestone() } }} />
              <Button type="button" aria-label={msg.goals.editor.addMilestone} onClick={addMilestone}><Plus size={16} /></Button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div><Label>{msg.goals.editor.start}</Label><Input type="date" value={d.startDate} onChange={(e) => set('startDate', e.target.value || today)} /></div>
          <div><Label hint={msg.common.optional}>{msg.goals.editor.deadline}</Label><Input type="date" value={d.deadline ?? ''} onChange={(e) => set('deadline', e.target.value || null)} /></div>
        </div>
      </div>
    </Modal>
  )
}
