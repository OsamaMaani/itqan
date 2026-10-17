import { motion } from 'motion/react'
import { CalendarDays, Check, CheckCircle2, Pause, Pencil, Play, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { tx } from '../i18n/core'
import { useI18n } from '../i18n/react'
import { celebrate } from '../lib/celebrate'
import { goalCurrent, goalPace, goalProgress, goalTarget, type Pace } from '../lib/goals'
import { areaHex, useAreaMap, useToday } from '../lib/hooks'
import { useStore } from '../lib/store'
import { categoryForArea } from '../lib/achievements'
import { todayKey } from '../lib/date'
import { openAchievement } from '../pages/Achievements'
import { toast } from '../lib/toast'
import type { Goal } from '../lib/types'
import { GoalEditor } from './GoalEditor'
import { AreaChip, Button, Card, cx, IconButton, Input, Label, Modal, ProgressRing } from './ui'

const PACE: Record<Exclude<Pace, 'none'>, string> = {
  ahead: 'bg-accent-soft text-accent',
  'on-track': 'bg-sky-500/10 text-sky-500',
  behind: 'bg-amber-500/10 text-amber-500',
  overdue: 'bg-danger/10 text-danger',
}

function onCompleted(goal: Goal) {
  const t = tx()
  celebrate.goal()
  const area = useStore.getState().areas.find((a) => a.id === goal.areaId)
  toast({
    emoji: '🏆', message: t.f(t.m.goals.complete, { title: goal.title }),
    action: {
      label: t.m.goals.addToAchievements,
      run: () => openAchievement({ title: goal.title, story: goal.why, date: todayKey(), category: categoryForArea(area), emoji: '🏆', impact: 3, goalId: goal.id, source: `goal:${goal.id}` }),
    },
  }, 10000)
}

/** "+" button that logs progress on a numeric goal, or opens milestones. */
export function GoalLogButton({ goal }: { goal: Goal }) {
  const { m } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <>
      <IconButton label={m.goals.logProgress} onClick={() => setOpen(true)} className="bg-surface-2"><Plus size={16} /></IconButton>
      <GoalLogModal goal={goal} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export function GoalLogModal({ goal, open, onClose }: { goal: Goal; open: boolean; onClose: () => void }) {
  const t = useI18n()
  const { m } = t
  const today = useToday()
  const logGoal = useStore((s) => s.logGoal)
  const toggleMilestone = useStore((s) => s.toggleMilestone)
  const [amount, setAmount] = useState(1)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(today)

  const save = () => {
    if (!amount) return
    if (logGoal(goal.id, amount, note, date)) onCompleted(goal)
    else celebrate.tick()
    setNote('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal.title}
      footer={goal.kind === 'numeric' ? (
        <>
          <Button variant="ghost" onClick={onClose}>{m.common.cancel}</Button>
          <Button variant="primary" onClick={save}>{t.f(m.goals.log.button, { amount, unit: goal.unit })}</Button>
        </>
      ) : undefined}
    >
      {goal.kind === 'numeric' ? (
        <div className="space-y-4">
          <div>
            <Label>{m.goals.log.howMuch}</Label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 5, 10, 20].map((n) => (
                <button key={n} onClick={() => setAmount(n)} className={cx('h-10 min-w-12 rounded-xl px-3 text-sm font-bold transition', amount === n ? 'bg-gradient-accent text-accent-fg' : 'bg-surface-2 text-muted')}>
                  +{t.n(n)}
                </button>
              ))}
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-24" />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div><Label>{m.goals.log.note}</Label><Input placeholder={m.common.optional} value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} /></div>
            <div><Label>{m.goals.log.day}</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value || today)} /></div>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {goal.milestones.map((ms) => (
            <button
              key={ms.id}
              onClick={() => { if (toggleMilestone(goal.id, ms.id)) onCompleted(goal); else if (!ms.done) celebrate.tick() }}
              className="flex w-full items-center gap-3 rounded-xl bg-surface-2/60 px-3 py-2.5 text-start text-sm transition hover:bg-surface-2"
            >
              <span className={cx('grid size-5 place-items-center rounded-full border-2', ms.done ? 'border-transparent bg-accent' : 'border-border')}>
                {ms.done && <Check size={12} strokeWidth={3.5} className="text-white" />}
              </span>
              <span className={ms.done ? 'text-muted line-through' : ''}>{ms.title}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

export function GoalCard({ goal }: { goal: Goal }) {
  const t = useI18n()
  const { m } = t
  const today = useToday()
  const logs = useStore((s) => s.goalLogs)
  const setStatus = useStore((s) => s.setGoalStatus)
  const deleteGoal = useStore((s) => s.deleteGoal)
  const deleteLog = useStore((s) => s.deleteGoalLog)
  const toggleMilestone = useStore((s) => s.toggleMilestone)
  const linkedOpen = useStore((s) => s.tasks.filter((k) => k.goalId === goal.id && !k.done).length)
  const areas = useAreaMap()
  const [editing, setEditing] = useState(false)
  const [logging, setLogging] = useState(false)
  const [history, setHistory] = useState(false)
  const fmtN = (x: number) => t.n(x, { maximumFractionDigits: 1 })

  const area = goal.areaId ? areas.get(goal.areaId) : undefined
  const hex = areaHex(area)
  const p = goalProgress(goal, logs)
  const pace = goalPace(goal, logs, today)
  const cur = goalCurrent(goal, logs)
  const target = goalTarget(goal)
  const myLogs = logs.filter((l) => l.goalId === goal.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={cx('relative flex h-full flex-col overflow-hidden p-5', goal.status !== 'active' && 'opacity-80')}>
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: hex }} />
        <div className="flex items-start gap-4">
          <ProgressRing value={p} size={72} stroke={7} color={hex}>
            <span className="text-sm font-extrabold tabular">{goal.status === 'done' ? '🏆' : t.pct(p)}</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <AreaChip area={area} />
              {goal.status === 'active' && pace.pace !== 'none' && (
                <span className={cx('rounded-md px-1.5 py-0.5 text-[11px] font-bold', PACE[pace.pace])}>{m.goals.pace[pace.pace]}</span>
              )}
              {goal.status === 'paused' && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold text-muted">{m.goals.paused}</span>}
            </div>
            <h3 className="mt-1.5 text-lg font-bold leading-tight">{goal.title}</h3>
            <div className="mt-1 text-sm text-muted tabular">
              {goal.kind === 'numeric'
                ? t.f(m.goals.card.progressNumeric, { cur: fmtN(cur), target: fmtN(target), unit: goal.unit })
                : t.p(m.goals.card.progressMilestones, target, { cur })}
            </div>
          </div>
        </div>

        {goal.why && <p className="mt-4 border-s-2 ps-3 text-sm italic text-muted" style={{ borderColor: `${hex}88` }}>{goal.why}</p>}

        {goal.kind === 'milestones' && (
          <div className="mt-4 space-y-1">
            {goal.milestones.map((ms) => (
              <button
                key={ms.id}
                onClick={() => { if (toggleMilestone(goal.id, ms.id)) onCompleted(goal); else if (!ms.done) celebrate.tick() }}
                className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1 text-start text-sm hover:bg-surface-2/60"
              >
                <span className="grid size-[18px] shrink-0 place-items-center rounded-full border-2" style={ms.done ? { background: hex, borderColor: hex } : { borderColor: 'var(--border)' }}>
                  {ms.done && <Check size={11} strokeWidth={3.5} className="text-white" />}
                </span>
                <span className={ms.done ? 'text-muted line-through' : ''}>{ms.title}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {goal.deadline && (
              <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{t.d(goal.deadline, 'medium')}
                {pace.daysLeft !== null && goal.status === 'active' && ` · ${pace.daysLeft >= 0 ? t.p(m.goals.card.daysLeft, pace.daysLeft) : t.p(m.goals.card.daysOver, -pace.daysLeft)}`}
              </span>
            )}
            {pace.perDay !== null && goal.kind === 'numeric' && <span>{t.f(m.goals.card.needsPerDay, { amount: fmtN(Math.ceil(pace.perDay * 10) / 10), unit: goal.unit })}</span>}
            {linkedOpen > 0 && <span>{t.p(m.goals.card.openTasks, linkedOpen)}</span>}
          </div>
          <div className="mt-3 flex items-center gap-1">
            {goal.status === 'active' && goal.kind === 'numeric' && (
              <Button size="sm" variant="primary" onClick={() => setLogging(true)}><Plus size={14} /> {m.goals.logProgress}</Button>
            )}
            {goal.kind === 'numeric' && myLogs.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setHistory((h) => !h)}>{m.goals.card.history}</Button>
            )}
            <div className="ms-auto flex">
              <IconButton label={m.common.edit} onClick={() => setEditing(true)}><Pencil size={15} /></IconButton>
              {goal.status === 'active' && <IconButton label={m.goals.card.pause} onClick={() => setStatus(goal.id, 'paused')}><Pause size={15} /></IconButton>}
              {goal.status === 'paused' && <IconButton label={m.goals.card.resume} onClick={() => setStatus(goal.id, 'active')}><Play size={15} /></IconButton>}
              {goal.status !== 'done' && <IconButton label={m.goals.card.markComplete} onClick={() => { setStatus(goal.id, 'done'); onCompleted(goal) }}><CheckCircle2 size={15} /></IconButton>}
              {goal.status === 'done' && <IconButton label={m.goals.card.reopen} onClick={() => setStatus(goal.id, 'active')}><RotateCcw size={15} /></IconButton>}
              <IconButton label={m.common.delete} className="hover:text-danger" onClick={() => { if (confirm(t.f(m.goals.card.deleteConfirm, { title: goal.title }))) deleteGoal(goal.id) }}><Trash2 size={15} /></IconButton>
            </div>
          </div>
          {history && (
            <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-xl bg-surface-2/50 p-2">
              {myLogs.map((l) => (
                <div key={l.id} className="group flex items-center gap-2 px-2 py-1 text-xs">
                  <span className="w-20 text-muted">{t.d(l.date, 'short')}</span>
                  <span className="font-bold tabular" style={{ color: hex }}>+{fmtN(l.amount)}</span>
                  <span className="flex-1 truncate text-muted">{l.note}</span>
                  <button onClick={() => deleteLog(l.id)} className="text-muted opacity-0 hover:text-danger group-hover:opacity-100"><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
      <GoalEditor open={editing} onClose={() => setEditing(false)} goal={goal} />
      <GoalLogModal goal={goal} open={logging} onClose={() => setLogging(false)} />
    </motion.div>
  )
}


