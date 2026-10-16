import { format } from 'date-fns'
import { motion } from 'motion/react'
import { CheckCircle2, Clock, Flame, Lock, Trophy, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Heatmap } from '../components/Heatmap'
import { Card, cx, PageHeader, ProgressBar, Segmented, SectionTitle } from '../components/ui'
import { AREA_HEX } from '../lib/colors'
import { addDaysKey, fromKey, rangeKeys, todayKey } from '../lib/date'
import { badges as computeBadges, xpByDay } from '../lib/gamification'
import { completionRate, isMetOn, streak } from '../lib/habits'
import { useData, useProgress, useToday } from '../lib/hooks'
import { fmtMin } from './Focus'

export function InsightsPage() {
  const d = useData()
  const today = useToday()
  const { events, total, level, streak: active } = useProgress()
  const [range, setRange] = useState<14 | 30 | 90>(30)

  const from = addDaysKey(today, -(range - 1))
  const days = rangeKeys(from, today)
  const byDay = useMemo(() => xpByDay(events), [events])
  const maxXp = Math.max(10, ...days.map((k) => byDay[k] ?? 0))

  const tasksDone = d.tasks.filter((t) => t.done).length
  const focusMin = d.focusSessions.reduce((s, f) => s + f.minutes, 0)
  const bestStreak = Math.max(0, ...d.habits.map((h) => streak(h, d.habitLogs, today, d.settings.weekStartsOn).best))
  const badges = useMemo(() => computeBadges(d, today), [d, today])
  const unlocked = badges.filter((b) => b.unlocked).length

  // Effort per area over the selected range: tasks, habit days and focus time, as one score.
  const areaStats = useMemo(() => {
    const inRange = (k: string) => k >= from && k <= today
    return d.areas.filter((a) => !a.archived).map((a) => {
      const tasks = d.tasks.filter((t) => t.areaId === a.id && t.done && t.doneAt && inRange(todayKey(new Date(t.doneAt)))).length
      const habitDays = d.habits.filter((h) => h.areaId === a.id)
        .reduce((s, h) => s + days.filter((k) => isMetOn(h, d.habitLogs, k)).length, 0)
      const focus = d.focusSessions.filter((f) => f.areaId === a.id && inRange(todayKey(new Date(f.startedAt)))).reduce((s, f) => s + f.minutes, 0)
      return { a, tasks, habitDays, focus, score: tasks * 10 + habitDays * 8 + focus }
    }).sort((x, y) => y.score - x.score)
  }, [d, from, today, days])
  const maxScore = Math.max(1, ...areaStats.map((s) => s.score))

  const rangeXp = days.reduce((s, k) => s + (byDay[k] ?? 0), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        subtitle="Where your time and energy went — and how far you've come."
        right={<Segmented value={range} onChange={setRange} options={[{ value: 14, label: '14d' }, { value: 30, label: '30d' }, { value: 90, label: '90d' }]} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr]">
        <Card className="relative col-span-2 overflow-hidden p-5 lg:col-span-1">
          <div className="absolute -right-6 -top-6 size-32 rounded-full bg-gradient-accent opacity-20 blur-2xl" />
          <div className="text-xs font-bold uppercase tracking-wider text-muted">Level</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-5xl font-extrabold text-gradient tabular">{level.level}</span>
            <span className="font-bold">{level.title}</span>
          </div>
          <ProgressBar value={level.progress} className="mt-3" height={8} />
          <div className="mt-1.5 text-xs text-muted tabular">{level.into} / {level.needed} XP · {total.toLocaleString()} XP total</div>
        </Card>
        <StatCard icon={<CheckCircle2 size={18} />} value={tasksDone.toLocaleString()} label="tasks completed" />
        <StatCard icon={<Clock size={18} />} value={fmtMin(focusMin)} label="focused, all time" />
        <StatCard icon={<Trophy size={18} />} value={`${bestStreak}`} label="best habit streak" />
        <StatCard icon={<Flame size={18} />} value={`${active}`} label="active days in a row" />
      </div>

      <Card className="p-5">
        <SectionTitle right={<span className="text-xs font-semibold text-muted">{rangeXp.toLocaleString()} XP in {range} days</span>}>
          <span className="inline-flex items-center gap-1.5"><Zap size={13} /> XP per day</span>
        </SectionTitle>
        <div className="flex h-40 items-end gap-[3px]">
          {days.map((k, i) => {
            const v = byDay[k] ?? 0
            return (
              <div key={k} className="group relative flex h-full flex-1 items-end">
                <motion.div
                  className={cx('w-full rounded-t-md', k === today ? 'bg-gradient-accent' : 'bg-accent/60 group-hover:bg-accent')}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(v ? 4 : 1.5, (v / maxXp) * 100)}%` }}
                  transition={{ delay: i * 0.008, type: 'spring', bounce: 0.2 }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-text px-2 py-1 text-[11px] font-semibold text-bg group-hover:block">
                  {format(fromKey(k), 'EEE MMM d')} · {v} XP
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-semibold text-muted">
          <span>{format(fromKey(from), 'MMM d')}</span><span>Today</span>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle>Balance across areas</SectionTitle>
          {areaStats.length === 0 ? <p className="text-sm text-muted">Create areas in Settings to see your balance.</p> : (
            <div className="space-y-3.5">
              {areaStats.map(({ a, tasks, habitDays, focus, score }) => (
                <div key={a.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold">{a.emoji} {a.name}</span>
                    <span className="text-xs text-muted tabular">{tasks} tasks · {habitDays} habit days · {fmtMin(focus)}</span>
                  </div>
                  <ProgressBar value={score / maxScore} color={AREA_HEX[a.color]} height={8} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle>Habit consistency · {range}d</SectionTitle>
          {d.habits.length === 0 ? <p className="text-sm text-muted">No habits yet.</p> : (
            <div className="space-y-3.5">
              {d.habits.filter((h) => !h.archived).map((h) => {
                const r = completionRate(h, d.habitLogs, from, today, today, d.settings.weekStartsOn)
                const a = d.areas.find((x) => x.id === h.areaId)
                return (
                  <div key={h.id}>
                    <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{h.emoji} {h.name}</span><span className="font-bold tabular">{Math.round(r * 100)}%</span></div>
                    <ProgressBar value={r} color={a ? AREA_HEX[a.color] : undefined} height={8} />
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle>Activity · last 6 months</SectionTitle>
        <Heatmap end={today} weeks={26} weekStartsOn={d.settings.weekStartsOn} cell={14} value={(k) => Math.min(1, (byDay[k] ?? 0) / 120)} label={(k) => `${format(fromKey(k), 'EEE, MMM d')}: ${byDay[k] ?? 0} XP`} />
      </Card>

      <div>
        <SectionTitle>Badges · {unlocked}/{badges.length}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {badges.map((b) => (
            <Card key={b.id} className={cx('relative p-4 text-center transition', !b.unlocked && 'opacity-50 grayscale')}>
              {!b.unlocked && <Lock size={12} className="absolute right-3 top-3 text-muted" />}
              <div className="text-3xl">{b.emoji}</div>
              <div className="mt-2 text-sm font-bold">{b.title}</div>
              <div className="mt-0.5 text-[11px] leading-tight text-muted">{b.description}</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <Card className="p-5">
      <div className="mb-3 grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">{icon}</div>
      <div className="text-2xl font-extrabold tabular">{value}</div>
      <div className="text-xs font-semibold text-muted">{label}</div>
    </Card>
  )
}
