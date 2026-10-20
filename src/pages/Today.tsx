import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Flame, Plus, Sparkles, Target, Timer, Zap } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { GoalLogButton } from '../components/GoalCard'
import { HabitTile } from '../components/HabitTile'
import { QuickAdd } from '../components/QuickAdd'
import { TaskItem } from '../components/TaskItem'
import { Button, Card, cx, EmptyState, ProgressBar, ProgressRing, SectionTitle } from '../components/ui'
import { tx } from '../i18n/core'
import { rich, useI18n } from '../i18n/react'
import { celebrate } from '../lib/celebrate'
import { fromKey, greetingKey, toKey } from '../lib/date'
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

const GROUPS: { key: TimeOfDay; emoji: string }[] = [
  { key: 'morning', emoji: '🌅' },
  { key: 'afternoon', emoji: '☀️' },
  { key: 'evening', emoji: '🌙' },
  { key: 'anytime', emoji: '✨' },
]

const MOODS = ['😞', '😕', '😐', '🙂', '😄']

// Its content (verses, hadith, words…) loads as a separate chunk, so Today itself stays light.
const DailyCard = lazy(() => import('../components/DailyCard'))

const byOrder = (a: Task, b: Task) => b.priority - a.priority || a.order - b.order

export function TodayPage() {
  const t = useI18n()
  const { m } = t
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
  const focusToday = d.focusSessions.filter((f) => toKey(new Date(f.startedAt)) === today)
    .reduce((s, f) => s + f.minutes, 0)
  const activeGoals = useMemo(
    () => d.goals.filter((g) => g.status === 'active')
      .map((g) => ({ g, p: goalProgress(g, d), pace: goalPace(g, d, today) }))
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
            {t.d(date, 'full', true)}
            {d.settings.showHijri && <span className="opacity-70"> · {t.hijri(date)}</span>}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {d.settings.name
              ? rich(m.today.greetingWithName, { greeting: m.today.greeting[greetingKey()], name: <span className="text-gradient">{d.settings.name}</span> })
              : m.today.greeting[greetingKey()]}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Pill icon={<Flame size={15} fill="currentColor" />} className="text-gold" label={t.p(m.today.streakDays, streak)} title={m.today.streakTitle} />
          <Pill icon={<Zap size={15} fill="currentColor" />} className="text-accent" label={t.f(m.today.xpToday, { n: todayXp })} title={m.today.xpTitle} />
        </div>
      </div>

      {/* Hero row */}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
        <Card className="flex items-center gap-5 p-5">
          <ProgressRing value={ratio} size={96} stroke={10}>
            <div className="text-center">
              <div className="text-2xl font-extrabold tabular">{t.pct(ratio)}</div>
            </div>
          </ProgressRing>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-muted">{m.today.progressLabel}</div>
            <div className="text-xl font-bold">{t.f(m.today.doneOf, { done: completed, total })}</div>
            <div className="mt-2 text-xs text-muted">
              {ratio === 1 && total > 0 ? m.today.allDone : total === 0 ? m.today.begin : t.p(m.today.left, total - completed)}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-muted"><Sparkles size={14} /> {m.today.intention}</span>
            <div className="flex gap-0.5">
              {MOODS.map((mood, i) => (
                <button
                  key={mood}
                  onClick={() => setDayNote(today, { mood: note.mood === i + 1 ? 0 : ((i + 1) as 1 | 2 | 3 | 4 | 5) })}
                  className={cx('grid size-7 place-items-center rounded-lg text-base transition hover:scale-110', note.mood === i + 1 ? 'bg-accent-soft' : 'opacity-40 hover:opacity-100')}
                  title={m.today.moodTitle}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={note.intention}
            onChange={(e) => setDayNote(today, { intention: e.target.value })}
            placeholder={m.today.intentionPlaceholder}
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
                <span className="text-xs font-bold uppercase tracking-wider text-danger">{t.f(m.today.overdue, { n: overdue.length })}</span>
                <Button size="sm" variant="ghost" onClick={() => overdue.forEach((x) => moveTask(x.id, today))}>{m.today.moveAll}</Button>
              </div>
              <AnimatePresence initial={false}>
                {overdue.map((x) => <TaskItem key={x.id} task={x} showDate />)}
              </AnimatePresence>
            </Card>
          )}

          {open.length === 0 && done.length === 0 ? (
            <EmptyState emoji="🌤️" title={m.today.emptyTitle}>{m.today.emptyBody}</EmptyState>
          ) : (
            GROUPS.map(({ key, emoji }) => {
              const items = open.filter((x) => x.timeOfDay === key)
              if (!items.length) return null
              const mins = items.reduce((sum, x) => sum + (x.estimateMin ?? 0), 0)
              return (
                <Card key={key} className="p-2">
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">{emoji} {t.f(m.today.groupCount, { label: m.today.groups[key], n: items.length })}</span>
                    {mins > 0 && <span className="text-[11px] text-muted">{t.f(m.today.estimate, { duration: t.dur(mins) })}</span>}
                  </div>
                  <AnimatePresence initial={false}>
                    {items.map((x) => <TaskItem key={x.id} task={x} />)}
                  </AnimatePresence>
                </Card>
              )
            })
          )}

          {done.length > 0 && (
            <div>
              <button onClick={() => setShowDone((s) => !s)} className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted hover:text-text">
                <ChevronDown size={14} className={cx('transition', !showDone && '-rotate-90 rtl:rotate-90')} />
                {t.f(m.today.completed, { n: done.length })}
              </button>
              <AnimatePresence>
                {showDone && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <Card className="mt-2 p-2">
                      {done.map((x) => <TaskItem key={x.id} task={x} />)}
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
            <SectionTitle right={<button onClick={() => navigate('habits')} className="text-xs font-semibold text-accent hover:underline">{m.today.allHabits}</button>}>
              {t.f(m.today.habits, { met: habitsMet, total: habits.length })}
            </SectionTitle>
            {habits.length === 0 ? (
              <EmptyState emoji="🌱" title={m.today.noHabits}>
                {rich(m.today.noHabitsBody, { create: <button className="font-semibold text-accent" onClick={() => navigate('habits')}>{m.today.createOne}</button> })}
              </EmptyState>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                {habits.map((h) => <HabitTile key={h.id} habit={h} day={today} />)}
              </div>
            )}
          </section>

          <PinnedProjects />

          <section>
            <SectionTitle right={<button onClick={() => navigate('goals')} className="text-xs font-semibold text-accent hover:underline">{m.today.allGoals}</button>}>
              {m.today.goalsTitle}
            </SectionTitle>
            {activeGoals.length === 0 ? (
              <EmptyState emoji="🎯" title={m.today.noGoals}>
                {rich(m.today.noGoalsBody, { set: <button className="font-semibold text-accent" onClick={() => navigate('goals')}>{m.today.setOne}</button> })}
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
                          <span className="text-xs font-bold tabular" style={{ color: hex }}>{t.pct(p)}</span>
                        </div>
                        <ProgressBar value={p} color={hex} className="mt-1.5" />
                        {pace.daysLeft !== null && (
                          <div className="mt-1 text-[11px] text-muted">
                            {pace.daysLeft >= 0 ? t.p(m.today.daysLeft, pace.daysLeft) : m.today.pastDeadline}
                            {pace.perDay !== null && g.kind === 'numeric' && ` · ${t.f(m.today.perDay, { amount: fmt(pace.perDay), unit: g.unit })}`}
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
              <div className="text-sm font-semibold">{t.p(m.today.focusedToday, focusToday)}</div>
              <div className="text-xs text-muted">{t.f(m.today.levelLine, { n: level.level, title: m.levels[level.rank], xp: level.needed - level.into })}</div>
            </div>
            <Button size="sm" variant="primary" onClick={() => navigate('focus')}><Plus size={14} /> {m.nav.focus}</Button>
          </Card>
        </div>
      </div>
    </div>
  )
}

function PinnedProjects() {
  const t = useI18n()
  const { m } = t
  const projects = useStore((s) => s.projects)
  const tasks = useStore((s) => s.tasks)
  const areas = useAreaMap()
  const pinned = projects.filter((p) => p.pinned && p.status !== 'archived' && p.status !== 'done')
  if (!pinned.length) return null
  return (
    <section>
      <SectionTitle right={<button onClick={() => navigate('projects')} className="text-xs font-semibold text-accent hover:underline">{m.today.allProjects}</button>}>{m.nav.projects}</SectionTitle>
      <Card className="divide-y divide-border">
        {pinned.map((p) => {
          const hex = areaHex(p.areaId ? areas.get(p.areaId) : null)
          const progress = projectProgress(p, tasks)
          const next = nextAction(p, tasks)
          return (
            <button key={p.id} onClick={() => navigate('projects', p.id)} className="flex w-full items-center gap-3 p-3 text-start">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl text-lg" style={{ background: `${hex}1f` }}>{p.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{p.title}</span>
                  <span className="text-xs font-bold tabular" style={{ color: hex }}>{t.pct(progress)}</span>
                </div>
                <ProgressBar value={progress} color={hex} className="mt-1.5" />
                {next && <div className="mt-1 truncate text-[11px] text-muted">{t.f(m.today.next, { title: next.title })}</div>}
              </div>
            </button>
          )
        })}
      </Card>
    </section>
  )
}

function ComingUp() {
  const t = useI18n()
  const { m } = t
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
          <SectionTitle right={<button onClick={() => navigate('reminders')} className="text-xs font-semibold text-accent hover:underline">{m.today.allReminders}</button>}>{m.today.comingUp}</SectionTitle>
          <Card className="divide-y divide-border">
            {soon.map(({ r, occ, days }) => (
              <button key={r.id} onClick={() => navigate('reminders')} className="flex w-full items-center gap-3 p-3 text-start">
                <span className="text-xl">{r.emoji || '🔔'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.title}</span>
                  <span className={cx('text-[11px]', days < 0 ? 'font-semibold text-danger' : days === 0 ? 'font-semibold text-accent' : 'text-muted')}>{whenText(r, occ, now, t)}</span>
                </span>
              </button>
            ))}
          </Card>
        </>
      )}
      {reach.length > 0 && (
        <>
          <SectionTitle right={<button onClick={() => navigate('connections')} className="text-xs font-semibold text-accent hover:underline">{m.today.allPeople}</button>}>{m.today.reachOut}</SectionTitle>
          <Card className="divide-y divide-border">
            {reach.map(({ c, ci }) => (
              <button key={c.id} onClick={() => navigate('connections', c.id)} className="flex w-full items-center gap-3 p-3 text-start">
                <Avatar c={c} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{c.name}</span>
                  <span className={cx('text-[11px]', ci.state === 'overdue' ? 'font-semibold text-danger' : 'font-semibold text-accent')}>
                    {ci.state === 'overdue' ? t.p(m.today.overdueBy, -(ci.days ?? 0)) : m.today.checkInToday}
                  </span>
                </span>
              </button>
            ))}
          </Card>
        </>
      )}
      {otd.length > 0 && (
        <Card className="relative overflow-hidden p-4">
          <div className="absolute -end-6 -top-6 size-24 rounded-full bg-gradient-accent opacity-15 blur-2xl" />
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-accent">{m.today.onThisDay}</div>
          {otd.slice(0, 2).map((mem) => (
            <button key={mem.id} onClick={() => navigate('memories')} className="flex w-full items-center gap-3 py-1 text-start">
              <span className="text-2xl">{mem.emoji}</span>
              <span><span className="block text-sm font-semibold">{mem.title}</span><span className="text-[11px] text-muted">{t.d(mem.date, 'year')}</span></span>
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
      {/* bdi: "+5 XP" keeps its sign in front in right-to-left languages */}
      <bdi className="text-text tabular">{label}</bdi>
    </div>
  )
}

/** A per-day pace, rounded up (10+ to whole units, below that to one decimal), in the interface language. */
export function fmt(n: number, t = tx()): string {
  return t.n(n >= 10 ? Math.ceil(n) : Math.ceil(n * 10) / 10)
}
