/** The daily card on Today (ADR-023). Its content (verses, sayings, words…) is in src/content, not here. */
export const daily = {
  /** The tab list's accessible name. */
  card: 'Daily card',
  /** The gear at the card's bottom corner: opens the daily card's own settings. */
  settings: 'Daily card settings',
  kinds: {
    verse: { label: 'Verse', title: 'Verse of the day' },
    hadith: { label: 'Hadith', title: 'Hadith of the day' },
    word: { label: 'Word', title: 'Word of the day' },
    wisdom: { label: 'Wisdom', title: 'Wisdom' },
    fact: { label: 'Fact', title: 'Fact of the day' },
  },
  /** The subject of a piece of wisdom or a fact, shown beside the tab name. */
  fields: {
    Psychology: 'Psychology', Medicine: 'Medicine', Biology: 'Biology', Neuroscience: 'Neuroscience', Learning: 'Learning',
    Science: 'Science', Character: 'Character', History: 'History', Proverb: 'Proverb',
  },
  /** Beside the word tab: "French B1". {language} is the language's name, {level} a CEFR level such as B1. */
  wordQualifier: '{language} {level}',
  /** Part of speech of the word of the day. */
  pos: {
    n: 'noun', nm: 'noun, masc.', nf: 'noun, fem.', nn: 'noun, neut.', v: 'verb', adj: 'adjective', adv: 'adverb',
    expr: 'expression', prep: 'preposition', conj: 'conjunction', pron: 'pronoun',
  },
  /** {surah} is the surah's name, {s} its number, {ayahs} "5" or "5–6": "Ash-Sharh 94:5–6". */
  verseRef: '{surah} {s}:{ayahs}',
  /** The same for a verse shown in part: "from Al-Baqarah 2:286". */
  verseRefPart: 'from {surah} {s}:{ayahs}',
  /** Tooltip on a verse's meaning. {name} is the translator. */
  meaningBy: 'Translation of the meanings: {name}',
  /** Hadith collections, as cited. */
  collections: {
    bukhari: 'Sahih al-Bukhari', muslim: 'Sahih Muslim', tirmidhi: 'Jami‘ at-Tirmidhi', abudawud: 'Sunan Abi Dawud',
    ibnmajah: 'Sunan Ibn Majah', bayhaqi: 'al-Bayhaqi, Shu‘ab al-Iman',
  },
  /** "Sahih al-Bukhari 6464". */
  hadithNumber: '{collection} {n}',
  /** Al-Albani's grading of a hadith. */
  grades: { sahih: 'Sahih', hasan: 'Hasan', hasanSahih: 'Hasan Sahih' },
  /** "Jami‘ at-Tirmidhi 2380 · Sahih (al-Albani)". {where} is the collection and number. */
  graded: '{where} · {grade} (al-Albani)',
  /** After a hadith's source: who narrated it. */
  narratedBy: 'from {name}',
  /** Under a saying: "— William James, The Principles of Psychology, 1890". */
  saidBy: '— {name}',
  saidByIn: '— {name}, {source}',
  /** Under a fact: the study or authority behind it. */
  factSource: 'Source: {source}',
  /** Buttons that read the word or its example aloud. */
  say: 'Say “{word}”',
  sayExample: 'Say the example',
}
