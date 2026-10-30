import { afterEach, describe, expect, it } from 'vitest'
import { i18nFor } from '../../i18n/core'
import { setDayRule } from '../date'
import { prayerTimes } from '../fajr'
import {
  edgeMs, nextWindow, spanText, todayOccurrence, windowCheck, windowDays, windowLabel, windowSpan, withDays, recount, opensInEvening,
  type WindowContext,
} from '../habitWindows'
import { streak } from '../habits'
import type { Habit, HabitLogs, HabitWindow, WindowEdge } from '../types'

const cairo = { lat: 30.0444, lng: 31.2357, angle: 19.5 }
const ctx: WindowContext = { place: cairo, asr: 'standard' }
const nowhere: WindowContext = { place: null, asr: 'standard' }
const at = (time: string): WindowEdge => ({ kind: 'time', time })
const prayer = (p: 'fajr' | 'asr' | 'maghrib' | 'isha', offset = 0): WindowEdge => ({ kind: 'prayer', prayer: p, offset })
const win = (start: WindowEdge, end: WindowEdge, nights = 0, countOn: HabitWindow['countOn'] = 'start'): HabitWindow =>
  ({ start, end, nights, countOn, countdown: true })
const habit = (schedule: Habit['schedule'], window: HabitWindow | null): Habit => ({
  id: 'h', name: 'H', emoji: '', areaId: null, schedule, target: 1, unit: '', round: null, window, archived: false,
  createdAt: '2026-10-01T08:00:00.000Z', order: 0,
})
const none: HabitLogs = {}
// Local clock instants: 2026-10-29 is a Thursday, 10-30 a Friday, 10-31 a Saturday.
const local = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime()
const THU = '2026-10-29', FRI = '2026-10-30', SAT = '2026-10-31'
const occ = (h: Habit, now: number, today: string, logs = none, showBefore = -1, c = ctx) => {
  const o = todayOccurrence(h, logs, now, today, 6, c, showBefore)
  return o && { day: o.day, state: o.state }
}

afterEach(() => setDayRule([]))

describe('prayerTimes', () => {
  // From an independent implementation (the adhan library, twilight-angle high-latitude rule).
  const REF: [string, number, number, number, 'standard' | 'hanafi', string, string[]][] = [
    ['Cairo', 30.0444, 31.2357, 19.5, 'standard', '2026-10-28', ['02:38', '04:06', '09:39', '12:47', '15:11', '16:30']],
    ['Cairo in summer', 30.0444, 31.2357, 19.5, 'standard', '2026-06-21', ['01:08', '02:54', '09:57', '13:32', '16:59', '18:33']],
    ['Riyadh (Isha 90 min after Maghrib)', 24.7136, 46.6753, 18.5, 'standard', '2026-01-15', ['02:17', '03:40', '09:03', '12:06', '14:26', '15:56']],
    ['New York (Isha after midnight UTC)', 40.7128, -74.006, 15, 'standard', '2026-03-21', ['09:42', '10:58', '17:03', '20:30', '23:09', '+00:25']],
    ['Karachi, Hanafi Asr', 24.8607, 67.0011, 18, 'hanafi', '2026-07-01', ['-23:17', '00:46', '07:36', '12:18', '14:26', '15:49']],
    ['London in June (angle-based Fajr and Isha)', 51.5074, -0.1278, 18, 'standard', '2026-06-21', ['01:31', '03:43', '12:02', '16:25', '20:22', '22:27']],
    ['Paris', 48.8566, 2.3522, 12, 'standard', '2026-09-23', ['04:30', '05:38', '11:43', '15:01', '17:47', '18:55']],
  ]
  it.each(REF)('%s is within 2 minutes of the reference', (_, lat, lng, angle, asr, k, ref) => {
    const p = prayerTimes(k, { lat, lng, angle }, asr)!
    const keys = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
    keys.forEach((key, i) => {
      const r = ref[i]
      const shift = r[0] === '+' ? 1 : r[0] === '-' ? -1 : 0
      const want = Date.parse(`${k}T${r.replace(/^[+-]/, '')}Z`) + shift * 86_400_000
      expect(Math.abs(p[key] - want), key).toBeLessThan(2 * 60_000)
    })
  })
  it('Hanafi Asr is later than the standard one', () => {
    expect(prayerTimes(FRI, cairo, 'hanafi')!.asr - prayerTimes(FRI, cairo, 'standard')!.asr).toBeGreaterThan(30 * 60_000)
  })
  it('are in order through the day', () => {
    const p = prayerTimes(FRI, cairo, 'standard')!
    expect([p.fajr, p.sunrise, p.dhuhr, p.asr, p.maghrib, p.isha]).toEqual([...[p.fajr, p.sunrise, p.dhuhr, p.asr, p.maghrib, p.isha]].sort((a, b) => a - b))
  })
  it('there are none where the sun does not rise or set', () => {
    expect(prayerTimes('2026-06-21', { lat: 69.65, lng: 18.95, angle: 18 }, 'standard')).toBeNull()
    expect(prayerTimes('2026-12-21', { lat: 69.65, lng: 18.95, angle: 18 }, 'standard')).toBeNull()
  })
})

describe('where a window falls', () => {
  it('a prayer edge is that calendar day’s prayer time, give or take its offset', () => {
    const p = prayerTimes(FRI, cairo, 'standard')!
    expect(edgeMs(prayer('asr'), FRI, ctx)).toBe(p.asr)
    expect(edgeMs(prayer('asr', 15), FRI, ctx)).toBe(p.asr + 15 * 60_000)
    expect(edgeMs(prayer('maghrib', -10), FRI, ctx)).toBe(p.maghrib - 10 * 60_000)
  })
  it('a clock edge is that day’s local clock', () => {
    expect(edgeMs(at('15:30'), FRI, nowhere)).toBe(local(30, 15, 30))
  })
  it('Thursday’s Asr to Friday’s Maghrib, counted on Friday, opens Thursday', () => {
    const w = win(prayer('asr'), prayer('maghrib'), 1, 'end')
    expect(windowSpan(w, FRI, ctx)).toEqual({ opens: prayerTimes(THU, cairo, 'standard')!.asr, closes: prayerTimes(FRI, cairo, 'standard')!.maghrib })
  })
  it('… and counted on Thursday, it is the same window', () => {
    expect(windowSpan(win(prayer('asr'), prayer('maghrib'), 1, 'start'), THU, ctx)).toEqual(windowSpan(win(prayer('asr'), prayer('maghrib'), 1, 'end'), FRI, ctx))
  })
  it('cannot be placed without a location, at the pole, or closing before it opens', () => {
    expect(windowSpan(win(prayer('asr'), prayer('maghrib')), FRI, nowhere)).toBeNull()
    expect(windowSpan(win(prayer('asr'), prayer('maghrib')), '2026-06-21', { place: { lat: 69.65, lng: 18.95, angle: 18 }, asr: 'standard' })).toBeNull()
    expect(windowSpan(win(prayer('maghrib'), prayer('asr')), FRI, ctx)).toBeNull()
    expect(windowSpan(win(at('17:00'), at('17:00')), FRI, ctx)).toBeNull()
  })
})

describe('a window as days around the day it counts for', () => {
  it('opens days before it, or closes days after it — never both', () => {
    expect(windowDays(win(prayer('maghrib'), prayer('maghrib'), 1, 'end'))).toEqual({ before: 1, after: 0 })
    expect(windowDays(win(prayer('isha'), prayer('fajr'), 1, 'start'))).toEqual({ before: 0, after: 1 })
    expect(windowDays(win(prayer('asr'), prayer('maghrib')))).toEqual({ before: 0, after: 0 })
  })
  it('choosing one side replaces the other', () => {
    const night = win(prayer('isha'), prayer('fajr'), 1, 'start')
    expect(withDays(night, { before: 1 })).toMatchObject({ nights: 1, countOn: 'end' }) // Thursday Maghrib to Friday Maghrib
    expect(withDays(night, { before: 0 })).toBe(night) // the start day was already "that day": the end stays
    expect(withDays(night, { after: 0 })).toMatchObject({ nights: 0, countOn: 'start' })
    const friday = win(prayer('maghrib'), prayer('maghrib'), 1, 'end')
    expect(withDays(friday, { after: 2 })).toMatchObject({ nights: 2, countOn: 'start' })
    expect(withDays(friday, { after: 0 })).toBe(friday)
    expect(withDays(friday, { before: 0 })).toMatchObject({ nights: 0, countOn: 'start' })
  })
})

describe('which normal day a window across days is saved on', () => {
  const friday = win(prayer('maghrib'), prayer('maghrib'), 1, 'end')
  it('moves the weekdays with the count day, so the window itself stays put', () => {
    const r = recount({ type: 'days', days: [5] }, friday, 'start')
    expect(r).toEqual({ schedule: { type: 'days', days: [4] }, window: { ...friday, countOn: 'start' } })
    expect(recount(r.schedule, r.window, 'end')).toEqual({ schedule: { type: 'days', days: [5] }, window: friday })
    expect(recount({ type: 'days', days: [0, 6] }, { ...friday, countOn: 'start' }, 'end').schedule).toEqual({ type: 'days', days: [0, 1] })
    expect(recount({ type: 'days', days: [0] }, friday, 'start').schedule).toEqual({ type: 'days', days: [6] })
  })
  it('the same window either way: Thursday Maghrib to Friday Maghrib', () => {
    const r = recount({ type: 'days', days: [5] }, friday, 'start')
    expect(windowSpan(r.window, THU, ctx)).toEqual(windowSpan(friday, FRI, ctx))
  })
  it('leaves daily habits, one-day windows and no-change alone', () => {
    expect(recount({ type: 'daily' }, friday, 'start').schedule).toEqual({ type: 'daily' })
    const same = win(prayer('asr'), prayer('maghrib'))
    expect(recount({ type: 'days', days: [5] }, same, 'end')).toEqual({ schedule: { type: 'days', days: [5] }, window: same })
    expect(recount({ type: 'days', days: [5] }, friday, 'end').window).toBe(friday)
  })
  it('knows an evening start, when the Islamic day has already turned', () => {
    expect(opensInEvening(friday, ctx, FRI)).toBe(true)
    expect(opensInEvening(win(prayer('isha'), prayer('fajr'), 1), ctx, FRI)).toBe(true)
    expect(opensInEvening(win(prayer('asr'), prayer('maghrib')), ctx, FRI)).toBe(false)
    expect(opensInEvening(win({ kind: 'time', time: '21:00' }, { kind: 'time', time: '23:00' }), ctx, FRI)).toBe(true)
    expect(opensInEvening(win({ kind: 'time', time: '13:00' }, { kind: 'time', time: '15:00' }), nowhere, FRI)).toBe(false)
  })
})

describe('todayOccurrence — what Today shows, and which day a tap counts for', () => {
  it('a habit without a window shows on its days only, for today', () => {
    const h = habit({ type: 'days', days: [5] }, null)
    expect(occ(h, local(30, 9), FRI)).toEqual({ day: FRI, state: null })
    expect(occ(h, local(29, 9), THU)).toBeNull()
  })

  describe('Friday, 3 PM to 5 PM', () => {
    const h = habit({ type: 'days', days: [5] }, win(at('15:00'), at('17:00')))
    it('before: upcoming, all day by default', () => expect(occ(h, local(30, 9), FRI)).toEqual({ day: FRI, state: 'upcoming' }))
    it('during: open', () => expect(occ(h, local(30, 15, 30), FRI)).toEqual({ day: FRI, state: 'open' }))
    it('after: closed, and still there to tick for the rest of the day', () => expect(occ(h, local(30, 20), FRI)).toEqual({ day: FRI, state: 'closed' }))
    it('the opening instant is open, the closing instant is closed', () => {
      expect(occ(h, local(30, 15), FRI)?.state).toBe('open')
      expect(occ(h, local(30, 17), FRI)?.state).toBe('closed')
    })
    it('not on other days', () => expect(occ(h, local(29, 16), THU)).toBeNull())
    it('“an hour before”: hidden until an hour before it opens', () => {
      expect(occ(h, local(30, 13, 59), FRI, none, 60)).toBeNull()
      expect(occ(h, local(30, 14), FRI, none, 60)).toEqual({ day: FRI, state: 'upcoming' })
    })
    it('“once it opens”: hidden until it opens, then shown to the end of the day', () => {
      expect(occ(h, local(30, 14, 59), FRI, none, 0)).toBeNull()
      expect(occ(h, local(30, 15), FRI, none, 0)?.state).toBe('open')
      expect(occ(h, local(30, 20), FRI, none, 0)?.state).toBe('closed')
    })
  })

  describe('Thursday 3 PM to Friday 5 PM, counted on Friday', () => {
    const h = habit({ type: 'days', days: [5] }, win(at('15:00'), at('17:00'), 1, 'end'))
    it('Thursday morning: upcoming, for Friday', () => expect(occ(h, local(29, 9), THU)).toEqual({ day: FRI, state: 'upcoming' }))
    it('Thursday evening: open, for Friday', () => expect(occ(h, local(29, 22), THU)).toEqual({ day: FRI, state: 'open' }))
    it('Friday noon: still open, for Friday', () => expect(occ(h, local(30, 12), FRI)).toEqual({ day: FRI, state: 'open' }))
    it('Friday night: closed, for Friday', () => expect(occ(h, local(30, 21), FRI)).toEqual({ day: FRI, state: 'closed' }))
    it('Saturday: nothing', () => expect(occ(h, local(31, 9), SAT)).toBeNull())
    it('ticking it on Thursday makes Friday met, and only once Friday comes does it count in the streak', () => {
      const logs: HabitLogs = { h: { [FRI]: 1 } }
      expect(streak(h, logs, THU, 6).current).toBe(0)
      expect(streak(h, logs, FRI, 6).current).toBe(1)
    })
  })

  describe('Thursday 3 PM to Friday 5 PM, counted on Thursday', () => {
    const h = habit({ type: 'days', days: [4] }, win(at('15:00'), at('17:00'), 1, 'start'))
    it('Thursday morning: upcoming, for Thursday', () => expect(occ(h, local(29, 9), THU)).toEqual({ day: THU, state: 'upcoming' }))
    it('Friday noon: open, still for Thursday', () => expect(occ(h, local(30, 12), FRI)).toEqual({ day: THU, state: 'open' }))
    it('Friday after it closed: gone — Thursday is past', () => expect(occ(h, local(30, 18), FRI)).toBeNull())
  })

  it('a night window decides the day, not the clock: 1 AM in “11 PM to 4 AM, counted on the day it opens” is the evening before', () => {
    const h = habit({ type: 'daily' }, win(at('23:00'), at('04:00'), 1, 'start'))
    expect(occ(h, local(30, 1), FRI)).toEqual({ day: THU, state: 'open' })
    expect(occ(h, local(30, 9), FRI)).toEqual({ day: FRI, state: 'upcoming' })
  })

  it('a nightly window that closed this morning gives way to tonight’s once tonight’s shows', () => {
    // 11:30 PM to 12:30 AM, counted on the day it closes: Friday's closed at 12:30 AM; Saturday's opens Friday night.
    const h = habit({ type: 'daily' }, win(at('23:30'), at('00:30'), 1, 'end'))
    expect(occ(h, local(30, 21), FRI)).toEqual({ day: SAT, state: 'upcoming' })
    expect(occ(h, local(30, 10), FRI, none, 60)).toEqual({ day: FRI, state: 'closed' })
    expect(occ(h, local(30, 23, 45), FRI)).toEqual({ day: SAT, state: 'open' })
  })

  it('overlapping windows (daily, longer than a day) show the unmet one closing first', () => {
    const h = habit({ type: 'daily' }, win(at('15:00'), at('17:00'), 1, 'start'))
    expect(occ(h, local(30, 16), FRI)).toEqual({ day: THU, state: 'open' })
    expect(occ(h, local(30, 16), FRI, { h: { [THU]: 1 } })).toEqual({ day: FRI, state: 'open' })
  })

  it('a weekly habit whose week is done is not shown', () => {
    const h = habit({ type: 'weekly', times: 1 }, win(at('15:00'), at('17:00')))
    expect(occ(h, local(30, 16), FRI, { h: { [THU]: 1 } })).toBeNull()
    expect(occ(h, local(30, 16), FRI, { h: { [FRI]: 1 } })).toEqual({ day: FRI, state: 'open' })
  })

  it('a window that cannot be placed today (no location) leaves the habit as it would be without one', () => {
    const h = habit({ type: 'days', days: [5] }, win(prayer('asr'), prayer('maghrib')))
    expect(occ(h, local(30, 9), FRI, none, -1, nowhere)).toEqual({ day: FRI, state: null })
    expect(occ(h, local(29, 9), THU, none, -1, nowhere)).toBeNull()
  })

  it('a backwards window (5 PM to 3 PM the same day) is no window', () => {
    const h = habit({ type: 'daily' }, win(at('17:00'), at('15:00')))
    expect(occ(h, local(30, 16), FRI)).toEqual({ day: FRI, state: null })
  })

  it('archived habits show nothing', () => {
    expect(todayOccurrence({ ...habit({ type: 'daily' }, win(at('15:00'), at('17:00'))), archived: true }, none, local(30, 16), FRI, 6, ctx, -1)).toBeNull()
  })

  it('reads the day through the day rule: before Fajr, an evening window still belongs to the day before', () => {
    // A day starting at Fajr in Cairo: at 2 AM Friday it is still Thursday, so a window
    // "Thursday 3 PM → Friday 5 PM, for Friday" that opened yesterday is open for Friday.
    setDayRule([{ id: 's', from: '2026-01-01T00:00:00.000Z', to: null, ...cairo, createdAt: '2026-01-01T00:00:00.000Z' }])
    const h = habit({ type: 'days', days: [5] }, win(at('15:00'), at('17:00'), 1, 'end'))
    expect(occ(h, local(30, 2), THU)).toEqual({ day: FRI, state: 'open' })
  })
})

describe('windowCheck — what the editor warns about', () => {
  it('prayer edges need a location', () => {
    expect(windowCheck(win(prayer('asr'), at('18:00')), nowhere, FRI).noPlace).toBe(true)
    expect(windowCheck(win(at('15:00'), at('18:00')), nowhere, FRI)).toEqual({ noPlace: false, backwards: 0 })
  })
  it('counts the days of the coming year a window closes before it opens', () => {
    expect(windowCheck(win(prayer('asr'), prayer('maghrib')), ctx, FRI).backwards).toBe(0)
    expect(windowCheck(win(prayer('maghrib'), prayer('asr')), ctx, FRI).backwards).toBe(366)
    expect(windowCheck(win(prayer('maghrib'), prayer('asr'), 1), ctx, FRI).backwards).toBe(0)
    expect(windowCheck(win(at('15:00'), at('14:00')), ctx, FRI).backwards).toBe(366)
  })
})

describe('nextWindow — the editor’s example', () => {
  it('is the next window not yet closed, on a scheduled day', () => {
    const h = { schedule: { type: 'days' as const, days: [5] }, window: win(at('15:00'), at('17:00'), 1, 'end') }
    expect(nextWindow(h, local(29, 9), THU, ctx)).toEqual({ day: FRI, opens: local(29, 15), closes: local(30, 17) })
    expect(nextWindow(h, local(30, 18), FRI, ctx)?.day).toBe('2026-11-06')
  })
})

describe('words', () => {
  const t = i18nFor('en')
  it('labels a window', () => {
    expect(windowLabel(win(prayer('asr'), prayer('maghrib')), t)).toBe('Asr – Maghrib')
    expect(windowLabel(win(prayer('isha', 30), prayer('fajr', -15), 1), t)).toBe('30 min after Isha – 15 min before Fajr the next day')
    expect(windowLabel(win(prayer('asr'), prayer('maghrib'), 2), t)).toBe('Asr – Maghrib, 2 days later')
    expect(windowLabel(win(prayer('maghrib'), prayer('maghrib'), 1, 'end'), t)).toBe('Maghrib the day before – Maghrib')
    expect(windowLabel(win(prayer('maghrib'), prayer('maghrib'), 2, 'end'), t)).toBe('Maghrib, 2 days before – Maghrib')
  })
  it('names the days when it counts for one weekday', () => {
    expect(windowLabel(win(prayer('maghrib'), prayer('maghrib'), 1, 'end'), t, 5)).toBe('Thu Maghrib – Fri Maghrib')
    expect(windowLabel(win(prayer('isha'), prayer('fajr'), 1, 'start'), t, 6)).toBe('Sat Isha – Sun Fajr')
    expect(windowLabel(win(prayer('maghrib'), prayer('maghrib'), 1, 'end'), t, 0)).toBe('Sat Maghrib – Sun Maghrib')
    expect(windowLabel(win(prayer('asr'), prayer('maghrib')), t, 5)).toBe('Asr – Maghrib')
  })
  it('says how long, rounded up', () => {
    expect(spanText(30_000, t)).toBe('1m')
    expect(spanText(45 * 60_000, t)).toBe('45m')
    expect(spanText(125 * 60_000, t)).toBe('2h 5m')
    expect(spanText((26 * 60 + 10) * 60_000, t)).toBe('1d 2h')
  })
})
