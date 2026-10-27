import { describe, expect, it } from 'vitest'
import { goalChecks, wordCount } from '../goals'

/** The goal helper's checklist (ADR-039): advice computed from the draft, never a gate. */

const draft = (o: Partial<Parameters<typeof goalChecks>[0]> = {}) => ({
  title: '', why: '', kind: 'numeric' as const, startValue: 0, target: 10, startDate: '2026-10-27', deadline: null, milestones: [], ...o,
})
const ms = (n: number, done = 0) => Array.from({ length: n }, (_, i) => ({ id: `m${i}`, title: `M${i}`, done: i < done, doneAt: null }))

describe('wordCount', () => {
  it('counts words in spaced scripts and segments Chinese', () => {
    expect(wordCount('Read 12 books')).toBe(3)
    expect(wordCount('  ')).toBe(0)
    expect(wordCount('أختم القرآن مرتين', 'ar')).toBe(3)
    expect(wordCount('读完十二本书', 'zh')).toBeGreaterThanOrEqual(3)
  })
})

describe('goalChecks', () => {
  it('specific needs three words or more', () => {
    expect(goalChecks(draft({ title: 'Reading' }), '2026-10-27').specific).toBe(false)
    expect(goalChecks(draft({ title: 'Read 12 books' }), '2026-10-27').specific).toBe(true)
  })

  it('measurable: a target above what is done, or two milestones', () => {
    expect(goalChecks(draft({ target: 10, startValue: 10 }), '2026-10-27').measurable).toBe(false)
    expect(goalChecks(draft({ target: 12 }), '2026-10-27').measurable).toBe(true)
    expect(goalChecks(draft({ kind: 'milestones', milestones: ms(1) }), '2026-10-27').measurable).toBe(false)
    expect(goalChecks(draft({ kind: 'milestones', milestones: ms(2) }), '2026-10-27').measurable).toBe(true)
  })

  it('time-bound needs a deadline that is not past and not before the start', () => {
    expect(goalChecks(draft(), '2026-10-27').timeBound).toBe(false)
    expect(goalChecks(draft({ deadline: '2026-12-31' }), '2026-10-27').timeBound).toBe(true)
    expect(goalChecks(draft({ startDate: '2026-01-01', deadline: '2026-10-01' }), '2026-10-27').timeBound).toBe(false)
    expect(goalChecks(draft({ startDate: '2026-11-10', deadline: '2026-11-01' }), '2026-10-27').timeBound).toBe(false)
  })

  it('the pace a numeric deadline asks for, a week, counted from today or a later start', () => {
    // 14 days from 10-27 to 11-09 inclusive; 10 to go → 5 a week.
    expect(goalChecks(draft({ deadline: '2026-11-09' }), '2026-10-27').perWeek).toBe(5)
    expect(goalChecks(draft({ startDate: '2026-11-03', deadline: '2026-11-09' }), '2026-10-27').perWeek).toBeCloseTo(10)
    expect(goalChecks(draft({ deadline: '2026-11-09', startValue: 10 }), '2026-10-27').perWeek).toBeNull()
    expect(goalChecks(draft(), '2026-10-27').perWeek).toBeNull()
  })

  it('days for each milestone still open', () => {
    expect(goalChecks(draft({ kind: 'milestones', milestones: ms(4, 2), deadline: '2026-11-15' }), '2026-10-27').daysPerMilestone).toBe(10)
    expect(goalChecks(draft({ kind: 'milestones', milestones: ms(2, 2), deadline: '2026-11-15' }), '2026-10-27').daysPerMilestone).toBeNull()
  })

  it('a deadline more than a year away is flagged as far', () => {
    expect(goalChecks(draft({ deadline: '2027-10-27' }), '2026-10-27').far).toBe(false)
    expect(goalChecks(draft({ deadline: '2027-12-31' }), '2026-10-27').far).toBe(true)
  })

  it('why is any text', () => {
    expect(goalChecks(draft({ why: '  ' }), '2026-10-27').why).toBe(false)
    expect(goalChecks(draft({ why: 'For my health' }), '2026-10-27').why).toBe(true)
  })
})
