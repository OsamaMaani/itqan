import { describe, expect, it } from 'vitest'
import { buildSchedule, nextOccurrence, occurrencesBetween, timerAlert, yearsOn } from '../reminders'
import type { ActiveTimer, Reminder } from '../types'

const r = (p: Partial<Reminder>): Reminder => ({
  id: 'r', title: 'T', notes: '', emoji: '', date: '2026-10-16', time: null, repeat: 'none',
  alerts: [0], important: false, contactId: null, countYears: true, done: false, createdAt: '', ...p,
})
const local = (s: string) => new Date(s) // "2026-10-16T10:00" parses as local time

describe('occurrences', () => {
  it('monthly on the 31st falls on the last day of shorter months, counted from the original', () => {
    expect(occurrencesBetween(r({ date: '2026-01-31', repeat: 'monthly' }), '2026-02-01', '2026-04-30'))
      .toEqual(['2026-02-28', '2026-03-31', '2026-04-30'])
  })
  it('yearly on 29 February falls on 28 February in other years', () => {
    expect(occurrencesBetween(r({ date: '2024-02-29', repeat: 'yearly' }), '2025-01-01', '2028-12-31'))
      .toEqual(['2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29'])
  })
  it('weekly from an old start date lands on the right weekday', () => {
    expect(occurrencesBetween(r({ date: '2020-01-03', repeat: 'weekly' }), '2026-10-12', '2026-10-18')).toEqual(['2026-10-16'])
  })
  it('a one-off occurs once', () => {
    expect(occurrencesBetween(r({}), '2026-01-01', '2026-12-31')).toEqual(['2026-10-16'])
  })
})

describe('next occurrence', () => {
  it('an all-day yearly date still counts today, all day', () => {
    expect(nextOccurrence(r({ date: '1995-10-16', repeat: 'yearly' }), local('2026-10-16T23:00'))).toBe('2026-10-16')
  })
  it('a timed one that has passed moves to the next', () => {
    expect(nextOccurrence(r({ date: '2026-10-01', time: '08:00', repeat: 'daily' }), local('2026-10-16T09:00'))).toBe('2026-10-17')
  })
  it('counts the years for birthdays', () => {
    expect(yearsOn(r({ date: '1998-03-12', repeat: 'yearly' }), '2027-03-12')).toBe(29)
  })
})

describe('desktop schedule', () => {
  const now = local('2026-10-16T10:00')

  it('makes one alert per occurrence and offset, at the right local time', () => {
    const s = buildSchedule([r({ date: '2026-10-20', time: '18:30', alerts: [0, 1440] })], now)
    expect(s.map((a) => a.key)).toEqual(['r|2026-10-20|1440', 'r|2026-10-20|0'])
    expect(new Date(s[1].fireAt).getHours()).toBe(18)
    expect(new Date(s[0].fireAt).getDate()).toBe(19)
  })
  it('all-day reminders alert at 09:00', () => {
    const s = buildSchedule([r({ date: '2026-10-18' })], now)
    expect(new Date(s[0].fireAt).getHours()).toBe(9)
  })
  it('keeps a recently missed alert (computer was asleep) but drops old ones', () => {
    const s = buildSchedule([r({ date: '2026-10-16', time: '01:00' }), r({ id: 'old', date: '2026-10-10', time: '01:00' })], now)
    expect(s.map((a) => a.key)).toEqual(['r|2026-10-16|0'])
  })
  it('does not fire alerts from before the reminder was created', () => {
    expect(buildSchedule([r({ date: '2026-10-16', time: '08:00', createdAt: '2026-10-16T09:30:00' })], now)).toEqual([])
  })
  it('a done one-off never alerts', () => {
    expect(buildSchedule([r({ date: '2026-10-20', done: true })], now)).toEqual([])
  })
  it('keys are unique even for daily reminders over the whole horizon', () => {
    const s = buildSchedule([r({ date: '2026-01-01', time: '07:00', repeat: 'daily', alerts: [0, 15] })], now, 400)
    expect(new Set(s.map((a) => a.key)).size).toBe(s.length)
    expect(s.length).toBeGreaterThan(700)
  })
  it('says how many years on a birthday', () => {
    const s = buildSchedule([r({ date: '1996-10-17', repeat: 'yearly', title: 'Ahmed’s birthday' })], now, 2)
    expect(s[0].body).toContain('30 years')
  })
})

describe('timer alert', () => {
  const timer = (p: Partial<ActiveTimer>): ActiveTimer => ({
    mode: 'focus', endsAt: 1_000_000, remainingMs: 1_500_000, totalMs: 1_500_000, startedAt: '2026-10-21T03:30:00',
    label: 'Read', areaId: null, goalId: null, taskId: null, habitId: 'h', ...p,
  })
  it('a running timer alerts when it ends', () => {
    const a = timerAlert(timer({}))
    expect(a?.fireAt).toBe(1_000_000)
    expect(a?.body).toContain('25')
  })
  it('a paused timer, or none, has no alert', () => {
    expect(timerAlert(timer({ endsAt: null }))).toBeNull()
    expect(timerAlert(null)).toBeNull()
  })
  it('resuming moves the alert to a new key, so the old end time is dropped', () => {
    expect(timerAlert(timer({ endsAt: 2_000_000 }))?.key).not.toBe(timerAlert(timer({}))?.key)
  })
  it('a break alerts with the break message', () => {
    expect(timerAlert(timer({ mode: 'break' }))?.body).not.toBe(timerAlert(timer({}))?.body)
  })
})
