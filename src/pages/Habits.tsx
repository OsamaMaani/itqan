import { Check, Flame, Pencil, Plus, Trophy } from 'lucide-react'
import { useState } from 'react'
import { HabitEditor } from '../components/HabitEditor'
import { Heatmap } from '../components/Heatmap'
import { AreaChip, Button, Card, cx, EmptyState, IconButton, PageHeader } from '../components/ui'
import { useI18n } from '../i18n/react'
import { celebrate } from '../lib/celebrate'
import { addDaysKey } from '../lib/date'
import { amountOn, completionRate, isMetOn, isScheduled, scheduleLabel, streak } from '../lib/habits'
import { areaHex, useAreaMap, useData, useToday } from '../lib/hooks'
import { useStore } from '../lib/store'
import type { Habit } from '../lib/types'

export function HabitsPage() {
  const { m } = useI18n()
  const d = useData()
  const [creating, setCreating] = useState(false)
  const habits = d.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order)

  return (
    <div>
      <PageHeader
        title={m.nav.habits}
        subtitle={m.habits.subtitle}
        right={<Button variant="primary" onClick={() => setCreating(true)}><Plus size={16} /> {m.habits.newHabit}</Button>}
      />
      {habits.length === 0 ? (
        <EmptyState emoji="🌱" title={m.habits.emptyTitle}>{m.habits.emptyBody}</EmptyState>
      ) : (
        <div className="space-y-4">{habits.map((h) => <HabitRow key={h.id} habit={h} />)}</div>
      )}
      <HabitEditor open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

function HabitRow({ habit }: { habit: Habit }) {
  const t = useI18n()
  const { m } = t
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
            <IconButton label={m.habits.editHabit} onClick={() => setEditing(true)}><Pencil size={14} /></IconButton>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <AreaChip area={area} />
            <span>{scheduleLabel(habit, t)}</span>
            {(target > 1 || habit.unit) && <span>· {t.f(m.habits.targetPerDay, { target, unit: habit.unit })}</span>}
          </div>
        </div>
        <div className="flex w-full justify-around gap-5 border-t border-border pt-3 text-center sm:w-auto sm:justify-start sm:border-0 sm:pt-0">
          <Stat icon={<Flame size={14} fill="currentColor" />} value={t.n(st.current)} label={st.unit === 'week' ? m.habits.weekStreak : m.habits.dayStreak} className="text-gold" />
          <Stat icon={<Trophy size={14} />} value={t.n(st.best)} label={m.habits.best} className="text-accent" />
          <Stat value={t.pct(rate30)} label={m.habits.last30} />
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
                title={t.f(amt ? m.habits.dayTipAmount : m.habits.dayTip, { date: t.d(k, 'weekdayShort'), amount: amt, unit: habit.unit })}
                className={cx('flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold transition hover:scale-105 sm:w-11 sm:flex-none', !sched && 'opacity-40', k === today && 'ring-2 ring-accent/40')}
                style={met ? { background: hex, color: 'white' } : { background: 'var(--surface-2)', color: 'var(--muted)' }}
              >
                {t.d(k, 'weekdayName')}
                <span className="grid size-5 place-items-center">{met ? <Check size={15} strokeWidth={3} /> : <span className="text-xs">{t.d(k, 'day')}</span>}</span>
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
            label={(k) => t.f(m.habits.heatTip, { date: t.d(k, 'weekdayShort'), amount: amountOn(logs, habit.id, k), unit: habit.unit })}
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

