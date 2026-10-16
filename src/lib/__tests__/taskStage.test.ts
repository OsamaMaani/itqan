import { describe, expect, it } from 'vitest'
import { useStore } from '../store'

const task = (id: string) => useStore.getState().tasks.find((t) => t.id === id)!

describe('moving tasks between board columns', () => {
  it('to Done completes it (once), back out of Done reopens it in that column', () => {
    const id = useStore.getState().addTask({ title: 'Card', date: null })
    const s = useStore.getState()
    expect(task(id)).toMatchObject({ stage: 'todo', done: false, doneAt: null })

    expect(s.setTaskStage(id, 'doing')).toBe(false)
    expect(task(id)).toMatchObject({ stage: 'doing', done: false })

    expect(s.setTaskStage(id, 'done')).toBe(true) // became done → celebrate
    const doneAt = task(id).doneAt
    expect(task(id).done).toBe(true)
    expect(doneAt).not.toBeNull()
    expect(s.setTaskStage(id, 'done')).toBe(false) // already done: no second celebration, same time
    expect(task(id).doneAt).toBe(doneAt)

    s.setTaskStage(id, 'todo')
    expect(task(id)).toMatchObject({ stage: 'todo', done: false, doneAt: null })
  })
  it('completing a blocked task clears the block', () => {
    const id = useStore.getState().addTask({ title: 'Stuck', date: null })
    useStore.getState().toggleTaskBlocked(id)
    expect(task(id).blocked).toBe(true)
    useStore.getState().setTaskStage(id, 'done')
    expect(task(id).blocked).toBe(false)
  })
})
