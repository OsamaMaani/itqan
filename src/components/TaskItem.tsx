import { motion } from 'motion/react'
import { ArrowRight, CalendarClock, Check, Flag, FolderKanban, ListChecks, OctagonAlert, Target, Timer, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '../i18n/react'
import { celebrate } from '../lib/celebrate'
import { addDaysKey, diffDays, prettyDay } from '../lib/date'
import { useAreaMap, useToday } from '../lib/hooks'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import type { Task } from '../lib/types'
import { AREA_HEX } from '../lib/colors'
import { AreaChip, cx, IconButton } from './ui'
import { TaskEditor } from './TaskEditor'

const PRIORITY_COLOR = ['', '#0ea5e9', '#f59e0b', '#f43f5e']

export function Checkbox({ checked, onChange, color }: { checked: boolean; onChange: () => void; color?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange() }}
      className={cx(
        'relative grid size-[22px] shrink-0 place-items-center rounded-full border-2 transition',
        checked ? 'border-transparent' : 'border-border hover:border-accent',
      )}
      style={checked ? { background: color ?? 'var(--accent)' } : color ? { borderColor: `${color}88` } : undefined}
    >
      <motion.span initial={false} animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }} transition={{ type: 'spring', bounce: 0.5, duration: 0.35 }}>
        <Check size={13} strokeWidth={3.5} className="text-white" />
      </motion.span>
    </button>
  )
}

export function TaskItem({ task, showDate, hideProject, onToggled }: { task: Task; showDate?: boolean; hideProject?: boolean; onToggled?: (done: boolean) => void }) {
  const t = useI18n()
  const { m } = t
  const areas = useAreaMap()
  const today = useToday()
  const toggle = useStore((s) => s.toggleTask)
  const remove = useStore((s) => s.deleteTask)
  const restore = useStore((s) => s.restoreTask)
  const move = useStore((s) => s.moveTask)
  const goal = useStore((s) => (task.goalId ? s.goals.find((g) => g.id === task.goalId) : undefined))
  const project = useStore((s) => (task.projectId ? s.projects.find((p) => p.id === task.projectId) : undefined))
  const startTimer = useStore((s) => s.startTimer)
  const focusMinutes = useStore((s) => s.settings.focusMinutes)
  const [editing, setEditing] = useState(false)

  const area = task.areaId ? areas.get(task.areaId) : undefined
  const overdue = !task.done && task.date !== null && diffDays(task.date, today) < 0
  const subDone = task.subtasks.filter((s) => s.done).length

  const onToggle = () => {
    const done = toggle(task.id)
    if (done) celebrate.tick()
    onToggled?.(done)
  }

  const onDelete = () => {
    const removed = remove(task.id)
    if (removed) toast({ message: t.f(m.tasks.deleted, { title: removed.title }), emoji: '🗑️', action: { label: m.common.undo, run: () => restore(removed) } })
  }

  const onFocus = () => {
    startTimer({ mode: 'focus', totalMs: (task.estimateMin ?? focusMinutes) * 60000, label: task.title, areaId: task.areaId, goalId: task.goalId, taskId: task.id, habitId: null })
    navigate('focus')
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 * (t.dir === 'rtl' ? -1 : 1), transition: { duration: 0.15 } }}
      >
      <div
        draggable
        onDragStart={(e) => e.dataTransfer.setData('text/task-id', task.id)}
        onClick={() => setEditing(true)}
        className="group flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 transition hover:border-border hover:bg-surface-2/60"
      >
        <div className="pt-0.5">
          <Checkbox checked={task.done} onChange={onToggle} color={area ? AREA_HEX[area.color] : undefined} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={cx('text-[15px] leading-snug transition', task.done && 'text-muted line-through decoration-muted/50')}>
            {task.title}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted empty:hidden">
            {!task.done && task.stage === 'doing' && <span className="rounded-md bg-sky-500/10 px-1.5 py-0.5 font-bold text-sky-500">{m.tasks.doing}</span>}
            {!task.done && task.blocked && <span className="inline-flex items-center gap-0.5 font-bold text-danger"><OctagonAlert size={11} /> {m.tasks.blocked}</span>}
            {area && <AreaChip area={area} />}
            {task.priority > 0 && (
              <span className="inline-flex items-center gap-0.5 font-semibold" style={{ color: PRIORITY_COLOR[task.priority] }}>
                <Flag size={11} fill="currentColor" /> {t.f(m.tasks.priority, { n: task.priority })}
              </span>
            )}
            {(showDate || overdue) && task.date && (
              <span className={cx('inline-flex items-center gap-1', overdue && 'font-semibold text-danger')}>
                <CalendarClock size={11} /> {prettyDay(task.date, today, t)}
              </span>
            )}
            {task.estimateMin && <span className="inline-flex items-center gap-1"><Timer size={11} />{t.dur(task.estimateMin)}</span>}
            {task.subtasks.length > 0 && <span className="inline-flex items-center gap-1"><ListChecks size={11} />{t.n(subDone)}/{t.n(task.subtasks.length)}</span>}
            {project && !hideProject && (
              <button onClick={(e) => { e.stopPropagation(); navigate('projects', project.id) }} className="inline-flex items-center gap-1 hover:text-accent">
                <FolderKanban size={11} />{project.title}
              </button>
            )}
            {goal && <span className="inline-flex items-center gap-1"><Target size={11} />{goal.title}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
          {!task.done && <IconButton label={m.tasks.focusOnThis} onClick={onFocus}><Timer size={15} /></IconButton>}
          {!task.done && (
            <IconButton label={m.tasks.moveToTomorrow} onClick={() => move(task.id, addDaysKey(today, 1))}>
              <ArrowRight size={15} className="rtl:-scale-x-100" />
            </IconButton>
          )}
          <IconButton label={m.common.delete} onClick={onDelete} className="hover:text-danger"><Trash2 size={15} /></IconButton>
        </div>
      </div>
      </motion.div>
      <TaskEditor open={editing} onClose={() => setEditing(false)} task={task} />
    </>
  )
}
