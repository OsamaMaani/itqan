import { AnimatePresence, motion } from 'motion/react'
import { Bell, Camera, CornerDownLeft, Download, Lightbulb, Moon, Plus, Search, Timer } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { downloadBackup } from '../lib/backup'
import { prettyDay } from '../lib/date'
import { useToday } from '../lib/hooks'
import { parseQuickAdd } from '../lib/quickAdd'
import { navigate } from '../lib/router'
import { snapshot, useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { NAV } from './Shell'
import { AreaChip, cx, Kbd } from './ui'

interface Item {
  id: string
  icon: ReactNode
  label: ReactNode
  hint?: ReactNode
  keywords: string
  run: () => void
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const today = useToday()
  const areas = useStore((s) => s.areas)
  const projects = useStore((s) => s.projects)
  const weekStartsOn = useStore((s) => s.settings.weekStartsOn)

  useEffect(() => { if (open) { setQ(''); setSel(0) } }, [open])

  const parsed = useMemo(() => parseQuickAdd(q, areas, today, weekStartsOn, projects), [q, areas, today, weekStartsOn, projects])

  const items = useMemo<Item[]>(() => {
    const st = useStore.getState()
    const list: Item[] = []
    const ideaText = /^idea[:\s]\s*/i.test(q) ? q.replace(/^idea[:\s]\s*/i, '').trim() : ''
    if (ideaText) {
      list.push({
        id: 'idea', icon: <Lightbulb size={16} />, keywords: '',
        label: <span>Save idea <b>“{ideaText}”</b></span>,
        run: () => { st.addIdea({ title: ideaText }); toast({ emoji: '💡', message: 'Idea saved' }) },
      })
    } else if (parsed.title) {
      const date = parsed.date === undefined ? today : parsed.date
      const area = areas.find((a) => a.id === parsed.areaId)
      list.push({
        id: 'add', icon: <Plus size={16} />, keywords: '',
        label: <span>Add task <b>“{parsed.title}”</b></span>,
        hint: <span className="flex items-center gap-1.5">{area && <AreaChip area={area} />}{date ? prettyDay(date, today) : 'Inbox'}{parsed.priority > 0 && ` · P${parsed.priority}`}</span>,
        run: () => { st.addTask({ title: parsed.title, areaId: parsed.areaId, projectId: parsed.projectId, priority: parsed.priority, timeOfDay: parsed.timeOfDay, estimateMin: parsed.estimateMin, date }); toast({ emoji: '✅', message: `Added “${parsed.title}”` }) },
      })
    }
    for (const n of NAV) list.push({ id: `go-${n.route}`, icon: n.icon, label: `Go to ${n.label}`, keywords: `go ${n.label}`, run: () => navigate(n.route) })
    list.push({
      id: 'focus', icon: <Timer size={16} />, label: `Start a ${st.settings.focusMinutes}-minute focus session`, keywords: 'focus timer pomodoro start',
      run: () => { st.startTimer({ mode: 'focus', totalMs: st.settings.focusMinutes * 60000, label: 'Focus', areaId: null, goalId: null, taskId: null }); navigate('focus') },
    })
    list.push({ id: 'new-reminder', icon: <Bell size={16} />, label: 'New reminder', keywords: 'reminder remind date birthday new', run: () => navigate('reminders') })
    list.push({ id: 'new-memory', icon: <Camera size={16} />, label: 'Write a memory', keywords: 'memory memories journal write new', run: () => navigate('memories') })
    list.push({
      id: 'theme', icon: <Moon size={16} />, label: 'Toggle dark mode', keywords: 'theme dark light mode',
      run: () => st.updateSettings({ theme: document.documentElement.classList.contains('dark') ? 'light' : 'dark' }),
    })
    list.push({
      id: 'backup', icon: <Download size={16} />, label: 'Download a backup', keywords: 'backup export download save',
      run: () => { downloadBackup(snapshot(useStore.getState())); st.updateSettings({ lastBackupAt: new Date().toISOString() }) },
    })
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return list.filter((i) => i.id === 'add' || i.id === 'idea' || words.length === 0 || words.every((w) => i.keywords.toLowerCase().includes(w)))
  }, [parsed, q, areas, today])

  const run = (i: Item) => { i.run(); onClose() }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl"
            initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search size={18} className="text-muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => { setQ(e.target.value); setSel(0) }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)) }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)) }
                  if (e.key === 'Enter' && items[sel]) run(items[sel])
                  if (e.key === 'Escape') onClose()
                }}
                placeholder="Type a task (“Gym tonight #gym”) or a command…"
                className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted/70"
              />
              <Kbd>Esc</Kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {items.map((i, idx) => (
                <button
                  key={i.id}
                  onMouseEnter={() => setSel(idx)}
                  onClick={() => run(i)}
                  className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition', idx === sel ? 'bg-surface-2' : '')}
                >
                  <span className={cx('grid size-8 place-items-center rounded-lg', idx === sel ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted')}>{i.icon}</span>
                  <span className="flex-1">{i.label}</span>
                  {i.hint && <span className="text-xs text-muted">{i.hint}</span>}
                  {idx === sel && <CornerDownLeft size={14} className="text-muted" />}
                </button>
              ))}
            </div>
            <div className="border-t border-border px-4 py-2 text-[11px] text-muted">
              <b>idea: …</b> saves an idea · <b>#area</b> · <b>+project</b> · <b>!1–!3</b> priority · <b>today / tomorrow / friday / next week / in 3 days / inbox</b> · <b>@morning</b> · <b>~30m</b>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
