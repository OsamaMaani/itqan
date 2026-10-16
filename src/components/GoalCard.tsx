import { format } from 'date-fns'
import { motion } from 'motion/react'
import { CalendarDays, Check, CheckCircle2, Pause, Pencil, Play, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { celebrate } from '../lib/celebrate'
import { fromKey } from '../lib/date'
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

const PACE: Record<Pace, { label: string; cls: string }> = {
  ahead: { label: 'Ahead', cls: 'bg-accent-soft text-accent' },
  'on-track': { label: 'On track', cls: 'bg-sky-500/10 text-sky-500' },
  behind: { label: 'Behind', cls: 'bg-amber-500/10 text-amber-500' },
  overdue: { label: 'Overdue', cls: 'bg-danger/10 text-danger' },
  none: { label: '', cls: '' },
}

function onCompleted(goal: Goal) {
  celebrate.goal()
  const area = useStore.getState().areas.find((a) => a.id === goal.areaId)
  toast({
    emoji: '🏆', message: `Goal complete: ${goal.title}`,
    action: {
      label: 'Add to achievements',
      run: () => openAchievement({ title: goal.title, story: goal.why, date: todayKey(), category: categoryForArea(area), emoji: '🏆', impact: 3, goalId: goal.id, source: `goal:${goal.id}` }),
    },
  }, 10000)
}

/** "+" button that logs progress on a numeric goal, or opens milestones. */
export function GoalLogButton({ goal }: { goal: Goal }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <IconButton label="Log progress" onClick={() => setOpen(true)} className="bg-surface-2"><Plus size={16} /></IconButton>
      <GoalLogModal goal={goal} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

export function GoalLogModal({ goal, open, onClose }: { goal: Goal; open: boolean; onClose: () => void }) {
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
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>Log {amount} {goal.unit}</Button>
        </>
      ) : undefined}
    >
      {goal.kind === 'numeric' ? (
        <div className="space-y-4">
          <div>
            <Label>How much did you do?</Label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 5, 10, 20].map((n) => (
                <button key={n} onClick={() => setAmount(n)} className={cx('h-10 min-w-12 rounded-xl px-3 text-sm font-bold transition', amount === n ? 'bg-gradient-accent text-accent-fg' : 'bg-surface-2 text-muted')}>
                  +{n}
                </button>
              ))}
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-24" />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div><Label>Note</Label><Input placeholder="optional" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} /></div>
            <div><Label>Day</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value || today)} /></div>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {goal.milestones.map((m) => (
            <button
              key={m.id}
              onClick={() => { if (toggleMilestone(goal.id, m.id)) onCompleted(goal); else if (!m.done) celebrate.tick() }}
              className="flex w-full items-center gap-3 rounded-xl bg-surface-2/60 px-3 py-2.5 text-left text-sm transition hover:bg-surface-2"
            >
              <span className={cx('grid size-5 place-items-center rounded-full border-2', m.done ? 'border-transparent bg-accent' : 'border-border')}>
                {m.done && <Check size={12} strokeWidth={3.5} className="text-white" />}
              </span>
              <span className={m.done ? 'text-muted line-through' : ''}>{m.title}</span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}

export function GoalCard({ goal }: { goal: Goal }) {
  const today = useToday()
  const logs = useStore((s) => s.goalLogs)
  const setStatus = useStore((s) => s.setGoalStatus)
  const deleteGoal = useStore((s) => s.deleteGoal)
  const deleteLog = useStore((s) => s.deleteGoalLog)
  const toggleMilestone = useStore((s) => s.toggleMilestone)
  const linkedOpen = useStore((s) => s.tasks.filter((t) => t.goalId === goal.id && !t.done).length)
  const areas = useAreaMap()
  const [editing, setEditing] = useState(false)
  const [logging, setLogging] = useState(false)
  const [history, setHistory] = useState(false)

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
            <span className="text-sm font-extrabold tabular">{goal.status === 'done' ? '🏆' : `${Math.round(p * 100)}%`}</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <AreaChip area={area} />
              {goal.status === 'active' && pace.pace !== 'none' && (
                <span className={cx('rounded-md px-1.5 py-0.5 text-[11px] font-bold', PACE[pace.pace].cls)}>{PACE[pace.pace].label}</span>
              )}
              {goal.status === 'paused' && <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold text-muted">Paused</span>}
            </div>
            <h3 className="mt-1.5 text-lg font-bold leading-tight">{goal.title}</h3>
            <div className="mt-1 text-sm text-muted tabular">
              {goal.kind === 'numeric' ? `${fmtN(cur)} / ${fmtN(target)} ${goal.unit}` : `${cur} / ${target} milestones`}
            </div>
          </div>
        </div>

        {goal.why && <p className="mt-4 border-l-2 pl-3 text-sm italic text-muted" style={{ borderColor: `${hex}88` }}>{goal.why}</p>}

        {goal.kind === 'milestones' && (
          <div className="mt-4 space-y-1">
            {goal.milestones.map((m) => (
              <button
                key={m.id}
                onClick={() => { if (toggleMilestone(goal.id, m.id)) onCompleted(goal); else if (!m.done) celebrate.tick() }}
                className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1 text-left text-sm hover:bg-surface-2/60"
              >
                <span className="grid size-[18px] shrink-0 place-items-center rounded-full border-2" style={m.done ? { background: hex, borderColor: hex } : { borderColor: 'var(--border)' }}>
                  {m.done && <Check size={11} strokeWidth={3.5} className="text-white" />}
                </span>
                <span className={m.done ? 'text-muted line-through' : ''}>{m.title}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {goal.deadline && (
              <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{format(fromKey(goal.deadline), 'MMM d, yyyy')}
                {pace.daysLeft !== null && goal.status === 'active' && ` · ${pace.daysLeft >= 0 ? `${pace.daysLeft}d left` : `${-pace.daysLeft}d over`}`}
              </span>
            )}
            {pace.perDay !== null && goal.kind === 'numeric' && <span>needs {fmtN(Math.ceil(pace.perDay * 10) / 10)} {goal.unit}/day</span>}
            {linkedOpen > 0 && <span>{linkedOpen} open task{linkedOpen > 1 ? 's' : ''}</span>}
          </div>
          <div className="mt-3 flex items-center gap-1">
            {goal.status === 'active' && goal.kind === 'numeric' && (
              <Button size="sm" variant="primary" onClick={() => setLogging(true)}><Plus size={14} /> Log progress</Button>
            )}
            {goal.kind === 'numeric' && myLogs.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setHistory((h) => !h)}>History</Button>
            )}
            <div className="ml-auto flex">
              <IconButton label="Edit" onClick={() => setEditing(true)}><Pencil size={15} /></IconButton>
              {goal.status === 'active' && <IconButton label="Pause" onClick={() => setStatus(goal.id, 'paused')}><Pause size={15} /></IconButton>}
              {goal.status === 'paused' && <IconButton label="Resume" onClick={() => setStatus(goal.id, 'active')}><Play size={15} /></IconButton>}
              {goal.status !== 'done' && <IconButton label="Mark complete" onClick={() => { setStatus(goal.id, 'done'); onCompleted(goal) }}><CheckCircle2 size={15} /></IconButton>}
              {goal.status === 'done' && <IconButton label="Reopen" onClick={() => setStatus(goal.id, 'active')}><RotateCcw size={15} /></IconButton>}
              <IconButton label="Delete" className="hover:text-danger" onClick={() => { if (confirm(`Delete “${goal.title}” and its progress history?`)) deleteGoal(goal.id) }}><Trash2 size={15} /></IconButton>
            </div>
          </div>
          {history && (
            <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-xl bg-surface-2/50 p-2">
              {myLogs.map((l) => (
                <div key={l.id} className="group flex items-center gap-2 px-2 py-1 text-xs">
                  <span className="w-20 text-muted">{format(fromKey(l.date), 'MMM d')}</span>
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

function fmtN(n: number) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1)
}
