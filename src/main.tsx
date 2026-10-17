import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { setCurrentLang } from './i18n/core'
import { loadLanguage } from './i18n/react'
import { UI_LANGUAGES, type UiLanguage } from './lib/types'
import './index.css'

// Service workers only exist over http(s); the local file:// build skips this (ADR-012).
if (location.protocol.startsWith('http')) registerSW({ immediate: true })

/** The saved interface language, read before the store hydrates so the first paint is already in it. */
function savedLanguage(): UiLanguage {
  try {
    const l = JSON.parse(localStorage.getItem('itqan-store') ?? '{}')?.state?.settings?.language
    return UI_LANGUAGES.includes(l) ? l : 'en'
  } catch {
    return 'en'
  }
}

const lang = savedLanguage()
setCurrentLang(lang)
loadLanguage(lang).catch(() => {}).finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
