import { differenceInCalendarYears } from 'date-fns'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, Heart, Plus, Search, Shuffle, Trash2 } from 'lucide-react'
import { usePageAction } from '../components/Shell'
import { useEffect, useMemo, useState } from 'react'
import { EmojiInput } from '../components/EmojiInput'
import { Button, Card, cx, EmptyState, IconButton, Input, Label, Modal, PageHeader, Textarea } from '../components/ui'
import { useI18n } from '../i18n/react'
import { celebrate } from '../lib/celebrate'
import { fromKey } from '../lib/date'
import { useData, useToday } from '../lib/hooks'
import { useStore } from '../lib/store'
import { toast } from '../lib/toast'
import type { Memory } from '../lib/types'

const MEMORY_EMOJIS = ['✨', '❤️', '🎉', '🏆', '🌙', '🕋', '✈️', '👨‍👩‍👧', '🎓', '📸', '🌅', '🤲', '😂', '🍽️', '🏖️', '💍']

/** Memories from this day of the year, in earlier years. */
export function onThisDay(memories: Memory[], today: string): Memory[] {
  const md = today.slice(5)
  return memories.filter((m) => m.date.slice(5) === md && m.date < today).sort((a, b) => b.date.localeCompare(a.date))
}

export function MemoriesPage() {
  const t = useI18n()
  const L = t.m.memories
  const d = useData()
  const today = useToday()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [favOnly, setFavOnly] = useState(false)
  const [editing, setEditing] = useState<Memory | 'new' | null>(null)
  usePageAction({ label: L.newMemory, icon: <Camera size={24} />, run: () => setEditing('new') })
  const [shuffle, setShuffle] = useState(0)

  const tags = useMemo(() => {
    const m = new Map<string, number>()
    for (const x of d.memories) for (const tg of x.tags) m.set(tg, (m.get(tg) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([tg]) => tg)
  }, [d.memories])

  const list = d.memories
    .filter((m) => !favOnly || m.favorite)
    .filter((m) => !tag || m.tags.includes(tag))
    .filter((m) => !q || `${m.title} ${m.story} ${m.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))

  const groups = useMemo(() => {
    const out: { key: string; label: string; items: Memory[] }[] = []
    for (const m of list) {
      const key = m.date.slice(0, 7)
      let g = out[out.length - 1]
      if (!g || g.key !== key) { g = { key, label: t.d(`${key}-01`, 'month', true), items: [] }; out.push(g) }
      g.items.push(m)
    }
    return out
  }, [list, t])

  const otd = onThisDay(d.memories, today)
  const rediscover = useMemo(() => {
    const shown = new Set(onThisDay(d.memories, today).map((m) => m.id))
    const pool = d.memories.filter((m) => m.date < today && !shown.has(m.id))
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffle, d.memories.length, today])

  return (
    <div>
      <PageHeader
        title={t.m.nav.memories}
        subtitle={d.memories.length ? t.p(L.subtitleCount, d.memories.length) : L.subtitleEmpty}
        right={<Button variant="primary" onClick={() => setEditing('new')}><Plus size={16} /> {L.newMemory}</Button>}
      />

      {(otd.length > 0 || rediscover) && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          {otd.length > 0 && (
            <Card className="relative overflow-hidden p-5">
              <div className="absolute -end-8 -top-8 size-32 rounded-full bg-gradient-accent opacity-15 blur-2xl" />
              <div className="mb-3 text-xs font-bold uppercase tracking-wider text-accent">{L.onThisDay}</div>
              <div className="space-y-3">
                {otd.map((m) => (
                  <button key={m.id} onClick={() => setEditing(m)} className="flex w-full items-start gap-3 text-start">
                    <span className="text-2xl">{m.emoji}</span>
                    <span>
                      <span className="block font-bold">{m.title}</span>
                      <span className="text-xs text-muted">{t.f(L.onThisDayMeta, { ago: t.p(L.yearsAgo, differenceInCalendarYears(fromKey(today), fromKey(m.date))), year: t.d(m.date, 'year') })}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}
          {rediscover && (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">{L.rememberThis}</span>
                <IconButton label={L.anotherMemory} onClick={() => setShuffle((n) => n + 1)}><Shuffle size={15} /></IconButton>
              </div>
              <button onClick={() => setEditing(rediscover)} className="flex w-full items-start gap-3 text-start">
                <span className="text-3xl">{rediscover.emoji}</span>
                <span className="min-w-0">
                  <span className="block font-bold">{rediscover.title}</span>
                  <span className="text-xs text-muted">{t.f(L.rediscoverMeta, { date: t.d(rediscover.date, 'medium'), ago: t.ago(rediscover.date, fromKey(today)) })}</span>
                  {rediscover.story && <span className="mt-1 line-clamp-2 block text-sm text-muted">{rediscover.story}</span>}
                </span>
              </button>
            </Card>
          )}
        </div>
      )}

      {d.memories.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input placeholder={L.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} className="ps-9" />
          </div>
          <button onClick={() => setFavOnly((f) => !f)} className={cx('flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition', favOnly ? 'bg-rose-500/15 text-rose-500' : 'bg-surface-2 text-muted')}>
            <Heart size={15} fill={favOnly ? 'currentColor' : 'none'} /> {L.favourites}
          </button>
          {tags.slice(0, 12).map((tg) => (
            <button key={tg} onClick={() => setTag(tag === tg ? null : tg)} className={cx('h-8 rounded-lg px-2.5 text-xs font-semibold transition', tag === tg ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted hover:text-text')}>
              #{tg}
            </button>
          ))}
        </div>
      )}

      {d.memories.length === 0 ? (
        <EmptyState emoji="📸" title={L.emptyTitle}>{L.emptyBody}</EmptyState>
      ) : list.length === 0 ? (
        <EmptyState emoji="🔍" title={L.noMatchTitle}>{L.noMatchBody}</EmptyState>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="mb-3 text-sm font-bold text-muted">{g.label}</h2>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence initial={false}>
                  {g.items.map((m) => <MemoryCard key={m.id} memory={m} onOpen={() => setEditing(m)} />)}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      )}

      <MemoryEditor memory={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function MemoryCard({ memory: m, onOpen }: { memory: Memory; onOpen: () => void }) {
  const t = useI18n()
  const L = t.m.memories
  const update = useStore((s) => s.updateMemory)
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
      <Card className="group h-full cursor-pointer p-4 transition hover:border-text/20" onClick={onOpen}>
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-2xl">{m.emoji}</div>
          <div className="min-w-0 flex-1">
            <div className="font-bold leading-snug">{m.title}</div>
            <div className="text-xs text-muted">{t.f(L.dateWithWeekday, { weekday: t.d(m.date, 'weekday', true), date: t.d(m.date, 'medium') })}</div>
          </div>
          <button
            aria-label={m.favorite ? L.removeFavourite : L.addFavourite}
            onClick={(e) => { e.stopPropagation(); update(m.id, { favorite: !m.favorite }) }}
            className={cx('transition hover:scale-110', m.favorite ? 'text-rose-500' : 'text-muted opacity-0 group-hover:opacity-100')}
          >
            <Heart size={17} fill={m.favorite ? 'currentColor' : 'none'} />
          </button>
        </div>
        {m.story && <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-muted">{m.story}</p>}
        {m.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {m.tags.map((tg) => <span key={tg} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted">#{tg}</span>)}
          </div>
        )}
      </Card>
    </motion.div>
  )
}

export function MemoryEditor({ memory, onClose }: { memory: Memory | 'new' | null; onClose: () => void }) {
  const t = useI18n()
  const L = t.m.memories.editor
  const today = useToday()
  const add = useStore((s) => s.addMemory)
  const update = useStore((s) => s.updateMemory)
  const remove = useStore((s) => s.deleteMemory)
  const restore = useStore((s) => s.restoreMemory)
  const existing = memory && memory !== 'new' ? memory : null
  const [title, setTitle] = useState('')
  const [story, setStory] = useState('')
  const [date, setDate] = useState(today)
  const [emoji, setEmoji] = useState('✨')
  const [tags, setTags] = useState('')
  const [favorite, setFavorite] = useState(false)

  useEffect(() => {
    if (!memory) return
    setTitle(existing?.title ?? '')
    setStory(existing?.story ?? '')
    setDate(existing?.date ?? today)
    setEmoji(existing?.emoji ?? '✨')
    setTags(existing?.tags.join(', ') ?? '')
    setFavorite(existing?.favorite ?? false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory])

  const save = () => {
    if (!title.trim()) return
    const m = {
      title: title.trim(), story: story.trim(), date, emoji, favorite,
      tags: [...new Set(tags.split(/[,،，、]/).map((x) => x.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))],
    }
    if (existing) update(existing.id, m)
    else { add(m); celebrate.tick(); toast({ emoji: '📸', message: L.saved }) }
    onClose()
  }

  return (
    <Modal
      open={memory !== null}
      onClose={onClose}
      title={existing ? L.title : L.newTitle}
      wide
      footer={
        <>
          {existing && (
            <Button variant="danger" className="me-auto" onClick={() => {
              const m = remove(existing.id)
              onClose()
              if (m) toast({ emoji: '🗑️', message: L.deleted, action: { label: t.m.common.undo, run: () => restore(m) } }, 8000)
            }}>
              <Trash2 size={15} /> {t.m.common.delete}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>{t.m.common.cancel}</Button>
          <Button variant="primary" onClick={save} disabled={!title.trim()}>{existing ? t.m.common.save : L.keep}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <EmojiInput value={emoji} onChange={setEmoji} />
          <Input autoFocus placeholder={L.titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 font-semibold" />
        </div>
        <div className="flex flex-wrap gap-1">
          {MEMORY_EMOJIS.map((e) => (
            <button key={e} type="button" onClick={() => setEmoji(e)} className={cx('grid size-8 place-items-center rounded-lg text-lg transition hover:bg-surface-2', emoji === e && 'bg-accent-soft')}>{e}</button>
          ))}
        </div>
        <div>
          <Label>{L.story}</Label>
          <Textarea placeholder={L.storyPlaceholder} value={story} onChange={(e) => setStory(e.target.value)} className="min-h-40 leading-relaxed" />
        </div>
        <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
          <div><Label>{L.when}</Label><Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} className="w-auto" /></div>
          <div><Label hint={L.tagsHint}>{t.m.common.tags}</Label><Input placeholder={L.tagsPlaceholder} value={tags} onChange={(e) => setTags(e.target.value)} /></div>
          <button type="button" onClick={() => setFavorite((f) => !f)} className={cx('flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition', favorite ? 'bg-rose-500/15 text-rose-500' : 'bg-surface-2 text-muted')}>
            <Heart size={15} fill={favorite ? 'currentColor' : 'none'} /> {t.m.common.favourite}
          </button>
        </div>
      </div>
    </Modal>
  )
}
