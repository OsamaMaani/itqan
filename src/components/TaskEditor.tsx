import { Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/react'
import { addDaysKey } from '../lib/date'
import { useToday } from '../lib/hooks'
import { uid } from '../lib/id'
import { useStore } from '../lib/store'
import type { Priority, Subtask, Task, TaskStage, TimeOfDay } from '../lib/types'
import { AreaPicker } from './AreaPicker'
import { Button, cx, Input, Label, Modal, Segmented, Select, Textarea } from './ui'

type Draft = Pick<Task, 'title' | 'notes' | 'areaId' | 'goalId' | 'projectId' | 'date' | 'timeOfDay' | 'priority' | 'estimateMin' | 'subtasks' | 'stage' | 'blocked'>

const blank = (date: string | null): Draft => ({
  title: '', notes: '', areaId: null, goalId: null, projectId: null, stage: 'todo', blocked: false, date, timeOfDay: 'anytime', priority: 0, estimateMin: null, subtasks: [],
})

/** Create a task (no `task`) or edit one. */
export function TaskEditor({ open, onClose, task, defaults }: {
  open: boolean
  onClose: () => void
  task?: Task
  defaults?: Partial<Draft>
}) {
  const t = useI18n()
  const { m } = t
  const today = useToday()
  const goals = useStore((s) => s.goals)
  const projects = useStore((s) => s.projects)
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
      title={task ? m.tasks.editor.editTitle : m.tasks.editor.newTitle}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{m.common.cancel}</Button>
          <Button variant="primary" onClick={save} disabled={!d.title.trim()}>{task ? m.tasks.editor.saveChanges : m.tasks.editor.addTask}</Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save() }}>
        <Input autoFocus placeholder={m.tasks.editor.titlePlaceholder} value={d.title} onChange={(e) => set('title', e.target.value)} className="h-12 text-base font-semibold" />

        <div>
          <Label>{m.common.area}</Label>
          <AreaPicker value={d.areaId} onChange={(v) => set('areaId', v)} />
        </div>

        <div>
          <Label>{m.tasks.editor.when}</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              value={d.date === today ? 'today' : d.date === addDaysKey(today, 1) ? 'tomorrow' : d.date === null ? 'inbox' : 'custom'}
              onChange={(v) => {
                if (v === 'today') set('date', today)
                else if (v === 'tomorrow') set('date', addDaysKey(today, 1))
                else if (v === 'inbox') set('date', null)
              }}
              options={[
                { value: 'today', label: m.time.today },
                { value: 'tomorrow', label: m.time.tomorrow },
                { value: 'inbox', label: m.tasks.inbox },
                { value: 'custom', label: m.common.date },
              ]}
            />
            <Input type="date" value={d.date ?? ''} onChange={(e) => set('date', e.target.value || null)} className="w-auto" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{m.tasks.editor.timeOfDay}</Label>
            <Segmented<TimeOfDay>
              value={d.timeOfDay}
              onChange={(v) => set('timeOfDay', v)}
              options={[
                { value: 'anytime', label: m.tasks.editor.anyTime },
                { value: 'morning', label: '🌅' },
                { value: 'afternoon', label: '☀️' },
                { value: 'evening', label: '🌙' },
              ]}
            />
          </div>
          <div>
            <Label>{m.tasks.editor.priority}</Label>
            <Segmented<Priority>
              value={d.priority}
              onChange={(v) => set('priority', v)}
              options={[
                { value: 0, label: m.common.none },
                { value: 1, label: t.f(m.tasks.priority, { n: 1 }) },
                { value: 2, label: t.f(m.tasks.priority, { n: 2 }) },
                { value: 3, label: t.f(m.tasks.priority, { n: 3 }) },
              ]}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label hint={m.tasks.editor.minutesHint}>{m.tasks.editor.estimate}</Label>
            <Input type="number" min={0} placeholder={m.tasks.editor.estimatePlaceholder} value={d.estimateMin ?? ''} onChange={(e) => set('estimateMin', e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div>
            <Label>{m.tasks.editor.goal}</Label>
            <Select value={d.goalId ?? ''} onChange={(e) => set('goalId', e.target.value || null)}>
              <option value="">{m.common.noGoal}</option>
              {activeGoals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </Select>
          </div>
        </div>

        {projects.length > 0 && (
          <div>
            <Label>{m.common.project}</Label>
            <Select value={d.projectId ?? ''} onChange={(e) => set('projectId', e.target.value || null)}>
              <option value="">{m.common.noProject}</option>
              {projects.filter((p) => p.status !== 'archived' || p.id === d.projectId).map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.title}</option>)}
            </Select>
          </div>
        )}

        {!task?.done && (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label>{m.common.status}</Label>
              <Segmented<TaskStage> value={d.stage} onChange={(v) => set('stage', v)} options={[{ value: 'todo', label: m.tasks.editor.todo }, { value: 'doing', label: m.tasks.doing }]} />
            </div>
            <label className={cx('flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition', d.blocked ? 'bg-danger/10 text-danger' : 'bg-surface-2 text-muted')}>
              <input type="checkbox" checked={d.blocked} onChange={(e) => set('blocked', e.target.checked)} className="accent-[var(--danger)]" />
              {m.tasks.blocked}
            </label>
          </div>
        )}

        <div>
          <Label>{m.tasks.editor.steps}</Label>
          <div className="space-y-1.5">
            {d.subtasks.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg bg-surface-2/60 px-3 py-1.5 text-sm">
                <input type="checkbox" checked={s.done} onChange={() => set('subtasks', d.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))} className="accent-[var(--accent)]" />
                <span className={s.done ? 'flex-1 text-muted line-through' : 'flex-1'}>{s.title}</span>
                <button type="button" onClick={() => set('subtasks', d.subtasks.filter((x) => x.id !== s.id))} aria-label={m.common.remove} title={m.common.remove} className="text-muted hover:text-danger"><X size={14} /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder={m.tasks.editor.addStep} value={sub} onChange={(e) => setSub(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub() } }} />
              <Button type="button" onClick={addSub} aria-label={m.common.add} title={m.common.add}><Plus size={16} /></Button>
            </div>
          </div>
        </div>

        <div>
          <Label>{m.common.notes}</Label>
          <Textarea placeholder={m.tasks.editor.notesPlaceholder} value={d.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
