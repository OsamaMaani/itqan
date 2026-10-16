import { describe, expect, it } from 'vitest'
import { toICS } from '../ics'
import type { Reminder } from '../types'

const r = (p: Partial<Reminder>): Reminder => ({
  id: 'r1', title: 'T', notes: '', emoji: '', date: '2026-10-20', time: null, repeat: 'none', alerts: [0],
  important: false, contactId: null, countYears: true, done: false, createdAt: '', ...p,
})

describe('calendar export', () => {
  it('a yearly all-day birthday alerts at 09:00 on the day and a week before', () => {
    const ics = toICS([r({ title: 'Mum’s birthday', date: '1965-10-21', repeat: 'yearly', alerts: [0, 10080] })])
    expect(ics).toContain('DTSTART;VALUE=DATE:19651021')
    expect(ics).toContain('DTEND;VALUE=DATE:19651022')
    expect(ics).toContain('RRULE:FREQ=YEARLY')
    expect(ics).toContain('TRIGGER:PT540M')
    expect(ics).toContain('TRIGGER:-PT9540M') // 7 days before, at 09:00
  })
  it('a timed one-off uses local time and minutes-before alerts', () => {
    const ics = toICS([r({ date: '2026-10-17', time: '17:00', alerts: [0, 1440] })])
    expect(ics).toContain('DTSTART:20261017T170000')
    expect(ics).toContain('TRIGGER:PT0M')
    expect(ics).toContain('TRIGGER:-PT1440M')
    expect(ics).not.toContain('RRULE')
  })
  it('matches Itqan’s clamping for the 31st and 29 February', () => {
    expect(toICS([r({ date: '2026-01-31', repeat: 'monthly' })])).toContain('RRULE:FREQ=MONTHLY;BYMONTHDAY=-1')
    expect(toICS([r({ date: '2024-02-29', repeat: 'yearly' })])).toContain('RRULE:FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=-1')
  })
  it('escapes text, uses CRLF and folds long lines', () => {
    const ics = toICS([r({ title: 'Call; then, write', notes: 'line1\nline2 '.repeat(20) })])
    expect(ics).toContain('SUMMARY:Call\; then\\, write')
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true)
  })
  it('skips done one-offs', () => {
    expect(toICS([r({ done: true })])).not.toContain('BEGIN:VEVENT')
  })
})
