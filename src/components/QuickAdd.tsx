import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, CornerDownLeft, Flag, Plus, Timer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { prettyDay } from '../lib/date'
import { useToday } from '../lib/hooks'
import { parseQuickAdd } from '../lib/quickAdd'
import { useStore } from '../lib/store'
import type { DateKey } from '../lib/types'
import { AreaChip, cx } from './ui'

/** One-line task entry with live parsing: "#area !2 tomorrow @evening ~30m". */
export function QuickAdd({ defaultDate, placeholder, autoFocus, onAdded, className }: {
  defaultDate: DateKey | null
  placeholder?: string
  autoFocus?: boolean
  onAdded?: () => void
  className?: string
}) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const today = useToday()
  const areas = useStore((s) => s.areas)
  const weekStartsOn = useStore((s) => s.settings.weekStartsOn)
  const addTask = useStore((s) => s.addTask)

  const p = useMemo(() => parseQuickAdd(text, areas, today, weekStartsOn), [text, areas, today, weekStartsOn])
  const date = p.date === undefined ? defaultDate : p.date
  const area = areas.find((a) => a.id === p.areaId)

  const submit = () => {
    if (!p.title) return
    addTask({ title: p.title, areaId: p.areaId, priority: p.priority, timeOfDay: p.timeOfDay, estimateMin: p.estimateMin, date })
    setText('')
    onAdded?.()
  }

  const showChips = text.trim().length > 0

  return (
    <div className={cx('rounded-2xl border bg-surface/80 transition', focused ? 'border-accent ring-4 ring-accent-soft' : 'border-border', className)}>
      <div className="flex items-center gap-3 px-3">
        <Plus size={18} className={focused ? 'text-accent' : 'text-muted'} />
        <input
          autoFocus={autoFocus}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') (e.target as HTMLInputElement).blur() }}
          placeholder={placeholder ?? 'Add a task…  try “Read 20 pages #books tomorrow !2”'}
          className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted/70"
        />
        {showChips && (
          <button onClick={submit} className="hidden items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-semibold text-muted sm:flex">
            <CornerDownLeft size={12} /> Add
          </button>
        )}
      </div>
      <AnimatePresence>
        {showChips && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2 text-[11px] font-semibold text-muted">
              <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{date ? prettyDay(date, today) : 'Inbox'}</span>
              {area && <AreaChip area={area} />}
              {p.priority > 0 && <span className="inline-flex items-center gap-1"><Flag size={12} />P{p.priority}</span>}
              {p.timeOfDay !== 'anytime' && <span className="capitalize">{p.timeOfDay}</span>}
              {p.estimateMin && <span className="inline-flex items-center gap-1"><Timer size={12} />{p.estimateMin}m</span>}
              <span className="ml-auto hidden font-normal opacity-70 md:inline">#area · !1–3 · today/tomorrow/friday · @morning · ~30m</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
