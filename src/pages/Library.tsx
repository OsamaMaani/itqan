import { BookPlus, FileUp, Library as LibraryIcon, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BookCard, ContinueCard, editBook } from '../components/library/Books'
import { Reader } from '../components/library/Reader'
import { usePageAction } from '../components/Shell'
import { Button, cx, EmptyState, Input, PageHeader, SectionTitle } from '../components/ui'
import { useI18n } from '../i18n/react'
import { continueBook, visibleBooks } from '../lib/library'
import { addPdfFiles, pickPdfs, refreshFiles, useFiles } from '../lib/libraryFiles'
import { navigate, useRouteParam } from '../lib/router'
import { useStore } from '../lib/store'
import { BOOK_STATUSES, type BookStatus } from '../lib/types'

/**
 * The Library (ADR-046): PDFs read in Itqan, opening on the same page on every device, and books
 * read elsewhere whose page is kept by hand. #/library/<id> opens a book in the reader.
 */
export function LibraryPage() {
  const param = useRouteParam()
  const book = useStore((s) => (param ? s.books.find((b) => b.id === param) : undefined))
  useEffect(() => { void refreshFiles() }, [])
  useEffect(() => { if (param && !book && useStore.persist.hasHydrated()) navigate('library') }, [param, book])
  return (
    <>
      <Shelf />
      {book && <Reader key={book.id} book={book} />}
    </>
  )
}

function Shelf() {
  const t = useI18n()
  const L = t.m.library
  const books = useStore((s) => s.books)
  const places = useStore((s) => s.bookPlaces)
  const busy = useFiles((s) => s.busy > 0)
  const [status, setStatus] = useState<BookStatus | null>(null)
  const [q, setQ] = useState('')
  const [drag, setDrag] = useState(false)
  const addPdfs = () => pickPdfs((f) => void addPdfFiles(f))
  usePageAction({ label: L.addPdf, icon: <FileUp size={24} />, run: addPdfs })

  const shown = useMemo(() => visibleBooks(books, places, { status, query: q }), [books, places, status, q])
  const reading = continueBook(books, places)
  const count = (st: BookStatus) => books.filter((b) => b.status === st).length

  return (
    <div
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDrag(true) } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDrag(false) }}
      onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) void addPdfFiles([...e.dataTransfer.files]) }}
      className={cx('min-h-[60vh] rounded-3xl transition', drag && 'bg-accent-soft ring-2 ring-accent ring-offset-4 ring-offset-bg')}
    >
      <PageHeader
        title={t.m.nav.library}
        subtitle={books.length ? t.p(L.subtitleCount, books.length, { reading: t.n(count('reading')) }) : L.subtitleEmpty}
        right={
          <div className="flex gap-2">
            <Button onClick={() => editBook({})}><BookPlus size={16} /> {L.addBook}</Button>
            <Button variant="primary" onClick={addPdfs} disabled={busy}><FileUp size={16} /> {busy ? L.adding : L.addPdf}</Button>
          </div>
        }
      />

      {books.length === 0 ? (
        <EmptyState emoji="📚" title={L.emptyTitle}>{L.emptyBody}</EmptyState>
      ) : (
        <div className="space-y-6">
          {reading && !q && status === null && <ContinueCard book={reading} />}

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              <Chip on={status === null} onClick={() => setStatus(null)}>{L.all} <Count n={books.length} /></Chip>
              {BOOK_STATUSES.map((st) => (
                <Chip key={st} on={status === st} onClick={() => setStatus(status === st ? null : st)}>{L.status[st]} <Count n={count(st)} /></Chip>
              ))}
            </div>
            {books.length > 6 && (
              <div className="relative ms-auto min-w-48 flex-1 sm:max-w-xs">
                <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input placeholder={L.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} className="ps-9" />
              </div>
            )}
          </div>

          {shown.length === 0
            ? <EmptyState emoji="🔍" title={L.noResultsTitle}>{L.noResultsBody}</EmptyState>
            : (
              <section>
                {status === null && !q && <SectionTitle>{L.shelf}</SectionTitle>}
                <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6">
                  {shown.map((b) => <BookCard key={b.id} book={b} />)}
                </div>
              </section>
            )}
          <p className="flex items-center gap-2 text-xs text-muted"><LibraryIcon size={14} className="shrink-0" /> {L.privacyNote}</p>
        </div>
      )}
    </div>
  )
}

function Count({ n }: { n: number }) {
  const t = useI18n()
  return <span className="opacity-60 tabular">{t.n(n)}</span>
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cx('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition', on ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted hover:text-text')}
    >
      {children}
    </button>
  )
}
