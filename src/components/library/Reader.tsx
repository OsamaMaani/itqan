import { ArrowLeft, Bookmark as BookmarkIcon, BookmarkCheck, List, Minus, Moon, Plus, Sun, Trash2 } from 'lucide-react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n/react'
import { dayOf } from '../../lib/date'
import { uid } from '../../lib/id'
import { activeMs, atEnd, pagesRead, placeOf } from '../../lib/library'
import { addPdfFiles, pickPdfs } from '../../lib/libraryFiles'
import { openPdf } from '../../lib/pdf'
import { loadPdf } from '../../lib/pdfStore'
import { navigate } from '../../lib/router'
import { useStore } from '../../lib/store'
import { toast } from '../../lib/toast'
import type { Book } from '../../lib/types'
import { Button, cx, IconButton, Input, Modal } from '../ui'

/**
 * The PDF reader (ADR-046): every page in one scroll, drawn only near the screen. It opens where
 * the book was left — on any device — and keeps that place, a reading session (active minutes and
 * pages stayed on) and the book's status as you read.
 */

const GAP = 8
const SAVE_EVERY_MS = 30_000
/** Pixels drawn per page at most (iOS caps canvas memory) */
const MAX_PIXELS = 5_000_000

/** A page asked for from outside the reader — a bookmark tapped in the book's details. */
let pendingPage: number | null = null
export function openReader(bookId: string, page?: number) {
  pendingPage = page ?? null
  navigate('library', bookId)
}

function readPref(key: string, fallback: number): number {
  try { const v = Number(localStorage.getItem(key)); return Number.isFinite(v) && v > 0 ? v : fallback } catch { return fallback }
}
function writePref(key: string, v: number) {
  try { localStorage.setItem(key, String(v)) } catch { /* private mode */ }
}

export function Reader({ book }: { book: Book }) {
  const t = useI18n()
  const L = t.m.library.reader
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [state, setState] = useState<'loading' | 'missing' | 'error' | 'ready'>('loading')
  const hash = book.file?.hash

  useEffect(() => {
    if (!hash) { setState('missing'); return }
    let alive = true
    let opened: PDFDocumentProxy | null = null
    setState('loading')
    loadPdf(hash)
      .then((bytes) => {
        if (!bytes) { if (alive) setState('missing'); return null }
        return openPdf(bytes)
      })
      .then((d) => {
        if (!d) return
        opened = d
        if (alive) { setDoc(d); setState('ready') } else void d.loadingTask.destroy()
      })
      .catch(() => alive && setState('error'))
    return () => { alive = false; void opened?.loadingTask.destroy() }
  }, [hash])

  // The page behind the reader stays still.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const close = () => navigate('library')

  return createPortal(
    <div className="fixed inset-0 z-40 flex flex-col bg-bg">
      {state === 'ready' && doc
        ? <Pages doc={doc} book={book} onClose={close} />
        : (
          <>
            <div className="flex items-center gap-2 border-b border-border bg-surface px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
              <IconButton label={L.back} onClick={close}><ArrowLeft size={18} className="rtl:-scale-x-100" /></IconButton>
              <div className="min-w-0 truncate font-semibold">{book.title}</div>
            </div>
            <div className="grid flex-1 place-items-center p-6 text-center">
              {state === 'loading' && <div className="animate-pulse text-muted">{L.loading}</div>}
              {state === 'error' && <div className="max-w-sm text-muted">{L.error}</div>}
              {state === 'missing' && (
                <div className="max-w-sm space-y-3">
                  <div className="text-4xl">📄</div>
                  <div className="font-semibold">{t.m.library.noFileHere}</div>
                  <div className="text-sm text-muted">{t.f(t.m.library.noFileHereHint, { page: t.n(Math.max(1, placeOf(book.id, useStore.getState().bookPlaces))) })}</div>
                  <Button variant="primary" onClick={() => pickPdfs((f) => void addPdfFiles(f, book), false)}>{t.m.library.pickFile}</Button>
                </div>
              )}
            </div>
          </>
        )}
    </div>,
    document.body,
  )
}

function Pages({ doc, book, onClose }: { doc: PDFDocumentProxy; book: Book; onClose: () => void }) {
  const t = useI18n()
  const L = t.m.library.reader
  const n = doc.numPages
  const scroller = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [viewH, setViewH] = useState(0)
  const [zoom, setZoom] = useState(() => readPref('itqan-reader-zoom', 1))
  const [night, setNight] = useState(() => readPref('itqan-reader-night', 0) === 1)
  /** width / height of each page; page 1's until a page is measured */
  const [ratios, setRatios] = useState<number[]>([])
  const [page, setPage] = useState(1)
  const [range, setRange] = useState<[number, number]>([1, 1])
  const [goTo, setGoTo] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const bookmarks = useStore((s) => s.bookmarks)
  const mine = useMemo(() => bookmarks.filter((b) => b.bookId === book.id).sort((a, b) => a.page - b.page), [bookmarks, book.id])
  const marked = mine.find((b) => b.page === page)
  // The sitting: active time, and how long each page was on screen (ADR-046).
  const session = useRef({ id: uid(), startedAt: new Date().toISOString(), from: 0, active: 0 })
  const dwell = useRef(new Map<number, number>())
  const touched = useRef(Date.now())
  const current = useRef(page)
  current.current = page

  // Page shapes: page 1 first (most books are one size), each other page as it is drawn.
  useEffect(() => {
    let alive = true
    doc.getPage(1).then((p) => {
      const v = p.getViewport({ scale: 1 })
      if (alive) setRatios(Array(n).fill(v.width / v.height))
    }).catch(() => {})
    return () => { alive = false }
  }, [doc, n])
  const measured = useCallback((i: number, r: number) => {
    setRatios((rs) => (Math.abs((rs[i] ?? r) - r) < 0.001 ? rs : rs.map((x, j) => (j === i ? r : x))))
  }, [])

  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const measure = () => { setWidth(el.clientWidth); setViewH(el.clientHeight) }
    // Measured now as well: ResizeObserver only reports at the next frame, which a background tab never draws.
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pageW = Math.max(120, Math.round(Math.min(width - 16, 960) * zoom))
  const heights = useMemo(() => ratios.map((r) => Math.round(pageW / r)), [ratios, pageW])
  const tops = useMemo(() => {
    const out: number[] = []
    let y = GAP
    for (const h of heights) { out.push(y); y += h + GAP }
    out.push(y)
    return out
  }, [heights])

  const pageAt = useCallback((y: number): number => {
    let lo = 0
    let hi = heights.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (tops[mid] <= y) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }, [tops, heights.length])

  // Opening: the page asked for, else where the book was left (on any device).
  const opened = useRef(false)
  /** The page at the top of the screen and how far into it, kept across re-layouts */
  const anchor = useRef<{ page: number; frac: number } | null>(null)
  const lastTops = useRef(tops)
  useLayoutEffect(() => {
    if (opened.current || !heights.length || !width) return
    opened.current = true
    const start = Math.min(n, Math.max(1, pendingPage ?? placeOf(book.id, useStore.getState().bookPlaces) ?? 1))
    pendingPage = null
    scroller.current!.scrollTop = tops[start - 1] - GAP
    anchor.current = { page: start, frac: 0 }
    lastTops.current = tops
    setPage(start)
    current.current = start
    session.current.from = start
    if (useStore.getState().books.find((b) => b.id === book.id)?.status === 'want') useStore.getState().setBookStatus(book.id, 'reading')
  }, [heights.length, width, tops, n, book.id])

  // Keep the page in view when the zoom or the window changes.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el || !opened.current || lastTops.current === tops) return
    const a = anchor.current
    if (a) el.scrollTop = tops[a.page - 1] + a.frac * (heights[a.page - 1] ?? 0) - GAP
    lastTops.current = tops
  }, [tops, heights])

  const onScroll = useCallback(() => {
    const el = scroller.current
    if (!el || !heights.length || !opened.current) return
    const y = el.scrollTop
    const p = pageAt(y + el.clientHeight * 0.35)
    setPage(p)
    const top = pageAt(y)
    anchor.current = { page: top, frac: Math.max(0, (y + GAP - tops[top - 1]) / (heights[top - 1] || 1)) }
    setRange([Math.max(1, pageAt(y - el.clientHeight)), Math.min(n, pageAt(y + 2 * el.clientHeight))])
    touched.current = Date.now()
  }, [heights, pageAt, tops, n])
  useEffect(() => { onScroll() }, [onScroll, viewH])

  // --- the reading session ------------------------------------------------------------------

  const save = useCallback(() => {
    const s = session.current
    if (!s.from) return
    useStore.getState().saveReadingSession({
      id: s.id, bookId: book.id, date: dayOf(s.startedAt), startedAt: s.startedAt,
      minutes: Math.round(s.active / 60_000), fromPage: s.from, toPage: current.current, pages: pagesRead(dwell.current),
    })
  }, [book.id])

  useEffect(() => {
    let last = Date.now()
    let sinceSave = 0
    const tick = setInterval(() => {
      const now = Date.now()
      const add = activeMs(last, now, touched.current, document.visibilityState === 'visible')
      last = now
      if (add > 0) {
        session.current.active += add
        dwell.current.set(current.current, (dwell.current.get(current.current) ?? 0) + add)
      }
      sinceSave += add
      if (sinceSave >= SAVE_EVERY_MS) { sinceSave = 0; save() }
    }, 1000)
    const hidden = () => { if (document.visibilityState === 'hidden') save() }
    const input = () => { touched.current = Date.now() }
    document.addEventListener('visibilitychange', hidden)
    window.addEventListener('pagehide', save)
    window.addEventListener('keydown', input)
    window.addEventListener('pointerdown', input)
    window.addEventListener('wheel', input, { passive: true })
    return () => {
      clearInterval(tick)
      document.removeEventListener('visibilitychange', hidden)
      window.removeEventListener('pagehide', save)
      window.removeEventListener('keydown', input)
      window.removeEventListener('pointerdown', input)
      window.removeEventListener('wheel', input)
      save()
    }
  }, [save])

  // The place follows the page, a moment after it settles.
  useEffect(() => {
    if (!opened.current) return
    const id = setTimeout(() => useStore.getState().setBookPlace(book.id, page), 800)
    return () => clearTimeout(id)
  }, [page, book.id])

  // The end of the book: offer to mark it finished, once per sitting.
  const offered = useRef(false)
  useEffect(() => {
    if (offered.current || !atEnd(page, n)) return
    const b = useStore.getState().books.find((x) => x.id === book.id)
    if (!b || b.status === 'finished') return
    offered.current = true
    toast({
      emoji: '🎉',
      message: t.f(t.m.library.reachedEnd, { title: b.title }),
      action: { label: t.m.library.markFinishedAction, run: () => useStore.getState().setBookStatus(book.id, 'finished') },
    }, 10000)
  }, [page, n, book.id, t])

  const jump = useCallback((p: number) => {
    const el = scroller.current
    const target = Math.min(n, Math.max(1, Math.round(p)))
    if (el && tops.length) el.scrollTop = tops[target - 1] - GAP
  }, [tops, n])

  // Keys: ←/→ and Page Up/Down a page at a time, Escape closes, B bookmarks.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return
      const el = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return
      const fwd = t.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
      const back = t.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
      if (e.key === 'Escape') onClose()
      else if (e.key === fwd || e.key === 'PageDown') { e.preventDefault(); jump(current.current + 1) }
      else if (e.key === back || e.key === 'PageUp') { e.preventDefault(); jump(current.current - 1) }
      else if (e.key.toLowerCase() === 'b' && !e.ctrlKey && !e.metaKey) toggleMark()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  const toggleMark = () => {
    const s = useStore.getState()
    const have = s.bookmarks.find((b) => b.bookId === book.id && b.page === current.current)
    if (have) s.deleteBookmark(have.id)
    else { s.addBookmark(book.id, current.current); toast({ emoji: '🔖', message: t.f(L.marked, { page: t.n(current.current) }) }) }
  }

  const setZ = (z: number) => {
    const v = Math.min(3, Math.max(0.5, Math.round(z * 100) / 100))
    setZoom(v)
    writePref('itqan-reader-zoom', v)
  }
  const toggleNight = () => { setNight(!night); writePref('itqan-reader-night', night ? 0 : 1) }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-surface px-2 pb-1.5 pt-[max(0.375rem,env(safe-area-inset-top))]">
        <IconButton label={L.back} onClick={onClose}><ArrowLeft size={18} className="rtl:-scale-x-100" /></IconButton>
        <div className="hidden min-w-0 flex-1 truncate px-1 text-sm font-semibold md:block">{book.title}</div>
        <div className="flex-1 md:hidden" />
        <button
          onClick={() => setGoTo(true)}
          className="h-9 rounded-lg px-2.5 text-sm font-semibold tabular hover:bg-surface-2"
          aria-label={L.pageInput}
        >
          <bdi>{t.f(L.pageOfShort, { page: t.n(page), pages: t.n(n) })}</bdi>
        </button>
        <IconButton label={marked ? L.bookmarkRemove : L.bookmarkAdd} onClick={toggleMark}>
          {marked ? <BookmarkCheck size={18} className="text-accent" /> : <BookmarkIcon size={18} />}
        </IconButton>
        <IconButton label={L.bookmarks} onClick={() => setListOpen(true)}><List size={18} /></IconButton>
        <IconButton label={night ? L.day : L.night} onClick={toggleNight}>{night ? <Sun size={18} /> : <Moon size={18} />}</IconButton>
        <div className="hidden items-center sm:flex">
          <IconButton label={L.zoomOut} onClick={() => setZ(zoom - 0.15)}><Minus size={16} /></IconButton>
          <button onClick={() => setZ(1)} className="h-9 w-12 rounded-lg text-xs font-semibold tabular text-muted hover:bg-surface-2" aria-label={L.fitWidth} title={L.fitWidth}>
            {t.pct(zoom)}
          </button>
          <IconButton label={L.zoomIn} onClick={() => setZ(zoom + 0.15)}><Plus size={16} /></IconButton>
        </div>
      </div>

      <div
        ref={scroller}
        onScroll={onScroll}
        dir="ltr"
        className={cx('min-h-0 flex-1 overflow-auto overscroll-contain', night ? 'bg-[#111]' : 'bg-surface-2')}
        style={{ overflowAnchor: 'none' }}
      >
        <div className="relative mx-auto" style={{ width: pageW, height: tops[tops.length - 1] ?? 0 }}>
          {heights.map((h, i) => (
            <div key={i} className={cx('absolute start-0 overflow-hidden shadow-sm', night ? 'bg-[#222]' : 'bg-white')} style={{ top: tops[i], width: pageW, height: h }}>
              {i + 1 >= range[0] && i + 1 <= range[1]
                ? <PageCanvas doc={doc} index={i} width={pageW} height={h} night={night} onRatio={measured} />
                : <div className="grid size-full place-items-center text-sm text-neutral-400 tabular">{i + 1}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 border-t border-border bg-surface px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <input
          type="range" min={1} max={n} value={page} dir={t.dir}
          onChange={(e) => jump(Number(e.target.value))}
          aria-label={L.pageInput}
          className="h-6 min-w-0 flex-1 accent-[var(--accent)]"
        />
      </div>

      <GoTo open={goTo} onClose={() => setGoTo(false)} page={page} pages={n} onGo={jump} />
      <Modal open={listOpen} onClose={() => setListOpen(false)} title={L.bookmarks}>
        {mine.length === 0
          ? <p className="py-4 text-sm text-muted">{t.m.library.noBookmarks}</p>
          : <ul className="divide-y divide-border">
              {mine.map((b) => (
                <li key={b.id} className="flex items-center gap-2 py-2">
                  <button className="min-w-0 flex-1 text-start" onClick={() => { setListOpen(false); jump(b.page) }}>
                    <div className="text-sm font-semibold">{t.f(L.pageOnly, { page: t.n(b.page) })}</div>
                    {b.note && <div className="truncate text-xs text-muted">{b.note}</div>}
                  </button>
                  <BookmarkNote id={b.id} note={b.note} />
                  <IconButton label={t.m.common.delete} onClick={() => useStore.getState().deleteBookmark(b.id)}><Trash2 size={15} /></IconButton>
                </li>
              ))}
            </ul>}
      </Modal>
    </>
  )
}

/** One page, drawn while it is near the screen and released when it leaves. */
function PageCanvas({ doc, index, width, height, night, onRatio }: {
  doc: PDFDocumentProxy; index: number; width: number; height: number; night: boolean; onRatio: (i: number, r: number) => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let task: RenderTask | null = null
    let alive = true
    // Drawn after the scroll settles a little, so flicking past pages draws nothing.
    const id = setTimeout(() => {
      doc.getPage(index + 1).then((p) => {
        if (!alive || !ref.current) return
        const base = p.getViewport({ scale: 1 })
        onRatio(index, base.width / base.height)
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        let scale = (width / base.width) * dpr
        const px = base.width * base.height * scale * scale
        if (px > MAX_PIXELS) scale *= Math.sqrt(MAX_PIXELS / px)
        const viewport = p.getViewport({ scale })
        const c = ref.current
        c.width = Math.floor(viewport.width)
        c.height = Math.floor(viewport.height)
        task = p.render({ canvas: c, viewport })
        task.promise.catch(() => {})
      }).catch(() => {})
    }, 60)
    return () => {
      alive = false
      clearTimeout(id)
      task?.cancel()
      const c = ref.current
      if (c) { c.width = 0; c.height = 0 }
    }
  }, [doc, index, width, onRatio])
  return (
    <canvas
      ref={ref}
      className="block"
      style={{ width, height, filter: night ? 'invert(0.92) hue-rotate(180deg)' : undefined }}
    />
  )
}

function GoTo({ open, onClose, page, pages, onGo }: { open: boolean; onClose: () => void; page: number; pages: number; onGo: (p: number) => void }) {
  const t = useI18n()
  const L = t.m.library.reader
  const [v, setV] = useState('')
  useEffect(() => { if (open) setV(String(page)) }, [open, page])
  const go = () => { const p = Number(v); if (p >= 1) { onGo(p); onClose() } }
  return (
    <Modal open={open} onClose={onClose} title={L.pageInput}
      footer={<><Button variant="ghost" onClick={onClose}>{t.m.common.cancel}</Button><Button variant="primary" onClick={go}>{L.go}</Button></>}>
      <div className="flex items-center gap-3">
        <Input autoFocus type="number" inputMode="numeric" min={1} max={pages} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} className="w-32" />
        <span className="text-sm text-muted">{t.f(L.ofPages, { pages: t.n(pages) })}</span>
      </div>
    </Modal>
  )
}

function BookmarkNote({ id, note }: { id: string; note: string }) {
  const t = useI18n()
  const L = t.m.library.reader
  return (
    <Button size="sm" variant="ghost" onClick={() => {
      const next = prompt(L.notePrompt, note)
      if (next !== null) useStore.getState().updateBookmark(id, next.trim())
    }}>
      {note ? L.editNote : L.addNote}
    </Button>
  )
}
