import { Activity, Award, BarChart3, BookOpen, CheckCircle2, Clock, Flame, Gauge, Lock, Moon, Play, Shield, Sun, Sunrise, Sunset, Target, Timer, Trophy, Zap } from 'lucide-react'
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
import { change, DAY_PARTS, focusStats, focusStreak, habitAmounts, habitConsistency, minutesPerPage, pagesPerHour, previousRange, readingSpeed, readingStats, tasksDoneByDay, type DayPart } from '../lib/insights'
import { cycleStats, interruptionStats } from '../lib/focusCycle'
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
  const { events, total, level, todayXp, streak: active, day } = useProgress()
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
  const amounts = useMemo(() => habitAmounts(d.habits, d.habitLogs, from, today, today), [d.habits, d.habitLogs, from, today])
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
              <div className="flex items-center gap-2"><Shield size={14} className="text-ice" />{t.p(m.streak.saverCount, day.held)}</div>
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

      {/* ---- Reading (ADR-047) ---- */}
      {(d.books.length > 0 || d.pastBooks.length > 0 || d.readingSessions.length > 0) && (
        <Section
          icon={<BookOpen size={15} />}
          title={mi.reading.title}
          right={<Button size="sm" variant="ghost" onClick={() => navigate('library')}><BookOpen size={13} /> {mi.reading.open}</Button>}
        >
          <ReadingSection days={days} today={today} from={from} prevFrom={prev.from} prevTo={prev.to} xLabels={xLabels} />
        </Section>
      )}

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

        <Card className="p-5">
          <SectionTitle>{mi.amounts}</SectionTitle>
          {amounts.length === 0 ? <p className="text-sm text-muted">{mi.amountsEmpty}</p> : (
            <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
              {amounts.map(({ habit: h, amount, prev, perDay, all, round }) => {
                const a = d.areas.find((x) => x.id === h.areaId)
                const unit = h.unit
                return (
                  <div key={h.id} className="min-w-0">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-semibold">{h.emoji} {h.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-bold tabular">{t.n(amount)} {unit}</span>
                        <Delta value={change(amount, prev)} />
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted tabular">
                      {t.f(mi.amountPerDay, { n: t.n(perDay, { maximumFractionDigits: 1 }), unit })} · {t.f(mi.amountAll, { n: t.n(all), unit })}
                    </div>
                    {round && (
                      <div className="mt-2">
                        <ProgressBar value={round.into / round.size} color={a ? AREA_HEX[a.color] : undefined} height={8} />
                        <div className="mt-1 text-xs text-muted tabular">
                          {t.f(m.habits.roundLine, { n: round.number, into: round.into, size: round.size, unit })}
                          {round.finishOn && ` · ${t.f(m.habits.roundFinish, { date: t.d(round.finishOn, round.finishOn.slice(0, 4) === today.slice(0, 4) ? 'short' : 'medium') })}`}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
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
  const pauses = useMemo(() => interruptionStats(d.interruptions, days[0], today), [d.interruptions, days, today])
  const cycles = useMemo(() => cycleStats(d.focusCycles, days[0], today), [d.focusCycles, days, today])
  const maxReason = Math.max(1, ...pauses.byReason.map((r) => r.count))
  const reasonEmoji = { call: '📞', person: '🗣️', distraction: '📱', prayer: '🕌', other: '✳️' } as const

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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle>{mf.interruptions}</SectionTitle>
          <p className="-mt-2 mb-3 text-xs text-muted">{mf.interruptionsNote}</p>
          {pauses.count === 0 ? (
            <p className="text-sm text-muted">{mf.noInterruptions}</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-2xl font-extrabold tabular">{t.p(mf.pauses, pauses.count)}</span>
                <span className="text-xs text-muted">{t.f(mf.pausedFor, { time: t.dur(pauses.minutes) })}</span>
                <span className="text-xs text-muted">{t.p(mf.duringFocus, pauses.duringFocus)}</span>
              </div>
              <div className="space-y-2.5">
                {pauses.byReason.map((r) => (
                  <div key={r.reason ?? 'none'} className="grid grid-cols-[7.5rem_1fr_4rem] items-center gap-3 text-sm">
                    <span className="truncate text-xs font-semibold text-muted">{r.reason ? `${reasonEmoji[r.reason]} ${m.focus.cycle.reasons[r.reason]}` : mf.noReason}</span>
                    <ProgressBar value={r.count / maxReason} height={8} />
                    <span className="text-end text-xs font-bold tabular">{t.n(r.count)} · {t.dur(r.minutes)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle>{mf.cycles}</SectionTitle>
          <div className="text-2xl font-extrabold tabular">{t.n(cycles.cycles)}</div>
          <p className="text-xs text-muted">{t.f(mf.cyclesSub, { done: t.n(cycles.completed), n: t.n(cycles.cycles) })}</p>
          {cycles.cycles > 0 && <p className="mt-3 text-sm">{t.p(mf.sessionCount, cycles.sessions)} · {t.dur(cycles.focusMinutes)}</p>}
        </Card>
      </div>
    </div>
  )
}

/** About five dates under a chart of days, the last one being Today. */
function ReadingSection({ days, today, from, prevFrom, prevTo, xLabels }: {
  days: DateKey[]; today: DateKey; from: DateKey; prevFrom: DateKey; prevTo: DateKey; xLabels: { i: number; label: string }[]
}) {
  const t = useI18n()
  const mr = t.m.insights.reading
  const d = useData()
  // Books deleted with their reading kept still name their reading and count as finished (ADR-050).
  const all = useMemo(() => [...d.books, ...d.pastBooks], [d.books, d.pastBooks])
  const r = useMemo(() => readingStats(d.readingSessions, all, from, today), [d.readingSessions, all, from, today])
  const p = useMemo(() => readingStats(d.readingSessions, all, prevFrom, prevTo), [d.readingSessions, all, prevFrom, prevTo])
  const speed = useMemo(() => readingSpeed(d.readingSessions, from, today), [d.readingSessions, from, today])
  const prevSpeed = useMemo(() => readingSpeed(d.readingSessions, prevFrom, prevTo), [d.readingSessions, prevFrom, prevTo])
  const books = useMemo(() => new Map(all.map((b) => [b.id, b])), [all])

  if (r.sessions === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <div className="font-bold">{mr.emptyTitle}</div>
        <p className="max-w-sm text-sm text-muted">{mr.emptyBody}</p>
      </Card>
    )
  }
  const perDay = days.map((k) => r.byDay[k]?.minutes ?? 0)
  const top = r.byBook.slice(0, 6)
  const maxTop = Math.max(1, ...top.map((b) => b.minutes))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
        <Metric label={mr.time} value={t.dur(r.minutes)} delta={change(r.minutes, p.minutes)} />
        <Metric label={mr.pages} value={t.n(r.pages)} delta={change(r.pages, p.pages)} />
        <Metric label={mr.days} value={t.pct(r.readingDays / r.days)} sub={t.p(mr.daysOf, r.days, { read: r.readingDays })}>
          <ProgressBar value={r.readingDays / r.days} height={4} className="mt-2" />
        </Metric>
        <Metric label={mr.finished} value={t.n(r.finished)} delta={change(r.finished, p.finished)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="p-5">
          <SectionTitle><span className="inline-flex items-center gap-1.5"><Clock size={13} /> {mr.perDay}</span></SectionTitle>
          <ColumnChart
            values={perDay}
            steps={MINUTE_STEPS}
            format={(v) => t.dur(Math.round(v))}
            emphasis={(i) => days[i] === today}
            tip={(i) => t.f(mr.dayTip, { date: t.d(days[i], 'weekdayShort'), time: t.dur(perDay[i]), pages: t.p(mr.pagesCount, r.byDay[days[i]]?.pages ?? 0) })}
            xLabels={xLabels}
            ariaLabel={`${mr.perDay}: ${t.dur(r.minutes)}`}
          />
          {r.minutes > 0 && (
            <div className="mt-4 space-y-1.5">
              <ShareBar parts={[
                { key: 'habit', value: r.habitMinutes, color: 'var(--accent)', title: mr.forHabits },
                { key: 'general', value: r.generalMinutes, color: 'var(--muted)', title: mr.general },
              ]} />
              <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
                <span>{t.f(mr.forHabitsValue, { time: t.dur(r.habitMinutes) })}</span>
                <span>{t.f(mr.generalValue, { time: t.dur(r.generalMinutes) })}</span>
              </div>
            </div>
          )}
        </Card>
        <Card className="p-5">
          <SectionTitle>{mr.byBook}</SectionTitle>
          <div className="space-y-3">
            {top.map((x) => (
              <div key={x.bookId}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-semibold" dir="auto">{books.get(x.bookId)?.title ?? mr.deletedBook}</span>
                  <span className="shrink-0 text-xs text-muted tabular">
                    {t.p(mr.pagesCount, x.pages)}
                    {speed.byBook[x.bookId] && pagesPerHour(speed.byBook[x.bookId]) !== null && <> · {t.f(mr.speed.perHourShort, { n: rate(t, pagesPerHour(speed.byBook[x.bookId])!) })}</>}
                    {' · '}<span className="font-semibold text-text">{t.dur(x.minutes)}</span>
                  </span>
                </div>
                <ProgressBar value={x.minutes / maxTop} height={6} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <SpeedCards speed={speed} prev={prevSpeed} days={days} today={today} xLabels={xLabels} />
    </div>
  )
}

/** Pages an hour (or a minute) shown to a sensible precision: 32, 7.5, 0.53. */
function rate(t: ReturnType<typeof useI18n>, x: number): string {
  return t.n(x, { maximumFractionDigits: x >= 10 ? 0 : x >= 1 ? 1 : 2 })
}

const PART_ICON: Record<DayPart, ReactNode> = {
  morning: <Sunrise size={14} />, afternoon: <Sun size={14} />, evening: <Sunset size={14} />, night: <Moon size={14} />,
}

/**
 * Reading speed (ADR-050): pages an hour over the range against the period before, day by day
 * around the range's own pace, and by the part of the day the reading was done. Every number comes
 * from `readingSpeed` — timed sittings only.
 */
function SpeedCards({ speed, prev, days, today, xLabels }: {
  speed: ReturnType<typeof readingSpeed>; prev: ReturnType<typeof readingSpeed>; days: DateKey[]; today: DateKey; xLabels: { i: number; label: string }[]
}) {
  const t = useI18n()
  const ms = t.m.insights.reading.speed
  const pph = pagesPerHour(speed.all)
  if (pph === null) {
    return (
      <Card className="p-5">
        <SectionTitle><span className="inline-flex items-center gap-1.5"><Gauge size={13} /> {ms.title}</span></SectionTitle>
        <p className="text-sm text-muted">{ms.empty}</p>
      </Card>
    )
  }
  const before = pagesPerHour(prev.all)
  const perDay = days.map((k) => pagesPerHour(speed.byDay[k] ?? { pages: 0, minutes: 0, sessions: 0 }) ?? 0)
  const parts = DAY_PARTS.map((part) => ({ part, pace: speed.byPart[part], pph: pagesPerHour(speed.byPart[part]) }))
  const maxPart = Math.max(1, ...parts.map((x) => x.pph ?? 0))
  const timedParts = parts.filter((x) => x.pph !== null)
  const fastest = timedParts.length > 1 ? timedParts.reduce((a, b) => (b.pph! > a.pph! ? b : a)).part : null
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card className="p-5">
        <SectionTitle><span className="inline-flex items-center gap-1.5"><Gauge size={13} /> {ms.title}</span></SectionTitle>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-2xl font-extrabold tracking-tight tabular">{t.f(ms.perHour, { n: rate(t, pph) })}</span>
              <Delta value={before === null ? null : change(pph, before)} />
            </div>
            <p className="text-xs text-muted">
              {t.f(ms.perMinute, { n: rate(t, pph / 60) })} · {t.f(ms.minutesPerPage, { n: rate(t, minutesPerPage(speed.all)!) })}
            </p>
          </div>
          <p className="text-xs text-muted">
            {t.p(ms.from, speed.all.sessions, { pages: t.p(t.m.insights.reading.pagesCount, speed.all.pages), time: t.dur(speed.all.minutes) })}
            {before !== null && <><br />{t.f(ms.before, { n: rate(t, before) })}</>}
          </p>
        </div>
        <div className="mt-4">
          <ColumnChart
            values={perDay}
            format={(v) => rate(t, v)}
            average={pph}
            emphasis={(i) => days[i] === today}
            tip={(i) => {
              const pace = speed.byDay[days[i]]
              return pace && pace.sessions > 0
                ? t.f(ms.dayTip, { date: t.d(days[i], 'weekdayShort'), speed: t.f(ms.perHour, { n: rate(t, perDay[i]) }), pages: t.p(t.m.insights.reading.pagesCount, pace.pages), time: t.dur(pace.minutes) })
                : t.f(ms.dayTipNone, { date: t.d(days[i], 'weekdayShort') })
            }}
            xLabels={xLabels}
            ariaLabel={`${ms.byDay}: ${t.f(ms.perHour, { n: rate(t, pph) })}`}
          />
          <p className="mt-2 text-[11px] text-muted">{ms.byDayNote}</p>
        </div>
      </Card>
      <Card className="p-5">
        <SectionTitle>{ms.byPart}</SectionTitle>
        <div className="space-y-3">
          {parts.map(({ part, pace, pph: v }) => (
            <div key={part}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <span className="text-muted">{PART_ICON[part]}</span>{ms.parts[part]}
                  {part === fastest && <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-accent">{ms.fastest}</span>}
                </span>
                <span className="shrink-0 text-xs text-muted tabular">
                  {v === null ? ms.noneYet : <>{t.dur(pace.minutes)} · <span className="font-semibold text-text">{t.f(ms.perHourShort, { n: rate(t, v) })}</span></>}
                </span>
              </div>
              <ProgressBar value={(v ?? 0) / maxPart} height={6} />
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted">{ms.byPartNote}</p>
      </Card>
    </div>
  )
}

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
