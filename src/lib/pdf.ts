import type * as PdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import jbig2Wasm from 'pdfjs-dist/wasm/jbig2.wasm?url'
import openjpegWasm from 'pdfjs-dist/wasm/openjpeg.wasm?url'
import { renderBudget } from './pdfBudget'

/**
 * pdf.js, loaded on first use (ADR-046) so the rest of Itqan does not pay for it.
 *
 * Two things make it work from the laptop's file:// app as well as the hosted one:
 * - The worker is pdf.js's own worker file, inlined as text and started as a *classic* worker from
 *   a blob URL — a module worker from a blob is refused on file:// (checked 2026-11-11). The file is
 *   an ES module only by its last line (`export{WorkerMessageHandler}`) and two `import.meta.url`
 *   reads in its image decoders; both are rewritten.
 * - Decoder wasm (JBIG2 and JPEG 2000, the images of most scanned books) is bundled and handed to
 *   pdf.js by `Assets` instead of fetched by URL, which file:// cannot do.
 */

type Pdfjs = typeof PdfjsLib
let loading: Promise<Pdfjs> | null = null

export function pdfjs(): Promise<Pdfjs> {
  loading ??= (async () => {
    const [lib, raw] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?raw')])
    const code = raw.default
      .replace(/export\s*\{\s*WorkerMessageHandler\s*\}\s*;?\s*$/, '')
      .replaceAll('import.meta.url', 'self.location.href')
    const worker = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })))
    lib.GlobalWorkerOptions.workerPort = worker
    return lib
  })().catch((e) => { loading = null; throw e })
  return loading
}

const WASM: Record<string, string> = { 'jbig2.wasm': jbig2Wasm, 'openjpeg.wasm': openjpegWasm }

/** pdf.js's BinaryDataFactory, serving bundled files by name (no CMaps or standard fonts: system fonts stand in). */
class Assets {
  constructor(_: unknown) {}
  async fetch({ kind, filename }: { kind: string; filename: string }): Promise<Uint8Array> {
    const url = kind === 'wasmUrl' ? WASM[filename] : undefined
    if (!url) throw new Error(`Not bundled: ${filename}`)
    const r = await fetch(url)
    if (!r.ok) throw new Error(`${r.status} ${filename}`)
    return new Uint8Array(await r.arrayBuffer())
  }
}

/** What every document is opened with. */
const OPTIONS = () => ({
  BinaryDataFactory: Assets,
  useWorkerFetch: false,
  // Never read: Assets ignores it. pdf.js only asks for wasm when it has a base to ask under.
  wasmUrl: 'itqan-bundled/',
  enableXfa: false,
  // Scanned pages are big images; on iOS, tell pdf.js the real canvas limit instead of letting it
  // probe by allocation, so it scales oversized images down rather than drawing blank (ADR-048).
  canvasMaxAreaInBytes: renderBudget().canvasMaxAreaInBytes,
})

/** Opens a PDF from its bytes. The buffer is handed to the worker, so pass a copy you no longer need. */
export async function openPdf(bytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  const lib = await pdfjs()
  return lib.getDocument({ data: new Uint8Array(bytes), ...OPTIONS() }).promise
}

/**
 * Opens a stored PDF by reading only the parts pdf.js asks for (ADR-048) — the cross-reference table,
 * then each page's objects as it is drawn — instead of loading the whole file into memory. A 300 MB
 * scanned book opens as fast as a small one and costs the iPhone only the pages being read.
 */
export async function openPdfBlob(blob: Blob): Promise<PDFDocumentProxy> {
  const lib = await pdfjs()
  class BlobRange extends lib.PDFDataRangeTransport {
    requestDataRange(begin: number, end: number) {
      blob.slice(begin, end).arrayBuffer()
        .then((b) => this.onDataRange(begin, new Uint8Array(b)))
        .catch(() => this.abort())
    }
  }
  return lib.getDocument({
    range: new BlobRange(blob.size, null),
    rangeChunkSize: 512 * 1024,
    // Fetch only what drawing needs; nothing streams or pre-reads the rest of the file.
    disableAutoFetch: true,
    disableStream: true,
    ...OPTIONS(),
  }).promise
}

export interface PdfFacts {
  pages: number
  title: string
  author: string
}

/** Page count, and the title and author written into the file (often empty or junk — only a suggestion). */
export async function pdfFacts(doc: PDFDocumentProxy): Promise<PdfFacts> {
  let title = ''
  let author = ''
  try {
    const { info } = await doc.getMetadata() as { info: { Title?: unknown; Author?: unknown } }
    title = typeof info.Title === 'string' ? info.Title.trim() : ''
    author = typeof info.Author === 'string' ? info.Author.trim() : ''
  } catch { /* no metadata */ }
  // "Microsoft Word - draft3.docx" and the like are not titles.
  if (/^(microsoft|untitled|document|\s*$)|\.(docx?|pdf|tex|indd)$/i.test(title)) title = ''
  return { pages: doc.numPages, title, author }
}

/** The first page as a small JPEG, for the book's cover. */
export async function renderCover(doc: PDFDocumentProxy, width = 360): Promise<Blob | null> {
  try {
    const page = await doc.getPage(1)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: width / base.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    await page.render({ canvas, viewport }).promise
    page.cleanup()
    return await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.8))
  } catch {
    return null
  }
}
