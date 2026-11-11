import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'
import { renderBudget, type RenderBudget } from '../../lib/pdfBudget'

/**
 * Draws a PDF's pages for the reader (ADR-048), the way pdf.js's own viewer does on phones:
 *
 * - **One page at a time, nearest first.** The page on screen, then the next ones, then the one
 *   before — never every nearby page at once, which on an iPhone left the visible page waiting
 *   behind the others (and kept them all half-drawn while scrolling).
 * - **A small buffer of drawn pages.** Pages scrolled back to reappear at once; beyond the budget the
 *   farthest are released (canvas zeroed), so canvas memory stays bounded.
 * - **Decoded images are freed after drawing** (`page.cleanup()`), and the whole document's caches
 *   when idle (`doc.cleanup()`). Scanned books hold a ~35 MB image per page; keeping them was what
 *   filled an iPhone's memory until pages came out white.
 * - **A new size is drawn off-screen and swapped in**, so zooming never flashes white.
 * - **Failures are visible**: a page that fails is retried smaller, then shows Retry; if the PDF
 *   engine itself is gone (iOS may stop it in the background), `onFatal` lets the reader reopen it.
 *
 * No React here: pages attach a container element and subscribe to their state.
 */

export type PageState = 'idle' | 'rendering' | 'done' | 'error'

interface Drawn { canvas: HTMLCanvasElement; width: number; pixels: number }

const CLEANUP_AFTER_MS = 10_000

export class PageRenderer {
  private budget: RenderBudget
  private width = 0
  private current = 1
  private first = 1
  private last = 1
  private states = new Map<number, PageState>()
  private drawn = new Map<number, Drawn>()
  private hosts = new Map<number, HTMLElement>()
  private failures = new Map<number, number>()
  private running = new Map<number, { task: RenderTask | null; page: number; cancelled: boolean }>()
  private listeners = new Set<() => void>()
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private cleaning: Promise<void> | null = null
  private engineErrors = 0
  private dead = false

  constructor(
    private doc: PDFDocumentProxy,
    private onRatio: (index: number, ratio: number) => void,
    private onFatal: () => void,
    budget: RenderBudget = renderBudget(),
  ) {
    this.budget = budget
  }

  // --- what React reads ----------------------------------------------------------------------
  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l) } }
  stateOf = (page: number): PageState => this.states.get(page) ?? 'idle'
  private set(page: number, s: PageState) {
    if (this.states.get(page) === s) return
    this.states.set(page, s)
    for (const l of this.listeners) l()
  }

  // --- what the reader tells it ----------------------------------------------------------------
  setWidth(cssWidth: number) {
    if (cssWidth === this.width) return
    this.width = cssWidth
    this.pump()
  }

  /** The page under the reading line and the pages mounted around it. */
  setView(current: number, first: number, last: number) {
    this.current = current
    this.first = first
    this.last = last
    // A page being drawn that has left the view is not worth finishing.
    for (const [p, r] of this.running) if (p < first || p > last) { r.cancelled = true; r.task?.cancel() }
    this.pump()
  }

  attach(page: number, host: HTMLElement) {
    this.hosts.set(page, host)
    const d = this.drawn.get(page)
    if (d) { host.replaceChildren(d.canvas); this.set(page, 'done') }
    this.pump()
  }

  detach(page: number) {
    this.hosts.delete(page)
  }

  retry(page: number) {
    this.failures.delete(page)
    this.set(page, 'idle')
    this.pump()
  }

  destroy() {
    this.dead = true
    if (this.idleTimer) clearTimeout(this.idleTimer)
    for (const r of this.running.values()) { r.cancelled = true; r.task?.cancel() }
    for (const d of this.drawn.values()) release(d.canvas)
    this.drawn.clear()
    this.listeners.clear()
  }

  // --- the queue -------------------------------------------------------------------------------

  /** Pages to draw, in order: the current one, the next two, the one before, then the rest in view. */
  private wanted(): number[] {
    const out: number[] = []
    const add = (p: number) => { if (p >= this.first && p <= this.last && !out.includes(p)) out.push(p) }
    add(this.current)
    add(this.current + 1)
    add(this.current - 1)
    add(this.current + 2)
    for (let d = 2; d <= this.last - this.first; d++) { add(this.current + d); add(this.current - d) }
    return out
  }

  private needsDrawing(page: number): boolean {
    if (!this.hosts.has(page) || this.running.has(page)) return false
    if ((this.failures.get(page) ?? 0) >= 2) return false
    const d = this.drawn.get(page)
    return !d || d.width !== this.width
  }

  private pump() {
    if (this.dead || !this.width || this.cleaning) return
    this.scheduleIdleCleanup()
    while (this.running.size < this.budget.concurrency) {
      const next = this.wanted().find((p) => this.needsDrawing(p))
      if (next === undefined) return
      void this.draw(next)
    }
  }

  private async draw(pageNo: number) {
    const run = { task: null as RenderTask | null, page: pageNo, cancelled: false }
    this.running.set(pageNo, run)
    if (!this.drawn.has(pageNo)) this.set(pageNo, 'rendering')
    const width = this.width
    let page: PDFPageProxy | null = null
    try {
      page = await this.doc.getPage(pageNo)
      this.engineErrors = 0
      if (run.cancelled || this.dead) return
      const base = page.getViewport({ scale: 1 })
      this.onRatio(pageNo - 1, base.width / base.height)
      const retrying = (this.failures.get(pageNo) ?? 0) > 0
      const scale = drawScale(base.width, base.height, width, this.budget, retrying)
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.floor(viewport.width))
      canvas.height = Math.max(1, Math.floor(viewport.height))
      canvas.style.cssText = 'display:block;width:100%;height:100%'
      run.task = page.render({ canvas, viewport })
      await run.task.promise
      if (run.cancelled || this.dead) { release(canvas); return }
      const old = this.drawn.get(pageNo)
      this.drawn.set(pageNo, { canvas, width, pixels: canvas.width * canvas.height })
      this.hosts.get(pageNo)?.replaceChildren(canvas)
      if (old) release(old.canvas)
      this.failures.delete(pageNo)
      this.set(pageNo, 'done')
      this.evict()
    } catch (e) {
      if (run.cancelled || this.dead || isCancel(e)) return
      if (!page) {
        // getPage failed: the PDF engine may be gone (a stopped worker). Twice in a row → reopen.
        if (++this.engineErrors >= 2) { this.dead = true; this.onFatal(); return }
      }
      this.failures.set(pageNo, (this.failures.get(pageNo) ?? 0) + 1)
      if ((this.failures.get(pageNo) ?? 0) >= 2) this.set(pageNo, 'error')
    } finally {
      // Decoded images are only needed while drawing; the canvas keeps the pixels.
      try { page?.cleanup() } catch { /* still in use */ }
      if (this.running.get(pageNo) === run) this.running.delete(pageNo)
      if (!this.dead) this.pump()
    }
  }

  /** Keeps at most `budget.buffer` drawn pages and `budget.bufferPixels`, releasing the farthest. */
  private evict() {
    const keep = [...this.drawn.keys()].sort((a, b) => Math.abs(a - this.current) - Math.abs(b - this.current))
    let pixels = 0
    keep.forEach((p, i) => {
      const d = this.drawn.get(p)!
      pixels += d.pixels
      const visible = p >= this.first && p <= this.last && this.hosts.has(p)
      if (!visible && (i >= this.budget.buffer || pixels > this.budget.bufferPixels)) {
        release(d.canvas)
        this.drawn.delete(p)
        this.set(p, 'idle')
      }
    })
  }

  /** After a quiet spell, frees the document's caches in the PDF engine too — never mid-drawing. */
  private scheduleIdleCleanup() {
    if (this.idleTimer) clearTimeout(this.idleTimer)
    this.idleTimer = setTimeout(() => {
      if (this.running.size || this.dead) return
      this.cleaning = this.doc.cleanup().catch(() => {}).then(() => { this.cleaning = null; this.pump() })
    }, CLEANUP_AFTER_MS)
  }
}

/**
 * The scale a page is drawn at: as wide as it is shown, times the screen's pixel ratio (capped), and
 * never over the device's pixel budget — on a retry, a quarter of it.
 */
export function drawScale(pageW: number, pageH: number, cssWidth: number, b: RenderBudget, retrying = false): number {
  const dpr = Math.min(b.devicePixelRatio, b.dprCap)
  let scale = (cssWidth / pageW) * dpr
  const max = retrying ? b.maxCanvasPixels / 4 : b.maxCanvasPixels
  const px = pageW * scale * pageH * scale
  if (px > max) scale *= Math.sqrt(max / px)
  return scale
}

function release(c: HTMLCanvasElement) {
  // Zeroing the size frees the bitmap now; iOS otherwise counts it against its canvas limit until GC.
  c.width = 0
  c.height = 0
  c.remove()
}

function isCancel(e: unknown): boolean {
  return !!e && typeof e === 'object' && (e as { name?: string }).name === 'RenderingCancelledException'
}
