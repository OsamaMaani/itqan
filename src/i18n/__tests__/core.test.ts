import { describe, expect, it } from 'vitest'
import { i18nFor, registerCatalog, type Messages, type Plural } from '../core'
import { en } from '../en'

// Formatting does not depend on the words, so the English catalog stands in for every language.
for (const lang of ['ar', 'fr', 'zh', 'es'] as const) registerCatalog(lang, en as Messages)

describe('formatting per language (ADR-024)', () => {
  it('writes Western digits in Arabic — the owner’s choice', () => {
    const t = i18nFor('ar')
    expect(t.n(1234)).toMatch(/^1[,٬]?234$/)
    expect(t.d('2026-10-17', 'day')).toBe('17')
    expect(t.pct(0.5)).toMatch(/50/)
    expect(t.d('2026-10-17', 'full')).not.toMatch(/[٠-٩]/)
  })
  it('names days and months in the language, from a local DateKey (never shifted by UTC)', () => {
    expect(i18nFor('fr').d('2026-10-17', 'full')).toBe('samedi 17 octobre')
    expect(i18nFor('es').d('2026-10-17', 'full')).toBe('sábado, 17 de octubre')
    expect(i18nFor('zh').d('2026-10-17', 'full')).toBe('10月17日星期六')
    expect(i18nFor('ar').d('2026-10-17', 'weekday')).toBe('السبت')
    expect(i18nFor('en').d('2026-10-17', 'full', true)).toBe('Saturday, October 17')
    expect(i18nFor('fr').d('2026-10-17', 'full', true)).toBe('Samedi 17 octobre')
  })
  it('lists weekdays from Sunday', () => {
    expect(i18nFor('fr').weekdays('long')[0]).toBe('dimanche')
    expect(i18nFor('ar').weekdays('long')[5]).toBe('الجمعة')
  })
  it('picks Arabic’s six plural forms', () => {
    const t = i18nFor('ar')
    const pl: Plural = { zero: 'z{n}', one: 'o{n}', two: 't{n}', few: 'f{n}', many: 'm{n}', other: 'x{n}' }
    expect([0, 1, 2, 3, 10, 11, 99, 100, 102].map((n) => t.p(pl, n))).toEqual(['z0', 'o1', 't2', 'f3', 'f10', 'm11', 'm99', 'x100', 'x102'])
  })
  it('falls back to other when a form is missing, and French counts 0 as one', () => {
    expect(i18nFor('fr').p({ one: '{n} tâche', other: '{n} tâches' }, 0)).toBe('0 tâche')
    expect(i18nFor('zh').p({ other: '{n} 个任务' }, 1)).toBe('1 个任务')
  })
  it('fills placeholders, formatting numbers but not strings', () => {
    const t = i18nFor('en')
    expect(t.f('{a} of {b}', { a: 1200, b: '2026' })).toBe('1,200 of 2026')
    expect(t.f('{missing} stays', {})).toBe('{missing} stays')
  })
  it('says how long ago, in the language', () => {
    const now = new Date(2026, 9, 17, 12, 0, 0)
    const t = i18nFor('en')
    expect(t.ago(new Date(2026, 9, 17, 11, 59, 30), now)).toBe('30 seconds ago')
    expect(t.ago(new Date(2026, 9, 17, 9, 0), now)).toBe('3 hours ago')
    expect(t.ago('2026-10-10', now)).toBe('7 days ago')
    expect(t.ago('2026-08-17', now)).toBe('2 months ago')
    expect(t.ago('2024-10-17', now)).toBe('2 years ago') // whole calendar years, not 730/365.25
    expect(i18nFor('fr').ago('2024-10-17', now)).toBe('il y a 2 ans')
    expect(i18nFor('es').ago('2026-10-10', now)).toBe('hace 7 días')
  })
  it('counts days across a daylight-saving change as whole days', () => {
    // 25 Oct 2026 is the EU change; in any zone the rounding keeps a 7-day gap at 7.
    expect(i18nFor('en').ago('2026-10-20', new Date(2026, 9, 27, 0, 0))).toBe('7 days ago')
  })
  it('counts a DateKey in whole days, whatever the time now', () => {
    const late = new Date(2026, 9, 17, 23, 30)
    expect(i18nFor('en').ago('2026-10-16', late)).toBe('yesterday')
    expect(i18nFor('en').ago('2026-10-17', late)).toBe('today')
  })
  it('says durations', () => {
    const t = i18nFor('en')
    expect([t.dur(25), t.dur(60), t.dur(80)]).toEqual(['25m', '1h', '1h 20m'])
  })
  it('gives Today / Tomorrow / In N days', () => {
    const t = i18nFor('en')
    expect([t.relDay(0), t.relDay(1), t.relDay(-1), t.relDay(3), t.relDay(-2)]).toEqual(['Today', 'Tomorrow', 'Yesterday', 'In 3 days', '2 days ago'])
  })
})
