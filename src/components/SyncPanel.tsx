import { AlertTriangle, Cloud, CloudOff, ExternalLink, Lock, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { create } from 'zustand'
import { rich, useI18n } from '../i18n/react'
import { useTick } from '../lib/hooks'
import { useStore, snapshot } from '../lib/store'
import { hasUserData, toEntities } from '../lib/sync/entities'
import { connect, disconnect, probe, syncNow, useSync } from '../lib/sync/engine'
import { toast } from '../lib/toast'
import { Button, Card, cx, Input, Label, Modal, SectionTitle } from './ui'

/** Lets onboarding open the setup straight away on a new device. */
export const useSyncSetup = create<{ open: boolean }>(() => ({ open: false }))

export function SyncBadge({ className }: { className?: string }) {
  const t = useI18n()
  const { m } = t
  const { status, config, lastSyncAt, error } = useSync()
  useTick(30_000, !!config)
  if (!config) return null
  const title = status === 'error' ? t.f(m.sync.badge.problem, { error: error ?? '' }) : status === 'offline' ? m.sync.badge.offline
    : lastSyncAt ? t.f(m.sync.badge.synced, { ago: t.ago(new Date(lastSyncAt)) }) : m.sync.badge.syncing
  return (
    <button onClick={() => void syncNow()} title={title} aria-label={title} className={cx('grid size-8 place-items-center rounded-lg transition hover:bg-surface-2', className)}>
      {status === 'syncing' ? <RefreshCw size={16} className="animate-spin text-accent" />
        : status === 'error' ? <AlertTriangle size={16} className="text-danger" />
        : status === 'offline' ? <CloudOff size={16} className="text-muted" />
        : <Cloud size={16} className="text-accent" />}
    </button>
  )
}

export function SyncPanel() {
  const t = useI18n()
  const { m } = t
  const { config, status, lastSyncAt, error } = useSync()
  const open = useSyncSetup((s) => s.open)
  useTick(30_000, !!config)

  return (
    <Card className="space-y-4 p-5">
      <SectionTitle className="mb-0" right={config && <SyncBadge />}>{m.sync.panel.title}</SectionTitle>
      {!config ? (
        <>
          <p className="text-sm text-muted">
            {rich(m.sync.panel.intro, { repo: <b className="text-text">{m.sync.panel.introRepo}</b> })}
          </p>
          <Button variant="primary" onClick={() => useSyncSetup.setState({ open: true })}><Cloud size={16} /> {m.sync.panel.setUp}</Button>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold"><Lock size={14} className="text-accent" /> <span dir="ltr">{config.owner}/{config.repo}</span></span>
            <span className="text-muted">
              {status === 'syncing' ? m.sync.badge.syncing : lastSyncAt ? t.f(m.sync.panel.lastSynced, { ago: t.ago(new Date(lastSyncAt)) }) : m.sync.panel.notSynced}
            </span>
          </div>
          {(status === 'error' || status === 'offline') && error && (
            <p className={cx('rounded-xl px-3 py-2 text-sm', status === 'error' ? 'bg-danger/10 text-danger' : 'bg-surface-2 text-muted')}>{error}</p>
          )}
          <p className="text-xs text-muted">{m.sync.panel.hint}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void syncNow()} disabled={status === 'syncing'}><RefreshCw size={15} className={status === 'syncing' ? 'animate-spin' : ''} /> {m.sync.panel.syncNow}</Button>
            <Button variant="ghost" onClick={() => { if (confirm(m.sync.panel.turnOffConfirm)) { disconnect(); toast({ message: m.sync.panel.turnedOff }) } }}>
              {m.sync.panel.turnOff}
            </Button>
          </div>
        </>
      )}
      <SyncSetup open={open} onClose={() => useSyncSetup.setState({ open: false })} />
    </Card>
  )
}

function SyncSetup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useI18n()
  const { m } = t
  const x = m.sync.setup
  const [step, setStep] = useState<1 | 2>(1)
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('itqan-data')
  const [token, setToken] = useState('')
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [exists, setExists] = useState(false)
  const [replace, setReplace] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [help, setHelp] = useState(false)

  const localHasData = hasUserData(toEntities(snapshot(useStore.getState())))

  const close = () => { setStep(1); setPass(''); setPass2(''); setErr(null); setBusy(false); onClose() }

  const next = async () => {
    setErr(null); setBusy(true)
    try {
      const p = await probe(owner, repo, token)
      setExists(p.exists)
      setReplace(p.exists && !localHasData)
      setStep(2)
    } catch (e) {
      setErr((e as Error).message)
    } finally { setBusy(false) }
  }

  const finish = async () => {
    if (!exists && pass !== pass2) return setErr(x.mismatch)
    setErr(null); setBusy(true)
    try {
      await connect(owner, repo, token, pass, replace)
      setToken(''); setPass(''); setPass2('')
      toast({ emoji: '☁️', message: exists ? x.connectedExisting : x.connectedNew }, 6000)
      close()
    } catch (e) {
      setErr((e as Error).message)
    } finally { setBusy(false) }
  }

  const passOk = pass.length >= 8 && (exists || pass === pass2)

  return (
    <Modal
      open={open}
      onClose={close}
      title={t.f(x.title, { step, total: 2 })}
      footer={step === 1 ? (
        <><Button variant="ghost" onClick={close}>{m.common.cancel}</Button><Button variant="primary" onClick={next} disabled={busy || !owner.trim() || !repo.trim() || !token.trim()}>{busy ? x.checking : x.continue}</Button></>
      ) : (
        <><Button variant="ghost" onClick={() => setStep(1)}>{m.common.back}</Button><Button variant="primary" onClick={finish} disabled={busy || !passOk}>{busy ? x.connecting : x.connect}</Button></>
      )}
    >
      {step === 1 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">{x.step1Body}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>{x.username}</Label><Input dir="ltr" autoComplete="off" autoCapitalize="off" spellCheck={false} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder={x.usernamePlaceholder} /></div>
            <div><Label>{x.repository}</Label><Input dir="ltr" autoComplete="off" autoCapitalize="off" spellCheck={false} value={repo} onChange={(e) => setRepo(e.target.value)} /></div>
          </div>
          <div>
            <Label hint={x.tokenHint}>{x.token}</Label>
            <Input type="password" dir="ltr" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" />
          </div>
          <button type="button" onClick={() => setHelp((h) => !h)} className="text-xs font-semibold text-accent">{help ? x.hideHelp : x.showHelp}</button>
          {help && (
            <ol className="list-decimal space-y-1.5 rounded-xl bg-surface-2/60 p-4 ps-8 text-xs text-muted">
              <li>{rich(x.help.create, {
                private: <b>{x.help.private}</b>,
                repo: <code dir="ltr">itqan-data</code>,
                link: <a dir="ltr" className="text-accent" href="https://github.com/new" target="_blank" rel="noreferrer">github.com/new <ExternalLink size={10} className="inline" /></a>,
              })}</li>
              <li>{rich(x.help.openToken, {
                link: <a className="text-accent" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">{x.help.tokenLink} <ExternalLink size={10} className="inline" /></a>,
              })}</li>
              <li>{rich(x.help.access, { only: <b>{x.help.onlySelect}</b>, repo: <code dir="ltr">itqan-data</code> })}</li>
              <li>{rich(x.help.permissions, { contents: <b>{x.help.contents}</b> })}</li>
              <li>{x.help.paste}</li>
            </ol>
          )}
          {err && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {exists ? (
            <p className="text-sm text-muted">{x.foundData}</p>
          ) : (
            <p className="text-sm text-muted">
              {rich(x.firstDevice, { warning: <b className="text-text">{x.firstDeviceWarning}</b> })}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label hint={x.passphraseHint}>{x.passphrase}</Label><Input type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} /></div>
            {!exists && <div><Label>{x.repeat}</Label><Input type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} /></div>}
          </div>
          {exists && localHasData && (
            <div className="space-y-2">
              <Label>{x.hasData}</Label>
              <Choice on={!replace} onClick={() => setReplace(false)} title={x.merge} body={x.mergeBody} />
              <Choice on={replace} onClick={() => setReplace(true)} title={x.replace} body={x.replaceBody} />
            </div>
          )}
          {err && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>}
        </div>
      )}
    </Modal>
  )
}

function Choice({ on, onClick, title, body }: { on: boolean; onClick: () => void; title: string; body: string }) {
  return (
    <button type="button" onClick={onClick} className={cx('flex w-full items-start gap-3 rounded-xl border p-3 text-start transition', on ? 'border-accent bg-accent-soft' : 'border-border')}>
      <span className={cx('mt-0.5 size-4 shrink-0 rounded-full border-2', on ? 'border-accent bg-accent' : 'border-border')} />
      <span><span className="block text-sm font-semibold">{title}</span><span className="block text-xs text-muted">{body}</span></span>
    </button>
  )
}
