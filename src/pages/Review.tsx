import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, Card, cx, IconButton, Label, PageHeader, SectionTitle, Textarea } from '../components/ui'
import { celebrate } from '../lib/celebrate'
import { rich, useI18n } from '../i18n/react'
import { addDaysKey, todayKey, weekDays, weekStartKey } from '../lib/date'
import { xpByDay } from '../lib/gamification'
import { historyStart, isMetOn, isScheduled } from '../lib/habits'
import { recordCounts, weekStats } from '../lib/training'
import { useAreaMap, useData, useProgress, useToday } from '../lib/hooks'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import type { WeeklyReview } from '../lib/types'

const MOODS = ['', '😞', '😕', '😐', '🙂', '😄']

export function ReviewPage() {
  const t = useI18n()
  const { m } = t
  const d = useData()
  const today = useToday()
  const areas = useAreaMap()
  const { events } = useProgress()
  const saveReview = useStore((s) => s.saveReview)
  const [offset, setOffset] = useState(0)

  const ws = weekStartKey(addDaysKey(today, offset * 7), d.settings.weekStartsOn)
  const days = weekDays(ws, d.settings.weekStartsOn)
  const inWeek = (iso: string) => days.includes(todayKey(new Date(iso)))
  const existing = d.reviews[ws]

  const blank = { wins: '', struggles: '', nextFocus: '', rating: 0 as WeeklyReview['rating'] }
  const [form, setForm] = useState(blank)
  useEffect(() => { setForm(existing ? { ...existing } : blank) /* eslint-disable-next-line */ }, [ws, existing?.savedAt])

  const summary = useMemo(() => {
    const done = d.tasks.filter((k) => k.done && k.doneAt && inWeek(k.doneAt))
    const planned = d.tasks.filter((k) => k.date && days.includes(k.date))
    let sched = 0, met = 0
    for (const h of d.habits) {
      if (h.schedule.type === 'weekly') continue
      const start = historyStart(h, d.habitLogs)
      for (const k of days) {
        if (k > today || k < start || !isScheduled(h, k)) continue
        sched++
        if (isMetOn(h, d.habitLogs, k)) met++
      }
    }
    const focus = d.focusSessions.filter((f) => inWeek(f.startedAt)).reduce((s, f) => s + f.minutes, 0)
    const goalLogs = d.goalLogs.filter((l) => days.includes(l.date)).length
    const people = new Set(d.interactions.filter((i) => days.includes(i.date)).map((i) => i.contactId)).size
    const xp = xpByDay(events)
    const xpWeek = days.reduce((s, k) => s + (xp[k] ?? 0), 0)
    const best = days.reduce((b, k) => ((xp[k] ?? 0) > (xp[b] ?? 0) ? k : b), days[0])
    const moods = days.map((k) => d.dayNotes[k]?.mood ?? 0).filter(Boolean)
    const mood = moods.length ? Math.round(moods.reduce<number>((s, x) => s + x, 0) / moods.length) : 0
    const perArea = new Map<string | null, number>()
    for (const t of done) perArea.set(t.areaId, (perArea.get(t.areaId) ?? 0) + 1)
    // Training (ADR-027): workouts against the program, and records set this week.
    const training = d.program || d.workouts.length ? weekStats(ws, d.settings.weekStartsOn, d.program, d.routines, d.workouts, d.workoutSets, d.exercises) : null
    const counts = recordCounts(d.workouts, d.workoutSets)
    const records = d.workouts.filter((w) => w.finishedAt && days.includes(w.date)).reduce((n, w) => n + (counts.get(w.id) ?? 0), 0)
    return { done, planned, habitRate: sched ? met / sched : null, focus, goalLogs, people, xpWeek, best, bestXp: xp[best] ?? 0, mood, perArea, training, records }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, ws, events, today])

  const save = () => {
    const first = !existing
    saveReview({ weekStart: ws, ...form })
    if (first) celebrate.tick()
    toast({ emoji: '📓', message: first ? m.review.toastSaved : m.review.toastUpdated })
  }

  const isCurrent = offset === 0

  return (
    <div>
      <PageHeader
        title={m.review.title}
        subtitle={m.review.subtitle}
        right={
          <div className="flex items-center gap-1">
            <IconButton label={m.review.previousWeek} onClick={() => setOffset((o) => o - 1)}><ChevronLeft size={18} className="rtl:-scale-x-100" /></IconButton>
            <span className="min-w-36 text-center text-sm font-semibold">{t.f(m.review.weekRange, { start: t.d(days[0], 'short'), end: t.d(days[6], 'short') })}</span>
            <IconButton label={m.review.nextWeek} disabled={isCurrent} onClick={() => setOffset((o) => Math.min(0, o + 1))} className="disabled:opacity-30"><ChevronRight size={18} className="rtl:-scale-x-100" /></IconButton>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Mini value={t.n(summary.done.length)} label={summary.planned.length ? t.p(m.review.tasksDoneOfPlanned, summary.planned.length) : m.review.tasksDone} />
            <Mini value={summary.habitRate === null ? '—' : t.pct(summary.habitRate)} label={m.review.habitsKept} />
            <Mini value={t.dur(summary.focus)} label={m.review.focused} />
            <Mini value={t.n(summary.xpWeek)} label={m.review.xpEarned} />
            <Mini value={t.n(summary.goalLogs)} label={m.review.goalCheckins} />
            <Mini value={t.n(summary.people)} label={t.p(m.review.peopleCheckedIn, summary.people)} />
            <Mini value={summary.mood ? MOODS[summary.mood] : '—'} label={m.review.averageMood} />
            {summary.training && (
              <Mini
                value={t.n(summary.training.done)}
                label={summary.training.planned ? t.p(m.review.workoutsOfPlanned, summary.training.planned) : t.p(m.review.workouts, summary.training.done)}
              />
            )}
            {summary.training && summary.records > 0 && <Mini value={t.n(summary.records)} label={t.p(m.review.records, summary.records)} />}
          </div>
          {summary.bestXp > 0 && (
            <Card className="p-4 text-sm">
              {rich(m.review.bestDay, { day: <b>{t.d(summary.best, 'weekday')}</b>, xp: t.n(summary.bestXp) })}
            </Card>
          )}
          {summary.done.length > 0 && (
            <Card className="p-5">
              <SectionTitle>{m.review.whatGotDone}</SectionTitle>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {[...summary.perArea.entries()].map(([id, n]) => {
                  const a = id ? areas.get(id) : undefined
                  return <span key={id ?? 'none'} className="rounded-lg bg-surface-2 px-2 py-1 text-xs font-semibold">{a ? `${a.emoji} ${a.name}` : m.common.other} · {t.n(n)}</span>
                })}
              </div>
              <ul className="max-h-60 space-y-1 overflow-y-auto text-sm">
                {summary.done.map((k) => <li key={k.id} className="flex gap-2"><span className="text-accent">✓</span><span className="text-muted">{k.title}</span></li>)}
              </ul>
            </Card>
          )}
        </div>

        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <SectionTitle className="mb-0">{m.review.reflection}</SectionTitle>
            {existing && <span className="text-xs text-muted">{t.f(m.review.saved, { date: t.d(new Date(existing.savedAt), 'short'), time: t.d(new Date(existing.savedAt), 'time') })}</span>}
          </div>
          <div>
            <Label>🏆 {m.review.wins}</Label>
            <Textarea value={form.wins} onChange={(e) => setForm({ ...form, wins: e.target.value })} className="min-h-24" />
          </div>
          <div>
            <Label>🧗 {m.review.struggles}</Label>
            <Textarea value={form.struggles} onChange={(e) => setForm({ ...form, struggles: e.target.value })} className="min-h-24" />
          </div>
          <div>
            <Label>🎯 {m.review.nextFocus}</Label>
            <Textarea value={form.nextFocus} onChange={(e) => setForm({ ...form, nextFocus: e.target.value })} className="min-h-16" />
          </div>
          <div>
            <Label>{m.review.rating}</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setForm({ ...form, rating: n as WeeklyReview['rating'] })} className="transition hover:scale-110">
                  <Star size={28} className={cx(n <= form.rating ? 'fill-gold text-gold' : 'text-border')} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" onClick={save}>{existing ? m.review.updateReview : m.review.saveReview}</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Mini({ value, label }: { value: string; label: string }) {
  return (
    <Card className="p-4">
      <div className="text-2xl font-extrabold tabular">{value}</div>
      <div className="text-xs font-semibold text-muted">{label}</div>
    </Card>
  )
}
