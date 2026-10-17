import type { CefrLevel, DailySettings, DateKey, WordLanguage } from './types'

/**
 * The daily card on Today (ADR-023): a verse, a hadith, a word, a piece of wisdom and a fact,
 * one of each per day. Pure functions only — the content lives in src/content and is loaded lazily.
 */

export type DailyKind = 'verse' | 'hadith' | 'word' | 'wisdom' | 'fact'
export const DAILY_KINDS: DailyKind[] = ['verse', 'hadith', 'word', 'wisdom', 'fact']

export interface Verse {
  /** Surah, first and last ayah. */
  s: number
  a: number
  b: number
  /** Uthmani Arabic, one string per ayah in a..b. */
  ar: string[]
  /** Saheeh International. */
  en: string
  /** An excerpt rather than whole ayahs. */
  part?: true
  /** The excerpt ends mid-ayah, so no end-of-ayah mark follows it. */
  cut?: true
}

export type HadithBook = 'bukhari' | 'muslim' | 'tirmidhi' | 'abudawud' | 'ibnmajah' | 'bayhaqi'

export interface Hadith {
  book: HadithBook
  /** sunnah.com number (Muslim: Fu'ad Abd al-Baqi's); 0 when the source has none here. */
  n: number
  ar: string
  en: string
  /** The Companion who narrated it. */
  by: string
  /** Al-Albani's grade, for books other than al-Bukhari and Muslim. */
  grade?: 'Sahih' | 'Hasan' | 'Hasan Sahih'
  /** False when the verifier's sources do not hold it and it was sourced by hand. */
  checked?: false
}

export type Field = 'Psychology' | 'Medicine' | 'Biology' | 'Neuroscience' | 'Learning' | 'Science' | 'Character' | 'History' | 'Proverb'

export interface Saying {
  text: string
  by: string
  field: Field
  /** Where it was said or written, when known. */
  source?: string
  /** The original Arabic, for sayings that have one. */
  ar?: string
}

export interface Fact {
  text: string
  field: Field
  /** The study or authority behind it. */
  source?: string
}

export type Pos = 'n' | 'nm' | 'nf' | 'nn' | 'v' | 'adj' | 'adv' | 'expr' | 'prep' | 'conj' | 'pron'

export interface Word {
  /** As a learner should learn it — nouns with their article ("la démarche", "die Erfahrung"). */
  word: string
  pos: Pos
  /** In English; for English words, a short definition. */
  meaning: string
  example: string
  /** The example in English (absent for English words). */
  exampleMeaning?: string
  /** Pinyin, for Chinese. */
  reading?: string
}

export type WordPack = Record<CefrLevel, Word[]>

export const POS_LABEL: Record<Pos, string> = {
  n: 'noun', nm: 'noun, masc.', nf: 'noun, fem.', nn: 'noun, neut.', v: 'verb', adj: 'adjective', adv: 'adverb',
  expr: 'expression', prep: 'preposition', conj: 'conjunction', pron: 'pronoun',
}

export const LANGUAGES: Record<WordLanguage, { name: string; speech: string }> = {
  fr: { name: 'French', speech: 'fr-FR' },
  en: { name: 'English', speech: 'en-GB' },
  de: { name: 'German', speech: 'de-DE' },
  es: { name: 'Spanish', speech: 'es-ES' },
  zh: { name: 'Chinese', speech: 'zh-CN' },
}

/** Chinese is graded by HSK, not CEFR; this is the usual approximate match (the original HSK 1–6). */
export const HSK: Record<CefrLevel, string> = { A1: 'HSK 1', A2: 'HSK 2', B1: 'HSK 3', B2: 'HSK 4', C1: 'HSK 5', C2: 'HSK 6' }

export function levelLabel(lang: WordLanguage, level: CefrLevel): string {
  return lang === 'zh' ? `${level} · ≈${HSK[level]}` : level
}

export function enabledKinds(s: DailySettings): DailyKind[] {
  return DAILY_KINDS.filter((k) => s[k])
}

/**
 * Days since 1970-01-01 for a local DateKey. Counted on the calendar date itself (Date.UTC of its
 * year, month and day), so it is exact in every time zone and across daylight-saving changes.
 */
export function dayNumber(day: DateKey): number {
  const [y, m, d] = day.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

/**
 * The item shown on `day`. Every item appears once per cycle of `items.length` days, in an order
 * shuffled afresh each cycle, and never on two days running. Same answer on every device; `salt`
 * keeps the kinds (and each language and level) on independent orders.
 */
export function pickForDay<T>(items: readonly T[], day: DateKey, salt: string): T | undefined {
  const n = items.length
  if (n === 0) return undefined
  const t = dayNumber(day)
  if (n <= 2) return items[((t % n) + n) % n]
  const cycle = Math.floor(t / n)
  return items[cycleOrder(n, salt, cycle)[t - cycle * n]]
}

function cycleOrder(n: number, salt: string, cycle: number): number[] {
  const order = shuffled(n, `${salt}:${cycle}`)
  // The swap below only touches the first two places, so the previous cycle's last item is
  // its unswapped shuffle's last item (n > 2).
  const before = shuffled(n, `${salt}:${cycle - 1}`)[n - 1]
  if (order[0] === before) [order[0], order[1]] = [order[1], order[0]]
  return order
}

/** Fisher–Yates over 0..n-1 with a PRNG seeded from `seed`. */
function shuffled(n: number, seed: string): number[] {
  const order = Array.from({ length: n }, (_, i) => i)
  const rand = mulberry32(hash(seed))
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
export function arabicDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)])
}

/** "Ash-Sharh 94:5–6", or "from Al-Baqarah 2:286" for an excerpt. */
export function verseRef(v: Verse, surahName: string): string {
  const ayahs = v.b > v.a ? `${v.a}–${v.b}` : `${v.a}`
  return `${v.part ? 'from ' : ''}${surahName} ${v.s}:${ayahs}`
}

const COLLECTIONS: Record<HadithBook, string> = {
  bukhari: 'Sahih al-Bukhari', muslim: 'Sahih Muslim', tirmidhi: 'Jami‘ at-Tirmidhi', abudawud: 'Sunan Abi Dawud',
  ibnmajah: 'Sunan Ibn Majah', bayhaqi: 'al-Bayhaqi, Shu‘ab al-Iman',
}

/** "Sahih al-Bukhari 6464" / "Jami‘ at-Tirmidhi 2380 · Sahih (al-Albani)". */
export function hadithSource(h: Hadith): string {
  const where = h.n ? `${COLLECTIONS[h.book]} ${h.n}` : COLLECTIONS[h.book]
  return h.grade ? `${where} · ${h.grade} (al-Albani)` : where
}
