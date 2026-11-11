import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildSteps, clampPlan, cycleStats, fitPrayer, focusStep, interruptionStats, prayerCrossings, sessionCount, sessionNumber, setStepMinutes, stepTimes } from '../focusCycle'
import type { PrayerTimes } from '../fajr'
import { emptyData } from '../seed'
import { useStore } from '../store'
import type { CycleStep, FocusCycle, Interruption } from '../types'

const st = () => useStore.getState()
const shape = (steps: CycleStep[]) => steps.map((s) => `${s.kind === 'focus' ? 'F' : s.tag === 'long' ? 'L' : s.tag === 'prayer' ? 'P' : 'B'}${s.minutes}`).join(' ')

describe('planning a cycle', () => {
  it('sessions with breaks between them, none after the last', () => {
    expect(shape(buildSteps({ sessions: 3, focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 0, longBreakEvery: 0 }))).toBe('F25 B5 F25 B5 F25')
    expect(shape(buildSteps({ sessions: 1, focusMinutes: 50, breakMinutes: 10, longBreakMinutes: 0, longBreakEvery: 0 }))).toBe('F50')
  })
  it('every Nth break is the long one, and never after the last session', () => {
    expect(shape(buildSteps({ sessions: 6, focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 20, longBreakEvery: 3 })))
      .toBe('F25 B5 F25 B5 F25 L20 F25 B5 F25 B5 F25')
    expect(shape(buildSteps({ sessions: 4, focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, longBreakEvery: 4 }))).toBe('F25 B5 F25 B5 F25 B5 F25')
    // A long break of 0 minutes is no long break.
    expect(shape(buildSteps({ sessions: 3, focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 0, longBreakEvery: 1 }))).toBe('F25 B5 F25 B5 F25')
  })
  it('keeps every number in range, whatever is typed', () => {
    expect(clampPlan({ sessions: 0, focusMinutes: 999, breakMinutes: -3, longBreakMinutes: Number.NaN, longBreakEvery: 2.6 }))
      .toEqual({ sessions: 1, focusMinutes: 240, breakMinutes: 1, longBreakMinutes: 0, longBreakEvery: 3 })
  })
  it('numbers sessions, a break carrying the number of the session before it', () => {
    const steps = buildSteps({ sessions: 3, focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 0, longBreakEvery: 0 })
    expect(sessionCount(steps)).toBe(3)
    expect([0, 1, 2, 3, 4].map((i) => sessionNumber(steps, i))).toEqual([1, 1, 2, 2, 3])
  })
  it('a step’s length is edited within its kind’s limits', () => {
    const steps = buildSteps({ sessions: 2, focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 0, longBreakEvery: 0 })
    expect(shape(setStepMinutes(steps, 0, 500))).toBe('F240 B5 F25')
    expect(shape(setStepMinutes(steps, 1, 0))).toBe('F25 B1 F25')
  })
  it('times each step from a start', () => {
    const steps = buildSteps({ sessions: 2, focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 0, longBreakEvery: 0 })
    expect(stepTimes(steps, 1, 0)).toEqual([{ index: 1, start: 0, end: 300_000 }, { index: 2, start: 300_000, end: 1_800_000 }])
  })
})

describe('prayers inside a cycle', () => {
  // 13:00 local, so the day is the same wherever the tests run.
  const T0 = new Date(2026, 10, 11, 13, 0).getTime()
  const MIN = 60_000
  const times: PrayerTimes = { fajr: T0 - 9 * 60 * MIN, sunrise: T0 - 7 * 60 * MIN, dhuhr: T0 - 60 * MIN, asr: T0 + 140 * MIN, maghrib: T0 + 280 * MIN, isha: T0 + 350 * MIN }
  const timesFor = () => times
  const plan = buildSteps({ sessions: 4, focusMinutes: 50, breakMinutes: 10, longBreakMinutes: 0, longBreakEvery: 0 })
  // F50 0–50, B10 50–60, F50 60–110, B10 110–120, F50 120–170 (Asr at 140), B10, F50

  it('finds the session a prayer falls in, and nothing when times are unknown', () => {
    expect(prayerCrossings(plan, 0, T0, timesFor)).toEqual([{ index: 4, prayer: 'asr', at: T0 + 140 * MIN, stepStart: T0 + 120 * MIN }])
    expect(prayerCrossings(plan, 0, T0, () => null)).toEqual([])
  })
  it('a prayer in a break, or exactly at a step’s edge, needs nothing', () => {
    expect(prayerCrossings(plan, 0, T0 + 30 * MIN, timesFor)).toEqual([]) // Asr lands on the edge of session 3 and the break at 140
    // From 85: Asr (140) falls in the break 135–145; only Maghrib (280) lands in a session, the last.
    expect(prayerCrossings(plan, 0, T0 + 85 * MIN, timesFor).map((c) => [c.index, c.prayer])).toEqual([[6, 'maghrib']])
  })
  it('only looks from the step asked for on', () => {
    expect(prayerCrossings(plan, 5, T0 - 50 * MIN, timesFor)).toEqual([])
  })
  it('splits the session around the prayer: focus, prayer break, the rest', () => {
    const [c] = prayerCrossings(plan, 0, T0, timesFor)
    expect(shape(fitPrayer(plan, c, 0))).toBe('F50 B10 F50 B10 F20 P15 F30 B10 F50')
    expect(fitPrayer(plan, c, 0)[5].prayer).toBe('asr')
  })
  it('a prayer in the first minutes: the break before becomes the prayer break', () => {
    const c = { index: 4, prayer: 'asr' as const, at: T0 + 123 * MIN, stepStart: T0 + 120 * MIN }
    expect(shape(fitPrayer(plan, c, 0))).toBe('F50 B10 F50 P15 F50 B10 F50')
    // …unless that break is already behind: then a prayer break goes in first.
    expect(shape(fitPrayer(plan, c, 4))).toBe('F50 B10 F50 B10 P15 F50 B10 F50')
  })
  it('a prayer in the last minutes: the session ends at it, and the break after becomes the prayer break', () => {
    const c = { index: 4, prayer: 'asr' as const, at: T0 + 167 * MIN, stepStart: T0 + 120 * MIN }
    expect(shape(fitPrayer(plan, c, 0))).toBe('F50 B10 F50 B10 F47 P15 F50')
    // The last session has no break after it: one is added.
    const last = { index: 6, prayer: 'maghrib' as const, at: T0 + 228 * MIN, stepStart: T0 + 180 * MIN }
    expect(shape(fitPrayer(plan, last, 0))).toBe('F50 B10 F50 B10 F50 B10 F48 P15')
  })
  it('a longer break stays longer when it becomes the prayer break', () => {
    const steps = [focusStep(25), { ...focusStep(30), kind: 'break' as const }, focusStep(25)]
    const c = { index: 2, prayer: 'isha' as const, at: 56 * MIN, stepStart: 55 * MIN }
    expect(shape(fitPrayer(steps, c, 0))).toBe('F25 P30 F25')
  })
  it('never touches a step that is running or done', () => {
    const [c] = prayerCrossings(plan, 0, T0, timesFor)
    expect(fitPrayer(plan, c, 5)).toEqual(plan)
  })
})

describe('insights', () => {
  const at = (d: number, h = 10) => new Date(2026, 10, d, h).toISOString()
  const pause = (id: string, day: number, seconds: number, reason: Interruption['reason'], during: Interruption['during'] = 'focus'): Interruption =>
    ({ id, at: at(day), seconds, reason, during, label: 'Study', cycleId: null })

  it('counts pauses in the period, by reason, most frequent first', () => {
    const list = [pause('a', 10, 120, 'call'), pause('b', 10, 60, 'call'), pause('c', 11, 600, 'person', 'break'), pause('d', 11, 30, null), pause('e', 3, 900, 'call')]
    const s = interruptionStats(list, '2026-11-09', '2026-11-11')
    expect(s.count).toBe(4)
    expect(s.duringFocus).toBe(3)
    expect(s.minutes).toBe(14) // 810 s
    expect(s.byReason).toEqual([
      { reason: 'call', count: 2, minutes: 3 },
      { reason: 'person', count: 1, minutes: 10 },
      { reason: null, count: 1, minutes: 1 },
    ])
  })
  it('counts cycles and the ones finished in full', () => {
    const c = (id: string, day: number, completed: boolean): FocusCycle => ({ id, startedAt: at(day), endedAt: at(day, 12), label: '', plannedSessions: 4, sessions: completed ? 4 : 2, focusMinutes: completed ? 100 : 50, extendedMinutes: 0, pauses: 0, completed })
    expect(cycleStats([c('a', 10, true), c('b', 11, false), c('x', 1, true)], '2026-11-09', '2026-11-11')).toEqual({ cycles: 2, completed: 1, sessions: 6, focusMinutes: 150 })
  })
})

describe('running a cycle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 11, 9, 0))
    useStore.setState({ ...emptyData() })
  })
  afterEach(() => vi.useRealTimers())

  const MIN = 60_000
  const steps = buildSteps({ sessions: 2, focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 0, longBreakEvery: 0 })
  const start = (extra: Partial<Parameters<ReturnType<typeof st>['startCycle']>[0]> = {}) =>
    st().startCycle({ steps, label: 'Study', areaId: null, goalId: null, taskId: null, habitId: null, ...extra })

  it('runs session, break, session, and saves each session in the cycle; waiting time is never focus', () => {
    start()
    expect(st().timer).toMatchObject({ mode: 'focus', totalMs: 25 * MIN, label: 'Study', cycleId: st().cycle!.id })
    vi.advanceTimersByTime(25 * MIN + 7 * MIN) // ended, then waited 7 minutes for an answer
    expect(st().focusSessions).toEqual([]) // nothing is saved while it waits
    expect(st().nextStep()).toBeNull()
    expect(st().focusSessions).toHaveLength(1)
    expect(st().focusSessions[0]).toMatchObject({ minutes: 25, cycleId: st().cycle!.id })
    expect(st().timer).toMatchObject({ mode: 'break', totalMs: 5 * MIN })
    expect(st().cycle!.index).toBe(1)

    vi.advanceTimersByTime(5 * MIN)
    st().nextStep()
    expect(st().timer?.mode).toBe('focus')
    vi.advanceTimersByTime(25 * MIN)
    const record = st().nextStep()
    expect(st().timer).toBeNull()
    expect(st().cycle).toBeNull()
    expect(record).toMatchObject({ plannedSessions: 2, sessions: 2, focusMinutes: 50, completed: true, label: 'Study' })
    expect(st().focusCycles).toEqual([record])
  })

  it('extending after the end counts the extra minutes from the moment of the answer', () => {
    start()
    vi.advanceTimersByTime(25 * MIN + 3 * MIN)
    st().extendStep(10)
    expect(st().timer!.endsAt).toBe(Date.now() + 10 * MIN)
    vi.advanceTimersByTime(10 * MIN)
    st().nextStep()
    expect(st().focusSessions[0].minutes).toBe(35)
    expect(st().cycle!.extendedMinutes).toBe(10)
  })

  it('extending a running session adds to its end; extending a break is no focus', () => {
    start()
    vi.advanceTimersByTime(10 * MIN)
    st().extendStep(5)
    expect(st().timer!.endsAt).toBe(Date.now() + 20 * MIN)
    vi.advanceTimersByTime(20 * MIN)
    st().nextStep()
    st().extendStep(5)
    expect(st().timer!.totalMs).toBe(10 * MIN)
    expect(st().cycle!.extendedMinutes).toBe(5)
  })

  it('done early saves only the minutes worked, and waits', () => {
    start()
    vi.advanceTimersByTime(12 * MIN)
    st().endStepNow()
    expect(st().timer!.endsAt).toBe(Date.now())
    vi.advanceTimersByTime(4 * MIN)
    st().nextStep()
    expect(st().focusSessions[0].minutes).toBe(12)
  })

  it('a pause is logged with its length and reason, and the paused time is not focus', () => {
    start()
    vi.advanceTimersByTime(10 * MIN)
    const id = st().pauseTimer()!
    st().setInterruptionReason(id, 'call')
    vi.advanceTimersByTime(4 * MIN)
    st().resumeTimer()
    expect(st().interruptions).toEqual([{ id, at: new Date(2026, 10, 11, 9, 10).toISOString(), seconds: 240, reason: 'call', during: 'focus', label: 'Study', cycleId: st().cycle!.id }])
    expect(st().cycle!.pauses).toBe(1)
    expect(st().timer!.pauseId).toBeNull()
    vi.advanceTimersByTime(15 * MIN)
    st().nextStep()
    expect(st().focusSessions[0].minutes).toBe(25)
  })

  it('a paused break can go straight to the next session; the pause is closed', () => {
    start()
    vi.advanceTimersByTime(25 * MIN)
    st().nextStep()
    vi.advanceTimersByTime(MIN)
    st().pauseTimer()
    vi.advanceTimersByTime(10 * MIN)
    st().nextStep()
    expect(st().timer).toMatchObject({ mode: 'focus', pauseId: null })
    expect(st().interruptions[0]).toMatchObject({ during: 'break', seconds: 600 })
  })

  it('a timer that ended and waits cannot be paused', () => {
    start()
    vi.advanceTimersByTime(26 * MIN)
    expect(st().pauseTimer()).toBeNull()
    expect(st().interruptions).toEqual([])
  })

  it('ending early keeps the focus so far; an untouched cycle leaves no record', () => {
    start()
    vi.advanceTimersByTime(25 * MIN)
    st().nextStep()
    vi.advanceTimersByTime(2 * MIN)
    const r = st().endCycle()
    expect(r).toMatchObject({ sessions: 1, plannedSessions: 2, focusMinutes: 25, completed: false })
    expect(st().timer).toBeNull()

    start()
    vi.advanceTimersByTime(20_000)
    expect(st().endCycle()).toBeNull()
    expect(st().focusCycles).toHaveLength(1)
  })

  it('a single timer started elsewhere ends the cycle first, saving its focus', () => {
    start()
    vi.advanceTimersByTime(10 * MIN)
    st().startTimer({ mode: 'focus', totalMs: 25 * MIN, label: 'Other', areaId: null, goalId: null, taskId: null, habitId: null })
    expect(st().cycle).toBeNull()
    expect(st().focusSessions[0]).toMatchObject({ minutes: 10, cycleId: expect.any(String) })
    expect(st().timer).toMatchObject({ label: 'Other', cycleId: null })
  })

  it('a step for its own habit counts toward that habit; others are for the cycle’s', () => {
    const french = st().addHabit({ name: 'French', emoji: '', areaId: null, schedule: { type: 'daily' }, target: 30, unit: 'min' })
    const quran = st().addHabit({ name: 'Quran', emoji: '', areaId: null, schedule: { type: 'daily' }, target: 20, unit: 'min' })
    const own = steps.map((s, i) => (i === 2 ? { ...s, habitId: quran } : s))
    st().startCycle({ steps: own, label: 'French', areaId: null, goalId: null, taskId: null, habitId: french })
    vi.advanceTimersByTime(25 * MIN); st().nextStep()
    vi.advanceTimersByTime(5 * MIN); st().nextStep()
    expect(st().timer).toMatchObject({ label: 'Quran', habitId: quran })
    vi.advanceTimersByTime(25 * MIN); st().nextStep()
    expect(st().habitLogs[french]['2026-11-11']).toBe(25)
    expect(st().habitLogs[quran]['2026-11-11']).toBe(25)
  })

  it('later steps can be changed; the running one and those before cannot', () => {
    start()
    vi.advanceTimersByTime(25 * MIN)
    st().nextStep() // on the break, index 1
    st().setCycleSteps([focusStep(1), focusStep(2), focusStep(45)])
    expect(shape(st().cycle!.steps)).toBe('F25 B5 F45')
  })

  it('deleting a habit unlinks it from the cycle and its steps', () => {
    const h = st().addHabit({ name: 'H', emoji: '', areaId: null, schedule: { type: 'daily' }, target: 1, unit: '' })
    st().startCycle({ steps: steps.map((s) => ({ ...s, habitId: s.kind === 'focus' ? h : null })), label: 'x', areaId: null, goalId: null, taskId: null, habitId: h })
    st().deleteHabit(h)
    expect(st().cycle!.habitId).toBeNull()
    expect(st().cycle!.steps.every((s) => s.habitId === null)).toBe(true)
  })

  it('templates are saved and deleted', () => {
    const id = st().saveCycleTemplate({ name: 'Study', sessions: 3, focusMinutes: 50, breakMinutes: 10, longBreakMinutes: 0, longBreakEvery: 0 })
    expect(st().cycleTemplates).toMatchObject([{ id, name: 'Study', sessions: 3 }])
    st().deleteCycleTemplate(id)
    expect(st().cycleTemplates).toEqual([])
  })
})

describe('what a cycle’s alerts say', async () => {
  const { timerAlert, cycleNudgeAlert, CYCLE_NUDGE_MS } = await import('../reminders')
  const steps = buildSteps({ sessions: 3, focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 0, longBreakEvery: 0 })
  const cycle = (index: number) => ({ id: 'c', startedAt: '', steps, index, label: 'Study', areaId: null, goalId: null, taskId: null, habitId: null, extendedMinutes: 0, pauses: 0 })
  const timer = (mode: 'focus' | 'break', cycleId: string | null = 'c') => ({
    mode, endsAt: 5_000_000, remainingMs: 0, totalMs: (mode === 'focus' ? 30 : 5) * 60_000, startedAt: 'x', label: 'Study',
    areaId: null, goalId: null, taskId: null, habitId: null, cycleId, pauseId: null,
  })

  it('names the session, what comes next, and the last one', () => {
    expect(timerAlert(timer('focus'), undefined, cycle(2))?.body).toBe('Session 2 of 3 done — 30 min. Break, or keep going?')
    expect(timerAlert(timer('break'), undefined, cycle(1))?.body).toBe('Break over — session 2 of 3 is next.')
    expect(timerAlert(timer('focus'), undefined, cycle(4))?.body).toBe('All 3 sessions done 🎉 Finish the cycle?')
  })
  it('a single timer keeps its own words, even while some cycle exists', () => {
    expect(timerAlert(timer('focus', null), undefined, cycle(0))?.body).toBe('Focus done — 30 min. Take a break.')
  })
  it('reminds once, five minutes after the end, only for a cycle’s step', () => {
    const a = cycleNudgeAlert(timer('focus'), cycle(0))
    expect(a?.fireAt).toBe(5_000_000 + CYCLE_NUDGE_MS)
    expect(a?.key).not.toBe(timerAlert(timer('focus'), undefined, cycle(0))?.key)
    expect(cycleNudgeAlert(timer('focus', null), cycle(0))).toBeNull()
    expect(cycleNudgeAlert(timer('focus'), null)).toBeNull()
    expect(cycleNudgeAlert({ ...timer('focus'), endsAt: null }, cycle(0))).toBeNull()
  })
})
