import { format } from 'date-fns'
import { Download, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { EmojiInput } from '../components/EmojiInput'
import { SyncPanel } from '../components/SyncPanel'
import { Button, Card, cx, IconButton, Input, Kbd, Label, Modal, PageHeader, Segmented, SectionTitle } from '../components/ui'
import { downloadBackup, parseBackup } from '../lib/backup'
import { AREA_HEX } from '../lib/colors'
import { useData } from '../lib/hooks'
import { snapshot, useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { HSK, LANGUAGES } from '../lib/daily'
import { AREA_COLORS, CEFR_LEVELS, WORD_LANGUAGES, type Area, type AreaColor, type CefrLevel, type DailySettings, type Settings, type WordLanguage } from '../lib/types'

export function SettingsPage() {
  const d = useData()
  const s = d.settings
  const update = useStore((x) => x.updateSettings)
  const replaceAll = useStore((x) => x.replaceAll)
  const resetAll = useStore((x) => x.resetAll)
  const fileRef = useRef<HTMLInputElement>(null)
  const [editingArea, setEditingArea] = useState<Area | 'new' | null>(null)

  const exportNow = () => {
    downloadBackup(snapshot(useStore.getState()))
    update({ lastBackupAt: new Date().toISOString() })
    toast({ emoji: '💾', message: 'Backup downloaded' })
  }

  const importFile = async (f: File) => {
    try {
      const data = parseBackup(await f.text())
      if (!confirm(`Replace everything in Itqan with this backup (${data.tasks.length} tasks, ${data.habits.length} habits, ${data.goals.length} goals)?`)) return
      replaceAll(data)
      toast({ emoji: '✅', message: 'Backup restored' })
    } catch (e) {
      toast({ emoji: '⚠️', message: (e as Error).message }, 6000)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Make Itqan yours." />

      <Card className="space-y-5 p-5">
        <SectionTitle className="mb-0">Profile</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Your name</Label><Input value={s.name} onChange={(e) => update({ name: e.target.value })} placeholder="Shown in the greeting" /></div>
          <div>
            <Label>Theme</Label>
            <Segmented<Settings['theme']> value={s.theme} onChange={(v) => update({ theme: v })} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
          </div>
          <div>
            <Label>Week starts on</Label>
            <Segmented<Settings['weekStartsOn']> value={s.weekStartsOn} onChange={(v) => update({ weekStartsOn: v })} options={[{ value: 6, label: 'Saturday' }, { value: 0, label: 'Sunday' }, { value: 1, label: 'Monday' }]} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Focus (min)</Label><Input type="number" min={1} value={s.focusMinutes} onChange={(e) => update({ focusMinutes: Math.max(1, Number(e.target.value) || 25) })} /></div>
            <div><Label>Break (min)</Label><Input type="number" min={1} value={s.breakMinutes} onChange={(e) => update({ breakMinutes: Math.max(1, Number(e.target.value) || 5) })} /></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <Toggle label="Sounds" checked={s.sound} onChange={(v) => update({ sound: v })} />
          <Toggle label="Show Hijri date" checked={s.showHijri} onChange={(v) => update({ showHijri: v })} />
        </div>
      </Card>

      <DailyCardSettings value={s.daily} onChange={(patch) => update({ daily: { ...s.daily, ...patch } })} />

      <Card className="p-5">
        <SectionTitle right={<Button size="sm" onClick={() => setEditingArea('new')}><Plus size={14} /> Add area</Button>}>Areas of life</SectionTitle>
        <p className="mb-4 text-sm text-muted">Areas group your tasks, habits, goals and focus time — and power the balance chart in Insights.</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {d.areas.map((a) => (
            <div key={a.id} className={cx('flex items-center gap-3 rounded-xl border border-border p-3', a.archived && 'opacity-50')}>
              <div className="grid size-10 place-items-center rounded-xl text-xl" style={{ background: `${AREA_HEX[a.color]}22` }}>{a.emoji}</div>
              <div className="flex-1">
                <div className="font-semibold">{a.name}</div>
                <div className="text-xs text-muted">{d.tasks.filter((t) => t.areaId === a.id).length} tasks · {d.habits.filter((h) => h.areaId === a.id).length} habits · {d.goals.filter((g) => g.areaId === a.id).length} goals</div>
              </div>
              <IconButton label="Edit area" onClick={() => setEditingArea(a)}><Pencil size={14} /></IconButton>
            </div>
          ))}
        </div>
      </Card>

      <SyncPanel />

      <Card className="space-y-4 p-5">
        <SectionTitle className="mb-0">Your data</SectionTitle>
        <p className="text-sm text-muted">
          Everything is stored privately in this browser — no account, no server. That also means <b className="text-text">clearing browser data deletes it</b>, so download a backup now and then.
          {s.lastBackupAt ? ` Last backup: ${format(new Date(s.lastBackupAt), 'MMM d, yyyy')}.` : ' You have not made a backup yet.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={exportNow}><Download size={16} /> Download backup</Button>
          <Button onClick={() => fileRef.current?.click()}><Upload size={16} /> Restore from backup</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = '' }} />
          <Button
            variant="danger"
            className="ml-auto"
            onClick={() => { if (prompt('This deletes everything — and, if sync is on, on your other devices too. Type DELETE to confirm.') === 'DELETE') { resetAll(); toast({ message: 'All data deleted' }) } }}
          >
            <Trash2 size={16} /> Delete everything
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle>Shortcuts</SectionTitle>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <Shortcut keys={['Ctrl', 'K']} label="Command bar: add tasks, jump anywhere" />
          <Shortcut keys={['N']} label="New task" />
          <Shortcut keys={['1', '…', '9']} label="Go to Today, Plan, Habits, Goals, Projects, Focus, Ideas, Reminders, Connections" />
          <Shortcut keys={['Esc']} label="Close a dialog" />
        </div>
        <p className="mt-4 text-sm text-muted">
          Install Itqan as an app: in Chrome or Edge, use the install icon in the address bar. On a phone, use <i>Add to Home screen</i>. It then works offline.
        </p>
      </Card>

      <AreaEditor area={editingArea} onClose={() => setEditingArea(null)} />
    </div>
  )
}

const LEVEL_NAME: Record<CefrLevel, string> = {
  A1: 'beginner', A2: 'elementary', B1: 'intermediate', B2: 'upper intermediate', C1: 'advanced', C2: 'mastery',
}

function DailyCardSettings({ value: v, onChange }: { value: DailySettings; onChange: (patch: Partial<DailySettings>) => void }) {
  return (
    <Card className="space-y-5 p-5">
      <div>
        <SectionTitle className="mb-1">Daily card</SectionTitle>
        <p className="text-sm text-muted">One of each a day on Today, the same on all your devices. On a phone it stays folded to one line until you open it.</p>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <Toggle label="Verse of the Quran" checked={v.verse} onChange={(x) => onChange({ verse: x })} />
        <Toggle label="Hadith" checked={v.hadith} onChange={(x) => onChange({ hadith: x })} />
        <Toggle label="Word of the day" checked={v.word} onChange={(x) => onChange({ word: x })} />
        <Toggle label="Wisdom" checked={v.wisdom} onChange={(x) => onChange({ wisdom: x })} />
        <Toggle label="Fact" checked={v.fact} onChange={(x) => onChange({ fact: x })} />
      </div>
      {(v.verse || v.hadith) && (
        <Toggle label="Show the English meaning under the Arabic" checked={v.meaning} onChange={(x) => onChange({ meaning: x })} />
      )}
      {v.word && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Word of the day — language</Label>
            <Segmented<WordLanguage> value={v.wordLanguage} onChange={(x) => onChange({ wordLanguage: x })} options={WORD_LANGUAGES.map((l) => ({ value: l, label: LANGUAGES[l].name }))} />
          </div>
          <div>
            <Label>Level</Label>
            <Segmented<CefrLevel> value={v.wordLevel} onChange={(x) => onChange({ wordLevel: x })} options={CEFR_LEVELS.map((l) => ({ value: l, label: l }))} />
            <p className="mt-1.5 text-xs text-muted">
              {v.wordLevel} — {LEVEL_NAME[v.wordLevel]}{v.wordLanguage === 'zh' && <> · Chinese uses HSK: {v.wordLevel} ≈ {HSK[v.wordLevel]}</>}
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cx('relative h-6 w-11 rounded-full transition', checked ? 'bg-accent' : 'bg-border')}>
        <span className={cx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
      {label}
    </label>
  )
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return <div className="flex items-center gap-3"><span className="flex gap-1">{keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span><span className="text-muted">{label}</span></div>
}

function AreaEditor({ area, onClose }: { area: Area | 'new' | null; onClose: () => void }) {
  const add = useStore((s) => s.addArea)
  const update = useStore((s) => s.updateArea)
  const remove = useStore((s) => s.deleteArea)
  const editing = area && area !== 'new' ? area : null
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('✨')
  const [color, setColor] = useState<AreaColor>('emerald')
  const [key, setKey] = useState<string | null>(null)

  const currentKey = area === null ? null : area === 'new' ? 'new' : area.id
  if (currentKey !== key) {
    setKey(currentKey)
    setName(editing?.name ?? '')
    setEmoji(editing?.emoji ?? '✨')
    setColor(editing?.color ?? 'emerald')
  }

  const save = () => {
    if (!name.trim()) return
    if (editing) update(editing.id, { name: name.trim(), emoji, color })
    else add({ name: name.trim(), emoji, color })
    onClose()
  }

  return (
    <Modal
      open={area !== null}
      onClose={onClose}
      title={editing ? 'Edit area' : 'New area'}
      footer={
        <>
          {editing && (
            <>
              <Button variant="danger" className="mr-auto" onClick={() => { if (confirm(`Delete “${editing.name}”? Its tasks, habits and goals are kept, just without an area.`)) { remove(editing.id); onClose() } }}>Delete</Button>
              <Button variant="ghost" onClick={() => { update(editing.id, { archived: !editing.archived }); onClose() }}>{editing.archived ? 'Unarchive' : 'Archive'}</Button>
            </>
          )}
          <Button variant="primary" onClick={save} disabled={!name.trim()}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <EmojiInput value={emoji} onChange={setEmoji} />
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Arabic poetry" onKeyDown={(e) => e.key === 'Enter' && save()} />
        </div>
        <div>
          <Label>Colour</Label>
          <div className="flex flex-wrap gap-2">
            {AREA_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={cx('size-8 rounded-full transition', color === c ? 'scale-110 ring-2 ring-text/40 ring-offset-2 ring-offset-surface' : 'hover:scale-110')} style={{ background: AREA_HEX[c] }} aria-label={c} />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
