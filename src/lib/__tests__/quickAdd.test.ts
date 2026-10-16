import { describe, expect, it } from 'vitest'
import { parseQuickAdd } from '../quickAdd'
import type { Area } from '../types'

const areas: Area[] = [
  { id: 'books', name: 'Books', emoji: '', color: 'amber', archived: false, createdAt: '' },
  { id: 'quran', name: 'Quran', emoji: '', color: 'emerald', archived: false, createdAt: '' },
  { id: 'arch', name: 'Old', emoji: '', color: 'slate', archived: true, createdAt: '' },
]
const today = '2026-10-16' // Friday

describe('quick add', () => {
  it('parses everything at once', () => {
    expect(parseQuickAdd('Read 30 pages #books !2 tomorrow @evening ~30m', areas, today)).toEqual({
      title: 'Read 30 pages', areaId: 'books', projectId: null, priority: 2, timeOfDay: 'evening', estimateMin: 30, date: '2026-10-17',
    })
  })
  it('leaves date undefined when none is given', () => {
    expect(parseQuickAdd('Call mum', areas, today).date).toBeUndefined()
  })
  it('matches area prefixes case-insensitively, but not archived areas', () => {
    expect(parseQuickAdd('Revise #qur', areas, today).areaId).toBe('quran')
    expect(parseQuickAdd('x #old', areas, today)).toMatchObject({ areaId: null, title: 'x #old' })
  })
  it('weekdays mean the next occurrence, never today', () => {
    expect(parseQuickAdd('Gym saturday', areas, today).date).toBe('2026-10-17')
    expect(parseQuickAdd('Gym friday', areas, today).date).toBe('2026-10-23')
  })
  it('understands relative phrases', () => {
    expect(parseQuickAdd('a in 3 days', areas, today).date).toBe('2026-10-19')
    expect(parseQuickAdd('a in 2 weeks', areas, today).date).toBe('2026-10-30')
    expect(parseQuickAdd('a next week', areas, today, 6).date).toBe('2026-10-17')
    expect(parseQuickAdd('a someday', areas, today).date).toBeNull()
    expect(parseQuickAdd('a tonight', areas, today)).toMatchObject({ date: today, timeOfDay: 'evening' })
  })
  it('+project puts the task in a project and takes its area, but not done/archived projects', () => {
    const projects = [
      { id: 'p1', title: 'Portfolio site', areaId: 'books', status: 'active' },
      { id: 'p2', title: 'Old thing', areaId: null, status: 'done' },
    ] as never[]
    expect(parseQuickAdd('Write about page +portfolio', areas, today, 6, projects)).toMatchObject({ title: 'Write about page', projectId: 'p1', areaId: 'books' })
    expect(parseQuickAdd('x +old', areas, today, 6, projects)).toMatchObject({ projectId: null, title: 'x +old' })
    expect(parseQuickAdd('2 + 2', areas, today, 6, projects).title).toBe('2 + 2')
  })
  it('hours estimate', () => {
    expect(parseQuickAdd('Study ~1.5h', areas, today).estimateMin).toBe(90)
  })
  it('keeps unrelated words such as "in" in the title', () => {
    expect(parseQuickAdd('Sign in to portal', areas, today).title).toBe('Sign in to portal')
  })
})
