import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { addDaysKey } from '../lib/date'
import { useToday } from '../lib/hooks'
import { uid } from '../lib/id'
import { useStore } from '../lib/store'
import type { Priority, Subtask, Task, TimeOfDay } from '../lib/types'
import { AreaPicker } from './AreaPicker'
import { Button, Input, Label, Modal, Segmented, Select, Textarea } from './ui'

type Draft = Pick<Task, 'title' | 'notes' | 'areaId' | 'goalId' | 'date' | 'timeOfDay' | 'priority' | 'estimateMin' | 'subtasks'>

const blank = (date: string | null): Draft => ({
  title: '', notes: '', areaId: null, goalId: null, date, timeOfDay: 'anytime', priority: 0, estimateMin: null, subtasks: [],
})

/** Create a task (no `task`) or edit one. */
export function TaskEditor({ open, onClose, task, defaults }: {
  open: boolean
  onClose: () => void
  task?: Task
  defaults?: Partial<Draft>
}) {
  const today = useToday()
  const goals = useStore((s) => s.goals)
  const addTask = useStore((s) => s.addTask)
  const updateTask = useStore((s) => s.updateTask)
  const [d, setD] = useState<Draft>(() => task ?? { ...blank(today), ...defaults })
  const [sub, setSub] = useState('')

  useEffect(() => {
    if (open) setD(task ? { ...task } : { ...blank(today), ...defaults })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  const save = () => {
    if (!d.title.trim()) return
    if (task) updateTask(task.id, { ...d, title: d.title.trim() })
    else addTask({ ...d, title: d.title.trim() })
    onClose()
  }

  const addSub = () => {
    if (!sub.trim()) return
    const s: Subtask = { id: uid(), title: sub.trim(), done: false }
    set('subtasks', [...d.subtasks, s])
    setSub('')
  }

  const activeGoals = goals.filter((g) => g.status === 'active' && (!d.areaId || g.areaId === d.areaId || g.id === d.goalId))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!d.title.trim()}>{task ? 'Save changes' : 'Add task'}</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save() }}>
        <Input autoFocus placeholder="What needs doing?" value={d.title} onChange={(e) => set('title', e.target.value)} className="h-12 text-base font-semibold" />

        <div>
          <Label>Area</Label>
          <AreaPicker value={d.areaId} onChange={(v) => set('areaId', v)} />
        </div>

        <div>
          <Label>When</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              value={d.date === today ? 'today' : d.date === addDaysKey(today, 1) ? 'tomorrow' : d.date === null ? 'inbox' : 'custom'}
              onChange={(v) => {
                if (v === 'today') set('date', today)
                else if (v === 'tomorrow') set('date', addDaysKey(today, 1))
                else if (v === 'inbox') set('date', null)
              }}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'tomorrow', label: 'Tomorrow' },
                { value: 'inbox', label: 'Inbox' },
                { value: 'custom', label: 'Date' },
              ]}
            />
            <Input type="date" value={d.date ?? ''} onChange={(e) => set('date', e.target.value || null)} className="w-auto" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Time of day</Label>
            <Segmented<TimeOfDay>
              value={d.timeOfDay}
              onChange={(v) => set('timeOfDay', v)}
              options={[
                { value: 'anytime', label: 'Any' },
                { value: 'morning', label: '🌅' },
                { value: 'afternoon', label: '☀️' },
                { value: 'evening', label: '🌙' },
              ]}
            />
          </div>
          <div>
            <Label>Priority</Label>
            <Segmented<Priority>
              value={d.priority}
              onChange={(v) => set('priority', v)}
              options={[
                { value: 0, label: 'None' },
                { value: 1, label: 'P1' },
                { value: 2, label: 'P2' },
                { value: 3, label: 'P3' },
              ]}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label hint="minutes">Estimate</Label>
            <Input type="number" min={0} placeholder="e.g. 30" value={d.estimateMin ?? ''} onChange={(e) => set('estimateMin', e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div>
            <Label>Moves a goal forward</Label>
            <Select value={d.goalId ?? ''} onChange={(e) => set('goalId', e.target.value || null)}>
              <option value="">No goal</option>
              {activeGoals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </Select>
          </div>
        </div>

        <div>
          <Label>Steps</Label>
          <div className="space-y-1.5">
            {d.subtasks.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg bg-surface-2/60 px-3 py-1.5 text-sm">
                <input type="checkbox" checked={s.done} onChange={() => set('subtasks', d.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))} className="accent-[var(--accent)]" />
                <span className={s.done ? 'flex-1 text-muted line-through' : 'flex-1'}>{s.title}</span>
                <button type="button" onClick={() => set('subtasks', d.subtasks.filter((x) => x.id !== s.id))} className="text-muted hover:text-danger"><X size={14} /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder="Add a step" value={sub} onChange={(e) => setSub(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub() } }} />
              <Button type="button" onClick={addSub}><Plus size={16} /></Button>
            </div>
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea placeholder="Anything worth remembering" value={d.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
