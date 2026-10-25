import { quickAddWords, type QuickAddWords } from '../i18n/quickAddWords'
import { addDaysKey, dayOfWeek, weekStartKey } from './date'
import type { Area, DateKey, Priority, Project, TimeOfDay } from './types'

/**
 * Parses a one-line task like
 *   "Read 30 pages #books !2 tomorrow @evening ~30m +portfolio"
 *   "Lire 30 pages #livres demain @soir"   "明天下午读书 #学习"   "اقرأ 30 صفحة غدا"
 * into its parts. Unrecognised words stay in the title. `date` is undefined when the text
 * says nothing about a day (the caller picks a default), and null for "inbox"/"someday".
 *
 * Day and time words come from `words` (English plus the interface language, see
 * i18n/quickAddWords.ts); #area, +project, !priority and 2026-10-20 work the same everywhere.
 */
export interface Parsed {
  title: string
  areaId: string | null
  projectId: string | null
  priority: Priority
  timeOfDay: TimeOfDay
  estimateMin: number | null
  date: DateKey | null | undefined
}

const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '')

const ARABIC_FOLD: Record<string, string> = { 'ٱ': 'ا', 'ى': 'ي', 'ة': 'ه', '’': "'", 'ʼ': "'", '٫': '.' }

/** One character, folded: lower case, no accents or Arabic diacritics/tatweel, Western digits. */
function foldChar(c: string): string {
  const code = c.codePointAt(0)!
  if (code >= 0x660 && code <= 0x669) return String(code - 0x660) // Arabic-Indic digits
  if (code >= 0x6f0 && code <= 0x6f9) return String(code - 0x6f0) // Persian digits
  const s = c.toLowerCase().normalize('NFKD').replace(/[\p{M}ـ]/gu, '')
  return [...s].map((x) => ARABIC_FOLD[x] ?? x).join('')
}

export const fold = (s: string) => [...s].map(foldChar).join('')

/** The folded text, and for each of its positions the matching position in `s`. */
function foldWithMap(s: string): { text: string; at: number[] } {
  let text = ''
  const at: number[] = []
  let i = 0
  for (const c of s) {
    const f = foldChar(c)
    for (let k = 0; k < f.length; k++) at.push(i)
    text += f
    i += c.length
  }
  at.push(s.length)
  return { text, at }
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const ZH_NUM = '一二两三四五六七八九十'
const NUM = `(\\d{1,3}|[${ZH_NUM}]{1,3})`
/** Edges of a word: spaces, punctuation, or a Chinese character (Chinese has no spaces). */
const EDGE = `\\s,.;:!?()\\[\\]"'«»“”‘’،؛؟。，、；：！？（）\\p{sc=Han}`
const BEFORE = `(?<=^|[${EDGE}])`
const AFTER = `(?=$|[${EDGE}…])`

/** A phrase as a regex: folded, any run of spaces, {n} for a number. */
function phrase(p: string): string {
  return fold(p).trim().split(/\s+/).map((part) => {
    // "{n}天后" also matches "3 天后": a number may stand apart from the word it is glued to.
    const pieces = part.split('{n}').map(esc)
    return pieces.map((x, i) => (i === 0 ? x : `${pieces[i - 1] ? '\\s?' : ''}${NUM}${x ? '\\s?' : ''}${x}`)).join('')
  }).join('\\s+')
}
const alt = (list: string[]) => `(?:${[...new Set(list.map(phrase))].sort((a, b) => b.length - a.length).join('|')})`

/** "3", "三", "十二", "两" → a number (Chinese numerals up to 99). */
function num(s: string): number {
  if (/^\d+$/.test(s)) return Number(s)
  const digit = (c: string) => (c === '两' ? 2 : '一二三四五六七八九'.indexOf(c) + 1)
  if (!s.includes('十')) return s.length === 1 ? digit(s) : NaN
  const [tens, ones] = s.split('十')
  if (tens.length > 1 || ones.length > 1) return NaN
  return (tens ? digit(tens) : 1) * 10 + (ones ? digit(ones) : 0)
}
const firstGroup = (m: RegExpExecArray) => m.slice(1).find((g) => g !== undefined) ?? ''

interface Rule {
  re: RegExp
  /** What the match means, or null if it turns out to mean nothing (a bad number). */
  apply: (m: RegExpExecArray) => ((out: Parsed) => void) | null
}

const ruleCache = new WeakMap<QuickAddWords[], Map<string, Rule[]>>()

function rulesFor(words: QuickAddWords[], today: DateKey, weekStartsOn: 0 | 1 | 6): Rule[] {
  const key = `${today}|${weekStartsOn}`
  const cached = ruleCache.get(words)?.get(key)
  if (cached) return cached

  const all = <K extends keyof QuickAddWords>(k: K) => words.flatMap((w) => w[k] as string[])
  const rule = (body: string, apply: Rule['apply']): Rule => ({ re: new RegExp(`${BEFORE}${body}${AFTER}`, 'gu'), apply })
  const day = (date: DateKey | null, time?: TimeOfDay) => () => (out: Parsed) => {
    out.date = date
    if (time) out.timeOfDay = time
  }
  const inDays = (perUnit: number) => (m: RegExpExecArray) => {
    const n = num(firstGroup(m))
    return Number.isFinite(n) ? (out: Parsed) => { out.date = addDaysKey(today, n * perUnit) } : null
  }

  const rules: Rule[] = [
    rule(alt(all('today')), day(today)),
    rule(alt(all('tonight')), day(today, 'evening')),
    rule(alt(all('tomorrow')), day(addDaysKey(today, 1))),
    rule(alt(all('inbox')), day(null)),
    rule(alt(all('nextWeek')), day(addDaysKey(weekStartKey(today, weekStartsOn), 7))),
    rule(alt(all('inDays')), inDays(1)),
    rule(alt(all('inWeeks')), inDays(7)),
    rule(`\\d{4}-\\d{2}-\\d{2}`, (m) => (out) => { out.date = m[0] }),
  ]
  for (const w of words) {
    for (const [p, days] of Object.entries(w.relative)) rules.push(rule(phrase(p), day(addDaysKey(today, days))))
  }

  const prefix = all('weekdayPrefix')
  const suffix = all('weekdaySuffix')
  for (let wd = 0; wd < 7; wd++) {
    const names = words.flatMap((w) => w.weekdays[wd])
    const body = `${prefix.length ? `(?:${alt(prefix)}\\s*){0,2}` : ''}${alt(names)}${suffix.length ? `(?:\\s*${alt(suffix)})?` : ''}`
    const delta = (wd - dayOfWeek(today) + 7) % 7 || 7 // the next one, never today
    rules.push(rule(body, day(addDaysKey(today, delta))))
  }

  for (const time of ['morning', 'afternoon', 'evening'] as const) {
    const set = (out: Parsed) => { out.timeOfDay = time }
    rules.push(rule(`@${alt(words.flatMap((w) => w.times[time]))}`, () => set))
    const bare = words.filter((w) => w.bareTimes).flatMap((w) => w.times[time])
    if (bare.length) rules.push(rule(alt(bare), () => set))
  }

  rules.push(rule(`~(\\d+(?:[.,]\\d+)?)(?:\\s?(?:(${alt(all('minutes'))})|(${alt(all('hours'))})))?`, (m) => {
    const n = Number(m[1].replace(',', '.'))
    return (out) => { out.estimateMin = Math.round(m[3] !== undefined ? n * 60 : n) }
  }))

  if (!ruleCache.has(words)) ruleCache.set(words, new Map())
  ruleCache.get(words)!.set(key, rules)
  return rules
}

/** The token around `pos` starts with # or +: it is an area or project name, not a date. */
function insideTag(input: string, pos: number): boolean {
  let s = pos
  while (s > 0 && !/\s/.test(input[s - 1])) s--
  return s < pos && (input[s] === '#' || input[s] === '+')
}

const ENGLISH = quickAddWords('en')

export function parseQuickAdd(
  input: string, areas: Area[], today: DateKey, weekStartsOn: 0 | 1 | 6 = 6, projects: Project[] = [],
  words: QuickAddWords[] = ENGLISH,
): Parsed {
  const out: Parsed = { title: '', areaId: null, projectId: null, priority: 0, timeOfDay: 'anytime', estimateMin: null, date: undefined }
  const { text, at } = foldWithMap(input)

  // 1. Day, time and estimate phrases, leftmost-longest, never overlapping.
  type Hit = { start: number; end: number; apply: (out: Parsed) => void }
  const found: Hit[] = []
  for (const r of rulesFor(words, today, weekStartsOn)) {
    r.re.lastIndex = 0
    for (let m = r.re.exec(text); m; m = r.re.exec(text)) {
      if (m[0].length === 0) { r.re.lastIndex++; continue }
      const start = at[m.index]
      const end = at[m.index + m[0].length]
      const apply = r.apply(m)
      if (apply && !insideTag(input, start)) found.push({ start, end, apply })
    }
  }
  found.sort((a, b) => a.start - b.start || b.end - a.end)
  const hits: Hit[] = []
  for (const h of found) if (!hits.length || h.start >= hits[hits.length - 1].end) hits.push(h)
  for (const h of hits) h.apply(out) // left to right: the last day mentioned wins

  // 2. What is left, word by word: #area, +project, !priority.
  const kept: { start: number; end: number }[] = []
  const edges = new Set(hits.flatMap((h) => [h.start, h.end]))
  let from = 0
  for (const gap of [...hits, { start: input.length, end: input.length }]) {
    for (const m of input.slice(from, gap.start).matchAll(/\S+/g)) {
      const w = m[0]
      const start = from + m.index
      // Punctuation stuck to a removed word goes with it: "demain!" is not a priority.
      if (/^\p{P}+$/u.test(w) && (edges.has(start) || edges.has(start + w.length))) continue
      if (w.startsWith('#') && w.length > 1) {
        const q = norm(w.slice(1))
        const live = areas.filter((a) => !a.archived)
        const hit = live.find((a) => norm(a.name) === q) ?? live.find((a) => norm(a.name).startsWith(q))
        if (hit) { out.areaId = hit.id; continue }
      }
      if (w.startsWith('+') && w.length > 1) {
        const q = norm(w.slice(1))
        const live = projects.filter((p) => p.status !== 'archived' && p.status !== 'done')
        const hit = live.find((p) => norm(p.title) === q) ?? live.find((p) => norm(p.title).startsWith(q))
        if (hit) {
          out.projectId = hit.id
          if (!out.areaId && hit.areaId) out.areaId = hit.areaId
          continue
        }
      }
      if (/^!{1,3}$/.test(w)) { out.priority = w.length as Priority; continue }
      if (/^![1-3]$/.test(w)) { out.priority = Number(w[1]) as Priority; continue }
      kept.push({ start, end: start + w.length })
    }
    from = gap.end
  }

  // Rejoin with a space only where the original had one ("去明天超市" → "去超市").
  out.title = kept.map((k, i) => {
    const w = input.slice(k.start, k.end)
    return i > 0 && /\s/.test(input.slice(kept[i - 1].end, k.start)) ? ` ${w}` : w
  }).join('').trim()
  return out
}

/**
 * "idea: buy a kettle" / "فكرة: …" / "想法：…" → "buy a kettle"; null when the text is not an
 * idea. An empty string means the prefix alone was typed.
 */
export function ideaText(input: string, words: QuickAddWords[] = ENGLISH): string | null {
  const { text, at } = foldWithMap(input)
  const m = new RegExp(`^\\s*${alt(words.flatMap((w) => w.idea))}(?:\\s*[:：]|\\s)\\s*`, 'u').exec(text)
  return m ? input.slice(at[m[0].length]).trim() : null
}

/** "note: …" → the note's text (ADR-035). Unlike an idea, the colon is required: "Note the time" is a task. */
export function noteText(input: string, words: QuickAddWords[] = ENGLISH): string | null {
  const { text, at } = foldWithMap(input)
  const m = new RegExp(`^\\s*${alt(words.flatMap((w) => w.note))}\\s*[:：]\\s*`, 'u').exec(text)
  return m ? input.slice(at[m[0].length]).trim() : null
}

/** Example words for hints, in the interface language (the last of `words`). */
export function quickAddExamples(words: QuickAddWords[]) {
  const w = words[words.length - 1]
  return {
    days: [w.today[0], w.tomorrow[0], w.weekdays[5][0], w.nextWeek[0], w.inDays[0].replace('{n}', '3'), w.inbox[0]],
    time: `@${w.times.morning[0]}`,
    estimate: `~30${w.minutes[0]}`,
    idea: w.idea[0],
    note: w.note[0],
  }
}
