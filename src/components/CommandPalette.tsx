import { AnimatePresence, motion } from 'motion/react'
import { Bell, Camera, Trophy, CornerDownLeft, Download, Dumbbell, Lightbulb, Moon, Plus, Search, Timer } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { downloadBackup } from '../lib/backup'
import { quickAddWords } from '../i18n/quickAddWords'
import { rich, useI18n } from '../i18n/react'
import { prettyDay } from '../lib/date'
import { useToday } from '../lib/hooks'
import { ideaText, parseQuickAdd, quickAddExamples } from '../lib/quickAdd'
import { navigate } from '../lib/router'
import { snapshot, useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { activeWorkout, dueRoutine } from '../lib/training'
import { beginWorkout } from './training/format'
import { NAV } from './Shell'
import { openAchievement } from '../pages/Achievements'
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
  const t = useI18n()
  const { m } = t
  const words = quickAddWords(t.lang)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const today = useToday()
  const areas = useStore((s) => s.areas)
  const projects = useStore((s) => s.projects)
  const weekStartsOn = useStore((s) => s.settings.weekStartsOn)

  useEffect(() => { if (open) { setQ(''); setSel(0) } }, [open])

  const parsed = useMemo(() => parseQuickAdd(q, areas, today, weekStartsOn, projects, words), [q, areas, today, weekStartsOn, projects, words])

  const items = useMemo<Item[]>(() => {
    const st = useStore.getState()
    const list: Item[] = []
    const idea = ideaText(q, words)
    if (idea) {
      list.push({
        id: 'idea', icon: <Lightbulb size={16} />, keywords: '',
        label: <span>{rich(m.palette.saveIdea, { text: <b>{idea}</b> })}</span>,
        run: () => { st.addIdea({ title: idea }); toast({ emoji: '💡', message: m.palette.ideaSaved }) },
      })
    } else if (parsed.title) {
      const date = parsed.date === undefined ? today : parsed.date
      const area = areas.find((a) => a.id === parsed.areaId)
      list.push({
        id: 'add', icon: <Plus size={16} />, keywords: '',
        label: <span>{rich(m.palette.addTask, { title: <b>{parsed.title}</b> })}</span>,
        hint: <span className="flex items-center gap-1.5">{area && <AreaChip area={area} />}{date ? prettyDay(date, today, t) : m.tasks.inbox}{parsed.priority > 0 && ` · ${t.f(m.tasks.priority, { n: parsed.priority })}`}</span>,
        run: () => { st.addTask({ title: parsed.title, areaId: parsed.areaId, projectId: parsed.projectId, priority: parsed.priority, timeOfDay: parsed.timeOfDay, estimateMin: parsed.estimateMin, date }); toast({ emoji: '✅', message: t.f(m.palette.taskAdded, { title: parsed.title }) }) },
      })
    }
    // Search matches the localized label plus the English keywords (route names are the English page names).
    for (const n of NAV) {
      const label = t.f(m.palette.goTo, { page: m.nav[n.route] })
      list.push({ id: `go-${n.route}`, icon: n.icon, label, keywords: `${label} go ${n.route}`, run: () => navigate(n.route) })
    }
    const focusLabel = t.f(m.palette.startFocus, { n: st.settings.focusMinutes })
    list.push({
      id: 'focus', icon: <Timer size={16} />, label: focusLabel, keywords: `${focusLabel} focus timer pomodoro start`,
      run: () => { st.startTimer({ mode: 'focus', totalMs: st.settings.focusMinutes * 60000, label: m.palette.focusLabel, areaId: null, goalId: null, taskId: null, habitId: null }); navigate('focus') },
    })
    // Training (ADR-027): resume the workout in progress, or start what today calls for.
    const active = activeWorkout(st.workouts)
    const due = dueRoutine(st.program, st.routines, st.workouts, today)
    const routine = due.kind === 'routine' || due.kind === 'suggest' ? st.routines.find((r) => r.id === due.routineId) : undefined
    const workoutLabel = active ? t.f(m.palette.resumeWorkout, { name: active.name }) : routine ? t.f(m.palette.startRoutine, { name: routine.name }) : m.palette.startWorkout
    list.push({
      id: 'workout', icon: <Dumbbell size={16} />, label: workoutLabel, keywords: `${workoutLabel} workout gym training exercise start`,
      run: () => beginWorkout(routine?.id ?? null, routine?.name ?? m.workout.title),
    })
    list.push({ id: 'new-reminder', icon: <Bell size={16} />, label: m.palette.newReminder, keywords: `${m.palette.newReminder} reminder remind date birthday new`, run: () => navigate('reminders') })
    list.push({ id: 'new-achievement', icon: <Trophy size={16} />, label: m.palette.recordAchievement, keywords: `${m.palette.recordAchievement} achievement win accomplishment record new`, run: () => { navigate('achievements'); openAchievement() } })
    list.push({ id: 'new-memory', icon: <Camera size={16} />, label: m.palette.writeMemory, keywords: `${m.palette.writeMemory} memory memories journal write new`, run: () => navigate('memories') })
    list.push({
      id: 'theme', icon: <Moon size={16} />, label: m.palette.toggleDark, keywords: `${m.palette.toggleDark} theme dark light mode`,
      run: () => st.updateSettings({ theme: document.documentElement.classList.contains('dark') ? 'light' : 'dark' }),
    })
    list.push({
      id: 'backup', icon: <Download size={16} />, label: m.palette.downloadBackup, keywords: `${m.palette.downloadBackup} backup export download save`,
      run: () => { downloadBackup(snapshot(useStore.getState())); st.updateSettings({ lastBackupAt: new Date().toISOString() }) },
    })
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
    return list.filter((i) => i.id === 'add' || i.id === 'idea' || terms.length === 0 || terms.every((w) => i.keywords.toLowerCase().includes(w)))
  }, [parsed, q, areas, today, t, m, words])

  const ex = quickAddExamples(words)
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
                placeholder={t.f(m.palette.placeholder, { example: m.palette.example })}
                className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted/70"
              />
              <Kbd><span dir="ltr">{m.palette.escKey}</span></Kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {items.map((i, idx) => (
                <button
                  key={i.id}
                  onMouseEnter={() => setSel(idx)}
                  onClick={() => run(i)}
                  className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm transition', idx === sel ? 'bg-surface-2' : '')}
                >
                  <span className={cx('grid size-8 place-items-center rounded-lg', idx === sel ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted')}>{i.icon}</span>
                  <span className="flex-1">{i.label}</span>
                  {i.hint && <span className="text-xs text-muted">{i.hint}</span>}
                  {idx === sel && <CornerDownLeft size={14} className="text-muted rtl:-scale-x-100" />}
                </button>
              ))}
            </div>
            <div className="border-t border-border px-4 py-2 text-[11px] text-muted">
              {rich(m.palette.hint, {
                idea: <b>{t.f(m.palette.ideaToken, { word: ex.idea })}</b>,
                area: <b>#{m.quickAdd.areaToken}</b>,
                project: <b>+{m.quickAdd.projectToken}</b>,
                priority: <b dir="ltr">!1–!3</b>,
                days: <b>{ex.days.join(' / ')}</b>,
                time: <b>{ex.time}</b>,
                estimate: <b>{ex.estimate}</b>,
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
