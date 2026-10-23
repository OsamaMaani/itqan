import { Activity, Award, BarChart3, CheckCircle2, Clock, Flame, Lock, Play, Target, Timer, Trophy, Zap } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { ColumnChart, Delta, MINUTE_STEPS, ShareBar, Sparkline } from '../components/charts'
import { Heatmap } from '../components/Heatmap'
import { usePageAction } from '../components/Shell'
import { Button, Card, cx, PageHeader, ProgressBar, Segmented, SectionTitle } from '../components/ui'
import { useI18n } from '../i18n/react'
import { AREA_HEX, NEUTRAL_HEX } from '../lib/colors'
import { addDaysKey, rangeKeys, todayKey } from '../lib/date'
import { badges as computeBadges, xpByDay } from '../lib/gamification'
import { completionRate, isMetOn, streak } from '../lib/habits'
import { useData, useProgress, useToday } from '../lib/hooks'
import { change, focusStats, focusStreak, habitConsistency, previousRange, tasksDoneByDay } from '../lib/insights'
import { navigate } from '../lib/router'
import type { DateKey } from '../lib/types'

type Range = 7 | 14 | 30 | 90
const RANGES: Range[] = [7, 14, 30, 90]
/** Names of the LENGTH_BANDS, in the same order. */
const BANDS = ['under15', 'b15', 'b30', 'b60', 'over90'] as const
const hh = (h: number) => `${String(h % 24).padStart(2, '0')}:00`

export function InsightsPage() {
  usePageAction(null)
  const t = useI18n()
  const { m } = t
  const mi = m.insights
  const d = useData()
  const today = useToday()
  const wso = d.settings.weekStartsOn
  const { events, total, level, todayXp, streak: active } = useProgress()
  const [range, setRange] = useState<Range>(30)
  const [heat, setHeat] = useState<'xp' | 'focus'>('xp')

  const from = addDaysKey(today, -(range - 1))
  const prev = previousRange(from, today)
  const days = useMemo(() => rangeKeys(from, today), [from, today])
  const byDay = useMemo(() => xpByDay(events), [events])

  const s = useMemo(() => {
    const sumXp = (ks: DateKey[]) => ks.reduce((a, k) => a + (byDay[k] ?? 0), 0)
    const tasksNow = tasksDoneByDay(d.tasks, from, today)
    const tasksPrev = tasksDoneByDay(d.tasks, prev.from, prev.to)
    const count = (r: Record<DateKey, number>) => Object.values(r).reduce((a, b) => a + b, 0)
    return {
      xp: sumXp(days), xpPrev: sumXp(rangeKeys(prev.from, prev.to)),
      tasksSeries: days.map((k) => tasksNow[k]), tasks: count(tasksNow), tasksPrev: count(tasksPrev),
      cons: habitConsistency(d.habits, d.habitLogs, from, today, today, wso),
      consPrev: habitConsistency(d.habits, d.habitLogs, prev.from, prev.to, today, wso),
      focus: focusStats(d.focusSessions, from, today),
      focusPrev: focusStats(d.focusSessions, prev.from, prev.to),
      focusStreak: focusStreak(d.focusSessions, today),
      focusAll: d.focusSessions.reduce((a, f) => a + f.minutes, 0),
      tasksAll: d.tasks.filter((x) => x.done).length,
    }
  }, [d, from, today, prev.from, prev.to, days, byDay, wso])

  const bestStreak = Math.max(0, ...d.habits.map((h) => streak(h, d.habitLogs, today, wso).best))
  const badges = useMemo(() => computeBadges(d, today), [d, today])
  const unlocked = badges.filter((b) => b.unlocked).length

  // Effort per area over the selected range: tasks, habit days and focus time, as one score.
  const areaStats = useMemo(() => {
    const inRange = (k: string) => k >= from && k <= today
    return d.areas.filter((a) => !a.archived).map((a) => {
      const tasks = d.tasks.filter((x) => x.areaId === a.id && x.done && x.doneAt && inRange(todayKey(new Date(x.doneAt)))).length
      const habitDays = d.habits.filter((h) => h.areaId === a.id)
        .reduce((sum, h) => sum + days.filter((k) => isMetOn(h, d.habitLogs, k)).length, 0)
      const focus = s.focus.byArea.find((x) => x.areaId === a.id)?.minutes ?? 0
      return { a, tasks, habitDays, focus, score: tasks * 10 + habitDays * 8 + focus }
    }).sort((x, y) => y.score - x.score)
  }, [d, from, today, days, s.focus])
  const maxScore = Math.max(1, ...areaStats.map((x) => x.score))

  const heatFocus = useMemo(() => focusStats(d.focusSessions, addDaysKey(today, -26 * 7), today).byDay, [d.focusSessions, today])
  const xpSeries = days.map((k) => byDay[k] ?? 0)
  const xLabels = dayLabels(days, today, t)

  return (
    <div className="space-y-8">
      <PageHeader
        title={m.nav.insights}
        subtitle={
          <>
            <span className="block">{mi.subtitle}</span>
            <span className="mt-1 block text-xs font-semibold text-muted/90">
              {t.p(mi.rangeCaption, range, { from: t.d(from, 'short'), to: t.d(today, 'short') })}
            </span>
          </>
        }
        right={<Segmented value={range} onChange={setRange} options={RANGES.map((n) => ({ value: n, label: t.p(mi.rangeShort, n) }))} />}
      />

      {/* ---- Overview ---- */}
      <Section icon={<BarChart3 size={15} />} title={mi.section.overview}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Card className="relative flex flex-col overflow-hidden p-5">
            <div className="absolute -end-8 -top-8 size-36 rounded-full bg-gradient-accent opacity-20 blur-2xl" />
            <div className="text-xs font-semibold text-muted">{mi.level}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-gradient">{t.n(level.level)}</span>
              <span className="font-bold">{m.levels[level.rank]}</span>
            </div>
            <ProgressBar value={level.progress} className="mt-3" height={8} />
            <div className="mb-4 mt-1.5 text-xs text-muted tabular">{t.f(mi.levelProgress, { into: level.into, needed: level.needed, total })}</div>
            <div className="mt-auto space-y-1.5 border-t border-border pt-3 text-xs font-semibold">
              <div className="flex items-center gap-2"><Flame size={14} className="text-gold" />{t.p(mi.activeStreak, active)}</div>
              <div className="flex items-center gap-2"><Trophy size={14} className="text-gold" />{t.p(mi.bestHabitStreak, bestStreak)}</div>
              <div className="flex items-center gap-2"><Zap size={14} className="text-accent" />{t.f(mi.xpToday, { xp: todayXp })}</div>
              <div className="flex items-center gap-2"><Award size={14} className="text-accent" />{t.f(mi.badges, { unlocked, total: badges.length })}</div>
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Kpi icon={<Zap size={15} />} label={mi.kpi.xp} value={t.n(s.xp)} delta={change(s.xp, s.xpPrev)}
              foot={t.f(mi.allTime, { value: t.n(total) })}><Sparkline values={xpSeries} className="h-8" /></Kpi>
            <Kpi icon={<CheckCircle2 size={15} />} label={mi.kpi.tasks} value={t.n(s.tasks)} delta={change(s.tasks, s.tasksPrev)}
              foot={t.f(mi.allTime, { value: t.n(s.tasksAll) })}><Sparkline values={s.tasksSeries} className="h-8" /></Kpi>
            <Kpi icon={<Clock size={15} />} label={mi.kpi.focus} value={t.dur(s.focus.minutes)} delta={change(s.focus.minutes, s.focusPrev.minutes)}
              foot={t.f(mi.allTime, { value: t.dur(s.focusAll) })}><Sparkline values={days.map((k) => s.focus.byDay[k].minutes)} className="h-8" /></Kpi>
            <Kpi
              icon={<Target size={15} />} label={mi.kpi.consistency} value={s.cons === null ? '—' : t.pct(s.cons)}
              delta={s.cons !== null && s.consPrev !== null ? s.cons - s.consPrev : null}
              deltaText={s.cons !== null && s.consPrev !== null ? t.f(mi.points, { value: t.n(Math.round((s.cons - s.consPrev) * 100), { signDisplay: 'exceptZero' }) }) : undefined}
              foot={s.cons === null ? mi.noHabitData : undefined}
            >
              <div className="flex h-8 items-center"><ProgressBar value={s.cons ?? 0} height={8} /></div>
            </Kpi>
          </div>
        </div>

        <Card className="p-5">
          <SectionTitle right={<span className="text-xs font-semibold text-muted">{t.p(mi.xpInRange, range, { xp: s.xp })}</span>}>
            <span className="inline-flex items-center gap-1.5"><Zap size={13} /> {mi.xpPerDay}</span>
          </SectionTitle>
          <ColumnChart
            values={xpSeries}
            format={(v) => t.n(Math.round(v))}
            average={s.xp / range}
            emphasis={(i) => days[i] === today}
            tip={(i) => t.f(mi.xpTip, { date: t.d(days[i], 'weekdayShort'), xp: xpSeries[i] })}
            xLabels={xLabels}
            ariaLabel={`${mi.xpPerDay}: ${t.p(mi.xpInRange, range, { xp: s.xp })}`}
          />
        </Card>
      </Section>

      {/* ---- Focus ---- */}
      <Section
        icon={<Timer size={15} />}
        title={mi.section.focus}
        right={<Button size="sm" variant="ghost" onClick={() => navigate('focus')}><Play size={13} /> {mi.focus.open}</Button>}
      >
        <FocusSection days={days} today={today} s={s} xLabels={xLabels} />
      </Section>

      {/* ---- Habits and areas ---- */}
      <Section icon={<Target size={15} />} title={mi.section.habits}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <SectionTitle>{mi.balance}</SectionTitle>
            {areaStats.length === 0 ? <p className="text-sm text-muted">{mi.noAreas}</p> : (
              <div className="space-y-3.5">
                {areaStats.map(({ a, tasks, habitDays, focus, score }) => (
                  <div key={a.id}>
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 text-sm">
                      <span className="font-semibold">{a.emoji} {a.name}</span>
                      <span className="text-xs text-muted tabular">{t.f(mi.areaLine, { tasks: t.p(mi.tasks, tasks), habitDays: t.p(mi.habitDays, habitDays), focus: t.dur(focus) })}</span>
                    </div>
                    <ProgressBar value={score / maxScore} color={AREA_HEX[a.color]} height={8} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle>{mi.consistency}</SectionTitle>
            {d.habits.filter((h) => !h.archived).length === 0 ? <p className="text-sm text-muted">{mi.noHabits}</p> : (
              <div className="space-y-3.5">
                {d.habits.filter((h) => !h.archived).sort((a, b) => a.order - b.order).map((h) => {
                  const r = completionRate(h, d.habitLogs, from, today, today, wso)
                  const a = d.areas.find((x) => x.id === h.areaId)
                  return (
                    <div key={h.id}>
                      <div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate font-semibold">{h.emoji} {h.name}</span><span className="font-bold tabular">{t.pct(r)}</span></div>
                      <ProgressBar value={r} color={a ? AREA_HEX[a.color] : undefined} height={8} />
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </Section>

      {/* ---- Progress ---- */}
      <Section icon={<Activity size={15} />} title={mi.section.progress}>
        <Card className="p-5">
          <SectionTitle right={<Segmented value={heat} onChange={setHeat} options={[{ value: 'xp' as const, label: mi.activityShow.xp }, { value: 'focus' as const, label: mi.activityShow.focus }]} />}>
            {mi.activity}
          </SectionTitle>
          {heat === 'xp' ? (
            <Heatmap end={today} weeks={26} weekStartsOn={wso} cell={14} value={(k) => Math.min(1, (byDay[k] ?? 0) / 120)} label={(k) => t.f(mi.activityTip, { date: t.d(k, 'weekdayShort'), xp: byDay[k] ?? 0 })} />
          ) : (
            <Heatmap end={today} weeks={26} weekStartsOn={wso} cell={14} value={(k) => Math.min(1, (heatFocus[k]?.minutes ?? 0) / 120)} label={(k) => t.f(mi.activityFocusTip, { date: t.d(k, 'weekdayShort'), time: t.dur(heatFocus[k]?.minutes ?? 0) })} />
          )}
        </Card>

        <div>
          <SectionTitle>{t.f(mi.badges, { unlocked, total: badges.length })}</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {badges.map((b) => (
              <Card key={b.id} className={cx('relative p-4 text-center transition', !b.unlocked && 'opacity-50 grayscale')}>
                {!b.unlocked && <Lock size={12} className="absolute end-3 top-3 text-muted" />}
                <div className="text-3xl">{b.emoji}</div>
                <div className="mt-2 text-sm font-bold">{m.badges[b.id].title}</div>
                <div className="mt-0.5 text-[11px] leading-tight text-muted">{m.badges[b.id].desc}</div>
              </Card>
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}

type Summary = {
  focus: ReturnType<typeof focusStats>
  focusPrev: ReturnType<typeof focusStats>
  focusStreak: { current: number; best: number }
  focusAll: number
}

function FocusSection({ days, today, s, xLabels }: { days: DateKey[]; today: DateKey; s: Summary; xLabels: { i: number; label: string }[] }) {
  const t = useI18n()
  const { m } = t
  const mf = m.insights.focus
  const d = useData()
  const f = s.focus
  const p = s.focusPrev

  const habits = useMemo(() => new Map(d.habits.map((h) => [h.id, h])), [d.habits])
  const goals = useMemo(() => new Map(d.goals.map((g) => [g.id, g])), [d.goals])
  const areas = useMemo(() => new Map(d.areas.map((a) => [a.id, a])), [d.areas])

  if (f.sessions === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent"><Timer size={22} /></div>
        <div className="font-bold">{mf.emptyTitle}</div>
        <p className="max-w-sm text-sm text-muted">{mf.emptyBody}</p>
        <Button variant="primary" className="mt-1" onClick={() => navigate('focus')}><Play size={15} fill="currentColor" /> {mf.start}</Button>
      </Card>
    )
  }

  const perDay = days.map((k) => f.byDay[k].minutes)
  const round = (x: number) => Math.round(x)
  const peakHour = f.byHour.indexOf(Math.max(...f.byHour))
  const order = Array.from({ length: 7 }, (_, i) => (d.settings.weekStartsOn + i) % 7)
  const wdShort = t.weekdays('short')
  const wdLong = t.weekdays('long')
  const wdValues = order.map((w) => f.byWeekday[w])
  const bestWd = order[wdValues.indexOf(Math.max(...wdValues))]
  const topGroups = f.groups.slice(0, 6)
  const maxGroup = Math.max(1, ...topGroups.map((g) => g.minutes))
  const maxBand = Math.max(1, ...f.lengths)
  const areaColor = (id: string | null) => { const a = id ? areas.get(id) : undefined; return a ? AREA_HEX[a.color] : NEUTRAL_HEX }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
        <Metric label={mf.total} value={t.dur(f.minutes)} delta={change(f.minutes, p.minutes)} sub={t.f(m.insights.allTime, { value: t.dur(s.focusAll) })} />
        <Metric label={mf.sessions} value={t.n(f.sessions)} delta={change(f.sessions, p.sessions)}
          sub={t.f(mf.perFocusDay, { value: t.n(f.sessions / Math.max(1, f.focusDays), { maximumFractionDigits: 1 }) })} />
        <Metric label={mf.avgSession} value={t.dur(round(f.avgSession))} delta={p.sessions ? change(f.avgSession, p.avgSession) : null} />
        <Metric label={mf.dailyAvg} value={t.dur(round(f.dailyAvg))} sub={mf.acrossAllDays} />
        <Metric label={mf.focusDays} value={t.pct(f.focusDays / f.days)} sub={t.p(mf.focusDaysOf, f.days, { focused: f.focusDays })}>
          <ProgressBar value={f.focusDays / f.days} height={4} className="mt-2" />
        </Metric>
        <Metric label={mf.streak} value={t.p(mf.days, s.focusStreak.current)} sub={t.p(mf.streakBest, s.focusStreak.best)} icon={<Flame size={13} className="text-gold" />} />
      </div>

      <Card className="p-5">
        <SectionTitle right={<span className="text-xs font-semibold text-muted">{t.p(mf.sessionCount, f.sessions)} · {t.dur(f.minutes)}</span>}>
          <span className="inline-flex items-center gap-1.5"><Clock size={13} /> {mf.perDay}</span>
        </SectionTitle>
        <ColumnChart
          values={perDay}
          steps={MINUTE_STEPS}
          format={(v) => t.dur(round(v))}
          average={f.dailyAvg}
          emphasis={(i) => days[i] === today || days[i] === f.bestDay?.date}
          tip={(i) => t.f(mf.dayTip, { date: t.d(days[i], 'weekdayShort'), time: t.dur(perDay[i]), sessions: t.p(mf.sessionCount, f.byDay[days[i]].sessions) })}
          xLabels={xLabels}
          ariaLabel={`${mf.perDay}: ${t.dur(f.minutes)}, ${t.p(mf.sessionCount, f.sessions)}`}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle>{mf.timeOfDay}</SectionTitle>
          <p className="-mt-1.5 mb-4 text-sm font-semibold">{t.f(mf.peak, { from: t.time(hh(peakHour)), to: t.time(hh(peakHour + 1)) })}</p>
          <ColumnChart
            values={f.byHour}
            steps={MINUTE_STEPS}
            height={130}
            format={(v) => t.dur(round(v))}
            emphasis={(i) => i === peakHour}
            tip={(i) => t.f(mf.hourTip, { from: t.time(hh(i)), to: t.time(hh(i + 1)), time: t.dur(f.byHour[i]) })}
            xLabels={[0, 6, 12, 18].map((h) => ({ i: h, label: t.time(hh(h)) }))}
            ariaLabel={`${mf.timeOfDay}: ${t.f(mf.peak, { from: t.time(hh(peakHour)), to: t.time(hh(peakHour + 1)) })}`}
          />
        </Card>
        <Card className="p-5">
          <SectionTitle>{mf.weekday}</SectionTitle>
          <p className="-mt-1.5 mb-4 text-sm font-semibold">
            {t.f(mf.bestWeekday, { day: wdLong[bestWd] })}
            <span className="ms-2 text-xs font-medium text-muted">{mf.weekdayNote}</span>
          </p>
          <ColumnChart
            values={wdValues}
            steps={MINUTE_STEPS}
            height={130}
            format={(v) => t.dur(round(v))}
            emphasis={(i) => order[i] === bestWd}
            tip={(i) => t.f(mf.weekdayTip, { day: wdLong[order[i]], time: t.dur(round(wdValues[i])) })}
            xLabels={order.map((w, i) => ({ i, label: wdShort[w] }))}
            ariaLabel={`${mf.weekday}: ${t.f(mf.bestWeekday, { day: wdLong[bestWd] })}`}
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle>{mf.byArea}</SectionTitle>
          <ShareBar parts={f.byArea.map((a) => {
            const area = a.areaId ? areas.get(a.areaId) : undefined
            return { key: a.areaId ?? 'none', value: a.minutes, color: areaColor(a.areaId), title: `${area ? area.name : m.common.noArea} · ${t.dur(a.minutes)}` }
          })} />
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-[11px] font-semibold text-muted">
                <th className="pb-2 text-start font-semibold">{mf.col.area}</th>
                <th className="pb-2 text-end font-semibold">{mf.col.time}</th>
                <th className="pb-2 text-end font-semibold">{mf.col.share}</th>
                <th className="hidden pb-2 text-end font-semibold sm:table-cell">{mf.col.sessions}</th>
              </tr>
            </thead>
            <tbody>
              {f.byArea.map((a) => {
                const area = a.areaId ? areas.get(a.areaId) : undefined
                return (
                  <tr key={a.areaId ?? 'none'} className="border-t border-border/70">
                    <td className="py-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: areaColor(a.areaId) }} />
                        <span className="truncate font-semibold">{area ? `${area.emoji} ${area.name}` : m.common.noArea}</span>
                      </span>
                    </td>
                    <td className="py-2 text-end font-semibold tabular">{t.dur(a.minutes)}</td>
                    <td className="py-2 text-end text-muted tabular">{t.pct(a.minutes / f.minutes)}</td>
                    <td className="hidden py-2 text-end text-muted tabular sm:table-cell">{t.n(a.sessions)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>

        <Card className="p-5">
          <SectionTitle>{mf.top}</SectionTitle>
          <div className="space-y-3">
            {topGroups.map((g) => {
              const h = g.habitId ? habits.get(g.habitId) : undefined
              const goal = g.goalId ? goals.get(g.goalId) : undefined
              const name = h ? `${h.emoji} ${h.name}` : goal ? `🎯 ${goal.title}` : g.label || m.focus.defaultLabel
              return (
                <div key={g.key}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-semibold">{name}</span>
                    <span className="shrink-0 text-xs text-muted tabular">
                      {t.p(mf.sessionCount, g.sessions)} · <span className="font-semibold text-text">{t.dur(g.minutes)}</span>
                    </span>
                  </div>
                  <ProgressBar value={g.minutes / maxGroup} height={6} />
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle>{mf.lengths}</SectionTitle>
          <div className="space-y-2.5">
            {BANDS.map((b, i) => (
              <div key={b} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                <span className="truncate text-xs font-semibold text-muted">{mf.band[b]}</span>
                <ProgressBar value={f.lengths[i] / maxBand} height={8} />
                <span className="text-end text-xs font-bold tabular">{t.n(f.lengths[i])}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle>{mf.records}</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {f.longest && (
              <Record icon={<Timer size={16} />} label={mf.longest} value={t.dur(f.longest.minutes)}
                sub={t.f(mf.recordSub, { label: f.longest.label, date: t.d(new Date(f.longest.startedAt), 'weekdayShort') })} />
            )}
            {f.bestDay && (
              <Record icon={<Trophy size={16} />} label={mf.bestDay} value={t.dur(f.bestDay.minutes)}
                sub={t.f(mf.bestDaySub, { date: t.d(f.bestDay.date, 'weekdayShort'), sessions: t.p(mf.sessionCount, f.byDay[f.bestDay.date].sessions) })} />
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

/** About five dates under a chart of days, the last one being Today. */
function dayLabels(days: DateKey[], today: DateKey, t: ReturnType<typeof useI18n>): { i: number; label: string }[] {
  const n = days.length
  const every = n <= 7 ? 1 : n <= 14 ? 3 : n <= 30 ? 7 : 21
  const out: { i: number; label: string }[] = []
  for (let i = n - 1; i >= 0; i -= every) out.unshift({ i, label: days[i] === today ? t.m.time.today : n <= 7 ? t.d(days[i], 'weekdayName') : t.d(days[i], 'short') })
  return out
}

function Section({ icon, title, right, children }: { icon: ReactNode; title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <span className="grid size-7 place-items-center rounded-lg bg-accent-soft text-accent">{icon}</span>
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  )
}

function Kpi({ icon, label, value, delta, deltaText, foot, children }: {
  icon: ReactNode; label: string; value: string; delta: number | null; deltaText?: string; foot?: string; children?: ReactNode
}) {
  return (
    <Card className="flex flex-col p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-muted">{label}</span>
        <span className="text-muted">{icon}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-2xl font-extrabold tracking-tight sm:text-[1.75rem]">{value}</span>
        <Delta value={delta} text={deltaText} />
      </div>
      {children && <div className="mt-3">{children}</div>}
      {foot && <div className="mt-auto pt-2 text-[11px] font-medium text-muted">{foot}</div>}
    </Card>
  )
}

function Metric({ label, value, delta = null, sub, icon, children }: {
  label: string; value: string; delta?: number | null; sub?: string; icon?: ReactNode; children?: ReactNode
}) {
  return (
    <div className="bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">{icon}{label}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-xl font-extrabold tracking-tight">{value}</span>
        <Delta value={delta} />
      </div>
      {sub && <div className="mt-1 text-[11px] font-medium text-muted">{sub}</div>}
      {children}
    </div>
  )
}

function Record({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted"><span className="text-gold">{icon}</span>{label}</div>
      <div className="mt-1.5 text-2xl font-extrabold tracking-tight">{value}</div>
      <div className="mt-0.5 truncate text-xs text-muted">{sub}</div>
    </div>
  )
}
