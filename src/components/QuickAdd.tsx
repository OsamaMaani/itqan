import { AnimatePresence, motion } from 'motion/react'
import { CalendarDays, CornerDownLeft, Flag, Plus, Timer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { quickAddWords } from '../i18n/quickAddWords'
import { useI18n } from '../i18n/react'
import { prettyDay } from '../lib/date'
import { useToday } from '../lib/hooks'
import { parseQuickAdd, quickAddExamples } from '../lib/quickAdd'
import { useStore } from '../lib/store'
import type { DateKey, TaskStage } from '../lib/types'
import { AreaChip, cx } from './ui'

/** One-line task entry with live parsing: "#area !2 tomorrow @evening ~30m". */
export function QuickAdd({ defaultDate, defaultProjectId, defaultAreaId, defaultStage, placeholder, autoFocus, onAdded, className }: {
  defaultDate: DateKey | null
  defaultStage?: TaskStage
  defaultProjectId?: string | null
  defaultAreaId?: string | null
  placeholder?: string
  autoFocus?: boolean
  onAdded?: () => void
  className?: string
}) {
  const t = useI18n()
  const { m } = t
  const words = quickAddWords(t.lang)
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const today = useToday()
  const areas = useStore((s) => s.areas)
  const projects = useStore((s) => s.projects)
  const weekStartsOn = useStore((s) => s.settings.weekStartsOn)
  const addTask = useStore((s) => s.addTask)

  const p = useMemo(() => parseQuickAdd(text, areas, today, weekStartsOn, projects, words), [text, areas, today, weekStartsOn, projects, words])
  const date = p.date === undefined ? defaultDate : p.date
  const areaId = p.areaId ?? defaultAreaId ?? null
  const projectId = p.projectId ?? defaultProjectId ?? null
  const area = areas.find((a) => a.id === areaId)
  const project = projects.find((x) => x.id === projectId)

  const submit = () => {
    if (!p.title) return
    addTask({ title: p.title, areaId, projectId, priority: p.priority, timeOfDay: p.timeOfDay, estimateMin: p.estimateMin, date, stage: defaultStage ?? 'todo' })
    setText('')
    onAdded?.()
  }

  const ex = quickAddExamples(words)
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
          placeholder={placeholder ?? t.f(m.quickAdd.placeholder, { example: m.quickAdd.example })}
          className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none sm:text-[15px] placeholder:text-muted/70"
        />
        {showChips && (
          <button onClick={submit} className="hidden items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-semibold text-muted sm:flex">
            <CornerDownLeft size={12} className="rtl:-scale-x-100" /> {m.common.add}
          </button>
        )}
      </div>
      <AnimatePresence>
        {showChips && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2 text-[11px] font-semibold text-muted">
              <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{date ? prettyDay(date, today, t) : m.tasks.inbox}</span>
              {area && <AreaChip area={area} />}
              {project && !defaultProjectId && <span className="inline-flex items-center gap-1">{project.emoji} {project.title}</span>}
              {p.priority > 0 && <span className="inline-flex items-center gap-1"><Flag size={12} />{t.f(m.tasks.priority, { n: p.priority })}</span>}
              {p.timeOfDay !== 'anytime' && <span>{m.tasks.timeOfDay[p.timeOfDay]}</span>}
              {p.estimateMin && <span className="inline-flex items-center gap-1"><Timer size={12} />{t.dur(p.estimateMin)}</span>}
              <span className="ms-auto hidden font-normal opacity-70 md:inline">
                {t.f(m.quickAdd.hint, { area: m.quickAdd.areaToken, project: m.quickAdd.projectToken, days: ex.days.slice(0, 3).join('/'), time: ex.time, estimate: ex.estimate })}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
