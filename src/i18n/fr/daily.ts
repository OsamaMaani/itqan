import type { Messages } from '../core'

export const daily: Messages['daily'] = {
  card: 'Carte du jour',
  kinds: {
    verse: { label: 'Verset', title: 'Verset du jour' },
    hadith: { label: 'Hadith', title: 'Hadith du jour' },
    word: { label: 'Mot', title: 'Mot du jour' },
    wisdom: { label: 'Sagesse', title: 'Sagesse' },
    fact: { label: 'Fait', title: 'Fait du jour' },
  },
  fields: {
    Psychology: 'Psychologie', Medicine: 'Médecine', Biology: 'Biologie', Neuroscience: 'Neurosciences', Learning: 'Apprentissage',
    Science: 'Science', Character: 'Caractère', History: 'Histoire', Proverb: 'Proverbe',
  },
  wordQualifier: '{language} {level}',
  pos: {
    n: 'nom', nm: 'nom masc.', nf: 'nom fém.', nn: 'nom neutre', v: 'verbe', adj: 'adjectif', adv: 'adverbe',
    expr: 'expression', prep: 'préposition', conj: 'conjonction', pron: 'pronom',
  },
  verseRef: '{surah} {s}:{ayahs}',
  verseRefPart: 'extrait de {surah} {s}:{ayahs}',
  meaningBy: 'Traduction des sens\u00a0: {name}',
  // Same transliteration as the narrators in src/content/i18n/fr.ts (ou, ch, Boukhari).
  collections: {
    bukhari: 'Sahih al-Boukhari', muslim: 'Sahih Mouslim', tirmidhi: 'Jami‘ at-Tirmidhi', abudawud: 'Sounan Abi Daoud',
    ibnmajah: 'Sounan Ibn Maja', bayhaqi: 'al-Bayhaqi, Chou‘ab al-Iman',
  },
  hadithNumber: '{collection} {n}',
  grades: { sahih: 'Sahih', hasan: 'Hassan', hasanSahih: 'Hassan sahih' },
  graded: '{where} · {grade} (al-Albani)',
  narratedBy: 'rapporté par {name}',
  saidBy: '— {name}',
  saidByIn: '— {name}, {source}',
  factSource: 'Source\u00a0: {source}',
  say: 'Prononcer «\u202f{word}\u202f»',
  sayExample: 'Prononcer l’exemple',
}
