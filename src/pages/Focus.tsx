import { motion } from 'motion/react'
import { Coffee, Pause, Play, RotateCcw, Square, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AreaPicker } from '../components/AreaPicker'
import { CycleChoices, CycleControls, CyclePlanner, CycleStrip, CycleSummary, isWaiting, PauseReasons } from '../components/focus/cycle'
import { mmss, remainingMs } from '../components/TimerWatcher'
import { AreaChip, Button, Card, cx, EmptyState, IconButton, Input, Label, PageHeader, Segmented, Select } from '../components/ui'
import { tx } from '../i18n/core'
import { rich, useI18n } from '../i18n/react'
import { AREA_HEX } from '../lib/colors'
import { todayKey, weekDays } from '../lib/date'
import { amountOn, countsMinutes } from '../lib/habits'
import { useAreaMap, useData, useTick, useToday } from '../lib/hooks'
import { HAS_HELPER } from '../lib/notifier'
import { pushSupport } from '../lib/pushDevice'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'

const PRESETS = [15, 25, 50, 90]

export function FocusPage() {
  const t = useI18n()
  const { m } = t
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
  const [habitId, setHabitId] = useState<string | null>(null)
  // Which way of starting was used last, remembered on this device only (a convenience, not data).
  const [mode, setModeState] = useState<'single' | 'cycle'>(() => {
    try { return d.cycle || localStorage.getItem('itqan-focus-mode') === 'cycle' ? 'cycle' : 'single' } catch { return 'single' }
  })
  const setMode = (v: 'single' | 'cycle') => { setModeState(v); try { localStorage.setItem('itqan-focus-mode', v) } catch { /* private mode */ } }
  const [dismissed, setDismissed] = useState<string | null>(null)
  const cycle = d.cycle

  const openTasks = d.tasks.filter((x) => !x.done && x.date !== null && x.date <= today)
  const activeGoals = d.goals.filter((g) => g.status === 'active')
  const habits = d.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order)
  const habit = habits.find((h) => h.id === habitId)
  const habitById = useMemo(() => new Map(d.habits.map((h) => [h.id, h])), [d.habits])

  const pickHabit = (id: string | null) => {
    setHabitId(id)
    const h = d.habits.find((x) => x.id === id)
    // A habit counted in minutes suggests what is left of today's target as the session length.
    const left = h && countsMinutes(h) ? h.target - amountOn(d.habitLogs, h.id, today) : 0
    if (left >= 1) setMinutes(Math.min(240, left))
  }

  const left = timer ? remainingMs(timer, now) : minutes * 60000
  const total = timer ? timer.totalMs : minutes * 60000
  const progress = timer ? 1 - left / total : 0
  const isBreak = timer?.mode === 'break'
  const waiting = isWaiting(timer, now)
  const inCycle = !!timer?.cycleId && !!cycle
  // The summary of a cycle that ended in the last half hour, until it is closed.
  const lastCycle = d.focusCycles.at(-1)
  const summary = !timer && lastCycle && lastCycle.id !== dismissed && now - Date.parse(lastCycle.endedAt) < 30 * 60_000 ? lastCycle : null
  const task0 = openTasks.find((x) => x.id === taskId)
  const what = {
    label: label || task0?.title || habit?.name || m.focus.defaultLabel,
    areaId: areaId ?? task0?.areaId ?? habit?.areaId ?? null, goalId: goalId ?? task0?.goalId ?? null, taskId, habitId: habit?.id ?? null,
  }

  const start = () => {
    const task = openTasks.find((x) => x.id === taskId)
    startTimer({
      mode: 'focus', totalMs: minutes * 60000, label: label || task?.title || habit?.name || m.focus.defaultLabel,
      areaId: areaId ?? task?.areaId ?? habit?.areaId ?? null, goalId: goalId ?? task?.goalId ?? null, taskId, habitId: habit?.id ?? null,
    })
    updateSettings({ focusMinutes: minutes })
  }

  const sessionsToday = d.focusSessions.filter((f) => todayKey(new Date(f.startedAt)) === today).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  const week = weekDays(today, d.settings.weekStartsOn)
  const weekSessions = d.focusSessions.filter((f) => week.includes(todayKey(new Date(f.startedAt))))
  const todayMin = sessionsToday.reduce((s, f) => s + f.minutes, 0)
  const weekMin = weekSessions.reduce((s, f) => s + f.minutes, 0)
  const byArea = useMemo(() => {
    const sums = new Map<string | null, number>()
    for (const f of weekSessions) sums.set(f.areaId, (sums.get(f.areaId) ?? 0) + f.minutes)
    return [...sums.entries()].sort((a, b) => b[1] - a[1])
  }, [weekSessions])

  const R = 130
  const C = 2 * Math.PI * R

  return (
    <div>
      <PageHeader title={m.nav.focus} subtitle={m.focus.subtitle} />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="flex flex-col items-center p-6 sm:p-10">
          {inCycle && <CycleStrip cycle={cycle!} mode={timer!.mode} />}
          {summary && <div className="mb-6 flex w-full justify-center"><CycleSummary record={summary} onClose={() => setDismissed(summary.id)} /></div>}
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
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted">{waiting ? '🔔' : timer ? (isBreak ? m.focus.state.break : m.focus.state.focus) : m.focus.state.ready}</div>
              <div dir="ltr" className="my-1 text-5xl font-extrabold sm:text-6xl tabular tracking-tight">{mmss(left)}</div>
              <div className="mx-auto max-w-48 truncate text-sm text-muted">{timer?.label ?? (label || m.focus.idleLabel)}</div>
            </div>
          </div>

          {!timer ? (
            <div className="mt-8 w-full max-w-md space-y-4">
              <div className="flex justify-center">
                <Segmented value={mode} onChange={setMode} options={[{ value: 'single' as const, label: m.focus.cycle.mode.single }, { value: 'cycle' as const, label: m.focus.cycle.mode.cycle }]} />
              </div>
              {mode === 'single' && <div className="flex flex-wrap justify-center gap-2">
                {PRESETS.map((p) => (
                  <button key={p} onClick={() => setMinutes(p)} className={cx('h-10 w-14 rounded-xl text-sm font-bold transition', minutes === p ? 'bg-gradient-accent text-accent-fg' : 'bg-surface-2 text-muted hover:text-text')}>
                    {t.f(m.time.minutes, { m: p })}
                  </button>
                ))}
                <Input type="number" min={1} max={240} value={minutes} onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))} className="w-20 text-center" />
              </div>}
              <Input placeholder={m.focus.labelPlaceholder} value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && mode === 'single' && start()} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>{m.focus.task}</Label>
                  <Select value={taskId ?? ''} onChange={(e) => setTaskId(e.target.value || null)}>
                    <option value="">{m.common.none.task}</option>
                    {openTasks.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>{m.common.goal}</Label>
                  <Select value={goalId ?? ''} onChange={(e) => setGoalId(e.target.value || null)}>
                    <option value="">{m.common.none.goal}</option>
                    {activeGoals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </Select>
                </div>
              </div>
              <div>
                <Label>{m.focus.habit}</Label>
                <Select value={habitId ?? ''} onChange={(e) => pickHabit(e.target.value || null)}>
                  <option value="">{m.common.none.habit}</option>
                  {habits.map((h) => <option key={h.id} value={h.id}>{h.emoji} {h.name}</option>)}
                </Select>
                {habit && <p className="mt-1.5 text-xs text-muted">{t.f(countsMinutes(habit) ? m.focus.habitAddsMinutes : m.focus.habitChecksIn, { name: habit.name })}</p>}
              </div>
              <div><Label>{m.common.area}</Label><AreaPicker value={areaId} onChange={setAreaId} /></div>
              {mode === 'cycle' && (
                <CyclePlanner what={what} tasks={openTasks} habits={habits} />
              )}
              {mode === 'single' && <div className="flex justify-center gap-2 pt-2">
                <Button variant="primary" className="h-12 px-8 text-base" onClick={start}><Play size={18} fill="currentColor" /> {m.focus.start}</Button>
                <Button variant="soft" className="h-12" onClick={() => startTimer({ mode: 'break', totalMs: d.settings.breakMinutes * 60000, label: m.focus.breakLabel, areaId: null, goalId: null, taskId: null, habitId: null })}>
                  <Coffee size={18} /> {m.focus.takeBreak}
                </Button>
              </div>}
              {/* Permission is asked once, in Settings (ADR-031) — here only a pointer while it hasn't been. */}
              {!HAS_HELPER && d.settings.notify.on && d.settings.notify.timer && ('Notification' in window ? Notification.permission === 'default' : pushSupport() === 'home-screen') && (
                <p className="text-center text-xs text-muted">
                  {rich(m.focus.notifyHint, { link: <button className="font-semibold text-accent" onClick={() => navigate('settings', 'notifications')}>{m.focus.notifyHintLink}</button> })}
                </p>
              )}
            </div>
          ) : waiting ? (
            <div className="mt-8 flex w-full justify-center"><CycleChoices /></div>
          ) : inCycle ? (
            <CycleControls />
          ) : (
            <div className="mt-8 flex flex-col items-center gap-4">
            {!timer.endsAt && timer.pauseId && <PauseReasons id={timer.pauseId} />}
            <div className="flex gap-3">
              {timer.endsAt ? (
                <Button variant="soft" className="h-12 px-6" onClick={pauseTimer}><Pause size={18} /> {m.focus.pause}</Button>
              ) : (
                <Button variant="primary" className="h-12 px-6" onClick={resumeTimer}><Play size={18} fill="currentColor" /> {m.focus.resume}</Button>
              )}
              {!isBreak && <Button variant="soft" className="h-12 px-6" onClick={() => finishTimer(true)} title={m.focus.finishTitle}><Square size={16} /> {m.focus.finish}</Button>}
              <Button variant="ghost" className="h-12" onClick={() => finishTimer(false)} title={m.focus.discard}><RotateCcw size={16} /> {m.focus.discard}</Button>
            </div>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5"><div className="text-3xl font-extrabold tabular">{fmtMin(todayMin, t)}</div><div className="text-xs font-semibold text-muted">{m.time.today}</div></Card>
            <Card className="p-5"><div className="text-3xl font-extrabold tabular">{fmtMin(weekMin, t)}</div><div className="text-xs font-semibold text-muted">{m.focus.thisWeek}</div></Card>
          </div>
          {byArea.length > 0 && (
            <Card className="space-y-3 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">{m.focus.weekByArea}</div>
              {byArea.map(([id, min]) => {
                const a = id ? areas.get(id) : undefined
                const hex = a ? AREA_HEX[a.color] : '#94a3b8'
                return (
                  <div key={id ?? 'none'}>
                    <div className="mb-1 flex justify-between text-sm"><span>{a ? `${a.emoji} ${a.name}` : m.common.noArea}</span><span className="font-semibold tabular">{fmtMin(min, t)}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full" style={{ width: `${(min / weekMin) * 100}%`, background: hex }} /></div>
                  </div>
                )
              })}
            </Card>
          )}
          <Card className="p-2">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted">{m.focus.todaysSessions}</div>
            {sessionsToday.length === 0 ? (
              <div className="p-2"><EmptyState emoji="⏳" title={m.focus.noSessionsTitle}>{m.focus.noSessionsBody}</EmptyState></div>
            ) : sessionsToday.map((f) => (
              <div key={f.id} className="group flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-2/60">
                <span className="w-[4.5rem] shrink-0 text-xs text-muted tabular">{t.d(new Date(f.startedAt), 'time')}</span>
                {f.cycleId && <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-accent">{m.focus.cycle.tag}</span>}
                <span className="flex-1 truncate text-sm">{f.habitId && habitById.get(f.habitId) ? `${habitById.get(f.habitId)!.emoji} ` : ''}{f.label}</span>
                <AreaChip area={f.areaId ? areas.get(f.areaId) : undefined} />
                <span className="text-sm font-bold tabular">{t.dur(f.minutes)}</span>
                <IconButton label={m.focus.deleteSession} className="opacity-0 group-hover:opacity-100 hover:text-danger" onClick={() => deleteFocusSession(f.id)}><Trash2 size={14} /></IconButton>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}

/** Minutes as 45m / 1h 20m in the interface language. */
export function fmtMin(minutes: number, t = tx()): string {
  return t.dur(minutes)
}
