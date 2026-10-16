import { useEffect, useState } from 'react'
import { WEEKDAY_SHORT } from '../lib/date'
import { useStore } from '../lib/store'
import type { Habit, HabitSchedule } from '../lib/types'
import { AreaPicker } from './AreaPicker'
import { EmojiInput } from './EmojiInput'
import { Button, cx, Input, Label, Modal, Segmented } from './ui'

type Draft = Pick<Habit, 'name' | 'emoji' | 'areaId' | 'schedule' | 'target' | 'unit'>
const blank: Draft = { name: '', emoji: '✨', areaId: null, schedule: { type: 'daily' }, target: 1, unit: '' }

export function HabitEditor({ open, onClose, habit }: { open: boolean; onClose: () => void; habit?: Habit }) {
  const add = useStore((s) => s.addHabit)
  const update = useStore((s) => s.updateHabit)
  const remove = useStore((s) => s.deleteHabit)
  const [d, setD] = useState<Draft>(blank)

  useEffect(() => { if (open) setD(habit ? { ...habit } : blank) }, [open, habit])
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  const save = () => {
    if (!d.name.trim()) return
    const clean = { ...d, name: d.name.trim(), target: Math.max(1, d.target || 1) }
    if (habit) update(habit.id, clean)
    else add(clean)
    onClose()
  }

  const s = d.schedule
  const setType = (t: HabitSchedule['type']) =>
    set('schedule', t === 'daily' ? { type: 'daily' } : t === 'days' ? { type: 'days', days: [0, 1, 2, 3, 4] } : { type: 'weekly', times: 3 })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={habit ? 'Edit habit' : 'New habit'}
      footer={
        <>
          {habit && (
            <Button variant="danger" className="mr-auto" onClick={() => { if (confirm(`Delete “${habit.name}” and all its history?`)) { remove(habit.id); onClose() } }}>
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!d.name.trim()}>{habit ? 'Save' : 'Create habit'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <EmojiInput value={d.emoji} onChange={(v) => set('emoji', v)} />
          <Input autoFocus placeholder="e.g. Revise Quran" value={d.name} onChange={(e) => set('name', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
        </div>
        <div>
          <Label>Area</Label>
          <AreaPicker value={d.areaId} onChange={(v) => set('areaId', v)} />
        </div>
        <div>
          <Label>How often</Label>
          <Segmented
            value={s.type}
            onChange={setType}
            options={[{ value: 'daily', label: 'Every day' }, { value: 'days', label: 'Specific days' }, { value: 'weekly', label: 'X times a week' }]}
          />
          {s.type === 'days' && (
            <div className="mt-3 flex gap-1.5">
              {WEEKDAY_SHORT.map((n, i) => {
                const on = s.days.includes(i)
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set('schedule', { type: 'days', days: on ? s.days.filter((x) => x !== i) : [...s.days, i] })}
                    className={cx('h-9 flex-1 rounded-lg text-xs font-semibold transition', on ? 'bg-gradient-accent text-accent-fg' : 'bg-surface-2 text-muted')}
                  >
                    {n}
                  </button>
                )
              })}
            </div>
          )}
          {s.type === 'weekly' && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Input type="number" min={1} max={7} value={s.times} onChange={(e) => set('schedule', { type: 'weekly', times: Math.min(7, Math.max(1, Number(e.target.value) || 1)) })} className="w-20" />
              times per week
            </div>
          )}
        </div>
        <div>
          <Label hint="leave 1 for a simple check-off">Daily target</Label>
          <div className="flex gap-2">
            <Input type="number" min={1} value={d.target} onChange={(e) => set('target', Number(e.target.value))} className="w-28" />
            <Input placeholder="unit (pages, min, juz…)" value={d.unit} onChange={(e) => set('unit', e.target.value)} />
          </div>
        </div>
      </div>
    </Modal>
  )
}
