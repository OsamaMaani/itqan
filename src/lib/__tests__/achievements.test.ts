import { describe, expect, it } from 'vitest'
import { achievementYears, categoryMeta, suggestions, toText, yearSummary } from '../achievements'
import { emptyData } from '../seed'
import type { Achievement, Data } from '../types'

let n = 0
const a = (x: Partial<Achievement>): Achievement => ({
  id: `a${++n}`, title: 'T', story: '', date: '2026-03-01', category: 'career', emoji: '', impact: 1, highlight: false,
  tags: [], links: [], goalId: null, projectId: null, source: null, createdAt: '', updatedAt: '', ...x,
})

describe('years and summaries', () => {
  const list = [
    a({ date: '2026-01-10', category: 'career', impact: 3, highlight: true }),
    a({ date: '2026-05-02', category: 'faith' }),
    a({ date: '2026-07-20', category: 'career' }),
    a({ date: '2025-11-01', category: 'health' }),
  ]
  it('lists years newest first and always includes this year', () => {
    expect(achievementYears(list, '2026-10-16')).toEqual([2026, 2025])
    expect(achievementYears([], '2027-01-01')).toEqual([2027])
  })
  it('summarises one year and compares with the one before', () => {
    const s = yearSummary(list, 2026)
    expect(s).toMatchObject({ count: 3, major: 1, previousYearCount: 1 })
    expect(s.byCategory).toEqual([{ category: 'career', count: 2 }, { category: 'faith', count: 1 }])
    expect(s.highlights).toHaveLength(1)
  })
  it('custom categories get a neutral style instead of breaking', () => {
    expect(categoryMeta('Hackathons')).toMatchObject({ label: 'Hackathons', emoji: '✨' })
    expect(categoryMeta('career').label).toBe('Career')
  })
})

describe('suggestions from the rest of Itqan', () => {
  const base = (): Data => ({
    ...emptyData(),
    areas: [{ id: 'q', name: 'Quran', emoji: '', color: 'emerald', archived: false, createdAt: '' }],
    goals: [{ id: 'g1', title: 'Complete a full revision', why: 'Keep it strong', areaId: 'q', kind: 'numeric', startValue: 0, target: 30, unit: 'juz', startDate: '2026-01-01', deadline: null, milestones: [], status: 'done', completedAt: '2026-09-30T20:00:00', createdAt: '', link: null }],
    focusSessions: Array.from({ length: 25 }, (_, i) => ({ id: `f${i}`, startedAt: '2026-10-01T10:00:00', minutes: 30, label: '', areaId: null, goalId: null, taskId: null, habitId: null, habitAmount: 0 })),
  })
  it('offers completed goals (with a category from their area) and focus milestones', () => {
    const s = suggestions(base(), '2026-10-16')
    expect(s.map((x) => x.source)).toEqual(['focus:10', 'goal:g1'])
    expect(s[1]).toMatchObject({ title: 'Complete a full revision', category: 'faith', date: '2026-09-30', impact: 3, goalId: 'g1' })
  })
  it('never suggests something already recorded or dismissed', () => {
    const d = { ...base(), achievements: [a({ source: 'goal:g1' })] }
    expect(suggestions(d, '2026-10-16').map((x) => x.source)).toEqual(['focus:10'])
    expect(suggestions(d, '2026-10-16', ['focus:10'])).toEqual([])
  })
})

describe('export', () => {
  it('groups a year by category in a stable order, oldest first, with links', () => {
    const text = toText([
      a({ title: 'Promoted', date: '2026-06-01', category: 'career', impact: 3, story: 'Team lead' }),
      a({ title: 'B1 French', date: '2026-02-01', category: 'languages', links: [{ id: 'l', label: 'Certificate', url: 'https://x.y' }] }),
      a({ title: 'Old', date: '2025-01-01' }),
    ], 2026)
    expect(text).toContain('Achievements 2026')
    expect(text.indexOf('Career')).toBeLessThan(text.indexOf('Languages'))
    expect(text).toContain('• Jun 1 — Promoted ★')
    expect(text).toContain('  Team lead')
    expect(text).toContain('  Certificate: https://x.y')
    expect(text).not.toContain('Old')
    const bare = toText([a({ links: [{ id: 'l', label: 'x.y/cert', url: 'https://x.y/cert' }] })], 2026)
    expect(bare).toContain('  https://x.y/cert')
    expect(bare).not.toContain('x.y/cert: ')
  })
})
