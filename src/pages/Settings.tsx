import { Download, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { EmojiInput } from '../components/EmojiInput'
import { NotificationsPanel } from '../components/NotificationsPanel'
import { SyncPanel } from '../components/SyncPanel'
import { usePageAction } from '../components/Shell'
import { Button, Card, cx, IconButton, Input, Kbd, Label, Modal, PageHeader, Segmented, SectionTitle, Toggle } from '../components/ui'
import { LANG_INFO } from '../i18n/core'
import { rich, useI18n } from '../i18n/react'
import { downloadBackup, parseBackup } from '../lib/backup'
import { AREA_HEX } from '../lib/colors'
import { useData } from '../lib/hooks'
import { useRouteParam } from '../lib/router'
import { snapshot, useStore } from '../lib/store'
import { toast } from '../lib/toast'
import { HSK } from '../lib/daily'
import { AREA_COLORS, CEFR_LEVELS, UI_LANGUAGES, WORD_LANGUAGES, type Area, type AreaColor, type CefrLevel, type DailySettings, type Settings, type UiLanguage, type WordLanguage } from '../lib/types'

export function SettingsPage() {
  usePageAction(null)
  const t = useI18n()
  const { m } = t
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
    toast({ emoji: '💾', message: m.settings.data.backupDownloaded })
  }

  const importFile = async (f: File) => {
    try {
      const data = parseBackup(await f.text())
      if (!confirm(t.f(m.settings.data.restoreConfirm, {
        tasks: t.p(m.settings.counts.tasks, data.tasks.length),
        habits: t.p(m.settings.counts.habits, data.habits.length),
        goals: t.p(m.settings.counts.goals, data.goals.length),
      }))) return
      replaceAll(data)
      toast({ emoji: '✅', message: m.settings.data.backupRestored })
    } catch (e) {
      toast({ emoji: '⚠️', message: (e as Error).message }, 6000)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={m.settings.title} subtitle={m.settings.subtitle} />

      <Card className="space-y-5 p-5">
        <SectionTitle className="mb-0">{m.settings.profile.title}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>{m.settings.profile.language}</Label>
            <Segmented<UiLanguage> value={s.language} onChange={(v) => update({ language: v })} options={UI_LANGUAGES.map((l) => ({ value: l, label: LANG_INFO[l].name }))} />
            <p className="mt-1.5 text-xs text-muted">{m.settings.profile.languageHint}</p>
          </div>
          <div><Label>{m.settings.profile.name}</Label><Input value={s.name} onChange={(e) => update({ name: e.target.value })} placeholder={m.settings.profile.namePlaceholder} /></div>
          <div>
            <Label>{m.settings.profile.theme}</Label>
            <Segmented<Settings['theme']> value={s.theme} onChange={(v) => update({ theme: v })} options={[{ value: 'system', label: m.settings.profile.themes.system }, { value: 'light', label: m.settings.profile.themes.light }, { value: 'dark', label: m.settings.profile.themes.dark }]} />
          </div>
          <div>
            <Label>{m.settings.profile.weekStartsOn}</Label>
            <Segmented<Settings['weekStartsOn']> value={s.weekStartsOn} onChange={(v) => update({ weekStartsOn: v })} options={([6, 0, 1] as const).map((day) => ({ value: day, label: t.cap(t.weekdays('long')[day]) }))} />
          </div>
          <div>
            <Label hint={m.settings.profile.weightUnitHint}>{m.settings.profile.weightUnit}</Label>
            <Segmented<Settings['weightUnit']> value={s.weightUnit} onChange={(v) => update({ weightUnit: v })} options={[{ value: 'kg', label: m.gym.unitKg }, { value: 'lb', label: m.gym.unitLb }]} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>{m.settings.profile.focusMinutes}</Label><Input type="number" min={1} value={s.focusMinutes} onChange={(e) => update({ focusMinutes: Math.max(1, Number(e.target.value) || 25) })} /></div>
            <div><Label>{m.settings.profile.breakMinutes}</Label><Input type="number" min={1} value={s.breakMinutes} onChange={(e) => update({ breakMinutes: Math.max(1, Number(e.target.value) || 5) })} /></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <Toggle label={m.settings.profile.sounds} checked={s.sound} onChange={(v) => update({ sound: v })} />
          <Toggle label={m.settings.profile.showHijri} checked={s.showHijri} onChange={(v) => update({ showHijri: v })} />
        </div>
      </Card>

      <NotificationsPanel />

      <DailyCardSettings value={s.daily} onChange={(patch) => update({ daily: { ...s.daily, ...patch } })} />

      <Card className="p-5">
        <SectionTitle right={<Button size="sm" onClick={() => setEditingArea('new')}><Plus size={14} /> {m.settings.areas.add}</Button>}>{m.settings.areas.title}</SectionTitle>
        <p className="mb-4 text-sm text-muted">{m.settings.areas.body}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {d.areas.map((a) => (
            <div key={a.id} className={cx('flex items-center gap-3 rounded-xl border border-border p-3', a.archived && 'opacity-50')}>
              <div className="grid size-10 place-items-center rounded-xl text-xl" style={{ background: `${AREA_HEX[a.color]}22` }}>{a.emoji}</div>
              <div className="flex-1">
                <div className="font-semibold">{a.name}</div>
                <div className="text-xs text-muted">{[
                  t.p(m.settings.counts.tasks, d.tasks.filter((x) => x.areaId === a.id).length),
                  t.p(m.settings.counts.habits, d.habits.filter((h) => h.areaId === a.id).length),
                  t.p(m.settings.counts.goals, d.goals.filter((g) => g.areaId === a.id).length),
                ].join(' · ')}</div>
              </div>
              <IconButton label={m.settings.areas.edit} onClick={() => setEditingArea(a)}><Pencil size={14} /></IconButton>
            </div>
          ))}
        </div>
      </Card>

      <SyncPanel />

      <Card className="space-y-4 p-5">
        <SectionTitle className="mb-0">{m.settings.data.title}</SectionTitle>
        <p className="text-sm text-muted">
          {rich(m.settings.data.intro, { warning: <b className="text-text">{m.settings.data.warning}</b> })}
          {' '}
          {s.lastBackupAt ? t.f(m.settings.data.lastBackup, { date: t.d(new Date(s.lastBackupAt), 'medium') }) : m.settings.data.noBackup}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={exportNow}><Download size={16} /> {m.settings.data.download}</Button>
          <Button onClick={() => fileRef.current?.click()}><Upload size={16} /> {m.settings.data.restore}</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = '' }} />
          <Button
            variant="danger"
            className="ms-auto"
            onClick={() => { if (prompt(t.f(m.settings.data.deleteAllPrompt, { word: m.settings.data.deleteWord })) === m.settings.data.deleteWord) { resetAll(); toast({ message: m.settings.data.deleted }) } }}
          >
            <Trash2 size={16} /> {m.settings.data.deleteAll}
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle>{m.settings.shortcuts.title}</SectionTitle>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <Shortcut keys={['Ctrl', 'K']} label={m.settings.shortcuts.commandBar} />
          <Shortcut keys={['N']} label={m.settings.shortcuts.newTask} />
          <Shortcut keys={['1', '…', '9']} label={t.f(m.settings.shortcuts.goTo, { pages: t.list([m.nav.today, m.nav.plan, m.nav.habits, m.nav.goals, m.nav.projects, m.nav.focus, m.nav.ideas, m.nav.reminders, m.nav.connections]) })} />
          <Shortcut keys={['Esc']} label={m.settings.shortcuts.closeDialog} />
        </div>
        <p className="mt-4 text-sm text-muted">
          {rich(m.settings.shortcuts.install, { addToHome: <i>{m.settings.shortcuts.addToHome}</i> })}
        </p>
      </Card>

      <AreaEditor area={editingArea} onClose={() => setEditingArea(null)} />
    </div>
  )
}

function DailyCardSettings({ value: v, onChange }: { value: DailySettings; onChange: (patch: Partial<DailySettings>) => void }) {
  const t = useI18n()
  const { m } = t
  const s = m.settings.daily
  // #/settings/daily — the gear on the daily card — lands here, briefly marked.
  const ref = useRef<HTMLDivElement>(null)
  const linked = useRouteParam() === 'daily'
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    if (!linked) return
    ref.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    setFlash(true)
    const id = setTimeout(() => setFlash(false), 1600)
    return () => clearTimeout(id)
  }, [linked])
  // The word languages are languages being learned, so they are named in the interface language.
  const names = new Intl.DisplayNames([t.locale], { type: 'language' })
  return (
    <Card ref={ref} className={cx('scroll-mt-4 space-y-5 p-5 transition-shadow duration-500', flash && 'ring-2 ring-accent/50')}>
      <div>
        <SectionTitle className="mb-1">{s.title}</SectionTitle>
        <p className="text-sm text-muted">{s.body}</p>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <Toggle label={s.verse} checked={v.verse} onChange={(x) => onChange({ verse: x })} />
        <Toggle label={s.hadith} checked={v.hadith} onChange={(x) => onChange({ hadith: x })} />
        <Toggle label={s.word} checked={v.word} onChange={(x) => onChange({ word: x })} />
        <Toggle label={s.wisdom} checked={v.wisdom} onChange={(x) => onChange({ wisdom: x })} />
        <Toggle label={s.fact} checked={v.fact} onChange={(x) => onChange({ fact: x })} />
      </div>
      {/* In Arabic the verse and hadith stand alone, with no translation under them. */}
      {(v.verse || v.hadith) && t.lang !== 'ar' && (
        <Toggle label={s.meaning} checked={v.meaning} onChange={(x) => onChange({ meaning: x })} />
      )}
      {v.word && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{s.wordLanguage}</Label>
            <Segmented<WordLanguage> value={v.wordLanguage} onChange={(x) => onChange({ wordLanguage: x })} options={WORD_LANGUAGES.map((l) => ({ value: l, label: t.cap(names.of(l) ?? l) }))} />
          </div>
          <div>
            <Label>{s.level}</Label>
            <Segmented<CefrLevel> value={v.wordLevel} onChange={(x) => onChange({ wordLevel: x })} options={CEFR_LEVELS.map((l) => ({ value: l, label: l }))} />
            <p className="mt-1.5 text-xs text-muted">
              {t.f(s.levelLine, { level: v.wordLevel, name: s.levelNames[v.wordLevel] })}{v.wordLanguage === 'zh' && <> · {t.f(s.chineseHsk, { level: v.wordLevel, hsk: HSK[v.wordLevel] })}</>}
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return <div className="flex items-center gap-3"><span dir="ltr" className="flex gap-1">{keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span><span className="text-muted">{label}</span></div>
}

function AreaEditor({ area, onClose }: { area: Area | 'new' | null; onClose: () => void }) {
  const t = useI18n()
  const { m } = t
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
      title={editing ? m.settings.areas.editTitle : m.settings.areas.newTitle}
      footer={
        <>
          {editing && (
            <>
              <Button variant="danger" className="me-auto" onClick={() => { if (confirm(t.f(m.settings.areas.deleteConfirm, { name: editing.name }))) { remove(editing.id); onClose() } }}>{m.common.delete}</Button>
              <Button variant="ghost" onClick={() => { update(editing.id, { archived: !editing.archived }); onClose() }}>{editing.archived ? m.common.unarchive : m.common.archive}</Button>
            </>
          )}
          <Button variant="primary" onClick={save} disabled={!name.trim()}>{m.common.save}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <EmojiInput value={emoji} onChange={setEmoji} />
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={m.settings.areas.namePlaceholder} onKeyDown={(e) => e.key === 'Enter' && save()} />
        </div>
        <div>
          <Label>{m.settings.areas.colour}</Label>
          <div className="flex flex-wrap gap-2">
            {AREA_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={cx('size-8 rounded-full transition', color === c ? 'scale-110 ring-2 ring-text/40 ring-offset-2 ring-offset-surface' : 'hover:scale-110')} style={{ background: AREA_HEX[c] }} aria-label={m.settings.areas.colours[c]} />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
