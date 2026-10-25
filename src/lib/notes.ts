import type { ID, Note, NoteItem, Task } from './types'

/**
 * Notes (ADR-035): what the Notes screen and the project / goal sections show. Pure, no store.
 */

export interface NoteFilter {
  /** Words that must all appear in the title, text, checklist or labels (any case, any accents). */
  query?: string
  /** Only notes with this label */
  label?: string | null
  /** The archive instead of the live notes */
  archived?: boolean
}

/** Lower case without accents, so "Café" matches "cafe" and "É" matches "e". */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function haystack(n: Note): string {
  return fold([n.title, n.body, ...n.items.map((i) => i.text), ...n.labels].join('\n'))
}

/** The notes to show: matching the filter, pinned first, then the most recently changed. */
export function visibleNotes(notes: Note[], f: NoteFilter = {}): Note[] {
  const terms = fold(f.query ?? '').split(/\s+/).filter(Boolean)
  const label = f.label ? fold(f.label) : null
  return notes
    .filter((n) => n.archived === !!f.archived)
    .filter((n) => !label || n.labels.some((l) => fold(l) === label))
    .filter((n) => { if (!terms.length) return true; const h = haystack(n); return terms.every((t) => h.includes(t)) })
    .sort((a, b) => (a.pinned === b.pinned ? b.updatedAt.localeCompare(a.updatedAt) : a.pinned ? -1 : 1))
}

/** The notes pinned to Today: not archived, in the order they were written, so ticking a line never reorders them. */
export function todayNotes(notes: Note[]): Note[] {
  return notes.filter((n) => n.onToday && !n.archived).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Every label on these notes, each once (first spelling wins), with how many notes carry it, most used first. */
export function noteLabels(notes: Note[]): { label: string; count: number }[] {
  const by = new Map<string, { label: string; count: number }>()
  for (const n of notes) {
    for (const l of new Set(n.labels.map(fold))) {
      const hit = by.get(l)
      if (hit) hit.count++
      else by.set(l, { label: n.labels.find((x) => fold(x) === l)!, count: 1 })
    }
  }
  return [...by.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

/** "work, #Ideas  books" → ["work", "Ideas", "books"]: trimmed, no "#", no duplicates (any case). */
export function parseLabels(input: string): string[] {
  const out: string[] = []
  for (const raw of input.split(/[,،，\s]+/)) {
    const l = raw.replace(/^#+/, '').trim()
    if (l && !out.some((x) => fold(x) === fold(l))) out.push(l)
  }
  return out
}

/** A checklist line counts as done when it is ticked, or when the task made from it is done. */
export function itemDone(item: NoteItem, tasks: Map<ID, Task>): boolean {
  return item.done || (item.taskId ? tasks.get(item.taskId)?.done === true : false)
}

/** Done and total lines of a note's checklist. */
export function checklistProgress(note: Note, tasks: Map<ID, Task>): { done: number; total: number } {
  const total = note.items.filter((i) => i.text.trim()).length
  const done = note.items.filter((i) => i.text.trim() && itemDone(i, tasks)).length
  return { done, total }
}

/** Text lines become checklist lines (one per non-empty line, bullets removed); the inverse of `itemsToText`. */
export function textToItems(text: string, id: () => ID): NoteItem[] {
  return text
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*•]|\[[ xX]?\])\s*/, '').trim())
    .filter(Boolean)
    .map((t) => ({ id: id(), text: t, done: false, taskId: null }))
}

/** Checklist lines back to plain text, one per line, ticked lines included. */
export function itemsToText(items: NoteItem[]): string {
  return items.map((i) => i.text.trim()).filter(Boolean).join('\n')
}
