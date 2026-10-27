import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { RELEASES, type Release } from '../content/releases'
import { useI18n } from '../i18n/react'
import { useToday } from '../lib/hooks'
import { LATEST_RELEASE, markSeen, readSeen, toAnnounce, useWhatsNew } from '../lib/releases'
import { useStore } from '../lib/store'
import { Button, Modal } from './ui'

/**
 * What's new (ADR-040): after an update, the news shows once on each device, a moment after Itqan
 * opens — never over onboarding. Settings opens the whole history.
 */
export function WhatsNew() {
  const t = useI18n()
  const w = t.m.app.whatsNew
  const today = useToday()
  const onboarded = useStore((s) => s.settings.onboarded)
  const history = useWhatsNew((s) => s.history)
  const [news, setNews] = useState<Release[]>([])

  useEffect(() => {
    if (!onboarded) return
    const due = toAnnounce(RELEASES, readSeen(), today)
    if (!due.length) return void markSeen()
    const id = setTimeout(() => setNews(due), 1500)
    return () => clearTimeout(id)
  }, [onboarded, today])

  const close = () => {
    markSeen(LATEST_RELEASE)
    setNews([])
    useWhatsNew.setState({ history: false })
  }
  const shown = history ? RELEASES.filter((r) => r.items.length) : news

  return (
    <Modal
      open={shown.length > 0}
      onClose={close}
      title={<span className="flex items-center gap-2"><Sparkles size={18} className="text-gold" />{history ? w.history : w.title}</span>}
      footer={<Button variant="primary" onClick={close}>{w.gotIt}</Button>}
    >
      <div className="space-y-6">
        {shown.map((r) => (
          <section key={r.id}>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">{t.d(r.date, 'long')}</div>
            <ul className="space-y-3">
              {r.items.map((it, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-lg">{it.emoji}</span>
                  <p className="pt-1 text-sm leading-relaxed">{it.text[t.lang] || it.text.en}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  )
}
