import { format } from 'date-fns'
import { motion } from 'motion/react'
import { Coffee, Pause, Play, RotateCcw, Square, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AreaPicker } from '../components/AreaPicker'
import { mmss, remainingMs } from '../components/TimerWatcher'
import { AreaChip, Button, Card, cx, EmptyState, IconButton, Input, Label, PageHeader, Select } from '../components/ui'
import { AREA_HEX } from '../lib/colors'
import { todayKey, weekDays } from '../lib/date'
import { useAreaMap, useData, useTick, useToday } from '../lib/hooks'
import { useStore } from '../lib/store'

const PRESETS = [15, 25, 50, 90]

export function FocusPage() {
  const d = useData()
  const today = useToday()
  const areas = useAreaMap()
  const { startTimer, pauseTimer, resumeTimer, finishTimer, deleteFocusSession, updateSettings } = useStore.getState()
  const timer = d.timer
  const now = useTick(250, !!timer?.endsAt)

  const [minutes, setMinutes] = useState(d.settings.focusMinutes)
  const [label, setLabel] = useState('')
  const [areaId, setAreaId] = useState<string | null>(null)
  const [goalId, setGoalId] = useState<string | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)

  const openTasks = d.tasks.filter((t) => !t.done && t.date !== null && t.date <= today)
  const activeGoals = d.goals.filter((g) => g.status === 'active')

  const left = timer ? remainingMs(timer, now) : minutes * 60000
  const total = timer ? timer.totalMs : minutes * 60000
  const progress = timer ? 1 - left / total : 0
  const isBreak = timer?.mode === 'break'

  const start = () => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {})
    const task = openTasks.find((t) => t.id === taskId)
    startTimer({
      mode: 'focus', totalMs: minutes * 60000, label: label || task?.title || 'Focus',
      areaId: areaId ?? task?.areaId ?? null, goalId: goalId ?? task?.goalId ?? null, taskId,
    })
    updateSettings({ focusMinutes: minutes })
  }

  const sessionsToday = d.focusSessions.filter((f) => todayKey(new Date(f.startedAt)) === today).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const week = weekDays(today, d.settings.weekStartsOn)
  const weekSessions = d.focusSessions.filter((f) => week.includes(todayKey(new Date(f.startedAt))))
  const todayMin = sessionsToday.reduce((s, f) => s + f.minutes, 0)
  const weekMin = weekSessions.reduce((s, f) => s + f.minutes, 0)
  const byArea = useMemo(() => {
    const m = new Map<string | null, number>()
    for (const f of weekSessions) m.set(f.areaId, (m.get(f.areaId) ?? 0) + f.minutes)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [weekSessions])

  const R = 130
  const C = 2 * Math.PI * R

  return (
    <div>
      <PageHeader title="Focus" subtitle="One thing at a time. Sessions are logged automatically and earn XP." />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="flex flex-col items-center p-6 sm:p-10">
          <div className="relative grid place-items-center">
            <svg viewBox="0 0 300 300" className="h-auto w-[min(300px,72vw)] -rotate-90">
              <defs>
                <linearGradient id="focus-g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={isBreak ? '#38bdf8' : 'var(--accent)'} />
                  <stop offset="1" stopColor={isBreak ? '#818cf8' : 'var(--accent-2)'} />
                </linearGradient>
              </defs>
              <circle cx={150} cy={150} r={R} fill="none" stroke="var(--surface-2)" strokeWidth={14} />
              <motion.circle
                cx={150} cy={150} r={R} fill="none" stroke="url(#focus-g)" strokeWidth={14} strokeLinecap="round"
                strokeDasharray={C} animate={{ strokeDashoffset: C * (1 - progress) }} transition={{ duration: 0.3, ease: 'linear' }}
              />
            </svg>
            <div className="absolute text-center">
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted">{timer ? (isBreak ? 'Break' : 'Focus') : 'Ready'}</div>
              <div className="my-1 text-5xl font-extrabold sm:text-6xl tabular tracking-tight">{mmss(left)}</div>
              <div className="mx-auto max-w-48 truncate text-sm text-muted">{timer?.label ?? (label || 'What will you work on?')}</div>
            </div>
          </div>

          {!timer ? (
            <div className="mt-8 w-full max-w-md space-y-4">
              <div className="flex flex-wrap justify-center gap-2">
                {PRESETS.map((p) => (
                  <button key={p} onClick={() => setMinutes(p)} className={cx('h-10 w-14 rounded-xl text-sm font-bold transition', minutes === p ? 'bg-gradient-accent text-accent-fg' : 'bg-surface-2 text-muted hover:text-text')}>
                    {p}m
                  </button>
                ))}
                <Input type="number" min={1} max={240} value={minutes} onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))} className="w-20 text-center" />
              </div>
              <Input placeholder="What are you working on?" value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && start()} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Task</Label>
                  <Select value={taskId ?? ''} onChange={(e) => setTaskId(e.target.value || null)}>
                    <option value="">None</option>
                    {openTasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>Goal</Label>
                  <Select value={goalId ?? ''} onChange={(e) => setGoalId(e.target.value || null)}>
                    <option value="">None</option>
                    {activeGoals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </Select>
                </div>
              </div>
              <div><Label>Area</Label><AreaPicker value={areaId} onChange={setAreaId} /></div>
              <div className="flex justify-center gap-2 pt-2">
                <Button variant="primary" className="h-12 px-8 text-base" onClick={start}><Play size={18} fill="currentColor" /> Start focus</Button>
                <Button variant="soft" className="h-12" onClick={() => startTimer({ mode: 'break', totalMs: d.settings.breakMinutes * 60000, label: 'Break', areaId: null, goalId: null, taskId: null })}>
                  <Coffee size={18} /> Break
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-8 flex gap-3">
              {timer.endsAt ? (
                <Button variant="soft" className="h-12 px-6" onClick={pauseTimer}><Pause size={18} /> Pause</Button>
              ) : (
                <Button variant="primary" className="h-12 px-6" onClick={resumeTimer}><Play size={18} fill="currentColor" /> Resume</Button>
              )}
              {!isBreak && <Button variant="soft" className="h-12 px-6" onClick={() => finishTimer(true)} title="Stop and save the minutes so far"><Square size={16} /> Finish</Button>}
              <Button variant="ghost" className="h-12" onClick={() => finishTimer(false)} title="Discard"><RotateCcw size={16} /> Discard</Button>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5"><div className="text-3xl font-extrabold tabular">{fmtMin(todayMin)}</div><div className="text-xs font-semibold text-muted">Today</div></Card>
            <Card className="p-5"><div className="text-3xl font-extrabold tabular">{fmtMin(weekMin)}</div><div className="text-xs font-semibold text-muted">This week</div></Card>
          </div>
          {byArea.length > 0 && (
            <Card className="space-y-3 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">This week by area</div>
              {byArea.map(([id, min]) => {
                const a = id ? areas.get(id) : undefined
                const hex = a ? AREA_HEX[a.color] : '#94a3b8'
                return (
                  <div key={id ?? 'none'}>
                    <div className="mb-1 flex justify-between text-sm"><span>{a ? `${a.emoji} ${a.name}` : 'No area'}</span><span className="font-semibold tabular">{fmtMin(min)}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${(min / weekMin) * 100}%`, background: hex }} /></div>
                  </div>
                )
              })}
            </Card>
          )}
          <Card className="p-2">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted">Today’s sessions</div>
            {sessionsToday.length === 0 ? (
              <div className="p-2"><EmptyState emoji="⏳" title="No sessions yet">Your first 25 minutes are the hardest. Start small.</EmptyState></div>
            ) : sessionsToday.map((f) => (
              <div key={f.id} className="group flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-2/60">
                <span className="w-12 text-xs text-muted tabular">{format(new Date(f.startedAt), 'HH:mm')}</span>
                <span className="flex-1 truncate text-sm">{f.label}</span>
                <AreaChip area={f.areaId ? areas.get(f.areaId) : undefined} />
                <span className="text-sm font-bold tabular">{f.minutes}m</span>
                <IconButton label="Delete session" className="opacity-0 group-hover:opacity-100 hover:text-danger" onClick={() => deleteFocusSession(f.id)}><Trash2 size={14} /></IconButton>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}

export function fmtMin(m: number): string {
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`
}
