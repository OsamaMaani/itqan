import { BookOpen, ChevronDown, FlaskConical, Languages, Lightbulb, ScrollText, Volume2, type LucideIcon } from 'lucide-react'
import { Fragment, useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import { FACTS } from '../content/facts'
import { HADITH } from '../content/hadith'
import { SAYINGS } from '../content/sayings'
import { SURAHS, VERSES } from '../content/verses'
import {
  arabicDigits, enabledKinds, hadithSource, LANGUAGES, levelLabel, pickForDay, POS_LABEL, verseRef,
  type DailyKind, type Hadith, type Saying, type Verse, type Word, type WordPack,
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

const KINDS: Record<DailyKind, { label: string; title: string; icon: LucideIcon }> = {
  verse: { label: 'Verse', title: 'Verse of the day', icon: BookOpen },
  hadith: { label: 'Hadith', title: 'Hadith of the day', icon: ScrollText },
  word: { label: 'Word', title: 'Word of the day', icon: Languages },
  wisdom: { label: 'Wisdom', title: 'Wisdom', icon: Lightbulb },
  fact: { label: 'Fact', title: 'Fact of the day', icon: FlaskConical },
}

const PACKS: Record<WordLanguage, () => Promise<WordPack>> = {
  fr: () => import('../content/words/fr').then((m) => m.WORDS),
  en: () => import('../content/words/en').then((m) => m.WORDS),
  de: () => import('../content/words/de').then((m) => m.WORDS),
  es: () => import('../content/words/es').then((m) => m.WORDS),
  zh: () => import('../content/words/zh').then((m) => m.WORDS),
}
const loaded: Partial<Record<WordLanguage, WordPack>> = {}

// Folded or open on a phone is a per-device convenience (not synced, not essential).
const OPEN_KEY = 'itqan-daily-open'
function readOpen(): boolean {
  try { return localStorage.getItem(OPEN_KEY) === '1' } catch { return false }
}
function writeOpen(v: boolean) {
  try { localStorage.setItem(OPEN_KEY, v ? '1' : '0') } catch { /* ignore */ }
}

export default function DailyCard() {
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

  const qualifier: Partial<Record<DailyKind, string>> = {
    word: `${LANGUAGES[daily.wordLanguage].name} ${levelLabel(daily.wordLanguage, daily.wordLevel)}`,
    wisdom: saying.field,
    fact: fact.field,
  }
  const preview: Record<DailyKind, string> = {
    verse: daily.meaning ? verse.en : verse.ar.join(' '),
    hadith: daily.meaning ? hadith.en : hadith.ar,
    word: word ? `${word.word} — ${word.meaning}` : '',
    wisdom: saying.text,
    fact: fact.text,
  }
  const Icon = KINDS[kind].icon
  const toggle = () => setOpen((o) => { writeOpen(!o); return !o })
  const choose = (k: DailyKind) => { setChosen(k); if (!open) { setOpen(true); writeOpen(true) } }

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const i = kinds.indexOf(kind) + (e.key === 'ArrowRight' ? 1 : -1)
    setChosen(kinds[(i + kinds.length) % kinds.length])
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Phone: one line until opened */}
      <button onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-2.5 px-4 py-3 text-left lg:hidden">
        <Icon size={16} className="shrink-0 text-accent" />
        <span className="shrink-0 text-[13px] font-semibold uppercase tracking-wider text-muted">{KINDS[kind].label}</span>
        <span dir="auto" className={cx('min-w-0 flex-1 truncate text-sm text-muted/80', open && 'invisible')}>{preview[kind]}</span>
        <ChevronDown size={16} className={cx('shrink-0 text-muted transition', open && 'rotate-180')} />
      </button>

      <div className={cx('flex-1 flex-col', open ? 'flex' : 'hidden', 'lg:flex')}>
        <div className="flex items-center justify-between gap-3 px-4 lg:px-5 lg:pt-4">
          <span className="hidden min-w-0 items-center gap-1.5 truncate text-[13px] font-semibold uppercase tracking-wider text-muted lg:flex">
            <Icon size={14} className="shrink-0 text-accent" />
            <span className="truncate">{KINDS[kind].label}{qualifier[kind] && <span className="normal-case tracking-normal opacity-70"> · {qualifier[kind]}</span>}</span>
          </span>
          <div role="tablist" aria-label="Daily card" onKeyDown={onTabKey} className="-ml-1 flex gap-0.5 lg:ml-0">
            {kinds.map((k) => {
              const T = KINDS[k].icon
              return (
                <button
                  key={k}
                  role="tab"
                  aria-selected={k === kind}
                  aria-label={KINDS[k].label}
                  title={KINDS[k].label}
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

        <div className="flex-1 px-4 pb-4 pt-3 lg:px-5 lg:pb-5" role="tabpanel" aria-label={KINDS[kind].title}>
          {kind === 'verse' && <VerseView v={verse} meaning={daily.meaning} />}
          {kind === 'hadith' && <HadithView h={hadith} meaning={daily.meaning} />}
          {kind === 'word' && <WordView w={word} settings={daily} />}
          {kind === 'wisdom' && <SayingView s={saying} />}
          {kind === 'fact' && <Body text={fact.text} foot={fact.source && `Source: ${fact.source}`} />}
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

function VerseView({ v, meaning }: { v: Verse; meaning: boolean }) {
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
      {meaning && <p className="mt-1.5 text-sm leading-relaxed text-muted">{v.en}</p>}
      <Foot>{verseRef(v, SURAHS[v.s - 1][0])} <span className="font-normal opacity-70">· {SURAHS[v.s - 1][1]}</span></Foot>
    </>
  )
}

function HadithView({ h, meaning }: { h: Hadith; meaning: boolean }) {
  return (
    <>
      <Arabic size="text-xl">{h.ar}</Arabic>
      {meaning && <p className="mt-1.5 text-sm leading-relaxed text-muted">{h.en}</p>}
      <Foot>{hadithSource(h)} <span className="font-normal opacity-70">· from {h.by}</span></Foot>
    </>
  )
}

function SayingView({ s }: { s: Saying }) {
  return (
    <>
      {s.ar && <Arabic size="text-xl">{s.ar}</Arabic>}
      <Body text={s.text} foot={`— ${s.by}${s.source ? `, ${s.source}` : ''}`} />
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

function WordView({ w, settings }: { w: Word | undefined; settings: DailySettings }) {
  const lang = LANGUAGES[settings.wordLanguage]
  const canSpeak = useVoice(lang.speech)
  if (!w) return <p className="text-sm text-muted">Loading…</p>
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span lang={settings.wordLanguage} className="text-2xl font-extrabold tracking-tight">{w.word}</span>
            {w.reading && <span className="text-sm font-medium text-muted">{w.reading}</span>}
          </div>
          <p className="mt-0.5 text-sm text-muted"><span className="italic">{POS_LABEL[w.pos]}</span> · {w.meaning}</p>
        </div>
        {canSpeak && <IconButton label={`Say “${w.word}”`} onClick={() => speak(w.word, lang.speech)}><Volume2 size={16} /></IconButton>}
      </div>
      <p lang={settings.wordLanguage} className="mt-3 text-[15px] font-medium leading-relaxed">
        {w.example}
        {canSpeak && (
          <button onClick={() => speak(w.example, lang.speech)} aria-label="Say the example" title="Say the example" className="ml-1.5 inline-grid size-6 translate-y-0.5 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-text">
            <Volume2 size={13} />
          </button>
        )}
      </p>
      {w.exampleMeaning && <p className="mt-1 text-sm text-muted">{w.exampleMeaning}</p>}
    </>
  )
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
