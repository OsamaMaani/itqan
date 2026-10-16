import { format } from 'date-fns'
import { Check, Flame, Pencil, Plus, Trophy } from 'lucide-react'
import { useState } from 'react'
import { HabitEditor } from '../components/HabitEditor'
import { Heatmap } from '../components/Heatmap'
import { AreaChip, Button, Card, cx, EmptyState, IconButton, PageHeader } from '../components/ui'
import { celebrate } from '../lib/celebrate'
import { addDaysKey, fromKey } from '../lib/date'
import { amountOn, completionRate, isMetOn, isScheduled, scheduleLabel, streak } from '../lib/habits'
import { areaHex, useAreaMap, useData, useToday } from '../lib/hooks'
import { useStore } from '../lib/store'
import type { Habit } from '../lib/types'

export function HabitsPage() {
  const d = useData()
  const [creating, setCreating] = useState(false)
  const habits = d.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order)

  return (
    <div>
      <PageHeader
        title="Habits"
        subtitle="Small, consistent actions. Tap any day to check it off — you can fill in days you forgot."
        right={<Button variant="primary" onClick={() => setCreating(true)}><Plus size={16} /> New habit</Button>}
      />
      {habits.length === 0 ? (
        <EmptyState emoji="🌱" title="No habits yet">Start with one you can do even on a bad day — 5 minutes of French, 1 page of Quran.</EmptyState>
      ) : (
        <div className="space-y-4">{habits.map((h) => <HabitRow key={h.id} habit={h} />)}</div>
      )}
      <HabitEditor open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

function HabitRow({ habit }: { habit: Habit }) {
  const today = useToday()
  const logs = useStore((s) => s.habitLogs)
  const weekStartsOn = useStore((s) => s.settings.weekStartsOn)
  const setAmount = useStore((s) => s.setHabitAmount)
  const areas = useAreaMap()
  const [editing, setEditing] = useState(false)

  const area = habit.areaId ? areas.get(habit.areaId) : undefined
  const hex = areaHex(area)
  const st = streak(habit, logs, today, weekStartsOn)
  const rate30 = completionRate(habit, logs, addDaysKey(today, -29), today, today, weekStartsOn)
  const last7 = Array.from({ length: 7 }, (_, i) => addDaysKey(today, i - 6))
  const target = Math.max(1, habit.target)

  const toggle = (day: string) => {
    const met = isMetOn(habit, logs, day)
    setAmount(habit.id, day, met ? 0 : target)
    if (!met) celebrate.tick()
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid size-12 place-items-center rounded-2xl text-2xl" style={{ background: `${hex}1f` }}>{habit.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-bold">{habit.name}</h3>
            <IconButton label="Edit habit" onClick={() => setEditing(true)}><Pencil size={14} /></IconButton>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <AreaChip area={area} />
            <span>{scheduleLabel(habit)}</span>
            {(target > 1 || habit.unit) && <span>· {target} {habit.unit}/day</span>}
          </div>
        </div>
        <div className="flex gap-5 text-center">
          <Stat icon={<Flame size={14} fill="currentColor" />} value={st.current} label={`${st.unit} streak`} className="text-gold" />
          <Stat icon={<Trophy size={14} />} value={st.best} label="best" className="text-accent" />
          <Stat value={`${Math.round(rate30 * 100)}%`} label="30 days" />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[auto_1fr] lg:items-end">
        <div className="flex gap-1.5">
          {last7.map((k) => {
            const met = isMetOn(habit, logs, k)
            const sched = isScheduled(habit, k)
            const amt = amountOn(logs, habit.id, k)
            return (
              <button
                key={k}
                onClick={() => toggle(k)}
                title={`${format(fromKey(k), 'EEE, MMM d')}${amt ? ` — ${amt} ${habit.unit}` : ''}`}
                className={cx('flex w-11 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold transition hover:scale-105', !sched && 'opacity-40', k === today && 'ring-2 ring-accent/40')}
                style={met ? { background: hex, color: 'white' } : { background: 'var(--surface-2)', color: 'var(--muted)' }}
              >
                {format(fromKey(k), 'EEE')}
                <span className="grid size-5 place-items-center">{met ? <Check size={15} strokeWidth={3} /> : <span className="text-xs">{format(fromKey(k), 'd')}</span>}</span>
              </button>
            )
          })}
        </div>
        <div className="min-w-0 lg:justify-self-end">
          <Heatmap
            end={today}
            weeks={20}
            weekStartsOn={weekStartsOn}
            color={hex}
            value={(k) => (isScheduled(habit, k) || habit.schedule.type === 'weekly' ? Math.min(1, amountOn(logs, habit.id, k) / target) : null)}
            label={(k) => `${format(fromKey(k), 'EEE, MMM d')}: ${amountOn(logs, habit.id, k)} ${habit.unit}`}
          />
        </div>
      </div>
      <HabitEditor open={editing} onClose={() => setEditing(false)} habit={habit} />
    </Card>
  )
}

function Stat({ icon, value, label, className }: { icon?: React.ReactNode; value: React.ReactNode; label: string; className?: string }) {
  return (
    <div>
      <div className={cx('flex items-center justify-center gap-1 text-xl font-extrabold tabular', className)}>{icon}{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</div>
    </div>
  )
}

