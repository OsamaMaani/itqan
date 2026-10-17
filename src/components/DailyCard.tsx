import { BookOpen, ChevronDown, FlaskConical, Languages, Lightbulb, ScrollText, Volume2, type LucideIcon } from 'lucide-react'
import { Fragment, useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import { FACTS } from '../content/facts'
import { HADITH } from '../content/hadith'
import { SAYINGS } from '../content/sayings'
import { SURAHS, VERSES } from '../content/verses'
import type { Lang } from '../i18n/core'
import { useI18n } from '../i18n/react'
import {
  arabicDigits, enabledKinds, factText, hadithMeaning, hadithSource, languageName, LANGUAGES, levelLabel, personName, pickForDay,
  sayingText, sourceName, surahName, verseMeaning, verseRef, wordMeaning,
  type DailyContent, type DailyKind, type Hadith, type QuranMeanings, type Saying, type Verse, type Word, type WordPack,
} from '../lib/daily'
import { useToday } from '../lib/hooks'
import { useStore } from '../lib/store'
import type { DailySettings, WordLanguage } from '../lib/types'
import { Card, cx, IconButton } from './ui'

/**
 * The daily card on Today (ADR-023). One verse, hadith, word, piece of wisdom and fact per day,
 * one at a time behind small tabs. On a phone it folds to a single line until opened, so it never
 * pushes the day's tasks down; on a laptop it is always open.
 */

const ICONS: Record<DailyKind, LucideIcon> = { verse: BookOpen, hadith: ScrollText, word: Languages, wisdom: Lightbulb, fact: FlaskConical }

const PACKS: Record<WordLanguage, () => Promise<WordPack>> = {
  fr: () => import('../content/words/fr').then((m) => m.WORDS),
  en: () => import('../content/words/en').then((m) => m.WORDS),
  de: () => import('../content/words/de').then((m) => m.WORDS),
  es: () => import('../content/words/es').then((m) => m.WORDS),
  zh: () => import('../content/words/zh').then((m) => m.WORDS),
}
const loaded: Partial<Record<WordLanguage, WordPack>> = {}

// The card's content in the interface language (ADR-024); English is built in.
const quran = (q: { TRANSLATOR: string; SURAH_NAMES: string[]; VERSE_MEANINGS: Record<string, string>; EXCERPTS: Record<string, string> }): QuranMeanings =>
  ({ translator: q.TRANSLATOR, surahs: q.SURAH_NAMES, verses: q.VERSE_MEANINGS, excerpts: q.EXCERPTS })
const CONTENT: Record<Exclude<Lang, 'en'>, () => Promise<DailyContent>> = {
  ar: () => Promise.all([import('../content/meanings/ar'), import('../content/i18n/ar'), import('../content/i18n/ar-words')])
    .then(([q, x, w]) => ({ surahs: q.SURAH_NAMES, text: x.TEXT, words: w.WORD_MEANINGS })),
  fr: () => Promise.all([import('../content/meanings/fr'), import('../content/i18n/fr'), import('../content/i18n/fr-words')])
    .then(([q, x, w]) => ({ quran: quran(q), text: x.TEXT, words: w.WORD_MEANINGS })),
  zh: () => Promise.all([import('../content/meanings/zh'), import('../content/i18n/zh'), import('../content/i18n/zh-words')])
    .then(([q, x, w]) => ({ quran: quran(q), text: x.TEXT, words: w.WORD_MEANINGS })),
  es: () => Promise.all([import('../content/meanings/es'), import('../content/i18n/es'), import('../content/i18n/es-words')])
    .then(([q, x, w]) => ({ quran: quran(q), text: x.TEXT, words: w.WORD_MEANINGS })),
}
const content: Partial<Record<Lang, DailyContent>> = { en: {} }

// Folded or open on a phone is a per-device convenience (not synced, not essential).
const OPEN_KEY = 'itqan-daily-open'
function readOpen(): boolean {
  try { return localStorage.getItem(OPEN_KEY) === '1' } catch { return false }
}
function writeOpen(v: boolean) {
  try { localStorage.setItem(OPEN_KEY, v ? '1' : '0') } catch { /* ignore */ }
}

export default function DailyCard() {
  const t = useI18n()
  const { m, lang } = t
  const c = useContent(lang)
  const day = useToday()
  const daily = useStore((s) => s.settings.daily)
  const kinds = enabledKinds(daily)
  const [chosen, setChosen] = useState<DailyKind>(kinds[0] ?? 'verse')
  const [open, setOpen] = useState(readOpen)
  const pack = useWordPack(daily.word ? daily.wordLanguage : null)

  if (!kinds.length) return null
  const kind = kinds.includes(chosen) ? chosen : kinds[0]

  const verse = pickForDay(VERSES, day, 'verse')!
  const hadith = pickForDay(HADITH, day, 'hadith')!
  const saying = pickForDay(SAYINGS, day, 'wisdom')!
  const fact = pickForDay(FACTS, day, 'fact')!
  const word = pack ? pickForDay(pack[daily.wordLevel], day, `word:${daily.wordLanguage}:${daily.wordLevel}`) : undefined

  // Arabic shows the verse and hadith alone; elsewhere the meaning follows the setting.
  const meaning = daily.meaning && lang !== 'ar'
  const qualifier: Partial<Record<DailyKind, string>> = {
    word: t.f(m.daily.wordQualifier, { language: languageName(daily.wordLanguage, t), level: levelLabel(daily.wordLanguage, daily.wordLevel) }),
    wisdom: m.daily.fields[saying.field],
    fact: m.daily.fields[fact.field],
  }
  const preview: Record<DailyKind, string> = {
    verse: (meaning && verseMeaning(verse, lang, c)) || verse.ar.join(' '),
    hadith: (meaning && hadithMeaning(hadith, lang, c)) || hadith.ar,
    word: word ? `${word.word} — ${wordMeaning(word, daily.wordLanguage, lang, c)[0]}` : '',
    wisdom: sayingText(saying, lang, c) ?? saying.ar ?? saying.text,
    fact: factText(fact, lang, c),
  }
  const Icon = ICONS[kind]
  const toggle = () => setOpen((o) => { writeOpen(!o); return !o })
  const choose = (k: DailyKind) => { setChosen(k); if (!open) { setOpen(true); writeOpen(true) } }

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    // The tabs run from the start edge, so in RTL the right arrow goes back.
    const forward = (e.key === 'ArrowRight') === (t.dir === 'ltr')
    const i = kinds.indexOf(kind) + (forward ? 1 : -1)
    setChosen(kinds[(i + kinds.length) % kinds.length])
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Phone: one line until opened */}
      <button onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-2.5 px-4 py-3 text-start lg:hidden">
        <Icon size={16} className="shrink-0 text-accent" />
        <span className="shrink-0 text-[13px] font-semibold uppercase tracking-wider text-muted">{m.daily.kinds[kind].label}</span>
        <span dir="auto" className={cx('min-w-0 flex-1 truncate text-sm text-muted/80', open && 'invisible')}>{preview[kind]}</span>
        <ChevronDown size={16} className={cx('shrink-0 text-muted transition', open && 'rotate-180')} />
      </button>

      <div className={cx('flex-1 flex-col', open ? 'flex' : 'hidden', 'lg:flex')}>
        <div className="flex items-center justify-between gap-3 px-4 lg:px-5 lg:pt-4">
          <span className="hidden min-w-0 items-center gap-1.5 truncate text-[13px] font-semibold uppercase tracking-wider text-muted lg:flex">
            <Icon size={14} className="shrink-0 text-accent" />
            <span className="truncate">{m.daily.kinds[kind].label}{qualifier[kind] && <span className="normal-case tracking-normal opacity-70"> · {qualifier[kind]}</span>}</span>
          </span>
          <div role="tablist" aria-label={m.daily.card} onKeyDown={onTabKey} className="-ms-1 flex gap-0.5 lg:ms-0">
            {kinds.map((k) => {
              const T = ICONS[k]
              return (
                <button
                  key={k}
                  role="tab"
                  aria-selected={k === kind}
                  aria-label={m.daily.kinds[k].label}
                  title={m.daily.kinds[k].label}
                  tabIndex={k === kind ? 0 : -1}
                  onClick={() => choose(k)}
                  className={cx('grid size-8 place-items-center rounded-lg transition', k === kind ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-text')}
                >
                  <T size={15} />
                </button>
              )
            })}
          </div>
          {qualifier[kind] && <span className="truncate text-xs text-muted lg:hidden">{qualifier[kind]}</span>}
        </div>

        <div className="flex-1 px-4 pb-4 pt-3 lg:px-5 lg:pb-5" role="tabpanel" aria-label={m.daily.kinds[kind].title}>
          {kind === 'verse' && <VerseView v={verse} meaning={meaning} c={c} />}
          {kind === 'hadith' && <HadithView h={hadith} meaning={meaning} c={c} />}
          {kind === 'word' && <WordView w={word} settings={daily} c={c} />}
          {kind === 'wisdom' && <SayingView s={saying} c={c} />}
          {kind === 'fact' && <Body text={factText(fact, lang, c)} foot={fact.source && t.f(m.daily.factSource, { source: fact.source })} />}
        </div>
      </div>
    </Card>
  )
}

function Arabic({ children, size = 'text-[22px]' }: { children: ReactNode; size?: string }) {
  return <p dir="rtl" lang="ar" className={cx('font-quran leading-[2] text-text', size)}>{children}</p>
}

function Foot({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs font-semibold text-muted">{children}</p>
}

function VerseView({ v, meaning, c }: { v: Verse; meaning: boolean; c: DailyContent }) {
  const t = useI18n()
  const text = meaning ? verseMeaning(v, t.lang, c) : null
  const [name, alt] = surahName(v.s, t.lang, c, SURAHS[v.s - 1])
  return (
    <>
      <Arabic>
        {v.ar.map((t, i) => (
          <Fragment key={i}>
            {t}
            {/* A no-break space keeps the end-of-ayah mark with its last word, as in a printed mushaf. */}
            {(i < v.ar.length - 1 || !v.cut) && <span className="text-accent">{' ۝'}{arabicDigits(v.a + i)}</span>}
            {i < v.ar.length - 1 && ' '}
          </Fragment>
        ))}
      </Arabic>
      {text && <p className="mt-1.5 text-sm leading-relaxed text-muted" title={c.quran && t.f(t.m.daily.meaningBy, { name: c.quran.translator })}>{text}</p>}
      <Foot>{verseRef(v, name, t)}{alt && <span className="font-normal opacity-70"> · {alt}</span>}</Foot>
    </>
  )
}

function HadithView({ h, meaning, c }: { h: Hadith; meaning: boolean; c: DailyContent }) {
  const t = useI18n()
  const text = meaning ? hadithMeaning(h, t.lang, c) : null
  return (
    <>
      <Arabic size="text-xl">{h.ar}</Arabic>
      {text && <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>}
      <Foot>{hadithSource(h, t)} <span className="font-normal opacity-70">· {t.f(t.m.daily.narratedBy, { name: personName(h.by, t.lang, c) })}</span></Foot>
    </>
  )
}

function SayingView({ s, c }: { s: Saying; c: DailyContent }) {
  const t = useI18n()
  const text = sayingText(s, t.lang, c)
  const name = personName(s.by, t.lang, c)
  const foot = s.source ? t.f(t.m.daily.saidByIn, { name, source: sourceName(s.source, t.lang, c) }) : t.f(t.m.daily.saidBy, { name })
  return (
    <>
      {s.ar && <Arabic size="text-xl">{s.ar}</Arabic>}
      {text ? <Body text={text} foot={foot} /> : <Foot>{foot}</Foot>}
    </>
  )
}

function Body({ text, foot }: { text: string; foot?: string }) {
  return (
    <>
      <p className="text-[15px] font-medium leading-relaxed">{text}</p>
      {foot && <Foot>{foot}</Foot>}
    </>
  )
}

function WordView({ w, settings, c }: { w: Word | undefined; settings: DailySettings; c: DailyContent }) {
  const t = useI18n()
  const { m } = t
  const lang = LANGUAGES[settings.wordLanguage]
  const canSpeak = useVoice(lang.speech)
  if (!w) return <p className="text-sm text-muted">{m.common.loading}</p>
  const [meaning, exampleMeaning] = wordMeaning(w, settings.wordLanguage, t.lang, c)
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span lang={settings.wordLanguage} className="text-2xl font-extrabold tracking-tight">{w.word}</span>
            {w.reading && <span className="text-sm font-medium text-muted">{w.reading}</span>}
          </div>
          <p className="mt-0.5 text-sm text-muted"><span className="italic">{m.daily.pos[w.pos]}</span> · {meaning}</p>
        </div>
        {canSpeak && <IconButton label={t.f(m.daily.say, { word: w.word })} onClick={() => speak(w.word, lang.speech)}><Volume2 size={16} /></IconButton>}
      </div>
      <p lang={settings.wordLanguage} className="mt-3 text-[15px] font-medium leading-relaxed">
        {w.example}
        {canSpeak && (
          <button onClick={() => speak(w.example, lang.speech)} aria-label={m.daily.sayExample} title={m.daily.sayExample} className="ms-1.5 inline-grid size-6 translate-y-0.5 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text">
            <Volume2 size={13} />
          </button>
        )}
      </p>
      {exampleMeaning && <p className="mt-1 text-sm text-muted">{exampleMeaning}</p>}
    </>
  )
}

/** The card's content for the interface language; re-renders once it has loaded. */
function useContent(lang: Lang): DailyContent {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (content[lang] || lang === 'en') return
    let live = true
    CONTENT[lang]().then((x) => { content[lang] = x; if (live) setTick((n) => n + 1) }).catch(() => {})
    return () => { live = false }
  }, [lang])
  return content[lang] ?? {}
}

function useWordPack(lang: WordLanguage | null): WordPack | undefined {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!lang || loaded[lang]) return
    let live = true
    PACKS[lang]().then((p) => { loaded[lang] = p; if (live) setTick((n) => n + 1) }).catch(() => {})
    return () => { live = false }
  }, [lang])
  return lang ? loaded[lang] : undefined
}

/** True when this device has a speech voice for the language (Web Speech API, works offline on most). */
function useVoice(bcp47: string): boolean {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
    if (!synth) return
    const check = () => setOk(!!voiceFor(bcp47))
    check()
    synth.addEventListener('voiceschanged', check)
    return () => synth.removeEventListener('voiceschanged', check)
  }, [bcp47])
  return ok
}

function voiceFor(bcp47: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  const norm = (l: string) => l.replace('_', '-').toLowerCase()
  return voices.find((v) => norm(v.lang) === bcp47.toLowerCase()) ?? voices.find((v) => norm(v.lang).startsWith(bcp47.slice(0, 2)))
}

function speak(text: string, bcp47: string) {
  const synth = window.speechSynthesis
  const u = new SpeechSynthesisUtterance(text)
  u.lang = bcp47
  const v = voiceFor(bcp47)
  if (v) u.voice = v
  u.rate = 0.9
  synth.cancel()
  synth.speak(u)
}
