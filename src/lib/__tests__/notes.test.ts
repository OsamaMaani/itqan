import { describe, expect, it } from 'vitest'
import { checklistProgress, itemDone, itemsToText, noteLabels, parseLabels, textToItems, visibleNotes } from '../notes'
import { useStore } from '../store'
import { fromEntities, toEntities } from '../sync/entities'
import { emptyData } from '../seed'
import type { Note, Task } from '../types'

const note = (n: Partial<Note> & { id: string }): Note => ({
  title: '', body: '', items: [], color: null, labels: [], pinned: false, archived: false,
  areaId: null, projectId: null, goalId: null, taskIds: [], createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z', ...n,
})

describe('which notes show, and in what order', () => {
  const notes = [
    note({ id: 'old', title: 'Old', updatedAt: '2026-10-01T10:00:00Z' }),
    note({ id: 'new', title: 'New', updatedAt: '2026-10-20T10:00:00Z' }),
    note({ id: 'pin', title: 'Pinned but old', pinned: true, updatedAt: '2026-09-01T10:00:00Z' }),
    note({ id: 'arch', title: 'Archived', archived: true, updatedAt: '2026-10-25T10:00:00Z' }),
  ]
  it('pinned first, then the most recently changed; archived ones only in the archive', () => {
    expect(visibleNotes(notes).map((n) => n.id)).toEqual(['pin', 'new', 'old'])
    expect(visibleNotes(notes, { archived: true }).map((n) => n.id)).toEqual(['arch'])
  })
  it('search looks in the title, text, checklist and labels — every word, any case, any accents', () => {
    const ns = [
      note({ id: 'a', title: 'Café list', body: 'Beans from the market' }),
      note({ id: 'b', items: [{ id: 'x', text: 'Buy beans', done: false, taskId: null }] }),
      note({ id: 'c', labels: ['Recettes'], body: 'Soupe' }),
    ]
    expect(visibleNotes(ns, { query: 'cafe' }).map((n) => n.id)).toEqual(['a'])
    expect(visibleNotes(ns, { query: 'BEANS' }).map((n) => n.id).sort()).toEqual(['a', 'b'])
    expect(visibleNotes(ns, { query: 'beans market' }).map((n) => n.id)).toEqual(['a'])
    expect(visibleNotes(ns, { query: 'recettes soupe' }).map((n) => n.id)).toEqual(['c'])
    expect(visibleNotes(ns, { query: '   ' })).toHaveLength(3)
  })
  it('a label filter matches whatever the spelling case', () => {
    const ns = [note({ id: 'a', labels: ['Work'] }), note({ id: 'b', labels: ['work', 'books'] }), note({ id: 'c' })]
    expect(visibleNotes(ns, { label: 'WORK' }).map((n) => n.id).sort()).toEqual(['a', 'b'])
  })
})

describe('labels', () => {
  it('are counted once per note, first spelling kept, most used first', () => {
    const ns = [note({ id: 'a', labels: ['Work', 'work'] }), note({ id: 'b', labels: ['work', 'books'] }), note({ id: 'c', labels: ['art'] })]
    expect(noteLabels(ns)).toEqual([{ label: 'Work', count: 2 }, { label: 'art', count: 1 }, { label: 'books', count: 1 }])
  })
  it('are parsed from commas, spaces, Arabic and Chinese commas, without # or duplicates', () => {
    expect(parseLabels(' work, #Books  books ,,recipes ')).toEqual(['work', 'Books', 'recipes'])
    expect(parseLabels('عمل، كتب')).toEqual(['عمل', 'كتب'])
    expect(parseLabels('工作，读书')).toEqual(['工作', '读书'])
    expect(parseLabels('')).toEqual([])
  })
})

describe('checklists', () => {
  const tasks = new Map<string, Task>([['t-done', { id: 't-done', done: true } as Task], ['t-open', { id: 't-open', done: false } as Task]])
  it('a line is done when ticked, or when the task made from it is done; empty lines never count', () => {
    const n = note({
      id: 'n',
      items: [
        { id: '1', text: 'Ticked', done: true, taskId: null },
        { id: '2', text: 'Its task is done', done: false, taskId: 't-done' },
        { id: '3', text: 'Its task is open', done: false, taskId: 't-open' },
        { id: '4', text: 'Its task was deleted', done: false, taskId: 'gone' },
        { id: '5', text: '   ', done: true, taskId: null },
      ],
    })
    expect(n.items.map((i) => itemDone(i, tasks))).toEqual([true, true, false, false, true])
    expect(checklistProgress(n, tasks)).toEqual({ done: 2, total: 4 })
  })
  it('text and checklist convert into each other without losing a line', () => {
    let i = 0
    const items = textToItems('- milk\n\n* eggs\n[ ] bread\n• tea\n  dates  ', () => `i${i++}`)
    expect(items.map((x) => x.text)).toEqual(['milk', 'eggs', 'bread', 'tea', 'dates'])
    expect(items.every((x) => !x.done && x.taskId === null)).toBe(true)
    expect(itemsToText([...items, { id: 'z', text: ' ', done: false, taskId: null }])).toBe('milk\neggs\nbread\ntea\ndates')
  })
})

describe('note actions in the store', () => {
  const get = (id: string) => useStore.getState().notes.find((n) => n.id === id)!
  it('creates with defaults, updates with a new time, ticks a line, deletes and restores exactly', () => {
    const s = useStore.getState()
    const id = s.addNote({ title: 'Trip', items: [{ id: 'a', text: 'Passport', done: false, taskId: null }] })
    expect(get(id)).toMatchObject({ title: 'Trip', body: '', color: null, labels: [], pinned: false, archived: false, taskIds: [] })
    s.toggleNoteItem(id, 'a')
    expect(get(id).items[0].done).toBe(true)
    s.updateNote(id, { pinned: true })
    expect(get(id).pinned).toBe(true)
    const saved = s.deleteNote(id)!
    expect(useStore.getState().notes.some((n) => n.id === id)).toBe(false)
    s.restoreNote(saved)
    expect(get(id)).toEqual(saved)
  })
  it('a note or one of its lines becomes a linked task that keeps the note’s area, project and goal', () => {
    const s = useStore.getState()
    const id = s.addNote({ title: 'Launch', body: 'Plan the launch', areaId: 'ar', projectId: 'pr', goalId: 'go', items: [{ id: 'l', text: 'Write the post', done: false, taskId: null }] })
    const whole = s.noteToTask(id, 'Plan launch', null)
    const line = s.noteToTask(id, 'Write the post', '2026-10-27', 'l')
    const tasks = useStore.getState().tasks
    expect(tasks.find((x) => x.id === whole)).toMatchObject({ title: 'Plan launch', date: null, areaId: 'ar', projectId: 'pr', goalId: 'go', notes: 'Plan the launch' })
    expect(tasks.find((x) => x.id === line)).toMatchObject({ title: 'Write the post', date: '2026-10-27', projectId: 'pr', notes: 'From note: Launch' })
    expect(get(id).taskIds).toEqual([whole])
    expect(get(id).items[0].taskId).toBe(line)
  })
  it('deleting an area, goal or project unlinks its notes and deletes none', () => {
    const s = useStore.getState()
    const area = s.addArea({ name: 'A', emoji: '', color: 'sky' })
    const goal = s.addGoal({ title: 'G', why: '', areaId: null, kind: 'numeric', startValue: 0, target: 1, unit: '', startDate: '2026-10-01', deadline: null, milestones: [] })
    const project = s.addProject({ title: 'P' })
    const id = s.addNote({ title: 'Linked', areaId: area, goalId: goal, projectId: project })
    s.deleteArea(area); s.deleteGoal(goal); s.deleteProject(project)
    expect(get(id)).toMatchObject({ title: 'Linked', areaId: null, goalId: null, projectId: null })
  })
})

describe('notes sync', () => {
  it('each note is its own entity and comes back exactly', () => {
    const d = { ...emptyData(), notes: [note({ id: 'a', title: 'One' }), note({ id: 'b', title: 'Two', items: [{ id: 'x', text: 'y', done: true, taskId: null }] })] }
    const e = toEntities(d)
    expect(e['notes:a']).toEqual(d.notes[0])
    expect(e['notes:b']).toEqual(d.notes[1])
    expect(fromEntities(e, emptyData()).notes).toEqual(d.notes)
  })
})
