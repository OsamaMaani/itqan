import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToday } from '../lib/hooks'
import { uid } from '../lib/id'
import { useStore } from '../lib/store'
import type { Goal, Milestone } from '../lib/types'
import { AreaPicker } from './AreaPicker'
import { Button, Input, Label, Modal, Segmented, Textarea } from './ui'

type Draft = Pick<Goal, 'title' | 'why' | 'areaId' | 'kind' | 'startValue' | 'target' | 'unit' | 'startDate' | 'deadline' | 'milestones'>

export function GoalEditor({ open, onClose, goal, defaults, onCreated }: {
  open: boolean
  onClose: () => void
  goal?: Goal
  defaults?: Partial<Draft>
  onCreated?: (id: string) => void
}) {
  const today = useToday()
  const add = useStore((s) => s.addGoal)
  const update = useStore((s) => s.updateGoal)
  const blank: Draft = { title: '', why: '', areaId: null, kind: 'numeric', startValue: 0, target: 10, unit: '', startDate: today, deadline: null, milestones: [] }
  const [d, setD] = useState<Draft>(blank)
  const [m, setM] = useState('')

  useEffect(() => { if (open) setD(goal ? { ...goal } : { ...blank, ...defaults }) /* eslint-disable-next-line */ }, [open, goal])
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  const addMilestone = () => {
    if (!m.trim()) return
    const ms: Milestone = { id: uid(), title: m.trim(), done: false, doneAt: null }
    set('milestones', [...d.milestones, ms])
    setM('')
  }

  const valid = d.title.trim() && (d.kind === 'milestones' ? d.milestones.length > 0 : d.target > 0)
  const save = () => {
    if (!valid) return
    if (goal) update(goal.id, { ...d, title: d.title.trim() })
    else onCreated?.(add({ ...d, title: d.title.trim() }))
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? 'Edit goal' : 'New goal'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!valid}>{goal ? 'Save' : 'Create goal'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input autoFocus placeholder="e.g. Finish “Atomic Habits”" value={d.title} onChange={(e) => set('title', e.target.value)} className="h-12 text-base font-semibold" />
        <div>
          <Label hint="you will see this when motivation dips">Why it matters</Label>
          <Textarea placeholder="Because…" value={d.why} onChange={(e) => set('why', e.target.value)} className="min-h-16" />
        </div>
        <div>
          <Label>Area</Label>
          <AreaPicker value={d.areaId} onChange={(v) => set('areaId', v)} />
        </div>
        <div>
          <Label>Measure progress by</Label>
          <Segmented value={d.kind} onChange={(v) => set('kind', v)} options={[{ value: 'numeric', label: 'A number' }, { value: 'milestones', label: 'Milestones' }]} />
        </div>
        {d.kind === 'numeric' ? (
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Already done</Label><Input type="number" min={0} value={d.startValue} onChange={(e) => set('startValue', Number(e.target.value))} /></div>
            <div><Label>Target</Label><Input type="number" min={1} value={d.target} onChange={(e) => set('target', Number(e.target.value))} /></div>
            <div><Label>Unit</Label><Input placeholder="pages" value={d.unit} onChange={(e) => set('unit', e.target.value)} /></div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {d.milestones.map((x, i) => (
              <div key={x.id} className="flex items-center gap-2 rounded-lg bg-surface-2/60 px-3 py-1.5 text-sm">
                <span className="text-xs font-bold text-muted">{i + 1}</span>
                <input className="flex-1 bg-transparent outline-none" value={x.title} onChange={(e) => set('milestones', d.milestones.map((y) => (y.id === x.id ? { ...y, title: e.target.value } : y)))} />
                <button type="button" onClick={() => set('milestones', d.milestones.filter((y) => y.id !== x.id))} className="text-muted hover:text-danger"><X size={14} /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder="Add a milestone" value={m} onChange={(e) => setM(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMilestone() } }} />
              <Button type="button" onClick={addMilestone}><Plus size={16} /></Button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div><Label>Start</Label><Input type="date" value={d.startDate} onChange={(e) => set('startDate', e.target.value || today)} /></div>
          <div><Label hint="optional">Deadline</Label><Input type="date" value={d.deadline ?? ''} onChange={(e) => set('deadline', e.target.value || null)} /></div>
        </div>
      </div>
    </Modal>
  )
}
