import { addDaysKey, dayOfWeek, weekStartKey } from './date'
import type { Area, DateKey, Priority, TimeOfDay } from './types'

/**
 * Parses a one-line task like
 *   "Read 30 pages #books !2 tomorrow @evening ~30m"
 * into its parts. Unrecognised words stay in the title. `date` is undefined when the text
 * says nothing about a day (the caller picks a default), and null for "inbox"/"someday".
 */
export interface Parsed {
  title: string
  areaId: string | null
  priority: Priority
  timeOfDay: TimeOfDay
  estimateMin: number | null
  date: DateKey | null | undefined
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const TIMES: Record<string, TimeOfDay> = {
  morning: 'morning', am: 'morning', afternoon: 'afternoon', noon: 'afternoon',
  evening: 'evening', night: 'evening', pm: 'evening',
}

const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '')

export function parseQuickAdd(input: string, areas: Area[], today: DateKey, weekStartsOn: 0 | 1 | 6 = 6): Parsed {
  const out: Parsed = { title: '', areaId: null, priority: 0, timeOfDay: 'anytime', estimateMin: null, date: undefined }
  const words = input.trim().split(/\s+/).filter(Boolean)
  const keep: string[] = []

  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    const lw = w.toLowerCase()
    const next = words[i + 1]?.toLowerCase()

    if (w.startsWith('#') && w.length > 1) {
      const q = norm(w.slice(1))
      const live = areas.filter((a) => !a.archived)
      const hit = live.find((a) => norm(a.name) === q) ?? live.find((a) => norm(a.name).startsWith(q))
      if (hit) { out.areaId = hit.id; continue }
    }
    if (/^!{1,3}$/.test(w)) { out.priority = w.length as Priority; continue }
    if (/^![1-3]$/.test(w)) { out.priority = Number(w[1]) as Priority; continue }
    if (w.startsWith('@') && TIMES[lw.slice(1)]) { out.timeOfDay = TIMES[lw.slice(1)]; continue }

    const est = /^~(\d+(?:\.\d+)?)(m|min|h|hr)?$/.exec(lw)
    if (est) {
      const n = Number(est[1])
      out.estimateMin = Math.round(est[2]?.startsWith('h') ? n * 60 : n)
      continue
    }

    if (lw === 'today' || lw === 'tod') { out.date = today; continue }
    if (lw === 'tonight') { out.date = today; out.timeOfDay = 'evening'; continue }
    if (lw === 'tomorrow' || lw === 'tmr' || lw === 'tmrw') { out.date = addDaysKey(today, 1); continue }
    if (lw === 'inbox' || lw === 'someday') { out.date = null; continue }
    if (/^\d{4}-\d{2}-\d{2}$/.test(lw)) { out.date = lw; continue }

    if (lw === 'next' && next === 'week') {
      out.date = addDaysKey(weekStartKey(today, weekStartsOn), 7); i++; continue
    }
    if (lw === 'in' && next && /^\d+$/.test(next)) {
      const unit = words[i + 2]?.toLowerCase() ?? ''
      const n = Number(next)
      if (/^days?$/.test(unit)) { out.date = addDaysKey(today, n); i += 2; continue }
      if (/^weeks?$/.test(unit)) { out.date = addDaysKey(today, n * 7); i += 2; continue }
    }
    const wd = WEEKDAYS.indexOf(lw === 'next' && next && WEEKDAYS.includes(next) ? next : lw)
    if (wd >= 0) {
      if (lw === 'next') i++
      const delta = (wd - dayOfWeek(today) + 7) % 7 || 7
      out.date = addDaysKey(today, delta)
      continue
    }

    keep.push(w)
  }

  out.title = keep.join(' ').trim()
  return out
}
