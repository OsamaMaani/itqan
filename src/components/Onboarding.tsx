import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LANG_INFO } from '../i18n/core'
import { loadLanguage, rich, useI18n } from '../i18n/react'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { UI_LANGUAGES, type UiLanguage } from '../lib/types'
import { useSyncSetup } from './SyncPanel'
import { Logo } from './Shell'
import { Button, cx, Input, Segmented } from './ui'

/** The interface language the browser asks for, if Itqan speaks it. */
function browserLanguage(): UiLanguage | null {
  const code = (typeof navigator === 'undefined' ? '' : navigator.language).toLowerCase().slice(0, 2)
  return (['ar', 'fr', 'zh', 'es'] as const).find((l) => l === code) ?? null
}

export function Onboarding() {
  const t = useI18n()
  const { m } = t
  const done = useStore((s) => s.settings.onboarded)
  const language = useStore((s) => s.settings.language)
  const update = useStore((s) => s.updateSettings)
  const complete = useStore((s) => s.completeOnboarding)
  const [name, setName] = useState('')
  const [starter, setStarter] = useState(true)

  // First run: speak the browser's language if we have it, once. The picker below overrides it.
  useEffect(() => {
    if (done || language !== 'en') return
    const l = browserLanguage()
    if (l) update({ language: l })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (done) return null

  // The starter set is written in the interface language, so make sure its catalog is loaded first.
  const finish = async (withStarter: boolean, after?: () => void) => {
    await loadLanguage(language)
    complete(name, withStarter)
    after?.()
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-bg/80 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-surface p-7 shadow-2xl"
      >
        <Logo />
        <Segmented<UiLanguage> className="mt-5" value={language} onChange={(l) => update({ language: l })} options={UI_LANGUAGES.map((l) => ({ value: l, label: LANG_INFO[l].name }))} />
        <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight">
          {rich(m.onboarding.headline, { consistently: <span className="text-gradient">{m.onboarding.consistently}</span> })}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{m.onboarding.intro}</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); void finish(starter) }}>
          <Input autoFocus placeholder={m.onboarding.namePlaceholder} value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" />
          <button
            type="button"
            onClick={() => setStarter((s) => !s)}
            className={cx('flex w-full items-start gap-3 rounded-2xl border p-4 text-start transition', starter ? 'border-accent bg-accent-soft' : 'border-border')}
          >
            <span className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 text-[11px] font-black', starter ? 'border-accent bg-accent text-accent-fg' : 'border-border')}>{starter && '✓'}</span>
            <span>
              <span className="block text-sm font-bold">{m.onboarding.starterTitle}</span>
              <span className="mt-0.5 block text-xs text-muted">{m.onboarding.starterBody}</span>
            </span>
          </button>
          <Button variant="primary" type="submit" className="h-12 w-full text-base">{m.onboarding.begin}</Button>
          <button
            type="button"
            onClick={() => void finish(false, () => { navigate('settings'); useSyncSetup.setState({ open: true }) })}
            className="inline-flex w-full items-center justify-center gap-1 text-center text-sm font-semibold text-muted hover:text-accent"
          >
            {m.onboarding.otherDevice} <ArrowRight size={14} className="rtl:-scale-x-100" />
          </button>
        </form>
      </motion.div>
    </div>
  )
}
