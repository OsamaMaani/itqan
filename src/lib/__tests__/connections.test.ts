import { describe, expect, it } from 'vitest'
import { i18nFor, registerCatalog } from '../../i18n/core'
import { messages as zh } from '../../i18n/zh'
import { birthdayReminderDate, cadenceLabel, checkIn, lastContact, nextBirthday, parseBirthday } from '../connections'
import type { Contact, Interaction } from '../types'

const c = (p: Partial<Contact>): Contact => ({
  id: 'c', name: 'Ahmed', emoji: '', circle: 'friend', tags: [], phone: '', email: '', link: '', company: '', role: '',
  howWeMet: '', birthday: '', notes: '', cadenceDays: 14, lastContactManual: null, snoozedUntil: null,
  birthdayReminderId: null, favorite: false, archived: false, createdAt: '2026-10-01T10:00:00', updatedAt: '', ...p,
})
const talk = (date: string, contactId = 'c'): Interaction => ({ id: date, contactId, date, kind: 'call', note: '', createdAt: date })
const today = '2026-10-16'

describe('check-ins', () => {
  it('counts from the latest interaction', () => {
    const r = checkIn(c({}), [talk('2026-10-01'), talk('2026-10-10'), talk('2026-10-15', 'other')], today)
    expect(r.last).toBe('2026-10-10')
    expect(r.due).toBe('2026-10-24')
    expect(r.state).toBe('later') // 8 days away; "soon" is within a week
    expect(checkIn(c({}), [talk('2026-10-08')], today).state).toBe('soon')
  })
  it('is overdue when the rhythm has passed', () => {
    expect(checkIn(c({ cadenceDays: 7 }), [talk('2026-10-01')], today)).toMatchObject({ due: '2026-10-08', days: -8, state: 'overdue' })
  })
  it('a hand-entered “last time we talked” counts, but a later logged call wins', () => {
    expect(lastContact(c({ lastContactManual: '2026-09-01' }), [])).toBe('2026-09-01')
    expect(lastContact(c({ lastContactManual: '2026-09-01' }), [talk('2026-10-02')])).toBe('2026-10-02')
  })
  it('someone never contacted counts from the day they were added, not from today', () => {
    expect(checkIn(c({ cadenceDays: 30 }), [], today).due).toBe('2026-10-31')
  })
  it('a snooze pushes the check-in back, but never earlier', () => {
    expect(checkIn(c({ cadenceDays: 7, snoozedUntil: '2026-10-20' }), [talk('2026-10-01')], today)).toMatchObject({ due: '2026-10-20', state: 'soon' })
    expect(checkIn(c({ cadenceDays: 30, snoozedUntil: '2026-10-05' }), [talk('2026-10-10')], today).due).toBe('2026-11-09')
  })
  it('no rhythm, or archived, means no check-in', () => {
    expect(checkIn(c({ cadenceDays: null }), [], today).state).toBe('none')
    expect(checkIn(c({ archived: true }), [], today).state).toBe('none')
  })
})

describe('birthdays', () => {
  it('parses with or without a year, and rejects nonsense', () => {
    expect(parseBirthday('1998-03-12')).toEqual({ year: 1998, month: 3, day: 12 })
    expect(parseBirthday('03-12')).toEqual({ year: null, month: 3, day: 12 })
    expect(parseBirthday('13-40')).toBeNull()
    expect(parseBirthday('')).toBeNull()
  })
  it('finds the next birthday and the age then', () => {
    expect(nextBirthday('1998-10-20', today)).toEqual({ date: '2026-10-20', days: 4, age: 28 })
    expect(nextBirthday('1998-03-12', today)).toEqual({ date: '2027-03-12', days: 147, age: 29 })
    expect(nextBirthday('10-16', today)).toEqual({ date: '2026-10-16', days: 0, age: null })
  })
  it('29 February falls on 28 February in other years', () => {
    expect(nextBirthday('2000-02-29', today)?.date).toBe('2027-02-28')
  })
  it('a birthday without a year makes a reminder that does not count years', () => {
    expect(birthdayReminderDate('03-12', today)).toEqual({ date: '2026-03-12', countYears: false })
    expect(birthdayReminderDate('1998-03-12', today)).toEqual({ date: '1998-03-12', countYears: true })
  })
})

describe('cadence labels', () => {
  it('names one unit without a number, larger counts with one', () => {
    expect([7, 14, 30, 90, 365, 3, 1, null].map((d) => cadenceLabel(d)))
      .toEqual(['Every week', 'Every 2 weeks', 'Every month', 'Every 3 months', 'Every year', 'Every 3 days', 'Every day', 'No rhythm'])
  })
  it('says “every week” in a language with no singular form', () => {
    registerCatalog('zh', zh)
    const t = i18nFor('zh')
    expect([7, 14, 30, 365].map((d) => cadenceLabel(d, t))).toEqual(['每周', '每 2 周', '每月', '每年'])
  })
})
