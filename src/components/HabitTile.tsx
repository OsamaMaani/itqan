import { motion } from 'motion/react'
import { Flame, Minus, Plus } from 'lucide-react'
import { celebrate } from '../lib/celebrate'
import { amountOn, metDaysInWeek, streak } from '../lib/habits'
import { areaHex, useAreaMap } from '../lib/hooks'
import { useStore } from '../lib/store'
import type { DateKey, Habit } from '../lib/types'
import { cx, ProgressRing } from './ui'

export function HabitTile({ habit, day, onChanged }: { habit: Habit; day: DateKey; onChanged?: () => void }) {
  const logs = useStore((s) => s.habitLogs)
  const weekStartsOn = useStore((s) => s.settings.weekStartsOn)
  const setAmount = useStore((s) => s.setHabitAmount)
  const areas = useAreaMap()
  const color = areaHex(habit.areaId ? areas.get(habit.areaId) : null)

  const amount = amountOn(logs, habit.id, day)
  const target = Math.max(1, habit.target)
  const met = amount >= target
  const st = streak(habit, logs, day, weekStartsOn)
  const step = target >= 10 ? 5 : 1
  const weekly = habit.schedule.type === 'weekly' ? habit.schedule.times : 0
  const weekMet = weekly ? metDaysInWeek(habit, logs, day, weekStartsOn) : 0

  const change = (next: number) => {
    const wasMet = met
    setAmount(habit.id, day, Math.max(0, next))
    if (!wasMet && next >= target) celebrate.tick()
    onChanged?.()
  }

  return (
    <motion.div
      layout
      whileTap={{ scale: 0.97 }}
      onClick={() => change(met ? 0 : target)}
      className={cx(
        'group relative flex cursor-pointer select-none items-center gap-3 overflow-hidden rounded-2xl border p-3 transition',
        met ? 'border-transparent' : 'border-border bg-surface/80 hover:border-text/20',
      )}
      style={met ? { background: `linear-gradient(135deg, ${color}26, ${color}0d)` } : undefined}
    >
      <ProgressRing value={amount / target} size={46} stroke={5} color={color}>
        <span className="text-lg">{habit.emoji}</span>
      </ProgressRing>
      <div className="min-w-0 flex-1">
        <div className={cx('truncate text-sm font-semibold', met && 'opacity-80')}>{habit.name}</div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
          {target > 1 || habit.unit ? <span className="tabular">{amount}/{target} {habit.unit}</span> : <span>{met ? 'Done' : 'Tap to complete'}</span>}
          {weekly > 0 && <span className="tabular">· {weekMet}/{weekly} this week</span>}
        </div>
      </div>
      {st.current > 0 && (
        <div className="flex items-center gap-0.5 text-xs font-bold text-gold" title={`${st.current}-${st.unit} streak`}>
          <Flame size={14} fill="currentColor" />
          {st.current}
        </div>
      )}
      {target > 1 && (
        <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
          <button aria-label="Add" onClick={() => change(amount + step)} className="grid size-6 place-items-center rounded-md bg-surface-2 text-muted hover:text-text"><Plus size={12} /></button>
          <button aria-label="Remove" onClick={() => change(amount - step)} className="grid size-6 place-items-center rounded-md bg-surface-2 text-muted hover:text-text"><Minus size={12} /></button>
        </div>
      )}
    </motion.div>
  )
}
