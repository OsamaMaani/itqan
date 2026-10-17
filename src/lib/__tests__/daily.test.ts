import { describe, expect, it } from 'vitest'
import { FACTS } from '../../content/facts'
import { HADITH } from '../../content/hadith'
import { SAYINGS } from '../../content/sayings'
import { SURAHS, VERSES } from '../../content/verses'
import { WORDS as DE } from '../../content/words/de'
import { WORDS as EN } from '../../content/words/en'
import { WORDS as ES } from '../../content/words/es'
import { WORDS as FR } from '../../content/words/fr'
import { WORDS as ZH } from '../../content/words/zh'
import { arabicDigits, dayNumber, enabledKinds, hadithSource, levelLabel, pickForDay, verseRef, type WordPack } from '../daily'
import { addDaysKey } from '../date'
import { DEFAULT_SETTINGS } from '../seed'
import { CEFR_LEVELS } from '../types'

const days = (from: string, n: number) => Array.from({ length: n }, (_, i) => addDaysKey(from, i))

describe('day numbers', () => {
  it('counts calendar days from 1970-01-01', () => {
    expect(dayNumber('1970-01-01')).toBe(0)
    expect(dayNumber('1970-01-02')).toBe(1)
    expect(dayNumber('1969-12-31')).toBe(-1)
  })
  it('steps by exactly one every day, across both daylight-saving changes and leap days', () => {
    const ks = days('2027-12-25', 800) // includes 29 Feb 2028 and four DST switches
    ks.slice(1).forEach((k, i) => expect(dayNumber(k) - dayNumber(ks[i])).toBe(1))
  })
})

describe('pickForDay', () => {
  const items = Array.from({ length: 7 }, (_, i) => i)

  it('is the same for the same day — on every device and every reload', () => {
    expect(pickForDay(items, '2026-10-17', 'verse')).toBe(pickForDay(items, '2026-10-17', 'verse'))
  })
  it('shows every item once per cycle before any repeats', () => {
    for (const n of [3, 7, 31, VERSES.length]) {
      const list = Array.from({ length: n }, (_, i) => i)
      const start = addDaysKey('1970-01-01', n * 2900) // the first day of a cycle
      const seen = days(start, n).map((k) => pickForDay(list, k, 'x'))
      expect(new Set(seen).size).toBe(n)
    }
  })
  it('never shows the same item two days running, including across cycles', () => {
    for (const n of [2, 3, 4, 5, 12]) {
      const list = Array.from({ length: n }, (_, i) => i)
      const seq = days('2026-01-01', 3000).map((k) => pickForDay(list, k, 'hadith'))
      seq.slice(1).forEach((x, i) => expect(x).not.toBe(seq[i]))
    }
  })
  it('gives each kind its own order', () => {
    const list = Array.from({ length: 50 }, (_, i) => i)
    const a = days('2026-10-01', 50).map((k) => pickForDay(list, k, 'verse'))
    const b = days('2026-10-01', 50).map((k) => pickForDay(list, k, 'hadith'))
    expect(a).not.toEqual(b)
  })
  it('handles empty and single-item lists', () => {
    expect(pickForDay([], '2026-10-17', 'x')).toBeUndefined()
    expect(pickForDay(['only'], '2026-10-17', 'x')).toBe('only')
  })
})

describe('labels', () => {
  it('lists enabled kinds in card order', () => {
    expect(enabledKinds(DEFAULT_SETTINGS.daily)).toEqual(['verse', 'hadith', 'word', 'wisdom', 'fact'])
    expect(enabledKinds({ ...DEFAULT_SETTINGS.daily, verse: false, fact: false })).toEqual(['hadith', 'word', 'wisdom'])
  })
  it('writes references the usual way', () => {
    const v = VERSES.find((x) => x.s === 94 && x.a === 5)!
    expect(verseRef(v, SURAHS[93][0])).toBe('Ash-Sharh 94:5–6')
    expect(verseRef(VERSES.find((x) => x.s === 2 && x.a === 286)!, 'Al-Baqarah')).toBe('from Al-Baqarah 2:286')
    expect(hadithSource(HADITH.find((h) => h.book === 'bukhari' && h.n === 6464)!)).toBe('Sahih al-Bukhari 6464')
    expect(hadithSource(HADITH.find((h) => h.book === 'tirmidhi' && h.n === 2380)!)).toBe('Jami‘ at-Tirmidhi 2380 · Sahih (al-Albani)')
    expect(arabicDigits(286)).toBe('٢٨٦')
    expect(levelLabel('zh', 'B1')).toBe('B1 · ≈HSK 3')
    expect(levelLabel('fr', 'B1')).toBe('B1')
  })
})

// Content checks that run in CI. The text itself is checked against its sources by
// scripts/verify_daily.py (needs the network).
const ARABIC = /[ء-ي]/
const KFGQPC_PRIVATE = /[ٖٗٞ۞ ]/ // must have been mapped or removed (ADR-023)

describe('verses', () => {
  it('are valid, Arabic, with Standard Unicode marks, and not repeated', () => {
    expect(SURAHS).toHaveLength(114)
    const keys = new Set<string>()
    for (const v of VERSES) {
      expect(v.s).toBeGreaterThanOrEqual(1)
      expect(v.s).toBeLessThanOrEqual(114)
      expect(v.b).toBeGreaterThanOrEqual(v.a)
      expect(v.ar).toHaveLength(v.b - v.a + 1)
      for (const t of v.ar) {
        expect(t).toMatch(ARABIC)
        expect(t).not.toMatch(KFGQPC_PRIVATE)
      }
      expect(v.en.length).toBeGreaterThan(10)
      keys.add(`${v.s}:${v.a}`)
    }
    expect(keys.size).toBe(VERSES.length)
    expect(VERSES.length).toBeGreaterThanOrEqual(100)
  })
})

describe('hadith', () => {
  it('have Arabic, a source, a narrator, and a grade outside al-Bukhari and Muslim', () => {
    for (const h of HADITH) {
      expect(h.ar).toMatch(ARABIC)
      expect(h.ar).not.toMatch(/[‏"«»]/)
      expect(h.en.length).toBeGreaterThan(10)
      expect(h.by.length).toBeGreaterThan(2)
      if (h.book === 'bukhari' || h.book === 'muslim') expect(h.grade).toBeUndefined()
      else expect(['Sahih', 'Hasan', 'Hasan Sahih']).toContain(h.grade)
      if (h.checked === undefined) expect(h.n).toBeGreaterThan(0)
    }
    expect(new Set(HADITH.map((h) => h.ar)).size).toBe(HADITH.length)
    expect(HADITH.length).toBeGreaterThanOrEqual(100)
  })
})

describe('wisdom and facts', () => {
  it('are not repeated and name who said them', () => {
    expect(new Set(SAYINGS.map((s) => s.text)).size).toBe(SAYINGS.length)
    expect(new Set(FACTS.map((f) => f.text)).size).toBe(FACTS.length)
    for (const s of SAYINGS) expect(s.by.length).toBeGreaterThan(2)
    expect(SAYINGS.length).toBeGreaterThanOrEqual(80)
    expect(FACTS.length).toBeGreaterThanOrEqual(110)
  })
})

describe('words of the day', () => {
  const packs: [string, WordPack][] = [['fr', FR], ['en', EN], ['de', DE], ['es', ES], ['zh', ZH]]
  it('every language has at least a month of words at every level, none repeated', () => {
    for (const [lang, pack] of packs) {
      const all = CEFR_LEVELS.flatMap((l) => {
        expect(pack[l].length, `${lang} ${l}`).toBeGreaterThanOrEqual(30)
        return pack[l].map((w) => w.word)
      })
      expect(new Set(all).size, lang).toBe(all.length)
    }
    expect(FR.B1.length).toBeGreaterThanOrEqual(90)
  })
  it('have examples, translations (except English) and pinyin for Chinese', () => {
    for (const [lang, pack] of packs) {
      for (const w of CEFR_LEVELS.flatMap((l) => pack[l])) {
        expect(w.meaning.length, w.word).toBeGreaterThan(1)
        expect(w.example.length, w.word).toBeGreaterThan(5)
        if (lang === 'en') expect(w.exampleMeaning).toBeUndefined()
        else expect(w.exampleMeaning?.length, w.word).toBeGreaterThan(5)
        if (lang === 'zh') expect(w.reading, w.word).toBeTruthy()
      }
    }
  })
})
