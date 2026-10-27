import type { Messages } from '../core'

export const daily: Messages['daily'] = {
  card: 'Tarjeta del día',
  settings: 'Ajustes de la tarjeta del día',
  kinds: {
    verse: { label: 'Versículo', title: 'Versículo del día' },
    hadith: { label: 'Hadiz', title: 'Hadiz del día' },
    word: { label: 'Palabra', title: 'Palabra del día' },
    wisdom: { label: 'Sabiduría', title: 'Sabiduría' },
    fact: { label: 'Dato', title: 'Dato del día' },
  },
  fields: {
    Psychology: 'Psicología', Medicine: 'Medicina', Biology: 'Biología', Neuroscience: 'Neurociencia', Learning: 'Aprendizaje',
    Science: 'Ciencia', Character: 'Carácter', History: 'Historia', Proverb: 'Proverbio',
  },
  wordQualifier: '{language} {level}',
  pos: {
    n: 'sustantivo', nm: 'sustantivo masc.', nf: 'sustantivo fem.', nn: 'sustantivo neutro', v: 'verbo', adj: 'adjetivo', adv: 'adverbio',
    expr: 'expresión', prep: 'preposición', conj: 'conjunción', pron: 'pronombre',
  },
  verseRef: '{surah} {s}:{ayahs}',
  verseRefPart: 'de {surah} {s}:{ayahs}',
  meaningBy: 'Traducción de los significados: {name}',
  // Same transliteration as the narrators in src/content/i18n/es.ts (j for kh, y for j: al-Bujari, Ibn Mayah).
  collections: {
    bukhari: 'Sahih al-Bujari', muslim: 'Sahih Muslim', tirmidhi: 'Yami‘ at-Tirmidhi', abudawud: 'Sunan Abu Dawud',
    ibnmajah: 'Sunan Ibn Mayah', bayhaqi: 'al-Baihaqi, Shu‘ab al-Iman',
  },
  hadithNumber: '{collection} {n}',
  grades: { sahih: 'Sahih', hasan: 'Hasan', hasanSahih: 'Hasan sahih' },
  graded: '{where} · {grade} (al-Albani)',
  narratedBy: 'narrado por {name}',
  saidBy: '— {name}',
  saidByIn: '— {name}, {source}',
  factSource: 'Fuente: {source}',
  say: 'Pronunciar «{word}»',
  sayExample: 'Pronunciar el ejemplo',
}
