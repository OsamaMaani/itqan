import { ListChecks, Maximize2, Search, StickyNote } from 'lucide-react'
import { useState } from 'react'
import { NoteCard, openNote } from '../components/NoteEditor'
import { usePageAction } from '../components/Shell'
import { Button, cx, EmptyState, IconButton, Input, PageHeader, SectionTitle, Segmented } from '../components/ui'
import { useI18n } from '../i18n/react'
import { celebrate } from '../lib/celebrate'
import { noteLabels, visibleNotes } from '../lib/notes'
import { useStore } from '../lib/store'
import type { Note } from '../lib/types'

/** Notes (ADR-035): Keep-style cards — capture in one line, pin, colour, label, search, archive. */
export function NotesPage() {
  const t = useI18n()
  const L = t.m.notes
  const notes = useStore((s) => s.notes)
  const addNote = useStore((s) => s.addNote)
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [label, setLabel] = useState<string | null>(null)
  const [view, setView] = useState<'notes' | 'archive'>('notes')
  usePageAction({ label: L.newNote, icon: <StickyNote size={24} />, run: () => openNote({}) })

  const archived = view === 'archive'
  const live = notes.filter((n) => !n.archived)
  const inView = archived ? notes.filter((n) => n.archived) : live
  const labels = noteLabels(inView)
  const shown = visibleNotes(notes, { query: q, label, archived })
  const pinned = shown.filter((n) => n.pinned)
  const others = shown.filter((n) => !n.pinned)

  const capture = () => {
    if (!text.trim()) return
    addNote({ body: text.trim() })
    setText('')
    celebrate.tick()
  }

  return (
    <div>
      <PageHeader title={t.m.nav.notes} subtitle={live.length ? t.p(L.subtitleCount, live.length) : L.subtitleEmpty} />

      {!archived && (
        <div className="mx-auto mb-6 flex max-w-2xl items-center gap-1 rounded-2xl border border-border bg-surface/80 ps-3 pe-1.5 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-soft">
          <StickyNote size={18} className="shrink-0 text-gold" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && capture()}
            placeholder={L.capturePlaceholder}
            className="h-13 min-w-0 flex-1 bg-transparent px-1.5 text-base outline-none sm:text-[15px] placeholder:text-muted/70"
          />
          {text.trim()
            ? <Button size="sm" variant="primary" onClick={capture}>{L.saveNote}</Button>
            : <>
                <IconButton label={L.newChecklist} onClick={() => openNote({ checklist: true })}><ListChecks size={18} /></IconButton>
                <IconButton label={L.newNote} onClick={() => openNote({})}><Maximize2 size={16} /></IconButton>
              </>}
        </div>
      )}

      {notes.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input placeholder={L.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} className="ps-9" />
          </div>
          <Segmented
            value={view}
            onChange={(v) => { setView(v); setLabel(null) }}
            options={[
              { value: 'notes', label: t.f(L.view.notes, { n: t.n(live.length) }) },
              { value: 'archive', label: t.f(L.view.archive, { n: t.n(notes.length - live.length) }) },
            ]}
          />
        </div>
      )}

      {labels.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          <Chip on={label === null} onClick={() => setLabel(null)}>{L.allLabels}</Chip>
          {labels.map((l) => (
            <Chip key={l.label} on={label === l.label} onClick={() => setLabel(label === l.label ? null : l.label)}>
              <bdi>#{l.label}</bdi> <span className="opacity-60 tabular">{t.n(l.count)}</span>
            </Chip>
          ))}
        </div>
      )}

      {notes.length === 0 ? (
        <EmptyState emoji="📝" title={L.emptyTitle}>{L.emptyBody}</EmptyState>
      ) : shown.length === 0 ? (
        q || label
          ? <EmptyState emoji="🔍" title={L.noResultsTitle}>{L.noResultsBody}</EmptyState>
          : archived
            ? <EmptyState emoji="🗃️" title={L.archiveEmptyTitle}>{L.archiveEmptyBody}</EmptyState>
            : <EmptyState emoji="📝" title={L.emptyTitle}>{L.emptyBody}</EmptyState>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && <Section title={L.pinnedHeading} notes={pinned} />}
          {others.length > 0 && <Section title={pinned.length > 0 ? L.othersHeading : null} notes={others} />}
        </div>
      )}
    </div>
  )
}

/** Cards in columns, like Keep: each note as tall as its content. */
function Section({ title, notes }: { title: string | null; notes: Note[] }) {
  return (
    <section>
      {title && <SectionTitle>{title}</SectionTitle>}
      <div className="gap-3 sm:columns-2 lg:columns-3 2xl:columns-4">
        {notes.map((n) => <div key={n.id} className="page-enter mb-3 break-inside-avoid"><NoteCard note={n} /></div>)}
      </div>
    </section>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cx('inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition', on ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted hover:text-text')}
    >
      {children}
    </button>
  )
}
