import { BellOff, BellRing, Send, Smartphone, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { rich, useI18n } from '../i18n/react'
import { HAS_HELPER, sendTestNotification, sendTestPush, useNotifier } from '../lib/notifier'
import { disablePush, enablePush, pushSupport, setNotify, thisDeviceId } from '../lib/pushDevice'
import { useStore } from '../lib/store'
import { useSync } from '../lib/sync/engine'
import { toast } from '../lib/toast'
import { Button, Card, cx, IconButton, SectionTitle, Toggle } from './ui'

const SCRIPT = '~/Itqan/scripts/install_local.sh'

/**
 * Settings → Notifications (ADR-031): the one place where notifications are allowed, chosen and
 * turned off. The browser's permission is asked here, once, from a tap — never when a timer starts.
 */
export function NotificationsPanel() {
  const t = useI18n()
  const n = t.m.settings.notifications
  const notify = useStore((s) => s.settings.notify)
  const targets = useStore((s) => s.pushTargets)
  const helper = useNotifier()
  const syncOn = !!useSync((s) => s.config)
  const [perm, setPerm] = useState(() => ('Notification' in window ? Notification.permission : 'denied'))
  const [busy, setBusy] = useState(false)
  const support = pushSupport()
  const mine = thisDeviceId()
  const receiving = !!mine && targets.some((x) => x.id === mine)

  // Permission can change in the browser's own settings while Itqan is open.
  useEffect(() => {
    const on = () => { if ('Notification' in window) setPerm(Notification.permission) }
    window.addEventListener('focus', on)
    return () => window.removeEventListener('focus', on)
  }, [])

  const allow = async () => setPerm(await Notification.requestPermission())

  const test = async () => {
    const shown = await sendTestNotification()
    if (!shown && !HAS_HELPER && perm !== 'granted') toast({ emoji: 'ℹ️', message: n.askOnce })
  }

  const toggleFromLaptop = async (on: boolean) => {
    setBusy(true)
    try {
      if (!on) return void (await disablePush())
      const r = await enablePush()
      if ('Notification' in window) setPerm(Notification.permission)
      if (r === 'ok') toast({ emoji: '📲', message: n.enabled })
      else toast({ emoji: '⚠️', message: r === 'denied' ? n.denied : n.failed }, 6000)
    } finally {
      setBusy(false)
    }
  }

  const script = <code dir="ltr" className="rounded bg-surface-2 px-1">{SCRIPT}</code>
  const status: { tone: 'ok' | 'warn' | 'info'; text: React.ReactNode; action?: React.ReactNode } = HAS_HELPER
    ? helper.state === 'connected' ? { tone: 'ok', text: n.helperOn }
      : helper.state === 'checking' ? { tone: 'info', text: n.helperChecking }
      : { tone: 'warn', text: rich(n.helperOff, { script }) }
    : support === 'home-screen' ? { tone: 'info', text: n.homeScreen }
    : !('Notification' in window) ? { tone: 'info', text: n.unsupported }
    : perm === 'granted' ? { tone: 'ok', text: n.allowed }
    : perm === 'denied' ? { tone: 'warn', text: n.blocked }
    : { tone: 'info', text: n.askOnce, action: <Button size="sm" variant="primary" onClick={allow}><BellRing size={14} /> {n.allow}</Button> }

  return (
    <Card className="space-y-5 p-5">
      <SectionTitle className="mb-0" right={<Button size="sm" onClick={test}><Send size={13} /> {n.test}</Button>}>{n.title}</SectionTitle>
      <p className="text-sm text-muted">{n.body}</p>

      <div className={cx('flex flex-wrap items-center gap-3 rounded-xl border p-3', status.tone === 'ok' ? 'border-accent/40' : status.tone === 'warn' ? 'border-amber-500/40' : 'border-border')}>
        <div className={cx('grid size-9 shrink-0 place-items-center rounded-xl', status.tone === 'ok' ? 'bg-accent-soft text-accent' : status.tone === 'warn' ? 'bg-amber-500/10 text-amber-500' : 'bg-surface-2 text-muted')}>
          {status.tone === 'warn' ? <TriangleAlert size={17} /> : notify.on ? <BellRing size={17} /> : <BellOff size={17} />}
        </div>
        <p className="min-w-0 flex-1 text-sm">{status.text}</p>
        {status.action}
      </div>

      <div className="space-y-3">
        <Toggle label={n.on} checked={notify.on} onChange={(v) => setNotify({ on: v })} />
        <div className="flex flex-wrap gap-x-6 gap-y-3 ps-14">
          <Toggle label={n.timer} checked={notify.timer} disabled={!notify.on} onChange={(v) => setNotify({ timer: v })} />
          <Toggle label={n.reminders} checked={notify.reminders} disabled={!notify.on} onChange={(v) => setNotify({ reminders: v })} />
          <Toggle label={n.checkIns} checked={notify.checkIns} disabled={!notify.on} onChange={(v) => setNotify({ checkIns: v })} />
        </div>
      </div>

      {!HAS_HELPER && support !== 'unsupported' && (
        <div className="space-y-1.5 border-t border-border pt-4">
          <Toggle label={n.fromLaptop} checked={receiving} disabled={busy || support !== 'ok'} onChange={(v) => void toggleFromLaptop(v)} />
          <p className="ps-14 text-xs text-muted">{n.fromLaptopHint}</p>
          {receiving && !syncOn && <p className="ps-14 text-xs font-semibold text-amber-500">{n.needsSync}</p>}
        </div>
      )}

      {(HAS_HELPER || targets.length > 0) && (
        <div className="space-y-2 border-t border-border pt-4">
          <div className="text-sm font-bold">{n.devicesTitle}</div>
          {HAS_HELPER && helper.state === 'connected' && !helper.push && <p className="text-xs text-amber-500">{rich(n.helperOld, { script })}</p>}
          {targets.length === 0 ? (
            <p className="text-sm text-muted">{t.f(n.noDevices, { name: n.fromLaptop })}</p>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border">
              {targets.map((x) => (
                <div key={x.id} className="flex items-center gap-3 px-3 py-2">
                  <Smartphone size={16} className="shrink-0 text-muted" />
                  <div className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold">{x.label}</span>
                    <span className="text-muted"> · {x.id === mine ? n.thisDevice : t.f(n.added, { date: t.d(new Date(x.createdAt), 'medium') })}</span>
                  </div>
                  {HAS_HELPER && helper.push && (
                    <IconButton label={n.test} onClick={async () => toast({ emoji: '📲', message: (await sendTestPush(x)) ? n.testSent : n.testFailed })}><Send size={14} /></IconButton>
                  )}
                  <IconButton
                    label={n.remove}
                    onClick={() => {
                      if (x.id === mine) void disablePush()
                      else useStore.getState().removePushTarget(x.id)
                      toast({ message: n.removed })
                    }}
                  ><Trash2 size={14} /></IconButton>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
