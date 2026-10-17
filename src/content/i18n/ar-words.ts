/**
 * Word-of-the-day meanings in this interface language (ADR-024): pack → word → [meaning,
 * example meaning]; for the pack in this language itself, [a short definition]. Keyed by
 * `Word.word` in src/content/words/*.ts. daily.test.ts fails when a word has no entry here.
 */
import type { WordMeanings } from '../../lib/daily'

export const WORD_MEANINGS: WordMeanings = {
  fr: {},
  en: {},
  de: {},
  es: {},
  zh: {},
}
