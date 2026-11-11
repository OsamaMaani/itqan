import { create } from 'zustand'
import { tx } from '../i18n/core'
import { bookWithFile, titleFromFileName } from './library'
import { openPdf, pdfFacts, renderCover } from './pdf'
import { hashBytes, loadCover, pdfHashes, removePdf, saveCover, savePdf } from './pdfStore'
import { useStore } from './store'
import { toast } from './toast'
import type { Book, ID } from './types'

/**
 * The PDFs on this device, and adding or removing them (ADR-046). Kept apart from the persisted
 * store: these are files in this device's IndexedDB, not synced data.
 */

interface Files {
  /** Hashes of the PDFs on this device; null until first read */
  here: Set<string> | null
  /** Cover image URLs by hash, made on demand */
  covers: Record<string, string | null>
  busy: number
}

export const useFiles = create<Files>(() => ({ here: null, covers: {}, busy: 0 }))

export async function refreshFiles(): Promise<void> {
  try {
    useFiles.setState({ here: await pdfHashes() })
  } catch {
    useFiles.setState({ here: new Set() })
  }
}

const asked = new Set<string>()

/** Loads a cover into `useFiles.covers` once per hash; a missing cover stays null. */
export function wantCover(hash: string): void {
  if (asked.has(hash)) return
  asked.add(hash)
  loadCover(hash)
    .then((b) => useFiles.setState((s) => ({ covers: { ...s.covers, [hash]: b ? URL.createObjectURL(b) : null } })))
    .catch(() => {})
}

function isPdf(f: File): boolean {
  return f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
}

/**
 * Adds PDFs to the library. A file already in the library (the same bytes, from any device) is
 * not added twice — it becomes readable here. With `attachTo`, the file is that book's PDF; a file
 * other than the one the book was added with asks first.
 */
export async function addPdfFiles(files: File[], attachTo?: Book): Promise<ID[]> {
  const t = tx()
  const L = t.m.library
  const ids: ID[] = []
  let added = 0
  useFiles.setState((s) => ({ busy: s.busy + 1 }))
  try {
    for (const f of files) {
      if (!isPdf(f)) { toast({ emoji: '📄', message: t.f(L.notPdf, { name: f.name }) }, 6000); continue }
      let bytes: ArrayBuffer
      let hash: string
      try {
        bytes = await f.arrayBuffer()
        hash = await hashBytes(bytes)
      } catch {
        toast({ emoji: '⚠️', message: t.f(L.unreadable, { name: f.name }) }, 6000)
        continue
      }
      const books = useStore.getState().books
      const owner = attachTo ?? bookWithFile(books, hash)
      if (attachTo && attachTo.file && attachTo.file.hash !== hash && !confirm(t.f(L.wrongFile, { name: f.name }))) continue

      let doc
      try {
        doc = await openPdf(bytes.slice(0))
      } catch {
        toast({ emoji: '⚠️', message: t.f(L.unreadable, { name: f.name }) }, 6000)
        continue
      }
      try {
        await savePdf(hash, f)
      } catch {
        await doc.loadingTask.destroy()
        toast({ emoji: '💾', message: t.f(L.storageFull, { name: f.name }) }, 8000)
        continue
      }
      const facts = await pdfFacts(doc)
      const cover = await renderCover(doc)
      await doc.loadingTask.destroy()
      if (cover) await saveCover(hash, cover).catch(() => {})
      asked.delete(hash)
      const file = { hash, name: f.name, size: f.size }

      if (owner) {
        if (attachTo) useStore.getState().updateBook(owner.id, { file, pages: facts.pages })
        toast({ emoji: '📖', message: t.f(L.attached, { title: owner.title }) })
        ids.push(owner.id)
      } else {
        ids.push(useStore.getState().addBook({ title: facts.title || titleFromFileName(f.name), author: facts.author, file, pages: facts.pages }))
        added++
      }
    }
  } finally {
    useFiles.setState((s) => ({ busy: s.busy - 1 }))
    await refreshFiles()
  }
  if (added) toast({ emoji: '📚', message: t.p(L.added, added) })
  return ids
}

/** Removes a book's PDF from this device only. The book, its place and bookmarks stay. */
export async function removePdfHere(hash: string): Promise<void> {
  await removePdf(hash)
  asked.delete(hash)
  useFiles.setState((s) => ({ covers: { ...s.covers, [hash]: null } }))
  await refreshFiles()
}

/** Opens the system file picker for PDFs. */
export function pickPdfs(onPicked: (files: File[]) => void, multiple = true): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/pdf,.pdf'
  input.multiple = multiple
  input.onchange = () => { if (input.files?.length) onPicked([...input.files]) }
  input.click()
}
