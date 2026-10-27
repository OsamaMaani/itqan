import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { dayOf, fajrSpanAt, setDayRule, todayKey, toKey } from '../date'
import { countedForMessage } from '../dayStart'
import { fajrIsOn, fajrMs, placeForZone, resolveFajr, switchFajr } from '../fajr'
import { dayStreak, xpEvents } from '../gamification'
import { tasksDoneByDay } from '../insights'
import { emptyData } from '../seed'
import { useStore } from '../store'
import { fromEntities, toEntities } from '../sync/entities'
import type { Data, FajrSpan, Task } from '../types'

// Fajr from an independent implementation (the adhan library, angle-based high-latitude rule).
const REFERENCE: [string, number, number, number, string, string][] = [
  ['Cairo', 30.0444, 31.2357, 19.5, '2026-10-28', '2026-10-28T02:38Z'],
  ['Cairo', 30.0444, 31.2357, 19.5, '2026-06-21', '2026-06-21T01:08Z'],
  ['Riyadh', 24.7136, 46.6753, 18.5, '2026-01-15', '2026-01-15T02:17Z'],
  ['New York', 40.7128, -74.006, 15, '2026-03-21', '2026-03-21T09:42Z'],
  ['Jakarta', -6.2088, 106.8456, 20, '2026-12-21', '2026-12-20T21:10Z'],
  ['London (no true Fajr in June)', 51.5074, -0.1278, 18, '2026-06-21', '2026-06-21T01:30Z'],
  ['Paris', 48.8566, 2.3522, 12, '2026-09-23', '2026-09-23T04:29Z'],
]

describe('fajrMs', () => {
  it.each(REFERENCE)('%s on %s is within 2 minutes of the reference', (_, lat, lng, angle, k, ref) => {
    const ms = fajrMs(k, lat, lng, angle)
    expect(ms).not.toBeNull()
    expect(Math.abs(ms! - Date.parse(ref))).toBeLessThan(2 * 60_000)
  })
  it('has no Fajr where the sun does not rise or set (polar day and night)', () => {
    expect(fajrMs('2026-06-21', 69.65, 18.95, 18)).toBeNull()
    expect(fajrMs('2026-12-21', 69.65, 18.95, 18)).toBeNull()
  })
})

describe('where Fajr is reckoned', () => {
  const f = { place: null, angle: null, announce: true }
  it('a known time zone gives its main city and its usual angle', () => {
    expect(resolveFajr(f, 'Africa/Cairo')).toEqual({ lat: 30.0444, lng: 31.2357, angle: 19.5 })
    expect(placeForZone('Asia/Riyadh')?.angle).toBe(18.5)
  })
  it('an unknown time zone with no coordinates cannot be reckoned', () => {
    expect(resolveFajr(f, 'UTC')).toBeNull()
    expect(resolveFajr(f, '')).toBeNull()
  })
  it('coordinates win over the zone and take the nearest city’s angle; a chosen angle wins over both', () => {
    expect(resolveFajr({ ...f, place: { lat: 21.42, lng: 39.83 } }, 'UTC')).toEqual({ lat: 21.42, lng: 39.83, angle: 18.5 }) // Makkah
    expect(resolveFajr({ ...f, place: { lat: 31.2, lng: 29.9 } }, 'Europe/Paris')?.angle).toBe(19.5) // Alexandria
    expect(resolveFajr({ ...f, angle: 18 }, 'Africa/Cairo')?.angle).toBe(18)
  })
})

describe('switchFajr — turning the rule on and off only ever adds dated spans', () => {
  const cairo = { lat: 30.0444, lng: 31.2357, angle: 19.5 }
  const T1 = '2026-10-20T10:00:00.000Z', T2 = '2026-10-25T10:00:00.000Z', T3 = '2026-10-27T10:00:00.000Z'
  it('on from nothing opens a span at that moment; off closes it at that moment', () => {
    const on = switchFajr([], cairo, T1, 'a')
    expect(on).toEqual([{ id: 'a', from: T1, to: null, ...cairo, createdAt: T1 }])
    expect(fajrIsOn(on)).toBe(true)
    const off = switchFajr(on, null, T2, 'b')
    expect(off).toEqual([{ ...on[0], to: T2 }])
    expect(fajrIsOn(off)).toBe(false)
  })
  it('on again at the same place keeps the open span (changing only the notice adds nothing)', () => {
    const on = switchFajr([], cairo, T1, 'a')
    expect(switchFajr(on, cairo, T2, 'b')).toEqual(on)
  })
  it('a new place or angle closes the open span and opens another; old spans are kept', () => {
    const a = switchFajr([], cairo, T1, 'a')
    const b = switchFajr(a, { ...cairo, angle: 18 }, T2, 'b')
    expect(b.map((s) => [s.id, s.to])).toEqual([['a', T2], ['b', null]])
    const c = switchFajr(switchFajr(b, null, T3, 'x'), cairo, '2026-10-28T10:00:00.000Z', 'c')
    expect(c.map((s) => s.id)).toEqual(['a', 'b', 'c'])
    expect(c.filter((s) => s.to === null).map((s) => s.id)).toEqual(['c'])
  })
  it('off while two devices both opened a span closes both', () => {
    const both: FajrSpan[] = [{ id: 'a', from: T1, to: null, ...cairo, createdAt: T1 }, { id: 'b', from: T2, to: null, ...cairo, createdAt: T2 }]
    expect(fajrIsOn(switchFajr(both, null, T3, 'x'))).toBe(false)
  })
  it('a clock behind a span’s start closes it empty instead of ending before it began', () => {
    const on = switchFajr([], cairo, T2, 'a')
    expect(switchFajr(on, null, T1, 'b')[0].to).toBe(T2)
  })
})

// A place whose Fajr falls in the small hours of this machine's own time zone, wherever the tests
// run: longitude from the UTC offset, so local mean time is about local clock time.
const lng = -new Date(2026, 9, 28).getTimezoneOffset() / 4
const HERE = { lat: 30, lng, angle: 18 }
const span = (from: Date, to: Date | null = null, id = 's'): FajrSpan =>
  ({ id, from: from.toISOString(), to: to ? to.toISOString() : null, ...HERE, createdAt: from.toISOString() })
const at = (k: string, h: number, m = 0) => { const [y, mo, d] = k.split('-').map(Number); return new Date(y, mo - 1, d, h, m) }
const ON = at('2026-10-20', 12) // the moment the owner turned it on

afterEach(() => setDayRule([]))

describe('dayOf — which day a moment belongs to', () => {
  it('with the rule off (the default), always its calendar day', () => {
    expect(dayOf(at('2026-10-28', 1))).toBe('2026-10-28')
    expect(todayKey(at('2026-10-28', 0, 5))).toBe('2026-10-28')
  })
  it('with it on: after midnight but before Fajr is the day before; from Fajr on, the new day', () => {
    setDayRule([span(ON)])
    const fajr = fajrMs('2026-10-28', HERE.lat, HERE.lng, HERE.angle)!
    expect(new Date(fajr).getHours()).toBeGreaterThanOrEqual(3) // sanity: the test place works here
    expect(new Date(fajr).getHours()).toBeLessThanOrEqual(6)
    expect(dayOf(at('2026-10-28', 0, 30))).toBe('2026-10-27')
    expect(dayOf(new Date(fajr - 60_000))).toBe('2026-10-27')
    expect(dayOf(new Date(fajr))).toBe('2026-10-28')
    expect(dayOf(at('2026-10-28', 23, 59))).toBe('2026-10-28')
    expect(todayKey(at('2026-10-28', 1))).toBe('2026-10-27')
    expect(dayOf(at('2026-10-28', 1).toISOString())).toBe('2026-10-27')
  })
  it('a moment before it was turned on, or after it was turned off, keeps its calendar day', () => {
    setDayRule([span(ON, at('2026-10-25', 12))])
    expect(dayOf(at('2026-10-19', 1))).toBe('2026-10-19') // before
    expect(dayOf(at('2026-10-22', 1))).toBe('2026-10-21') // during
    expect(dayOf(at('2026-10-27', 1))).toBe('2026-10-27') // after
  })
  it('overlapping spans from two devices: the later one decides', () => {
    setDayRule([span(ON, null, 'a'), { ...span(at('2026-10-22', 12), null, 'b'), angle: 12 }])
    expect(fajrSpanAt(at('2026-10-21', 1).getTime())?.id).toBe('a')
    expect(fajrSpanAt(at('2026-10-23', 1).getTime())?.id).toBe('b')
  })
  it('an empty or broken span is ignored', () => {
    setDayRule([span(ON, ON), { ...span(ON), from: 'nonsense' }])
    expect(dayOf(at('2026-10-28', 1))).toBe('2026-10-28')
  })
})

const doneTask = (id: string, doneAt: Date): Task => ({
  id, title: id, notes: '', areaId: null, goalId: null, projectId: null, date: toKey(doneAt), timeOfDay: 'anytime', priority: 0,
  estimateMin: null, subtasks: [], done: true, doneAt: doneAt.toISOString(), stage: 'todo', blocked: false, createdAt: doneAt.toISOString(), order: 0,
})

describe('an owner switching to Fajr after months of use', () => {
  // Late-night work before the switch: each counted on its calendar day, and the day streak with it.
  const history: Data = {
    ...emptyData(),
    tasks: [doneTask('a', at('2026-10-17', 1, 30)), doneTask('b', at('2026-10-18', 2)), doneTask('c', at('2026-10-19', 0, 40))],
    focusSessions: [{ id: 'f', startedAt: at('2026-10-19', 1).toISOString(), minutes: 25, label: '', areaId: null, goalId: null, taskId: null, habitId: null, habitAmount: 0 }],
    habitLogs: {},
  }
  it('nothing already done moves: XP, the day streak and day counts are identical after switching', () => {
    const before = { ev: xpEvents(history), streak: dayStreak(xpEvents(history), '2026-10-19'), byDay: tasksDoneByDay(history.tasks, '2026-10-16', '2026-10-20') }
    setDayRule([span(ON)])
    expect(xpEvents(history)).toEqual(before.ev)
    expect(dayStreak(xpEvents(history), '2026-10-19')).toEqual(before.streak)
    expect(tasksDoneByDay(history.tasks, '2026-10-16', '2026-10-20')).toEqual(before.byDay)
  })
  it('turning it off again later moves nothing either — what counted at Fajr stays put', () => {
    const late = { ...history, tasks: [...history.tasks, doneTask('d', at('2026-10-22', 1))] }
    setDayRule([span(ON)])
    const whileOn = xpEvents(late)
    expect(whileOn.find((e) => e.kind === 'task' && e.date === '2026-10-21')).toBeTruthy()
    setDayRule([span(ON, at('2026-10-24', 12))])
    expect(xpEvents(late)).toEqual(whileOn)
  })
  it('a task finished at 1 AM after the switch counts for the day before, so the streak holds', () => {
    const d = { ...emptyData(), tasks: [doneTask('x', at('2026-10-21', 20)), doneTask('y', at('2026-10-23', 1))] }
    setDayRule([span(ON)])
    expect(xpEvents(d).map((e) => e.date)).toEqual(['2026-10-21', '2026-10-22'])
    expect(dayStreak(xpEvents(d), '2026-10-22').current).toBe(2)
  })
})

describe('the store', () => {
  beforeEach(() => useStore.setState({ ...emptyData() }))
  it('setDayStart dates the switch with a span, and the app’s today follows it at once', () => {
    const st = () => useStore.getState()
    expect(st().setDayStart(true, { place: { lat: HERE.lat, lng: HERE.lng }, angle: 18 })).toBe(true)
    expect(st().fajrSpans).toHaveLength(1)
    expect(st().fajrSpans[0]).toMatchObject({ to: null, lat: HERE.lat, lng: HERE.lng, angle: 18 })
    expect(fajrSpanAt(Date.now())?.id).toBe(st().fajrSpans[0].id) // installed into date.ts
    st().setDayStart(true, { announce: false }) // only the notice: no new span
    expect(st().fajrSpans).toHaveLength(1)
    expect(st().settings.fajr.announce).toBe(false)
    st().setDayStart(false)
    expect(fajrIsOn(st().fajrSpans)).toBe(false)
    expect(fajrSpanAt(Date.now() + 1000)).toBeNull()
  })
  it('asking for Fajr where no place is known leaves the day at midnight', () => {
    const st = useStore.getState()
    if (resolveFajr(st.settings.fajr, Intl.DateTimeFormat().resolvedOptions().timeZone)) return // this machine's zone is known
    expect(st.setDayStart(true)).toBe(false)
    expect(useStore.getState().fajrSpans).toEqual([])
  })
  it('restoring a backup or receiving a sync installs that data’s rule', () => {
    useStore.setState({ fajrSpans: [span(ON)] })
    expect(dayOf(at('2026-10-28', 1))).toBe('2026-10-27')
    useStore.getState().replaceAll(emptyData())
    expect(dayOf(at('2026-10-28', 1))).toBe('2026-10-28')
  })
})

describe('the “counted for” notice', () => {
  beforeEach(() => useStore.setState({ ...emptyData(), fajrSpans: [span(ON)] }))
  it('before Fajr it names the day before and says when Fajr is', () => {
    const m = countedForMessage('2026-10-27', at('2026-10-28', 1))
    expect(m).toMatch(/^Counted for Tuesday, October 27: Fajr is at .+, so that day is not over yet\.$/)
  })
  it('after Fajr it names today', () => {
    expect(countedForMessage('2026-10-28', at('2026-10-28', 15))).toBe('Counted for Wednesday, October 28.')
  })
  it('says nothing when the rule or the notice is off, or for a day ticked on purpose', () => {
    expect(countedForMessage('2026-10-26', at('2026-10-28', 15))).toBeNull()
    useStore.getState().updateSettings({ fajr: { ...useStore.getState().settings.fajr, announce: false } })
    expect(countedForMessage('2026-10-28', at('2026-10-28', 15))).toBeNull()
    useStore.setState({ ...emptyData() })
    expect(countedForMessage('2026-10-28', at('2026-10-28', 15))).toBeNull()
  })
})

describe('sync', () => {
  it('spans sync one by one, so a device that never saw a span cannot wipe it with its settings', () => {
    const d: Data = { ...emptyData(), fajrSpans: [span(ON)], settings: { ...emptyData().settings, fajr: { place: { lat: 1, lng: 2 }, angle: 18, announce: false } } }
    const e = toEntities(d)
    expect(e['fajrSpans:s']).toEqual(d.fajrSpans[0])
    expect(JSON.parse(e['settings:shared'] as string).fajr).toEqual(d.settings.fajr)
    expect(fromEntities(e, emptyData())).toEqual(d)
  })
})
