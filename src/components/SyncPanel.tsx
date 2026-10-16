import { formatDistanceToNowStrict } from 'date-fns'
import { AlertTriangle, Cloud, CloudOff, ExternalLink, Lock, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { create } from 'zustand'
import { useTick } from '../lib/hooks'
import { useStore, snapshot } from '../lib/store'
import { hasUserData, toEntities } from '../lib/sync/entities'
import { connect, disconnect, probe, syncNow, useSync } from '../lib/sync/engine'
import { toast } from '../lib/toast'
import { Button, Card, cx, Input, Label, Modal, SectionTitle } from './ui'

/** Lets onboarding open the setup straight away on a new device. */
export const useSyncSetup = create<{ open: boolean }>(() => ({ open: false }))

export function SyncBadge({ className }: { className?: string }) {
  const { status, config, lastSyncAt, error } = useSync()
  useTick(30_000, !!config)
  if (!config) return null
  const title = status === 'error' ? `Sync problem: ${error}` : status === 'offline' ? 'Offline — will sync when back online'
    : lastSyncAt ? `Synced ${formatDistanceToNowStrict(lastSyncAt)} ago` : 'Syncing…'
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
  const { config, status, lastSyncAt, error } = useSync()
  const open = useSyncSetup((s) => s.open)
  useTick(30_000, !!config)

  return (
    <Card className="space-y-4 p-5">
      <SectionTitle className="mb-0" right={config && <SyncBadge />}>Sync between devices</SectionTitle>
      {!config ? (
        <>
          <p className="text-sm text-muted">
            Use Itqan on your laptop and iPhone with the same data. Your data is encrypted with a passphrase on this device,
            then kept in a <b className="text-text">private GitHub repository</b> — free, and unreadable to anyone without the passphrase.
          </p>
          <Button variant="primary" onClick={() => useSyncSetup.setState({ open: true })}><Cloud size={16} /> Set up sync</Button>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold"><Lock size={14} className="text-accent" /> {config.owner}/{config.repo}</span>
            <span className="text-muted">
              {status === 'syncing' ? 'Syncing…' : lastSyncAt ? `Last synced ${formatDistanceToNowStrict(lastSyncAt)} ago` : 'Not synced yet'}
            </span>
          </div>
          {(status === 'error' || status === 'offline') && error && (
            <p className={cx('rounded-xl px-3 py-2 text-sm', status === 'error' ? 'bg-danger/10 text-danger' : 'bg-surface-2 text-muted')}>{error}</p>
          )}
          <p className="text-xs text-muted">Syncs when you open Itqan, a few seconds after each change, and every minute while it is open.</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void syncNow()} disabled={status === 'syncing'}><RefreshCw size={15} className={status === 'syncing' ? 'animate-spin' : ''} /> Sync now</Button>
            <Button variant="ghost" onClick={() => { if (confirm('Stop syncing on this device? Your data stays here and on GitHub.')) { disconnect(); toast({ message: 'Sync turned off on this device' }) } }}>
              Turn off on this device
            </Button>
          </div>
        </>
      )}
      <SyncSetup open={open} onClose={() => useSyncSetup.setState({ open: false })} />
    </Card>
  )
}

function SyncSetup({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    if (!exists && pass !== pass2) return setErr('The two passphrases are different.')
    setErr(null); setBusy(true)
    try {
      await connect(owner, repo, token, pass, replace)
      setToken(''); setPass(''); setPass2('')
      toast({ emoji: '☁️', message: exists ? 'Connected — your data is syncing' : 'Sync is on. Now connect your other device.' }, 6000)
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
      title={step === 1 ? 'Set up sync · 1 of 2' : 'Set up sync · 2 of 2'}
      footer={step === 1 ? (
        <><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="primary" onClick={next} disabled={busy || !owner.trim() || !repo.trim() || !token.trim()}>{busy ? 'Checking…' : 'Continue'}</Button></>
      ) : (
        <><Button variant="ghost" onClick={() => setStep(1)}>Back</Button><Button variant="primary" onClick={finish} disabled={busy || !passOk}>{busy ? 'Connecting…' : 'Connect'}</Button></>
      )}
    >
      {step === 1 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">Itqan stores your data in a private GitHub repository you own. You need the repository and a token that can only touch it.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>GitHub username</Label><Input autoComplete="off" autoCapitalize="off" spellCheck={false} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="your-username" /></div>
            <div><Label>Private repository</Label><Input autoComplete="off" autoCapitalize="off" spellCheck={false} value={repo} onChange={(e) => setRepo(e.target.value)} /></div>
          </div>
          <div>
            <Label hint="stored only on this device">Access token</Label>
            <Input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" />
          </div>
          <button type="button" onClick={() => setHelp((h) => !h)} className="text-xs font-semibold text-accent">{help ? 'Hide' : 'How do I get these?'}</button>
          {help && (
            <ol className="list-decimal space-y-1.5 rounded-xl bg-surface-2/60 p-4 pl-8 text-xs text-muted">
              <li>Create a <b>private</b> repository named <code>itqan-data</code> at <a className="text-accent" href="https://github.com/new" target="_blank" rel="noreferrer">github.com/new <ExternalLink size={10} className="inline" /></a>.</li>
              <li>Open <a className="text-accent" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">a new fine-grained token <ExternalLink size={10} className="inline" /></a>.</li>
              <li>Repository access: <b>Only select repositories</b> → <code>itqan-data</code>.</li>
              <li>Permissions → Repository → <b>Contents: Read and write</b>. Nothing else.</li>
              <li>Generate, copy it, paste it here. Do the same paste on your other device.</li>
            </ol>
          )}
          {err && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{err}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {exists ? (
            <p className="text-sm text-muted">Found your synced data. Enter the passphrase you chose on your other device.</p>
          ) : (
            <p className="text-sm text-muted">
              This is your first device. Choose a passphrase — it encrypts everything before it leaves this device.
              <b className="text-text"> Write it down: without it, the synced copy cannot be read</b> (your devices keep their own copies).
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label hint="at least 8 characters">Passphrase</Label><Input type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} /></div>
            {!exists && <div><Label>Repeat it</Label><Input type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} /></div>}
          </div>
          {exists && localHasData && (
            <div className="space-y-2">
              <Label>This device already has data</Label>
              <Choice on={!replace} onClick={() => setReplace(false)} title="Merge it with the synced data" body="Keeps everything from both. Right for your main device." />
              <Choice on={replace} onClick={() => setReplace(true)} title="Replace it with the synced data" body="Discards this device’s data (nothing is deleted elsewhere). Right for a new device." />
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
    <button type="button" onClick={onClick} className={cx('flex w-full items-start gap-3 rounded-xl border p-3 text-left transition', on ? 'border-accent bg-accent-soft' : 'border-border')}>
      <span className={cx('mt-0.5 size-4 shrink-0 rounded-full border-2', on ? 'border-accent bg-accent' : 'border-border')} />
      <span><span className="block text-sm font-semibold">{title}</span><span className="block text-xs text-muted">{body}</span></span>
    </button>
  )
}
