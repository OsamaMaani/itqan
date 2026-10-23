import { AnimatePresence, motion } from 'motion/react'
import { Copy, Download, ExternalLink, FolderKanban, Link2, Plus, Search, Sparkles, Star, Target, Trash2, TrendingDown, TrendingUp, Trophy, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { EmojiInput } from '../components/EmojiInput'
import { usePageAction } from '../components/Shell'
import { Button, Card, cx, EmptyState, IconButton, Input, Label, Modal, PageHeader, Segmented, SectionTitle, Select, Textarea } from '../components/ui'
import { ACHIEVEMENT_CATEGORIES, achievementYears, categoryMeta, IMPACT_KEY, suggestions, toText, yearOf, yearSummary, type Suggestion } from '../lib/achievements'
import { i18nFor } from '../i18n/core'
import { useI18n } from '../i18n/react'
import { celebrate } from '../lib/celebrate'
import { useData, useToday } from '../lib/hooks'
import { uid } from '../lib/id'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import type { Achievement, ProjectLink } from '../lib/types'

// --- opening the editor from anywhere (e.g. "goal complete → add to achievements") ------------

type Draft = Omit<Achievement, 'id' | 'createdAt' | 'updatedAt'>

export const useAchievementEditor = create<{ editing: Achievement | Partial<Draft> | null }>(() => ({ editing: null }))

export function openAchievement(x: Achievement | Partial<Draft> = {}) {
  useAchievementEditor.setState({ editing: x })
}

/** Mounted once in App so any screen can open the editor. */
export function GlobalAchievementEditor() {
  const editing = useAchievementEditor((s) => s.editing)
  return <AchievementEditor value={editing} onClose={() => useAchievementEditor.setState({ editing: null })} />
}

// --- dismissed suggestions are a per-device convenience (not synced, not essential) ---------

const DISMISS_KEY = 'itqan-dismissed-suggestions'
function readDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]') } catch { return [] }
}
function writeDismissed(v: string[]) {
  try { localStorage.setItem(DISMISS_KEY, JSON.stringify(v)) } catch { /* ignore */ }
}

function Stars({ n, size = 12 }: { n: 1 | 2 | 3; size?: number }) {
  const t = useI18n()
  return (
    <span className="inline-flex text-gold" title={t.m.achievements.impact[IMPACT_KEY[n]]}>
      {Array.from({ length: n }, (_, i) => <Star key={i} size={size} fill="currentColor" />)}
    </span>
  )
}

// --- page ---------------------------------------------------------------------------------------

export function AchievementsPage() {
  const t = useI18n()
  const L = t.m.achievements
  const d = useData()
  const today = useToday()
  const years = achievementYears(d.achievements, today)
  usePageAction({ label: L.addAchievement, icon: <Trophy size={24} />, run: () => openAchievement({ date: today }) })
  const [year, setYear] = useState(years[0])
  const [category, setCategory] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [exporting, setExporting] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>(readDismissed)

  const summary = useMemo(() => yearSummary(d.achievements, year), [d.achievements, year])
  const sugg = useMemo(() => suggestions(d, today, dismissed, t).filter((s) => Number(s.date.slice(0, 4)) === year), [d, today, dismissed, year, t])

  const list = d.achievements
    .filter((a) => yearOf(a) === year)
    .filter((a) => !category || a.category === category)
    .filter((a) => !q || `${a.title} ${a.story} ${a.tags.join(' ')} ${categoryMeta(a.category, t).label} ${categoryMeta(a.category, i18nFor('en')).label}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))

  const months = useMemo(() => {
    const out: { key: string; label: string; items: Achievement[] }[] = []
    for (const a of list) {
      const key = a.date.slice(0, 7)
      let m = out[out.length - 1]
      if (!m || m.key !== key) { m = { key, label: t.d(`${key}-01`, 'monthName', true), items: [] }; out.push(m) }
      m.items.push(a)
    }
    return out
  }, [list, t])

  const dismiss = (s: Suggestion) => { const v = [...dismissed, s.source!]; setDismissed(v); writeDismissed(v) }
  const delta = summary.count - summary.previousYearCount

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.m.nav.achievements}
        subtitle={L.subtitle}
        right={
          <div className="flex gap-2">
            <Button onClick={() => setExporting(true)}><Download size={16} /> {L.export}</Button>
            <Button variant="primary" onClick={() => openAchievement({ date: Number(today.slice(0, 4)) === year ? today : `${year}-12-31` })}><Plus size={16} /> {L.addAchievement}</Button>
          </div>
        }
      />

      <Segmented value={year} onChange={(y) => { setYear(y); setCategory(null) }} options={years.map((y) => ({ value: y, label: t.f(L.yearTab, { year: String(y), n: d.achievements.filter((a) => yearOf(a) === y).length }) }))} />

      {/* Year in review */}
      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className="absolute -end-10 -top-10 size-44 rounded-full bg-gradient-accent opacity-15 blur-3xl" />
        <div className="relative flex flex-wrap items-start gap-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">{t.f(L.yearInReview, { year: String(year) })}</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-5xl font-extrabold text-gradient tabular">{t.n(summary.count)}</span>
              <span className="font-semibold">{t.p(L.countLabel, summary.count)}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {summary.major > 0 && <span className="inline-flex items-center gap-1"><Stars n={3} /> {t.p(L.majorCount, summary.major)}</span>}
              {(summary.previousYearCount > 0 || summary.count > 0) && (
                <span className={cx('inline-flex items-center gap-1 font-semibold', delta > 0 ? 'text-accent' : delta < 0 ? 'text-muted' : '')}>
                  {delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {delta === 0 ? t.f(L.sameAsYear, { year: String(year - 1) }) : t.f(L.deltaVs, { delta: t.n(delta, { signDisplay: 'exceptZero' }), year: String(year - 1) })}
                </span>
              )}
            </div>
          </div>
          {summary.byCategory.length > 0 && (
            <div className="min-w-56 flex-1 space-y-2">
              {summary.byCategory.slice(0, 6).map(({ category: c, count }) => {
                const m = categoryMeta(c, t)
                return (
                  <button key={c} onClick={() => setCategory(category === c ? null : c)} className="block w-full text-start">
                    <div className="mb-0.5 flex justify-between text-xs"><span className="font-semibold">{m.emoji} {m.label}</span><span className="tabular text-muted">{t.n(count)}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <motion.div className="h-full rounded-full" style={{ background: m.hex }} initial={{ width: 0 }} animate={{ width: `${(count / summary.count) * 100}%` }} />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        {summary.highlights.length > 0 && (
          <div className="relative mt-5 border-t border-border pt-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{L.highlights}</div>
            <div className="flex flex-wrap gap-2">
              {summary.highlights.slice(0, 5).map((a) => (
                <button key={a.id} onClick={() => openAchievement(a)} className="inline-flex items-center gap-2 rounded-xl bg-surface-2/70 px-3 py-1.5 text-sm font-semibold hover:bg-surface-2">
                  <span>{a.emoji || categoryMeta(a.category, t).emoji}</span>{a.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Suggestions */}
      {sugg.length > 0 && (
        <section>
          <SectionTitle><span className="inline-flex items-center gap-1.5"><Sparkles size={13} /> {L.noticed}</span></SectionTitle>
          <Card className="divide-y divide-border">
            {sugg.slice(0, 6).map((s) => (
              <div key={s.source} className="flex flex-wrap items-center gap-3 p-3">
                <span className="text-xl">{s.emoji}</span>
                <div className="min-w-[12rem] flex-1">
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="text-xs text-muted">{t.f(L.suggestionMeta, { date: t.d(s.date, 'short'), category: categoryMeta(s.category, t).label })}</div>
                </div>
                <div className="ms-auto flex gap-1">
                  <Button size="sm" variant="primary" onClick={() => openAchievement(s)}><Plus size={13} /> {L.suggestionAdd}</Button>
                  <IconButton label={L.notAnAchievement} onClick={() => dismiss(s)}><X size={15} /></IconButton>
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* Filters */}
      {summary.count > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input placeholder={L.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} className="ps-9" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setCategory(null)} className={cx('rounded-lg px-2.5 py-1 text-xs font-semibold transition', !category ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted')}>{t.m.common.all}</button>
            {summary.byCategory.map(({ category: c, count }) => {
              const m = categoryMeta(c, t)
              return (
                <button key={c} onClick={() => setCategory(category === c ? null : c)}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
                  style={category === c ? { background: `${m.hex}22`, color: m.hex } : { background: 'var(--surface-2)', color: 'var(--muted)' }}>
                  {m.emoji} {t.f(L.categoryChip, { category: m.label, n: count })}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Timeline */}
      {summary.count === 0 ? (
        <EmptyState emoji="🏆" title={t.f(L.emptyYearTitle, { year: String(year) })}>{L.emptyYearBody}</EmptyState>
      ) : list.length === 0 ? (
        <EmptyState emoji="🔍" title={L.noMatch} />
      ) : (
        <div className="space-y-6">
          {months.map((m) => (
            <section key={m.key}>
              <h3 className="mb-3 text-sm font-bold text-muted">{m.label}</h3>
              <div className="relative space-y-3 border-s-2 border-border ps-5">
                <AnimatePresence initial={false}>
                  {m.items.map((a) => <AchievementCard key={a.id} a={a} />)}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      )}

      <ExportModal open={exporting} year={year} onClose={() => setExporting(false)} />
    </div>
  )
}

function AchievementCard({ a }: { a: Achievement }) {
  const t = useI18n()
  const update = useStore((s) => s.updateAchievement)
  const goal = useStore((s) => (a.goalId ? s.goals.find((g) => g.id === a.goalId) : undefined))
  const project = useStore((s) => (a.projectId ? s.projects.find((p) => p.id === a.projectId) : undefined))
  const m = categoryMeta(a.category, t)
  const dirSign = t.dir === 'rtl' ? -1 : 1

  return (
    <motion.div layout initial={{ opacity: 0, x: -6 * dirSign }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className="relative">
      <span className="absolute -start-[29px] top-5 size-3 rounded-full border-2 border-bg" style={{ background: m.hex }} />
      <Card className={cx('group cursor-pointer p-4 transition hover:border-text/20', a.highlight && 'border-gold/50')} onClick={() => openAchievement(a)}>
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: `${m.hex}1f` }}>{a.emoji || m.emoji}</div>
          <div className="min-w-0 flex-1">
            <div className="font-bold leading-snug">{a.title}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <span>{t.d(a.date, 'weekdayShort')}</span>
              <span className="rounded-md px-1.5 py-0.5 font-semibold" style={{ background: `${m.hex}1a`, color: m.hex }}>{m.emoji} {m.label}</span>
              <Stars n={a.impact} />
            </div>
          </div>
          <button
            aria-label={a.highlight ? t.m.achievements.removeHighlight : t.m.achievements.highlight}
            onClick={(e) => { e.stopPropagation(); update(a.id, { highlight: !a.highlight }) }}
            className={cx('transition hover:scale-110', a.highlight ? 'text-gold' : 'text-muted sm:opacity-0 sm:group-hover:opacity-100')}
          >
            <Trophy size={17} fill={a.highlight ? 'currentColor' : 'none'} />
          </button>
        </div>
        {a.story && <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-muted">{a.story}</p>}
        {(a.links.length > 0 || goal || project || a.tags.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs" onClick={(e) => e.stopPropagation()}>
            {a.links.map((l) => (
              <a key={l.id} href={l.url} dir="ltr" target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 font-semibold hover:text-accent">
                <Link2 size={11} />{l.label}<ExternalLink size={10} />
              </a>
            ))}
            {goal && <button onClick={() => navigate('goals')} className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 font-semibold text-muted hover:text-accent"><Target size={11} />{goal.title}</button>}
            {project && <button onClick={() => navigate('projects', project.id)} className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 font-semibold text-muted hover:text-accent"><FolderKanban size={11} />{project.title}</button>}
            {a.tags.map((tg) => <span key={tg} className="rounded-md bg-surface-2 px-1.5 py-1 text-muted">#{tg}</span>)}
          </div>
        )}
      </Card>
    </motion.div>
  )
}

// --- editor ---------------------------------------------------------------------------------

function AchievementEditor({ value, onClose }: { value: Achievement | Partial<Draft> | null; onClose: () => void }) {
  const t = useI18n()
  const L = t.m.achievements.editor
  const today = useToday()
  const goals = useStore((s) => s.goals)
  const projects = useStore((s) => s.projects)
  const add = useStore((s) => s.addAchievement)
  const update = useStore((s) => s.updateAchievement)
  const remove = useStore((s) => s.deleteAchievement)
  const restore = useStore((s) => s.restoreAchievement)
  const existing = value && 'id' in value && value.id ? (value as Achievement) : null

  const blank: Draft = { title: '', story: '', date: today, category: 'personal', emoji: '', impact: 2, highlight: false, tags: [], links: [], goalId: null, projectId: null, source: null }
  const [d, setD] = useState<Draft>(blank)
  const [tags, setTags] = useState('')
  const [custom, setCustom] = useState(false)
  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  useEffect(() => {
    if (!value) return
    const x = { ...blank, ...value } as Draft
    setD(x)
    setTags(x.tags.join(', '))
    setCustom(!!x.category && !ACHIEVEMENT_CATEGORIES.some((c) => c.key === x.category))
    setLinkLabel(''); setLinkUrl('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))

  const addLink = () => {
    const u = linkUrl.trim()
    if (!u) return
    const url = /^[a-z]+:\/\//i.test(u) ? u : `https://${u}`
    const link: ProjectLink = { id: uid(), label: linkLabel.trim() || u.replace(/^https?:\/\//, ''), url }
    set('links', [...d.links, link])
    setLinkLabel(''); setLinkUrl('')
  }

  const save = () => {
    if (!d.title.trim()) return
    const clean: Draft = {
      ...d, title: d.title.trim(), category: d.category.trim() || 'personal',
      tags: [...new Set(tags.split(/[,،，、]/).map((x) => x.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))],
      links: linkUrl.trim() ? [...d.links, { id: uid(), label: linkLabel.trim() || linkUrl.trim(), url: /^[a-z]+:\/\//i.test(linkUrl.trim()) ? linkUrl.trim() : `https://${linkUrl.trim()}` }] : d.links,
    }
    if (existing) update(existing.id, clean)
    else {
      add(clean)
      if (clean.impact === 3) celebrate.goal(); else celebrate.tick()
      toast({ emoji: '🏆', message: L.recorded })
    }
    onClose()
  }

  return (
    <Modal
      open={value !== null}
      onClose={onClose}
      title={existing ? L.title : L.newTitle}
      wide
      footer={
        <>
          {existing && (
            <Button variant="danger" className="me-auto" onClick={() => {
              const a = remove(existing.id)
              onClose()
              if (a) toast({ emoji: '🗑️', message: L.deleted, action: { label: t.m.common.undo, run: () => restore(a) } }, 8000)
            }}><Trash2 size={15} /> {t.m.common.delete}</Button>
          )}
          <Button variant="ghost" onClick={onClose}>{t.m.common.cancel}</Button>
          <Button variant="primary" onClick={save} disabled={!d.title.trim()}>{existing ? t.m.common.save : L.record}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <EmojiInput value={d.emoji || categoryMeta(d.category, t).emoji} onChange={(v) => set('emoji', v)} />
          <Input autoFocus placeholder={L.titlePlaceholder} value={d.title} onChange={(e) => set('title', e.target.value)} className="h-10 font-semibold" />
        </div>

        <div>
          <Label>{L.category}</Label>
          <div className="flex flex-wrap gap-1.5">
            {ACHIEVEMENT_CATEGORIES.map((c) => {
              const on = !custom && d.category === c.key
              return (
                <button key={c.key} type="button" onClick={() => { setCustom(false); set('category', c.key) }}
                  className="rounded-lg border px-2.5 py-1 text-xs font-semibold transition"
                  style={on ? { borderColor: c.hex, background: `${c.hex}22`, color: c.hex } : { borderColor: 'var(--border)' }}>
                  {c.emoji} {t.m.achievements.categories[c.key]}
                </button>
              )
            })}
            <button type="button" onClick={() => { setCustom(true); set('category', '') }}
              className={cx('rounded-lg border px-2.5 py-1 text-xs font-semibold transition', custom ? 'border-text/40 bg-surface-2' : 'border-border text-muted')}>
              ✨ {L.custom}
            </button>
          </div>
          {custom && <Input className="mt-2" placeholder={L.customPlaceholder} value={d.category} onChange={(e) => set('category', e.target.value)} />}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div><Label>{L.when}</Label><Input type="date" value={d.date} max={today} onChange={(e) => set('date', e.target.value || today)} className="w-auto" /></div>
          <div>
            <Label>{L.howBig}</Label>
            <Segmented<1 | 2 | 3> value={d.impact} onChange={(v) => set('impact', v)} options={([1, 2, 3] as const).map((n) => ({ value: n, label: <span className="inline-flex items-center gap-1"><Stars n={n} size={10} /> {t.m.achievements.impact[IMPACT_KEY[n]]}</span> }))} />
          </div>
          <button type="button" onClick={() => set('highlight', !d.highlight)}
            className={cx('flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition', d.highlight ? 'bg-amber-500/15 text-gold' : 'bg-surface-2 text-muted')}>
            <Trophy size={15} fill={d.highlight ? 'currentColor' : 'none'} /> {t.m.achievements.highlight}
          </button>
        </div>

        <div><Label>{L.story}</Label><Textarea value={d.story} onChange={(e) => set('story', e.target.value)} placeholder={L.storyPlaceholder} className="min-h-24" /></div>

        <div>
          <Label hint={L.proofHint}>{L.proof}</Label>
          <div className="space-y-1.5">
            {d.links.map((l) => (
              <div key={l.id} className="flex items-center gap-2 rounded-lg bg-surface-2/60 px-3 py-1.5 text-sm">
                <Link2 size={13} className="text-muted" />
                <span className="min-w-0 flex-1 truncate">{l.label}</span>
                <button type="button" onClick={() => set('links', d.links.filter((x) => x.id !== l.id))} className="text-muted hover:text-danger"><X size={14} /></button>
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
              <Input placeholder={L.linkLabel} value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} />
              <Input dir="ltr" placeholder={L.linkUrl} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} />
              <Button type="button" onClick={addLink} disabled={!linkUrl.trim()}><Plus size={15} /></Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {goals.length > 0 && (
            <div><Label hint={t.m.common.optional}>{L.goal}</Label>
              <Select value={d.goalId ?? ''} onChange={(e) => set('goalId', e.target.value || null)}>
                <option value="">{t.m.common.none.goal}</option>
                {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </Select>
            </div>
          )}
          {projects.length > 0 && (
            <div><Label hint={t.m.common.optional}>{L.project}</Label>
              <Select value={d.projectId ?? ''} onChange={(e) => set('projectId', e.target.value || null)}>
                <option value="">{t.m.common.none.project}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.title}</option>)}
              </Select>
            </div>
          )}
        </div>
        <div><Label hint={t.m.memories.editor.tagsHint}>{t.m.common.tags}</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder={L.tagsPlaceholder} /></div>
      </div>
    </Modal>
  )
}

// --- export -----------------------------------------------------------------------------------

function ExportModal({ open, year, onClose }: { open: boolean; year: number; onClose: () => void }) {
  const t = useI18n()
  const L = t.m.achievements.exportModal
  const achievements = useStore((s) => s.achievements)
  const text = useMemo(() => toText(achievements, year, t), [achievements, year, t])

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast({ emoji: '📋', message: L.copied }) }
    catch { toast({ emoji: '⚠️', message: L.copyFailed }) }
  }
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `achievements-${year}.txt`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <Modal open={open} onClose={onClose} title={t.f(L.title, { year: String(year) })} wide
      footer={<><Button onClick={download}><Download size={15} /> {L.download}</Button><Button variant="primary" onClick={copy}><Copy size={15} /> {t.m.common.copy}</Button></>}>
      <textarea readOnly value={text} className="min-h-80 w-full resize-y rounded-xl border border-border bg-surface-2/50 p-3 font-mono text-xs leading-relaxed outline-none sm:text-[13px]" />
    </Modal>
  )
}
