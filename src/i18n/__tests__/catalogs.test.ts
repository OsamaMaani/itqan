import { describe, expect, it } from 'vitest'
import { FACTS } from '../../content/facts'
import { HADITH } from '../../content/hadith'
import { TEXT as AR_TEXT } from '../../content/i18n/ar'
import { WORD_MEANINGS as AR_WORDS } from '../../content/i18n/ar-words'
import { TEXT as ES_TEXT } from '../../content/i18n/es'
import { WORD_MEANINGS as ES_WORDS } from '../../content/i18n/es-words'
import { TEXT as FR_TEXT } from '../../content/i18n/fr'
import { WORD_MEANINGS as FR_WORDS } from '../../content/i18n/fr-words'
import { TEXT as ZH_TEXT } from '../../content/i18n/zh'
import { WORD_MEANINGS as ZH_WORDS } from '../../content/i18n/zh-words'
import * as ES_QURAN from '../../content/meanings/es'
import * as FR_QURAN from '../../content/meanings/fr'
import * as ZH_QURAN from '../../content/meanings/zh'
import { SURAH_NAMES as AR_SURAHS } from '../../content/meanings/ar'
import { SAYINGS } from '../../content/sayings'
import { VERSES } from '../../content/verses'
import { WORDS as DE } from '../../content/words/de'
import { WORDS as EN } from '../../content/words/en'
import { WORDS as ES } from '../../content/words/es'
import { WORDS as FR } from '../../content/words/fr'
import { WORDS as ZH } from '../../content/words/zh'
import { verseKey, type DailyTranslation, type WordMeanings, type WordPack } from '../../lib/daily'
import { addDaysKey } from '../../lib/date'
import { parseQuickAdd } from '../../lib/quickAdd'
import { starterData } from '../../lib/seed'
import type { WordLanguage } from '../../lib/types'
import { messages as ar } from '../ar'
import { i18nFor, LANG_INFO, registerCatalog, type Lang, type Messages } from '../core'
import { en } from '../en'
import { messages as es } from '../es'
import { messages as fr } from '../fr'
import { quickAddWords } from '../quickAddWords'
import { messages as zh } from '../zh'

/**
 * Translation checks (ADR-024, memory/10-localization.md). Machine-checkable rules only; tone,
 * register and terminology are for the human (or agent) reviewer.
 *
 * Check one language while translating: I18N_LANGS=fr npx vitest run src/i18n
 */

type Other = Exclude<Lang, 'en'>
const CATALOGS: Record<Other, Messages> = { ar, fr, zh, es }
declare const process: { env: Record<string, string | undefined> }
const only = (process.env.I18N_LANGS ?? '').split(',').filter(Boolean)
const LANGS = (['ar', 'fr', 'zh', 'es'] as const).filter((l) => !only.length || only.includes(l))
const PLURAL_KEYS = new Set(['zero', 'one', 'two', 'few', 'many', 'other'])

const isPlural = (v: unknown): v is Record<string, string> =>
  !!v && typeof v === 'object' && !Array.isArray(v) && 'other' in v && Object.keys(v).every((k) => PLURAL_KEYS.has(k))

interface Leaf { path: string; en: string | string[] | Record<string, string>; tr: unknown }

/** Every message in the English catalog, paired with the translation at the same path. */
function leaves(a: unknown, b: unknown, path = ''): Leaf[] {
  if (typeof a === 'string' || Array.isArray(a) || isPlural(a)) return [{ path, en: a as Leaf['en'], tr: b }]
  return Object.entries(a as Record<string, unknown>).flatMap(([k, v]) =>
    leaves(v, b && typeof b === 'object' ? (b as Record<string, unknown>)[k] : undefined, path ? `${path}.${k}` : k))
}

/** Paths in the translation that English does not have (left over after an English key was removed). */
function extra(a: unknown, b: unknown, path = ''): string[] {
  if (!b || typeof b !== 'object' || Array.isArray(b) || typeof a === 'string' || isPlural(a)) return []
  return Object.entries(b as Record<string, unknown>).flatMap(([k, v]) => {
    const p = path ? `${path}.${k}` : k
    return a && typeof a === 'object' && k in a ? extra((a as Record<string, unknown>)[k], v, p) : [p]
  })
}

const placeholders = (s: string) => new Set([...s.matchAll(/\{(\w+)\}/g)].map((x) => x[1]))
const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x))
const strings = (v: unknown): string[] => (typeof v === 'string' ? [v] : Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [])

/** Plural categories a count from 0 to 1000 can land in, for a language. */
function categoriesUsed(lang: Lang): Set<string> {
  const rules = new Intl.PluralRules(LANG_INFO[lang].locale)
  return new Set(Array.from({ length: 1001 }, (_, n) => rules.select(n)))
}

const HAN = /\p{sc=Han}/u
const ARABIC = /\p{sc=Arabic}/u
const noPlaceholders = (s: string) => s.replace(/\{\w+\}/g, '')

/**
 * Typography rules per language (Part 2 of memory/10-localization.md). Returns the broken rule, or
 * null. Placeholders count as a word (U+E000), and "!2" is quick-add priority syntax, not punctuation.
 */
function typography(lang: Other, raw: string): string | null {
  const s = raw.replace(/\{\w+\}/g, '\uE000').replace(/!(?=\d)/g, '\uE001')
  if (/\.\.\./.test(s)) return 'use the ellipsis character … not ...'
  if (lang === 'fr') {
    if (/[^\s\u00a0\u202f\uE001!?][;!?]/u.test(s)) return 'French: a narrow no-break space (U+202F) goes before ; ! ?'
    if (/ [;:!?]/.test(s)) return 'French: the space before ; : ! ? must be a no-break space (U+00A0 before :, U+202F before ; ! ?)'
    if (/[\p{L}\uE000)»]:(?!\/\/|\d|\uE000)/u.test(s)) return 'French: a no-break space (U+00A0) goes before :'
    if (/[“”"]/.test(s)) return 'French: quotes are « … »'
    if (/«[ \p{L}\p{N}\uE000]|[ \p{L}\p{N}\uE000.…!?]»/u.test(s)) return 'French: « » take a narrow no-break space (U+202F) inside'
    if (/\p{L}'\p{L}/u.test(s)) return 'French: use the apostrophe ’ not \''
  }
  if (lang === 'es') {
    const count = (re: RegExp) => (s.match(re) ?? []).length
    if (count(/\?/g) !== count(/¿/g)) return 'Spanish: every question opens with ¿'
    if (count(/!/g) !== count(/¡/g)) return 'Spanish: every exclamation opens with ¡'
    if (/[“”"]/.test(s)) return 'Spanish: quotes are « … »'
    if (/\p{L}'\p{L}/u.test(s)) return 'Spanish: use the apostrophe ’ not \''
  }
  if (lang === 'zh') {
    if (/\p{sc=Han}[,.;:!?()]|[,;:!?(]\p{sc=Han}/u.test(s)) return 'Chinese: full-width punctuation next to Chinese (，。；：！？（）)'
    if (/\p{sc=Han} \p{sc=Han}/u.test(s)) return 'Chinese: no space between Chinese characters'
    if (/["']\p{sc=Han}|\p{sc=Han}["']/u.test(s)) return 'Chinese: quotes are “ … ”'
  }
  if (lang === 'ar') {
    if (/\p{sc=Arabic}\s?[,;?]|[,;?]\s?\p{sc=Arabic}/u.test(s)) return 'Arabic: use ، ؛ ؟'
    if (/\u0640/.test(s)) return 'Arabic: no tatweel'
    if (/[“”"]/.test(s)) return 'Arabic: quotes are « … »'
  }
  return null
}

/** Latin words that may stay as they are inside Arabic or Chinese text. */
const KEEP_LATIN = new Set([
  'GitHub', 'Itqan', 'XP', 'HSK', 'CEFR', 'iPhone', 'iOS', 'Android', 'Chrome', 'Safari', 'Ctrl', 'Cmd', 'Esc', 'Enter', 'Tab',
  'PWA', 'ICS', 'iCalendar', 'DELETE', 'Shift', 'Alt', 'Linux', 'Mac', 'Windows', 'URL', 'ID', 'PAT', 'Pages', 'K', 'N', 'P',
  'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'AM', 'PM', 'Contents', 'Read', 'Write', 'Fine', 'grained', 'token', 'tokens', 'repo', 'itqan', 'data',
])

describe.each(LANGS)('%s catalog', (lang) => {
  const tr = CATALOGS[lang]
  const all = leaves(en, tr)

  it('is a real translation, not the English placeholder', () => {
    expect(tr).not.toBe(en)
  })

  it('has every message, and nothing English no longer has', () => {
    const missing = all.filter((l) => l.tr === undefined || (typeof l.en === 'string' && typeof l.tr !== 'string')).map((l) => l.path)
    expect(missing).toEqual([])
    expect(extra(en, tr)).toEqual([])
  })

  it('keeps lists the same length (level titles, milestones…)', () => {
    const bad = all.filter((l) => Array.isArray(l.en) && (!Array.isArray(l.tr) || l.tr.length !== l.en.length)).map((l) => l.path)
    expect(bad).toEqual([])
  })

  it('keeps every placeholder, and adds none', () => {
    const bad: string[] = []
    for (const l of all) {
      if (typeof l.en === 'string' && typeof l.tr === 'string' && !same(placeholders(l.en), placeholders(l.tr))) bad.push(`${l.path}: ${l.tr}`)
      if (isPlural(l.en) && isPlural(l.tr)) {
        const want = new Set(Object.values(l.en).flatMap((x) => [...placeholders(x)]))
        for (const [form, text] of Object.entries(l.tr)) {
          const got = placeholders(text)
          // A form may drop {n} ("يوم واحد" for one day) but must keep every other placeholder.
          const ok = [...got].every((p) => want.has(p)) && [...want].every((p) => p === 'n' || got.has(p))
          if (!ok) bad.push(`${l.path}.${form}: ${text}`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('has every plural form the language uses for counts 0–1000', () => {
    const need = categoriesUsed(lang)
    const bad = all.filter((l) => isPlural(l.en)).filter((l) => !isPlural(l.tr) || [...need].some((c) => !(c in (l.tr as object))))
    expect(bad.map((l) => `${l.path} (needs ${[...need].join(', ')})`)).toEqual([])
  })

  it('follows the language’s typography', () => {
    const bad = all.flatMap((l) => strings(l.tr).map((s) => [l.path, s, typography(lang, s)] as const)).filter(([, , e]) => e)
    expect(bad.map(([p, s, e]) => `${p}: ${e} — ${s}`)).toEqual([])
  })

  it('leaves no English behind', () => {
    const bad: string[] = []
    for (const l of all) {
      const trs = strings(l.tr)
      const ens = strings(l.en)
      trs.forEach((s, i) => {
        const words = noPlaceholders(s).match(/[A-Za-z][A-Za-z’'-]+/g) ?? []
        if (lang === 'ar' || lang === 'zh') {
          // Two or more English words in a row, other than names and keys, are a miss.
          const runs = noPlaceholders(s).match(/[A-Za-z][A-Za-z’'-]*(?:\s+[A-Za-z][A-Za-z’'-]*)+/g) ?? []
          if (runs.some((r) => r.split(/\s+/).some((w) => !KEEP_LATIN.has(w)))) bad.push(`${l.path}: ${s}`)
        } else if (s === ens[i] && words.length >= 3) {
          bad.push(`${l.path}: ${s}`) // a whole English sentence, untouched
        }
      })
    }
    expect(bad).toEqual([])
  })

  it('writes the quick-add examples so quick add understands them', () => {
    registerCatalog(lang, tr)
    const t = i18nFor(lang)
    const today = '2026-10-16'
    const { areas } = starterData(today, t)
    const words = quickAddWords(lang)
    const task = parseQuickAdd(tr.quickAdd.example, areas, today, 6, [], words)
    expect(task, tr.quickAdd.example).toMatchObject({ date: addDaysKey(today, 1), priority: 2 })
    expect(task.areaId, `${tr.quickAdd.example}: # must name a starter area`).not.toBeNull()
    expect(task.title).not.toMatch(/[#!]/)
    const cmd = parseQuickAdd(tr.palette.example, areas, today, 6, [], words)
    expect(cmd, tr.palette.example).toMatchObject({ date: today, timeOfDay: 'evening' })
    expect(cmd.areaId, `${tr.palette.example}: # must name a starter area`).not.toBeNull()
  })
})

// ——— The daily card's content (ADR-023/024) ———

const QURAN = { fr: FR_QURAN, es: ES_QURAN, zh: ZH_QURAN }
const TEXT: Record<Other, DailyTranslation> = { ar: AR_TEXT, fr: FR_TEXT, zh: ZH_TEXT, es: ES_TEXT }
const WORDS: Record<Other, WordMeanings> = { ar: AR_WORDS, fr: FR_WORDS, zh: ZH_WORDS, es: ES_WORDS }
const PACKS: Record<WordLanguage, WordPack> = { fr: FR, en: EN, de: DE, es: ES, zh: ZH }
const squash = (s: string) => s.replace(/\s+/g, ' ').trim()
const keysDiff = (have: Record<string, unknown>, want: string[]) => {
  const w = new Set(want)
  return { missing: want.filter((k) => !(k in have) || !have[k]), stale: Object.keys(have).filter((k) => !w.has(k)) }
}

describe('Quran meanings', () => {
  it('has the Arabic surah names', () => {
    expect(AR_SURAHS).toHaveLength(114)
    expect(AR_SURAHS[93]).toBe('الشرح')
  })
  describe.each(['fr', 'es', 'zh'] as const)('%s', (lang) => {
    const q = QURAN[lang]
    it('has the published translation of every verse (generated — see verify_daily.py)', () => {
      expect(q.SURAH_NAMES).toHaveLength(114)
      expect(keysDiff(q.VERSE_MEANINGS, VERSES.map(verseKey))).toEqual({ missing: [], stale: [] })
    })
    it('cuts every excerpt from the published translation, never retranslating it', () => {
      const parts = VERSES.filter((v) => v.part).map(verseKey)
      expect(keysDiff(q.EXCERPTS, parts)).toEqual({ missing: [], stale: [] })
      const bad = parts.filter((k) => !squash(q.VERSE_MEANINGS[k]).includes(squash(q.EXCERPTS[k])))
      expect(bad).toEqual([])
    })
  })
})

describe.each(LANGS)('%s daily content', (lang) => {
  const tx = TEXT[lang]
  const people = [...new Set([...HADITH.map((h) => h.by), ...SAYINGS.map((s) => s.by)])]
  const sources = [...new Set(SAYINGS.flatMap((s) => (s.source ? [s.source] : [])))]

  it('names every narrator and author, and every source', () => {
    expect(keysDiff(tx.people, people)).toEqual({ missing: [], stale: [] })
    expect(keysDiff(tx.sources, sources)).toEqual({ missing: [], stale: [] })
  })
  it('translates every hadith meaning (none in Arabic: the hadith stands alone)', () => {
    expect(keysDiff(tx.hadith, lang === 'ar' ? [] : HADITH.map((h) => h.en))).toEqual({ missing: [], stale: [] })
  })
  it('translates every saying (in Arabic, those without their Arabic original) and every fact', () => {
    const sayings = SAYINGS.filter((s) => !(lang === 'ar' && s.ar)).map((s) => s.text)
    expect(keysDiff(tx.sayings, sayings)).toEqual({ missing: [], stale: [] })
    expect(keysDiff(tx.facts, FACTS.map((f) => f.text))).toEqual({ missing: [], stale: [] })
  })
  it('gives every word of every pack a meaning — and an example meaning, unless the pack is in this language', () => {
    for (const [pack, levels] of Object.entries(PACKS) as [WordLanguage, WordPack][]) {
      const words = Object.values(levels).flat()
      const have = WORDS[lang][pack]
      expect(keysDiff(have, words.map((w) => w.word)), pack).toEqual({ missing: [], stale: [] })
      const wrong = words.filter((w) => have[w.word] && have[w.word].length !== (pack === (lang as string) ? 1 : 2)).map((w) => w.word)
      expect(wrong, pack).toEqual([])
    }
  })
  it('follows the language’s typography', () => {
    const texts = [
      ...Object.values(tx.people), ...Object.values(tx.sources), ...Object.values(tx.hadith), ...Object.values(tx.sayings),
      ...Object.values(tx.facts), ...Object.values(WORDS[lang]).flatMap((p) => Object.values(p).flat()),
    ]
    const bad = texts.map((s) => [s, typography(lang, s)] as const).filter(([, e]) => e)
    expect(bad.map(([s, e]) => `${e} — ${s}`)).toEqual([])
  })
  it('writes Arabic and Chinese in their own script', () => {
    if (lang !== 'ar' && lang !== 'zh') return
    const script = lang === 'ar' ? ARABIC : HAN
    const texts = [...Object.values(tx.sayings), ...Object.values(tx.facts), ...Object.values(tx.hadith)]
    expect(texts.filter((s) => !script.test(s))).toEqual([])
  })
})
