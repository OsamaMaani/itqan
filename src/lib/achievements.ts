import { format } from 'date-fns'
import { fromKey, toKey } from './date'
import { streak } from './habits'
import type { Achievement, Area, Data, DateKey } from './types'

/**
 * The owner's real-life achievements (ADR-022). Pure and tested.
 * Not the game badges — those live in gamification.ts.
 */

export const ACHIEVEMENT_CATEGORIES = [
  { key: 'career', label: 'Career', emoji: '💼', hex: '#0ea5e9' },
  { key: 'education', label: 'Education', emoji: '🎓', hex: '#6366f1' },
  { key: 'learning', label: 'Learning & certificates', emoji: '📜', hex: '#8b5cf6' },
  { key: 'health', label: 'Health & fitness', emoji: '💪', hex: '#f43f5e' },
  { key: 'faith', label: 'Faith', emoji: '🕌', hex: '#10b981' },
  { key: 'languages', label: 'Languages', emoji: '🗣️', hex: '#14b8a6' },
  { key: 'projects', label: 'Projects & building', emoji: '🚀', hex: '#f97316' },
  { key: 'personal', label: 'Personal growth', emoji: '🌱', hex: '#84cc16' },
  { key: 'family', label: 'Family & friends', emoji: '🫶', hex: '#ec4899' },
  { key: 'creative', label: 'Creative', emoji: '🎨', hex: '#a855f7' },
  { key: 'finance', label: 'Finance', emoji: '💰', hex: '#f59e0b' },
  { key: 'community', label: 'Community & giving', emoji: '🤝', hex: '#22c55e' },
] as const

export interface CategoryMeta { key: string; label: string; emoji: string; hex: string }

/** Preset categories, or a custom label shown with a neutral style. */
export function categoryMeta(category: string): CategoryMeta {
  return ACHIEVEMENT_CATEGORIES.find((c) => c.key === category) ?? { key: category, label: category || 'Other', emoji: '✨', hex: '#64748b' }
}

export const IMPACT_LABEL: Record<1 | 2 | 3, string> = { 1: 'Small win', 2: 'Notable', 3: 'Major' }

export function yearOf(a: Achievement): number {
  return Number(a.date.slice(0, 4))
}

/** Years that have achievements, newest first, always including the current year. */
export function achievementYears(list: Achievement[], today: DateKey): number[] {
  return [...new Set([Number(today.slice(0, 4)), ...list.map(yearOf)])].sort((a, b) => b - a)
}

export interface YearSummary {
  year: number
  count: number
  major: number
  highlights: Achievement[]
  /** category key → count, biggest first */
  byCategory: { category: string; count: number }[]
  previousYearCount: number
}

export function yearSummary(list: Achievement[], year: number): YearSummary {
  const mine = list.filter((a) => yearOf(a) === year)
  const counts = new Map<string, number>()
  for (const a of mine) counts.set(a.category, (counts.get(a.category) ?? 0) + 1)
  return {
    year,
    count: mine.length,
    major: mine.filter((a) => a.impact === 3).length,
    highlights: mine.filter((a) => a.highlight).sort((a, b) => b.impact - a.impact || b.date.localeCompare(a.date)),
    byCategory: [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
    previousYearCount: list.filter((a) => yearOf(a) === year - 1).length,
  }
}

/** Guesses a category from an area's name (the starter areas and common English words). */
export function categoryForArea(area: Area | undefined): string {
  const n = (area?.name ?? '').toLowerCase()
  if (/quran|faith|deen|prayer|islam/.test(n)) return 'faith'
  if (/french|english|arabic|language|german|spanish/.test(n)) return 'languages'
  if (/gym|health|fitness|sport|run/.test(n)) return 'health'
  if (/course|study|university|exam|degree/.test(n)) return 'education'
  if (/book|read|learn/.test(n)) return 'learning'
  if (/work|career|job/.test(n)) return 'career'
  if (/family|friend/.test(n)) return 'family'
  if (/money|finance|saving/.test(n)) return 'finance'
  return 'personal'
}

export type Suggestion = Pick<Achievement, 'title' | 'story' | 'date' | 'category' | 'emoji' | 'impact' | 'goalId' | 'projectId' | 'source'>

const STREAK_TIERS = [30, 100, 365]
const FOCUS_TIERS = [10, 50, 100, 500] // hours

/**
 * Wins already recorded elsewhere in Itqan that are not achievements yet: completed goals and
 * projects, long habit streaks, focus-hour milestones. Anything whose `source` is already used,
 * or that the owner dismissed, is left out.
 */
export function suggestions(d: Data, today: DateKey, dismissed: string[] = []): Suggestion[] {
  const used = new Set([...d.achievements.map((a) => a.source).filter(Boolean) as string[], ...dismissed])
  const area = (id: string | null) => d.areas.find((a) => a.id === id)
  const out: Suggestion[] = []

  for (const g of d.goals) {
    if (g.status !== 'done' || !g.completedAt) continue
    out.push({
      source: `goal:${g.id}`, title: g.title, story: g.why, date: toKey(new Date(g.completedAt)),
      category: categoryForArea(area(g.areaId)), emoji: '🏆', impact: 3, goalId: g.id, projectId: null,
    })
  }
  for (const p of d.projects) {
    if (p.status !== 'done') continue
    out.push({
      source: `project:${p.id}`, title: `Finished: ${p.title}`, story: p.description, date: toKey(new Date(p.updatedAt)),
      category: 'projects', emoji: p.emoji || '🚀', impact: 2, goalId: p.goalId, projectId: p.id,
    })
  }
  for (const h of d.habits) {
    const best = streak(h, d.habitLogs, today, d.settings.weekStartsOn).best
    const unit = h.schedule.type === 'weekly' ? 'weeks' : 'days'
    for (const tier of STREAK_TIERS) {
      if (best < tier || (unit === 'weeks' && tier > 52)) continue
      out.push({
        source: `streak:${h.id}:${tier}`, title: `${h.name}: ${tier} ${unit} in a row`, story: '', date: today,
        category: categoryForArea(area(h.areaId)), emoji: '🔥', impact: tier >= 100 ? 3 : 2, goalId: null, projectId: null,
      })
    }
  }
  const focusHours = d.focusSessions.reduce((s, f) => s + f.minutes, 0) / 60
  for (const tier of FOCUS_TIERS) {
    if (focusHours < tier) continue
    out.push({
      source: `focus:${tier}`, title: `${tier} hours of deep focus`, story: '', date: today,
      category: 'personal', emoji: '🎯', impact: tier >= 100 ? 2 : 1, goalId: null, projectId: null,
    })
  }
  return out.filter((s) => !used.has(s.source!)).sort((a, b) => b.date.localeCompare(a.date))
}

/** A year as plain text — for a CV, LinkedIn, or an end-of-year reflection. */
export function toText(list: Achievement[], year: number): string {
  const mine = list.filter((a) => yearOf(a) === year).sort((a, b) => a.date.localeCompare(b.date))
  if (!mine.length) return `Achievements ${year}\n\n(none yet)\n`
  const order = [...ACHIEVEMENT_CATEGORIES.map((c) => c.key as string), ...new Set(mine.map((a) => a.category))]
  const lines = [`Achievements ${year}`, '']
  for (const cat of [...new Set(order)]) {
    const items = mine.filter((a) => a.category === cat)
    if (!items.length) continue
    const meta = categoryMeta(cat)
    lines.push(`${meta.emoji} ${meta.label}`)
    for (const a of items) {
      lines.push(`• ${format(fromKey(a.date), 'MMM d')} — ${a.title}${a.impact === 3 ? ' ★' : ''}`)
      if (a.story.trim()) lines.push(`  ${a.story.trim().replace(/\n+/g, ' ')}`)
      for (const l of a.links) lines.push(l.url.replace(/^[a-z]+:\/\//i, '') === l.label ? `  ${l.url}` : `  ${l.label}: ${l.url}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}
