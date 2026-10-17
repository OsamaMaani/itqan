import { Fragment, useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { useStore } from '../lib/store'
import { hasCatalog, i18nFor, LANG_INFO, registerCatalog, setCurrentLang, subscribeCatalogs, type I18n, type Lang, type Messages } from './core'

const LOADERS: Record<Exclude<Lang, 'en'>, () => Promise<Messages>> = {
  ar: () => import('./ar').then((x) => x.messages),
  fr: () => import('./fr').then((x) => x.messages),
  zh: () => import('./zh').then((x) => x.messages),
  es: () => import('./es').then((x) => x.messages),
}

/** Loads a language's catalog once; English is built in. */
export async function loadLanguage(lang: Lang): Promise<void> {
  if (lang === 'en' || hasCatalog(lang)) return
  registerCatalog(lang, await LOADERS[lang]())
}

/** The translator for the interface language; re-renders when its catalog arrives. */
export function useI18n(): I18n {
  const lang = useStore((s) => s.settings.language)
  useSyncExternalStore(subscribeCatalogs, () => hasCatalog(lang))
  useEffect(() => { if (!hasCatalog(lang)) void loadLanguage(lang) }, [lang])
  return i18nFor(lang)
}

/** Keeps <html lang dir> and lib code's `tx()` in step with the language setting. */
export function useDocumentLanguage() {
  const lang = useStore((s) => s.settings.language)
  setCurrentLang(lang)
  useEffect(() => {
    const el = document.documentElement
    el.lang = htmlLang(lang)
    el.dir = LANG_INFO[lang].dir
  }, [lang])
}

export function htmlLang(lang: Lang): string {
  return LANG_INFO[lang].locale.split('-u-')[0]
}

/**
 * A message with React nodes in it: rich('Tap {add} to begin', { add: <b>+</b> }). The words around
 * a link or button stay in one translatable sentence, so each language can order them its own way.
 */
export function rich(template: string, nodes: Record<string, ReactNode>): ReactNode {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1]
    return <Fragment key={i}>{key && key in nodes ? nodes[key] : part}</Fragment>
  })
}
