import { format } from 'date-fns'
import { AnimatePresence, motion } from 'motion/react'
import { Copy, Download, ExternalLink, FolderKanban, Link2, Plus, Search, Sparkles, Star, Target, Trash2, TrendingDown, TrendingUp, Trophy, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { create } from 'zustand'
import { EmojiInput } from '../components/EmojiInput'
import { Button, Card, cx, EmptyState, IconButton, Input, Label, Modal, PageHeader, Segmented, SectionTitle, Select, Textarea } from '../components/ui'
import { ACHIEVEMENT_CATEGORIES, achievementYears, categoryMeta, IMPACT_LABEL, suggestions, toText, yearOf, yearSummary, type Suggestion } from '../lib/achievements'
import { celebrate } from '../lib/celebrate'
import { fromKey } from '../lib/date'
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

const Stars = ({ n, size = 12 }: { n: 1 | 2 | 3; size?: number }) => (
  <span className="inline-flex text-gold" title={IMPACT_LABEL[n]}>
    {Array.from({ length: n }, (_, i) => <Star key={i} size={size} fill="currentColor" />)}
  </span>
)

// --- page ---------------------------------------------------------------------------------------

export function AchievementsPage() {
  const d = useData()
  const today = useToday()
  const years = achievementYears(d.achievements, today)
  const [year, setYear] = useState(years[0])
  const [category, setCategory] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [exporting, setExporting] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>(readDismissed)

  const summary = useMemo(() => yearSummary(d.achievements, year), [d.achievements, year])
  const sugg = useMemo(() => suggestions(d, today, dismissed).filter((s) => Number(s.date.slice(0, 4)) === year), [d, today, dismissed, year])

  const list = d.achievements
    .filter((a) => yearOf(a) === year)
    .filter((a) => !category || a.category === category)
    .filter((a) => !q || `${a.title} ${a.story} ${a.tags.join(' ')} ${categoryMeta(a.category).label}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))

  const months = useMemo(() => {
    const out: { key: string; label: string; items: Achievement[] }[] = []
    for (const a of list) {
      const key = a.date.slice(0, 7)
      let m = out[out.length - 1]
      if (!m || m.key !== key) { m = { key, label: format(fromKey(`${key}-01`), 'MMMM'), items: [] }; out.push(m) }
      m.items.push(a)
    }
    return out
  }, [list])

  const dismiss = (s: Suggestion) => { const v = [...dismissed, s.source!]; setDismissed(v); writeDismissed(v) }
  const delta = summary.count - summary.previousYearCount

  return (
    <div className="space-y-6">
      <PageHeader
        title="Achievements"
        subtitle="What you have done, year by year — for the days you forget how far you have come."
        right={
          <div className="flex gap-2">
            <Button onClick={() => setExporting(true)}><Download size={16} /> Export</Button>
            <Button variant="primary" onClick={() => openAchievement({ date: Number(today.slice(0, 4)) === year ? today : `${year}-12-31` })}><Plus size={16} /> Add achievement</Button>
          </div>
        }
      />

      <Segmented value={year} onChange={(y) => { setYear(y); setCategory(null) }} options={years.map((y) => ({ value: y, label: `${y} · ${d.achievements.filter((a) => yearOf(a) === y).length}` }))} />

      {/* Year in review */}
      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className="absolute -right-10 -top-10 size-44 rounded-full bg-gradient-accent opacity-15 blur-3xl" />
        <div className="relative flex flex-wrap items-start gap-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">{year} in review</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-5xl font-extrabold text-gradient tabular">{summary.count}</span>
              <span className="font-semibold">{summary.count === 1 ? 'achievement' : 'achievements'}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              {summary.major > 0 && <span className="inline-flex items-center gap-1"><Stars n={3} /> {summary.major} major</span>}
              {(summary.previousYearCount > 0 || summary.count > 0) && (
                <span className={cx('inline-flex items-center gap-1 font-semibold', delta > 0 ? 'text-accent' : delta < 0 ? 'text-muted' : '')}>
                  {delta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {delta === 0 ? `Same as ${year - 1}` : `${delta > 0 ? '+' : ''}${delta} vs ${year - 1}`}
                </span>
              )}
            </div>
          </div>
          {summary.byCategory.length > 0 && (
            <div className="min-w-56 flex-1 space-y-2">
              {summary.byCategory.slice(0, 6).map(({ category: c, count }) => {
                const m = categoryMeta(c)
                return (
                  <button key={c} onClick={() => setCategory(category === c ? null : c)} className="block w-full text-left">
                    <div className="mb-0.5 flex justify-between text-xs"><span className="font-semibold">{m.emoji} {m.label}</span><span className="tabular text-muted">{count}</span></div>
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
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Highlights</div>
            <div className="flex flex-wrap gap-2">
              {summary.highlights.slice(0, 5).map((a) => (
                <button key={a.id} onClick={() => openAchievement(a)} className="inline-flex items-center gap-2 rounded-xl bg-surface-2/70 px-3 py-1.5 text-sm font-semibold hover:bg-surface-2">
                  <span>{a.emoji || categoryMeta(a.category).emoji}</span>{a.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Suggestions */}
      {sugg.length > 0 && (
        <section>
          <SectionTitle><span className="inline-flex items-center gap-1.5"><Sparkles size={13} /> Wins Itqan noticed</span></SectionTitle>
          <Card className="divide-y divide-border">
            {sugg.slice(0, 6).map((s) => (
              <div key={s.source} className="flex flex-wrap items-center gap-3 p-3">
                <span className="text-xl">{s.emoji}</span>
                <div className="min-w-[12rem] flex-1">
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="text-xs text-muted">{format(fromKey(s.date), 'MMM d')} · {categoryMeta(s.category).label}</div>
                </div>
                <div className="ml-auto flex gap-1">
                  <Button size="sm" variant="primary" onClick={() => openAchievement(s)}><Plus size={13} /> Add</Button>
                  <IconButton label="Not an achievement" onClick={() => dismiss(s)}><X size={15} /></IconButton>
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
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input placeholder="Search achievements" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setCategory(null)} className={cx('rounded-lg px-2.5 py-1 text-xs font-semibold transition', !category ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted')}>All</button>
            {summary.byCategory.map(({ category: c, count }) => {
              const m = categoryMeta(c)
              return (
                <button key={c} onClick={() => setCategory(category === c ? null : c)}
                  className="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
                  style={category === c ? { background: `${m.hex}22`, color: m.hex } : { background: 'var(--surface-2)', color: 'var(--muted)' }}>
                  {m.emoji} {m.label} · {count}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Timeline */}
      {summary.count === 0 ? (
        <EmptyState emoji="🏆" title={`Nothing recorded for ${year} yet`}>
          Promotions, certificates, a finished juz, a race, a hard conversation handled well — big or small, write it down. Future you will be glad.
        </EmptyState>
      ) : list.length === 0 ? (
        <EmptyState emoji="🔍" title="Nothing matches" />
      ) : (
        <div className="space-y-6">
          {months.map((m) => (
            <section key={m.key}>
              <h3 className="mb-3 text-sm font-bold text-muted">{m.label}</h3>
              <div className="relative space-y-3 border-l-2 border-border pl-5">
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
  const update = useStore((s) => s.updateAchievement)
  const goal = useStore((s) => (a.goalId ? s.goals.find((g) => g.id === a.goalId) : undefined))
  const project = useStore((s) => (a.projectId ? s.projects.find((p) => p.id === a.projectId) : undefined))
  const m = categoryMeta(a.category)

  return (
    <motion.div layout initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className="relative">
      <span className="absolute -left-[29px] top-5 size-3 rounded-full border-2 border-bg" style={{ background: m.hex }} />
      <Card className={cx('group cursor-pointer p-4 transition hover:border-text/20', a.highlight && 'border-gold/50')} onClick={() => openAchievement(a)}>
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: `${m.hex}1f` }}>{a.emoji || m.emoji}</div>
          <div className="min-w-0 flex-1">
            <div className="font-bold leading-snug">{a.title}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <span>{format(fromKey(a.date), 'EEE, MMM d')}</span>
              <span className="rounded-md px-1.5 py-0.5 font-semibold" style={{ background: `${m.hex}1a`, color: m.hex }}>{m.emoji} {m.label}</span>
              <Stars n={a.impact} />
            </div>
          </div>
          <button
            aria-label={a.highlight ? 'Remove highlight' : 'Highlight'}
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
              <a key={l.id} href={l.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 font-semibold hover:text-accent">
                <Link2 size={11} />{l.label}<ExternalLink size={10} />
              </a>
            ))}
            {goal && <button onClick={() => navigate('goals')} className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 font-semibold text-muted hover:text-accent"><Target size={11} />{goal.title}</button>}
            {project && <button onClick={() => navigate('projects', project.id)} className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1 font-semibold text-muted hover:text-accent"><FolderKanban size={11} />{project.title}</button>}
            {a.tags.map((t) => <span key={t} className="rounded-md bg-surface-2 px-1.5 py-1 text-muted">#{t}</span>)}
          </div>
        )}
      </Card>
    </motion.div>
  )
}

// --- editor ---------------------------------------------------------------------------------

function AchievementEditor({ value, onClose }: { value: Achievement | Partial<Draft> | null; onClose: () => void }) {
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
      tags: [...new Set(tags.split(',').map((t) => t.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))],
      links: linkUrl.trim() ? [...d.links, { id: uid(), label: linkLabel.trim() || linkUrl.trim(), url: /^[a-z]+:\/\//i.test(linkUrl.trim()) ? linkUrl.trim() : `https://${linkUrl.trim()}` }] : d.links,
    }
    if (existing) update(existing.id, clean)
    else {
      add(clean)
      if (clean.impact === 3) celebrate.goal(); else celebrate.tick()
      toast({ emoji: '🏆', message: 'Achievement recorded · +5 XP' })
    }
    onClose()
  }

  return (
    <Modal
      open={value !== null}
      onClose={onClose}
      title={existing ? 'Achievement' : 'New achievement'}
      wide
      footer={
        <>
          {existing && (
            <Button variant="danger" className="mr-auto" onClick={() => {
              const a = remove(existing.id)
              onClose()
              if (a) toast({ emoji: '🗑️', message: 'Achievement deleted', action: { label: 'Undo', run: () => restore(a) } }, 8000)
            }}><Trash2 size={15} /> Delete</Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!d.title.trim()}>{existing ? 'Save' : 'Record it'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <EmojiInput value={d.emoji || categoryMeta(d.category).emoji} onChange={(v) => set('emoji', v)} />
          <Input autoFocus placeholder="What did you achieve?" value={d.title} onChange={(e) => set('title', e.target.value)} className="h-10 font-semibold" />
        </div>

        <div>
          <Label>Category</Label>
          <div className="flex flex-wrap gap-1.5">
            {ACHIEVEMENT_CATEGORIES.map((c) => {
              const on = !custom && d.category === c.key
              return (
                <button key={c.key} type="button" onClick={() => { setCustom(false); set('category', c.key) }}
                  className="rounded-lg border px-2.5 py-1 text-xs font-semibold transition"
                  style={on ? { borderColor: c.hex, background: `${c.hex}22`, color: c.hex } : { borderColor: 'var(--border)' }}>
                  {c.emoji} {c.label}
                </button>
              )
            })}
            <button type="button" onClick={() => { setCustom(true); set('category', '') }}
              className={cx('rounded-lg border px-2.5 py-1 text-xs font-semibold transition', custom ? 'border-text/40 bg-surface-2' : 'border-border text-muted')}>
              ✨ Custom…
            </button>
          </div>
          {custom && <Input className="mt-2" placeholder="e.g. Hackathons" value={d.category} onChange={(e) => set('category', e.target.value)} />}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div><Label>When</Label><Input type="date" value={d.date} max={today} onChange={(e) => set('date', e.target.value || today)} className="w-auto" /></div>
          <div>
            <Label>How big?</Label>
            <Segmented<1 | 2 | 3> value={d.impact} onChange={(v) => set('impact', v)} options={([1, 2, 3] as const).map((n) => ({ value: n, label: <span className="inline-flex items-center gap-1"><Stars n={n} size={10} /> {IMPACT_LABEL[n]}</span> }))} />
          </div>
          <button type="button" onClick={() => set('highlight', !d.highlight)}
            className={cx('flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition', d.highlight ? 'bg-amber-500/15 text-gold' : 'bg-surface-2 text-muted')}>
            <Trophy size={15} fill={d.highlight ? 'currentColor' : 'none'} /> Highlight
          </button>
        </div>

        <div><Label>The story</Label><Textarea value={d.story} onChange={(e) => set('story', e.target.value)} placeholder="What it took, who helped, why it matters…" className="min-h-24" /></div>

        <div>
          <Label hint="certificate, article, repo…">Proof & links</Label>
          <div className="space-y-1.5">
            {d.links.map((l) => (
              <div key={l.id} className="flex items-center gap-2 rounded-lg bg-surface-2/60 px-3 py-1.5 text-sm">
                <Link2 size={13} className="text-muted" />
                <span className="min-w-0 flex-1 truncate">{l.label}</span>
                <button type="button" onClick={() => set('links', d.links.filter((x) => x.id !== l.id))} className="text-muted hover:text-danger"><X size={14} /></button>
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
              <Input placeholder="Label" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} />
              <Input placeholder="https://…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }} />
              <Button type="button" onClick={addLink} disabled={!linkUrl.trim()}><Plus size={15} /></Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {goals.length > 0 && (
            <div><Label hint="optional">Goal</Label>
              <Select value={d.goalId ?? ''} onChange={(e) => set('goalId', e.target.value || null)}>
                <option value="">None</option>
                {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </Select>
            </div>
          )}
          {projects.length > 0 && (
            <div><Label hint="optional">Project</Label>
              <Select value={d.projectId ?? ''} onChange={(e) => set('projectId', e.target.value || null)}>
                <option value="">None</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.title}</option>)}
              </Select>
            </div>
          )}
        </div>
        <div><Label hint="comma separated">Tags</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="cv, linkedin" /></div>
      </div>
    </Modal>
  )
}

// --- export -----------------------------------------------------------------------------------

function ExportModal({ open, year, onClose }: { open: boolean; year: number; onClose: () => void }) {
  const achievements = useStore((s) => s.achievements)
  const text = useMemo(() => toText(achievements, year), [achievements, year])

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast({ emoji: '📋', message: 'Copied — paste it into your CV or LinkedIn' }) }
    catch { toast({ emoji: '⚠️', message: 'Copy failed — select the text and copy it by hand' }) }
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
    <Modal open={open} onClose={onClose} title={`Export ${year}`} wide
      footer={<><Button onClick={download}><Download size={15} /> Download .txt</Button><Button variant="primary" onClick={copy}><Copy size={15} /> Copy</Button></>}>
      <textarea readOnly value={text} className="min-h-80 w-full resize-y rounded-xl border border-border bg-surface-2/50 p-3 font-mono text-xs leading-relaxed outline-none sm:text-[13px]" />
    </Modal>
  )
}
