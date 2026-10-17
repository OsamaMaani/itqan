/**
 * The daily card's content in this interface language (ADR-024), keyed by the English in
 * src/content/{hadith,sayings,facts}.ts. Written by hand by a translator, then reviewed against
 * memory/10-localization.md. daily.test.ts fails when an English item has no translation here.
 */
import type { DailyTranslation } from '../../lib/daily'

export const TEXT: DailyTranslation = {
  people: {},
  sources: {},
  hadith: {},
  sayings: {},
  facts: {},
}
