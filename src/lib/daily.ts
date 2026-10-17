import { tx, type I18n, type Lang } from '../i18n/core'
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

/** Speech voices for the word of the day. Names come from Intl (`languageName`), in the interface language. */
export const LANGUAGES: Record<WordLanguage, { name: string; speech: string }> = {
  fr: { name: 'French', speech: 'fr-FR' },
  en: { name: 'English', speech: 'en-GB' },
  de: { name: 'German', speech: 'de-DE' },
  es: { name: 'Spanish', speech: 'es-ES' },
  zh: { name: 'Chinese', speech: 'zh-CN' },
}

/** "French", "Französisch"… — a language's name in the interface language. */
export function languageName(code: WordLanguage, t: I18n = tx()): string {
  try {
    return t.cap(new Intl.DisplayNames([t.locale], { type: 'language' }).of(code) ?? LANGUAGES[code].name)
  } catch {
    return LANGUAGES[code].name
  }
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

export function verseKey(v: Verse): string {
  return `${v.s}:${v.a}-${v.b}`
}

/** "Ash-Sharh 94:5–6", or "from Al-Baqarah 2:286" for an excerpt — in the interface language. */
export function verseRef(v: Verse, surahName: string, t: I18n = tx()): string {
  const ayahs = v.b > v.a ? `${v.a}–${v.b}` : `${v.a}`
  return t.f(v.part ? t.m.daily.verseRefPart : t.m.daily.verseRef, { surah: surahName, s: String(v.s), ayahs })
}

/** "Sahih al-Bukhari 6464" / "Jami‘ at-Tirmidhi 2380 · Sahih (al-Albani)" — in the interface language. */
export function hadithSource(h: Hadith, t: I18n = tx()): string {
  const { daily } = t.m
  const where = h.n ? t.f(daily.hadithNumber, { collection: daily.collections[h.book], n: String(h.n) }) : daily.collections[h.book]
  return h.grade ? t.f(daily.graded, { where, grade: daily.grades[GRADE_KEY[h.grade]] }) : where
}
const GRADE_KEY = { Sahih: 'sahih', Hasan: 'hasan', 'Hasan Sahih': 'hasanSahih' } as const

/*
 * Translations of the daily card (ADR-024). The verse, hadith and Arabic sayings are shown in
 * Arabic in every language; what changes is the meaning under them and everything else on the card.
 *
 * - Quran: never translated by us. French, Spanish and Chinese show a published translation of the
 *   meanings (src/content/meanings/, generated and verified); Arabic shows the verse alone.
 * - Everything else is translated in src/content/i18n/<lang>.ts and <lang>-words.ts, keyed by the
 *   English — so when an English item is edited its old translation stops matching, and the
 *   completeness test in daily.test.ts fails until it is translated again.
 */

/** A published translation of the Quran's meanings, for the verses in VERSES. */
export interface QuranMeanings {
  translator: string
  /** 114 surah names in the language, index = surah - 1. */
  surahs: string[]
  /** verseKey → the translation of ayahs a..b. */
  verses: Record<string, string>
  /** verseKey → the run of that translation matching an excerpt (`part`) verse. */
  excerpts: Record<string, string>
}

/** The daily card's own content in one interface language, keyed by the English. */
export interface DailyTranslation {
  /** Narrators and authors ("Abu Hurairah", "attributed to William Osler", "Arabic proverb"). */
  people: Record<string, string>
  /** Where a saying comes from ("The Principles of Psychology, 1890"). */
  sources: Record<string, string>
  /** Hadith meanings, keyed by `Hadith.en`. Not used in Arabic, where the hadith stands alone. */
  hadith: Record<string, string>
  /** Sayings, keyed by `Saying.text`. In Arabic, sayings that have their original `ar` need none. */
  sayings: Record<string, string>
  /** Facts, keyed by `Fact.text`. */
  facts: Record<string, string>
}

/**
 * Word meanings, per word pack, keyed by `Word.word`: [meaning, example meaning]. For the pack in
 * the interface language itself (French words in French), [a short definition] — like the English pack.
 */
export type WordMeanings = Record<WordLanguage, Record<string, [string] | [string, string]>>

export interface DailyContent {
  quran?: QuranMeanings
  /** Surah names for Arabic (no meanings there). */
  surahs?: string[]
  text?: DailyTranslation
  words?: WordMeanings
}

/** The meaning shown under a verse, or null when none is shown (Arabic, or not loaded yet). */
export function verseMeaning(v: Verse, lang: Lang, c: DailyContent): string | null {
  if (lang === 'en') return v.en
  const q = c.quran
  if (!q) return null
  return (v.part ? q.excerpts[verseKey(v)] : q.verses[verseKey(v)]) || null
}

/** [primary, secondary] surah name: "Ash-Sharh" · "The Relief"; "الشرح"; "开拓". */
export function surahName(s: number, lang: Lang, c: DailyContent, english: [string, string]): [string, string | null] {
  if (lang === 'en') return english
  if (lang === 'ar') return [c.surahs?.[s - 1] ?? english[0], null]
  const local = c.quran?.surahs[s - 1]
  if (lang === 'zh') return [local ?? english[0], null]
  return [english[0], local ?? null]
}

export function hadithMeaning(h: Hadith, lang: Lang, c: DailyContent): string | null {
  if (lang === 'en') return h.en
  if (lang === 'ar') return null
  return c.text?.hadith[h.en] ?? null
}

/** A saying in the interface language; null in Arabic for a saying shown in its Arabic original. */
export function sayingText(s: Saying, lang: Lang, c: DailyContent): string | null {
  if (lang === 'en') return s.text
  if (lang === 'ar' && s.ar) return null
  return c.text?.sayings[s.text] ?? s.text
}

export function factText(f: Fact, lang: Lang, c: DailyContent): string {
  return lang === 'en' ? f.text : c.text?.facts[f.text] ?? f.text
}

export function personName(name: string, lang: Lang, c: DailyContent): string {
  return lang === 'en' ? name : c.text?.people[name] ?? name
}

export function sourceName(source: string, lang: Lang, c: DailyContent): string {
  return lang === 'en' ? source : c.text?.sources[source] ?? source
}

/** [meaning, example meaning] of a word in the interface language (English until loaded). */
export function wordMeaning(w: Word, pack: WordLanguage, lang: Lang, c: DailyContent): [string, string | undefined] {
  const local = lang === 'en' ? undefined : c.words?.[pack]?.[w.word]
  return local ? [local[0], local[1]] : [w.meaning, w.exampleMeaning]
}
