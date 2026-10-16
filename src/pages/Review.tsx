import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, Card, cx, IconButton, Label, PageHeader, SectionTitle, Textarea } from '../components/ui'
import { celebrate } from '../lib/celebrate'
import { addDaysKey, fromKey, todayKey, weekDays, weekStartKey } from '../lib/date'
import { xpByDay } from '../lib/gamification'
import { historyStart, isMetOn, isScheduled } from '../lib/habits'
import { useAreaMap, useData, useProgress, useToday } from '../lib/hooks'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import type { WeeklyReview } from '../lib/types'
import { fmtMin } from './Focus'

const MOODS = ['', '😞', '😕', '😐', '🙂', '😄']

export function ReviewPage() {
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
    const done = d.tasks.filter((t) => t.done && t.doneAt && inWeek(t.doneAt))
    const planned = d.tasks.filter((t) => t.date && days.includes(t.date))
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
    const mood = moods.length ? Math.round(moods.reduce<number>((s, m) => s + m, 0) / moods.length) : 0
    const perArea = new Map<string | null, number>()
    for (const t of done) perArea.set(t.areaId, (perArea.get(t.areaId) ?? 0) + 1)
    return { done, planned, habitRate: sched ? met / sched : null, focus, goalLogs, people, xpWeek, best, bestXp: xp[best] ?? 0, mood, perArea }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, ws, events, today])

  const save = () => {
    const first = !existing
    saveReview({ weekStart: ws, ...form })
    if (first) celebrate.tick()
    toast({ emoji: '📓', message: first ? 'Review saved · +30 XP' : 'Review updated' })
  }

  const isCurrent = offset === 0

  return (
    <div>
      <PageHeader
        title="Weekly review"
        subtitle="Fifteen honest minutes a week keep your goals pointed in the right direction."
        right={
          <div className="flex items-center gap-1">
            <IconButton label="Previous week" onClick={() => setOffset((o) => o - 1)}><ChevronLeft size={18} /></IconButton>
            <span className="min-w-36 text-center text-sm font-semibold">{format(fromKey(days[0]), 'MMM d')} – {format(fromKey(days[6]), 'MMM d')}</span>
            <IconButton label="Next week" disabled={isCurrent} onClick={() => setOffset((o) => Math.min(0, o + 1))} className="disabled:opacity-30"><ChevronRight size={18} /></IconButton>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Mini value={`${summary.done.length}`} label={`tasks done${summary.planned.length ? ` of ${summary.planned.length} planned` : ''}`} />
            <Mini value={summary.habitRate === null ? '—' : `${Math.round(summary.habitRate * 100)}%`} label="daily habits kept" />
            <Mini value={fmtMin(summary.focus)} label="focused" />
            <Mini value={`${summary.xpWeek}`} label="XP earned" />
            <Mini value={`${summary.goalLogs}`} label="goal check-ins" />
            <Mini value={`${summary.people}`} label={summary.people === 1 ? 'person you checked in with' : 'people you checked in with'} />
            <Mini value={summary.mood ? MOODS[summary.mood] : '—'} label="average mood" />
          </div>
          {summary.bestXp > 0 && (
            <Card className="p-4 text-sm">
              🌟 Best day: <b>{format(fromKey(summary.best), 'EEEE')}</b> with {summary.bestXp} XP.
            </Card>
          )}
          {summary.done.length > 0 && (
            <Card className="p-5">
              <SectionTitle>What got done</SectionTitle>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {[...summary.perArea.entries()].map(([id, n]) => {
                  const a = id ? areas.get(id) : undefined
                  return <span key={id ?? 'none'} className="rounded-lg bg-surface-2 px-2 py-1 text-xs font-semibold">{a ? `${a.emoji} ${a.name}` : 'Other'} · {n}</span>
                })}
              </div>
              <ul className="max-h-60 space-y-1 overflow-y-auto text-sm">
                {summary.done.map((t) => <li key={t.id} className="flex gap-2"><span className="text-accent">✓</span><span className="text-muted">{t.title}</span></li>)}
              </ul>
            </Card>
          )}
        </div>

        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <SectionTitle className="mb-0">Reflection</SectionTitle>
            {existing && <span className="text-xs text-muted">Saved {format(new Date(existing.savedAt), 'MMM d, HH:mm')}</span>}
          </div>
          <div>
            <Label>🏆 What went well? What am I proud of?</Label>
            <Textarea value={form.wins} onChange={(e) => setForm({ ...form, wins: e.target.value })} className="min-h-24" />
          </div>
          <div>
            <Label>🧗 What got in the way? What will I change?</Label>
            <Textarea value={form.struggles} onChange={(e) => setForm({ ...form, struggles: e.target.value })} className="min-h-24" />
          </div>
          <div>
            <Label>🎯 The one thing that matters most next week</Label>
            <Textarea value={form.nextFocus} onChange={(e) => setForm({ ...form, nextFocus: e.target.value })} className="min-h-16" />
          </div>
          <div>
            <Label>How was this week overall?</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setForm({ ...form, rating: n as WeeklyReview['rating'] })} className="transition hover:scale-110">
                  <Star size={28} className={cx(n <= form.rating ? 'fill-gold text-gold' : 'text-border')} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" onClick={save}>{existing ? 'Update review' : 'Save review'}</Button>
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
