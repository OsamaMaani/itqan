import { format } from 'date-fns'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Flame, Plus, Sparkles, Target, Timer, Zap } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { GoalLogButton } from '../components/GoalCard'
import { HabitTile } from '../components/HabitTile'
import { QuickAdd } from '../components/QuickAdd'
import { TaskItem } from '../components/TaskItem'
import { Button, Card, cx, EmptyState, ProgressBar, ProgressRing, SectionTitle } from '../components/ui'
import { celebrate } from '../lib/celebrate'
import { fromKey, greeting, hijri } from '../lib/date'
import { goalPace, goalProgress } from '../lib/goals'
import { isDueToday, isMetOn } from '../lib/habits'
import { enabledKinds } from '../lib/daily'
import { areaHex, useAreaMap, useData, useMediaQuery, useProgress, useToday } from '../lib/hooks'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import type { Task, TimeOfDay } from '../lib/types'
import { onThisDay } from './Memories'
import { upcoming } from './Reminders'
import { whenText } from '../lib/reminders'
import { checkIn } from '../lib/connections'
import { Avatar } from './Connections'
import { nextAction, projectProgress } from '../lib/projects'

const GROUPS: { key: TimeOfDay; label: string; emoji: string }[] = [
  { key: 'morning', label: 'Morning', emoji: '🌅' },
  { key: 'afternoon', label: 'Afternoon', emoji: '☀️' },
  { key: 'evening', label: 'Evening', emoji: '🌙' },
  { key: 'anytime', label: 'Anytime', emoji: '✨' },
]

const MOODS = ['😞', '😕', '😐', '🙂', '😄']

// Its content (verses, hadith, words…) loads as a separate chunk, so Today itself stays light.
const DailyCard = lazy(() => import('../components/DailyCard'))

const byOrder = (a: Task, b: Task) => b.priority - a.priority || a.order - b.order

export function TodayPage() {
  const today = useToday()
  const d = useData()
  const { level, todayXp, streak } = useProgress()
  const setDayNote = useStore((s) => s.setDayNote)
  const moveTask = useStore((s) => s.moveTask)
  const areas = useAreaMap()
  const [showDone, setShowDone] = useState(false)
  const wide = useMediaQuery('(min-width: 1024px)')

  const todays = d.tasks.filter((t) => t.date === today)
  const overdue = d.tasks.filter((t) => !t.done && t.date !== null && t.date < today).sort(byOrder)
  const open = todays.filter((t) => !t.done).sort(byOrder)
  const done = todays.filter((t) => t.done).sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))
  const habits = d.habits.filter((h) => isDueToday(h, d.habitLogs, today, d.settings.weekStartsOn)).sort((a, b) => a.order - b.order)
  const habitsMet = habits.filter((h) => isMetOn(h, d.habitLogs, today)).length

  const total = todays.length + habits.length
  const completed = done.length + habitsMet
  const ratio = total ? completed / total : 0

  // Celebrate the moment the day becomes complete — not on load.
  const prev = useRef<number | null>(null)
  useEffect(() => {
    if (prev.current !== null && prev.current < 1 && ratio === 1 && total > 0) celebrate.allDone()
    prev.current = ratio
  }, [ratio, total])

  const note = d.dayNotes[today] ?? { intention: '', mood: 0, reflection: '' }
  const focusToday = d.focusSessions.filter((f) => format(new Date(f.startedAt), 'yyyy-MM-dd') === today)
    .reduce((s, f) => s + f.minutes, 0)
  const activeGoals = useMemo(
    () => d.goals.filter((g) => g.status === 'active')
      .map((g) => ({ g, p: goalProgress(g, d.goalLogs), pace: goalPace(g, d.goalLogs, today) }))
      .sort((a, b) => (a.pace.daysLeft ?? 9999) - (b.pace.daysLeft ?? 9999))
      .slice(0, 4),
    [d.goals, d.goalLogs, today],
  )

  const date = fromKey(today)
  // Phone: a folded line under the intention. Laptop: the top of the side column, so tasks stay put.
  const daily = enabledKinds(d.settings.daily).length > 0 && (
    <Suspense fallback={<Card className="h-12">{null}</Card>}><DailyCard /></Suspense>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">
            {format(date, 'EEEE, MMMM d')}
            {d.settings.showHijri && <span className="opacity-70"> · {hijri(date)}</span>}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {greeting()}{d.settings.name ? <>, <span className="text-gradient">{d.settings.name}</span></> : ''}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Pill icon={<Flame size={15} fill="currentColor" />} className="text-gold" label={`${streak} day${streak === 1 ? '' : 's'}`} title="Active-day streak" />
          <Pill icon={<Zap size={15} fill="currentColor" />} className="text-accent" label={`+${todayXp} XP`} title="XP earned today" />
        </div>
      </div>

      {/* Hero row */}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
        <Card className="flex items-center gap-5 p-5">
          <ProgressRing value={ratio} size={96} stroke={10}>
            <div className="text-center">
              <div className="text-2xl font-extrabold tabular">{Math.round(ratio * 100)}%</div>
            </div>
          </ProgressRing>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-muted">Today</div>
            <div className="text-xl font-bold">{completed} of {total} done</div>
            <div className="mt-2 text-xs text-muted">
              {ratio === 1 && total > 0 ? 'Everything done. Masha’Allah! 🎉' : total === 0 ? 'Add a task or habit to begin.' : `${total - completed} left — one at a time.`}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-muted"><Sparkles size={14} /> Intention for today</span>
            <div className="flex gap-0.5">
              {MOODS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setDayNote(today, { mood: note.mood === i + 1 ? 0 : ((i + 1) as 1 | 2 | 3 | 4 | 5) })}
                  className={cx('grid size-7 place-items-center rounded-lg text-base transition hover:scale-110', note.mood === i + 1 ? 'bg-accent-soft' : 'opacity-40 hover:opacity-100')}
                  title="How do you feel?"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={note.intention}
            onChange={(e) => setDayNote(today, { intention: e.target.value })}
            placeholder="What would make today a good day?"
            rows={2}
            className="w-full resize-none bg-transparent text-lg font-semibold leading-snug outline-none placeholder:font-medium placeholder:text-muted/60"
          />
        </Card>

        {!wide && daily}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Tasks */}
        <div className="space-y-4">
          <QuickAdd defaultDate={today} />

          {overdue.length > 0 && (
            <Card className="border-danger/30 p-2">
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-danger">Overdue · {overdue.length}</span>
                <Button size="sm" variant="ghost" onClick={() => overdue.forEach((t) => moveTask(t.id, today))}>Move all to today</Button>
              </div>
              <AnimatePresence initial={false}>
                {overdue.map((t) => <TaskItem key={t.id} task={t} showDate />)}
              </AnimatePresence>
            </Card>
          )}

          {open.length === 0 && done.length === 0 ? (
            <EmptyState emoji="🌤️" title="A clear day">Add what matters most today. Small, specific tasks are easier to start.</EmptyState>
          ) : (
            GROUPS.map(({ key, label, emoji }) => {
              const items = open.filter((t) => t.timeOfDay === key)
              if (!items.length) return null
              const mins = items.reduce((s, t) => s + (t.estimateMin ?? 0), 0)
              return (
                <Card key={key} className="p-2">
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">{emoji} {label} · {items.length}</span>
                    {mins > 0 && <span className="text-[11px] text-muted">~{mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`}</span>}
                  </div>
                  <AnimatePresence initial={false}>
                    {items.map((t) => <TaskItem key={t.id} task={t} />)}
                  </AnimatePresence>
                </Card>
              )
            })
          )}

          {done.length > 0 && (
            <div>
              <button onClick={() => setShowDone((s) => !s)} className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted hover:text-text">
                <ChevronDown size={14} className={cx('transition', !showDone && '-rotate-90')} />
                Completed · {done.length}
              </button>
              <AnimatePresence>
                {showDone && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <Card className="mt-2 p-2">
                      {done.map((t) => <TaskItem key={t.id} task={t} />)}
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {wide && daily}

          <section>
            <SectionTitle right={<button onClick={() => navigate('habits')} className="text-xs font-semibold text-accent hover:underline">All habits</button>}>
              Habits · {habitsMet}/{habits.length}
            </SectionTitle>
            {habits.length === 0 ? (
              <EmptyState emoji="🌱" title="No habits for today">
                <button className="font-semibold text-accent" onClick={() => navigate('habits')}>Create one</button> — Quran, French, reading…
              </EmptyState>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                {habits.map((h) => <HabitTile key={h.id} habit={h} day={today} />)}
              </div>
            )}
          </section>

          <PinnedProjects />

          <section>
            <SectionTitle right={<button onClick={() => navigate('goals')} className="text-xs font-semibold text-accent hover:underline">All goals</button>}>
              Goals in motion
            </SectionTitle>
            {activeGoals.length === 0 ? (
              <EmptyState emoji="🎯" title="No active goals">
                <button className="font-semibold text-accent" onClick={() => navigate('goals')}>Set one</button> to give your days a direction.
              </EmptyState>
            ) : (
              <Card className="divide-y divide-border">
                {activeGoals.map(({ g, p, pace }) => {
                  const area = g.areaId ? areas.get(g.areaId) : undefined
                  const hex = areaHex(area)
                  return (
                    <div key={g.id} className="flex items-center gap-3 p-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl text-lg" style={{ background: `${hex}1f` }}>{area?.emoji ?? <Target size={16} />}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{g.title}</span>
                          <span className="text-xs font-bold tabular" style={{ color: hex }}>{Math.round(p * 100)}%</span>
                        </div>
                        <ProgressBar value={p} color={hex} className="mt-1.5" />
                        {pace.daysLeft !== null && (
                          <div className="mt-1 text-[11px] text-muted">
                            {pace.daysLeft >= 0 ? `${pace.daysLeft} days left` : 'Past deadline'}
                            {pace.perDay !== null && g.kind === 'numeric' && ` · ${fmt(pace.perDay)} ${g.unit}/day to finish`}
                          </div>
                        )}
                      </div>
                      <GoalLogButton goal={g} />
                    </div>
                  )
                })}
              </Card>
            )}
          </section>

          <ComingUp />

          <Card className="flex items-center gap-4 p-4">
            <div className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent"><Timer size={20} /></div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{focusToday} min focused today</div>
              <div className="text-xs text-muted">Level {level.level} · {level.title} — {level.needed - level.into} XP to next</div>
            </div>
            <Button size="sm" variant="primary" onClick={() => navigate('focus')}><Plus size={14} /> Focus</Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

function PinnedProjects() {
  const projects = useStore((s) => s.projects)
  const tasks = useStore((s) => s.tasks)
  const areas = useAreaMap()
  const pinned = projects.filter((p) => p.pinned && p.status !== 'archived' && p.status !== 'done')
  if (!pinned.length) return null
  return (
    <section>
      <SectionTitle right={<button onClick={() => navigate('projects')} className="text-xs font-semibold text-accent hover:underline">All projects</button>}>Projects</SectionTitle>
      <Card className="divide-y divide-border">
        {pinned.map((p) => {
          const hex = areaHex(p.areaId ? areas.get(p.areaId) : null)
          const progress = projectProgress(p, tasks)
          const next = nextAction(p, tasks)
          return (
            <button key={p.id} onClick={() => navigate('projects', p.id)} className="flex w-full items-center gap-3 p-3 text-left">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl text-lg" style={{ background: `${hex}1f` }}>{p.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{p.title}</span>
                  <span className="text-xs font-bold tabular" style={{ color: hex }}>{Math.round(progress * 100)}%</span>
                </div>
                <ProgressBar value={progress} color={hex} className="mt-1.5" />
                {next && <div className="mt-1 truncate text-[11px] text-muted">Next: {next.title}</div>}
              </div>
            </button>
          )
        })}
      </Card>
    </section>
  )
}

function ComingUp() {
  const today = useToday()
  const reminders = useStore((s) => s.reminders)
  const memories = useStore((s) => s.memories)
  const contacts = useStore((s) => s.contacts)
  const interactions = useStore((s) => s.interactions)
  const reach = contacts
    .map((c) => ({ c, ci: checkIn(c, interactions, today) }))
    .filter((x) => x.ci.state === 'overdue' || x.ci.state === 'today')
    .sort((a, b) => (a.ci.days ?? 0) - (b.ci.days ?? 0))
    .slice(0, 4)
  const now = new Date()
  const soon = upcoming(reminders, now, today).filter((x) => x.days <= 7).slice(0, 5)
  const otd = onThisDay(memories, today)
  if (!soon.length && !otd.length && !reach.length) return null
  return (
    <section className="space-y-3">
      {soon.length > 0 && (
        <>
          <SectionTitle right={<button onClick={() => navigate('reminders')} className="text-xs font-semibold text-accent hover:underline">All reminders</button>}>Coming up</SectionTitle>
          <Card className="divide-y divide-border">
            {soon.map(({ r, occ, days }) => (
              <button key={r.id} onClick={() => navigate('reminders')} className="flex w-full items-center gap-3 p-3 text-left">
                <span className="text-xl">{r.emoji || '🔔'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.title}</span>
                  <span className={cx('text-[11px]', days < 0 ? 'font-semibold text-danger' : days === 0 ? 'font-semibold text-accent' : 'text-muted')}>{whenText(r, occ, now)}</span>
                </span>
              </button>
            ))}
          </Card>
        </>
      )}
      {reach.length > 0 && (
        <>
          <SectionTitle right={<button onClick={() => navigate('connections')} className="text-xs font-semibold text-accent hover:underline">All people</button>}>Reach out</SectionTitle>
          <Card className="divide-y divide-border">
            {reach.map(({ c, ci }) => (
              <button key={c.id} onClick={() => navigate('connections', c.id)} className="flex w-full items-center gap-3 p-3 text-left">
                <Avatar c={c} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{c.name}</span>
                  <span className={cx('text-[11px]', ci.state === 'overdue' ? 'font-semibold text-danger' : 'font-semibold text-accent')}>
                    {ci.state === 'overdue' ? `Overdue by ${-(ci.days ?? 0)}d` : 'Check in today'}
                  </span>
                </span>
              </button>
            ))}
          </Card>
        </>
      )}
      {otd.length > 0 && (
        <Card className="relative overflow-hidden p-4">
          <div className="absolute -right-6 -top-6 size-24 rounded-full bg-gradient-accent opacity-15 blur-2xl" />
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-accent">On this day</div>
          {otd.slice(0, 2).map((m) => (
            <button key={m.id} onClick={() => navigate('memories')} className="flex w-full items-center gap-3 py-1 text-left">
              <span className="text-2xl">{m.emoji}</span>
              <span><span className="block text-sm font-semibold">{m.title}</span><span className="text-[11px] text-muted">{m.date.slice(0, 4)}</span></span>
            </button>
          ))}
        </Card>
      )}
    </section>
  )
}

function Pill({ icon, label, className, title }: { icon: React.ReactNode; label: string; className?: string; title?: string }) {
  return (
    <div title={title} className={cx('flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-sm font-bold', className)}>
      {icon}
      <span className="text-text tabular">{label}</span>
    </div>
  )
}

export function fmt(n: number): string {
  return n >= 10 ? Math.ceil(n).toString() : (Math.ceil(n * 10) / 10).toString()
}
