import { motion } from 'motion/react'
import { CalendarDays, Check, CheckCircle2, ListTodo, Pause, Pencil, Play, Plus, RotateCcw, Trash2, TrendingUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { tx } from '../i18n/core'
import { useI18n } from '../i18n/react'
import { celebrate } from '../lib/celebrate'
import { goalCurrent, goalPace, goalProgress, goalTarget, type Pace } from '../lib/goals'
import { areaHex, useAreaMap, useGoalSources, useToday } from '../lib/hooks'
import { useStore } from '../lib/store'
import { categoryForArea } from '../lib/achievements'
import { todayKey } from '../lib/date'
import { openAchievement } from '../pages/Achievements'
import { toast } from '../lib/toast'
import type { Goal, Milestone } from '../lib/types'
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

function useGoalView(goal: Goal) {
  const t = useI18n()
  const today = useToday()
  const src = useGoalSources()
  const logs = src.goalLogs
  const linkedOpen = useStore((s) => s.tasks.filter((k) => k.goalId === goal.id && !k.done).length)
  const areas = useAreaMap()
  const area = goal.areaId ? areas.get(goal.areaId) : undefined
  const fmtN = (x: number) => t.n(x, { maximumFractionDigits: 1 })
  const cur = goalCurrent(goal, src)
  const target = goalTarget(goal)
  return {
    t, area, hex: areaHex(area), logs, linkedOpen, fmtN,
    p: goalProgress(goal, src),
    pace: goalPace(goal, src, today),
    progressText: goal.kind === 'numeric'
      ? t.f(t.m.goals.card.progressNumeric, { cur: fmtN(cur), target: fmtN(target), unit: goal.unit })
      : t.p(t.m.goals.card.progressMilestones, target, { cur }),
  }
}

function StatusChip({ goal, pace }: { goal: Goal; pace: Pace }) {
  const { m } = useI18n()
  if (goal.status === 'active' && pace !== 'none') return <span className={cx('rounded-md px-1.5 py-0.5 text-[11px] font-bold', PACE[pace])}>{m.goals.pace[pace]}</span>
  if (goal.status === 'paused') return <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold text-muted">{m.goals.paused}</span>
  return null
}

function MilestoneRow({ goal, ms, hex }: { goal: Goal; ms: Milestone; hex: string }) {
  const toggleMilestone = useStore((s) => s.toggleMilestone)
  return (
    <button
      onClick={() => { if (toggleMilestone(goal.id, ms.id)) onCompleted(goal); else if (!ms.done) celebrate.tick() }}
      className="relative flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-start text-sm hover:bg-surface-2/60"
    >
      <span className="grid size-[18px] shrink-0 place-items-center rounded-full border-2" style={ms.done ? { background: hex, borderColor: hex } : { borderColor: 'var(--border)' }}>
        {ms.done && <Check size={11} strokeWidth={3.5} className="text-white" />}
      </span>
      <span className={cx('min-w-0 flex-1 truncate', ms.done && 'text-muted line-through')}>{ms.title}</span>
    </button>
  )
}

/** Deadline, days left, pace needed, open tasks — one wrapping line of quiet facts. */
function GoalMeta({ goal, view, className }: { goal: Goal; view: ReturnType<typeof useGoalView>; className?: string }) {
  const { t, pace, fmtN, linkedOpen } = view
  const { m } = t
  const showPerDay = pace.perDay !== null && goal.kind === 'numeric'
  if (!goal.deadline && !showPerDay && !linkedOpen) return null
  return (
    <div className={cx('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted', className)}>
      {goal.deadline && (
        <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{t.d(goal.deadline, 'medium')}
          {pace.daysLeft !== null && goal.status === 'active' && ` · ${pace.daysLeft >= 0 ? t.p(m.goals.card.daysLeft, pace.daysLeft) : t.p(m.goals.card.daysOver, -pace.daysLeft)}`}
        </span>
      )}
      {showPerDay && <span className="inline-flex items-center gap-1"><TrendingUp size={12} />{t.f(m.goals.card.needsPerDay, { amount: fmtN(Math.ceil(pace.perDay! * 10) / 10), unit: goal.unit })}</span>}
      {linkedOpen > 0 && <span className="inline-flex items-center gap-1"><ListTodo size={12} />{t.p(m.goals.card.openTasks, linkedOpen)}</span>}
    </div>
  )
}

/**
 * Compact goal card: progress, title, status and one line of facts. The whole card opens
 * GoalDetails (why, milestones, history, every action); only the quick log stays on the card.
 */
export function GoalCard({ goal }: { goal: Goal }) {
  const view = useGoalView(goal)
  const { t, area, hex, p, pace, progressText } = view
  const { m } = t
  const [details, setDetails] = useState(false)
  const [editing, setEditing] = useState(false)
  const [logging, setLogging] = useState(false)
  const next = goal.kind === 'milestones' && goal.status === 'active' ? goal.milestones.find((x) => !x.done) : undefined

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={cx('group relative flex h-full flex-col overflow-hidden p-4 transition hover:border-muted/40 hover:shadow-md', goal.status !== 'active' && 'opacity-80')}>
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: hex }} />
        <div className="flex items-center gap-3.5">
          <ProgressRing value={p} size={52} stroke={5} color={hex}>
            <span className="text-xs font-extrabold tabular">{goal.status === 'done' ? '🏆' : t.pct(p)}</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            {/* Stretched across the card (after:inset-0): one real button, so the inner buttons stay valid. */}
            <button
              onClick={() => setDetails(true)}
              className="line-clamp-2 text-start text-[15px] font-bold leading-snug outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:ring-2 focus-visible:after:ring-accent"
            >
              {goal.title}
            </button>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <AreaChip area={area} />
              <StatusChip goal={goal} pace={pace.pace} />
              <span className="tabular">{progressText}</span>
            </div>
          </div>
          {goal.status === 'active' && goal.kind === 'numeric' && (
            <IconButton label={m.goals.logProgress} onClick={() => setLogging(true)} className="relative shrink-0 bg-surface-2"><Plus size={16} /></IconButton>
          )}
        </div>
        {next && <div className="mt-2.5"><MilestoneRow goal={goal} ms={next} hex={hex} /></div>}
        <GoalMeta goal={goal} view={view} className="mt-auto pt-3" />
      </Card>
      <GoalDetails
        goal={goal}
        open={details}
        onClose={() => setDetails(false)}
        onEdit={() => { setDetails(false); setEditing(true) }}
        onLog={() => { setDetails(false); setLogging(true) }}
      />
      <GoalEditor open={editing} onClose={() => setEditing(false)} goal={goal} />
      <GoalLogModal goal={goal} open={logging} onClose={() => setLogging(false)} />
    </motion.div>
  )
}

/** A footer action: icon and label from `sm` up, icon only on phones so the footer stays one row. */
function Action({ icon, label, variant = 'ghost', className, onClick }: { icon: ReactNode; label: string; variant?: 'ghost' | 'soft'; className?: string; onClick: () => void }) {
  return (
    <Button variant={variant} aria-label={label} title={label} className={cx('px-2.5! sm:px-4!', className)} onClick={onClick}>
      {icon}<span className="hidden sm:inline">{label}</span>
    </Button>
  )
}

/** Everything about one goal, opened from its card. */
function GoalDetails({ goal, open, onClose, onEdit, onLog }: { goal: Goal; open: boolean; onClose: () => void; onEdit: () => void; onLog: () => void }) {
  const view = useGoalView(goal)
  const { t, area, hex, p, pace, progressText, logs } = view
  const { m } = t
  const setStatus = useStore((s) => s.setGoalStatus)
  const deleteGoal = useStore((s) => s.deleteGoal)
  const deleteLog = useStore((s) => s.deleteGoalLog)
  const myLogs = logs.filter((l) => l.goalId === goal.id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  const section = 'mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted'

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={goal.title}
      footer={
        <>
          <Action className="me-auto hover:text-danger" icon={<Trash2 size={15} />} label={m.common.delete} onClick={() => { if (confirm(t.f(m.goals.card.deleteConfirm, { title: goal.title }))) { onClose(); deleteGoal(goal.id) } }} />
          {goal.status === 'active' && <Action icon={<Pause size={15} />} label={m.goals.card.pause} onClick={() => setStatus(goal.id, 'paused')} />}
          {goal.status === 'paused' && <Action icon={<Play size={15} />} label={m.goals.card.resume} onClick={() => setStatus(goal.id, 'active')} />}
          {goal.status !== 'done' && <Action icon={<CheckCircle2 size={15} />} label={m.goals.card.markComplete} onClick={() => { setStatus(goal.id, 'done'); onCompleted(goal) }} />}
          {goal.status === 'done' && <Action icon={<RotateCcw size={15} />} label={m.goals.card.reopen} onClick={() => setStatus(goal.id, 'active')} />}
          <Action variant="soft" icon={<Pencil size={15} />} label={m.common.edit} onClick={onEdit} />
          {goal.status === 'active' && goal.kind === 'numeric' && <Button variant="primary" onClick={onLog}><Plus size={15} /> {m.goals.logProgress}</Button>}
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4 rounded-2xl bg-surface-2/50 p-4">
          <ProgressRing value={p} size={76} stroke={7} color={hex}>
            <span className="text-sm font-extrabold tabular">{goal.status === 'done' ? '🏆' : t.pct(p)}</span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <AreaChip area={area} />
              <StatusChip goal={goal} pace={pace.pace} />
            </div>
            <div className="mt-1.5 text-lg font-bold tabular">{progressText}</div>
            <GoalMeta goal={goal} view={view} className="mt-1" />
          </div>
        </div>

        {goal.why && (
          <div>
            <div className={section}>{m.goals.editor.why}</div>
            <p className="whitespace-pre-line border-s-2 ps-3 text-sm italic text-muted" style={{ borderColor: `${hex}88` }}>{goal.why}</p>
          </div>
        )}

        {goal.kind === 'milestones' && (
          <div>
            <div className={section}>{m.goals.editor.milestones}</div>
            <div className="space-y-0.5">
              {goal.milestones.map((ms) => <MilestoneRow key={ms.id} goal={goal} ms={ms} hex={hex} />)}
            </div>
          </div>
        )}

        {goal.kind === 'numeric' && (
          <div>
            <div className={section}>{m.goals.card.history}</div>
            {myLogs.length === 0 ? (
              <p className="text-sm text-muted">{m.goals.card.noHistory}</p>
            ) : (
              <div className="divide-y divide-border rounded-xl border border-border">
                {myLogs.map((l) => (
                  <div key={l.id} className="group flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="w-24 shrink-0 text-muted">{t.d(l.date, 'short')}</span>
                    <span dir="ltr" className="shrink-0 font-bold tabular" style={{ color: hex }}>{t.n(l.amount, { maximumFractionDigits: 1, signDisplay: 'exceptZero' })}</span>
                    <span className="min-w-0 flex-1 truncate text-muted">{l.note}</span>
                    <IconButton label={m.common.delete} className="hover:text-danger sm:opacity-0 sm:group-hover:opacity-100" onClick={() => deleteLog(l.id)}><Trash2 size={14} /></IconButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
