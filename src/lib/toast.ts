import { create } from 'zustand'

export interface Toast {
  id: number
  message: string
  emoji?: string
  action?: { label: string; run: () => void }
}

interface ToastStore {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>, ms?: number) => void
  dismiss: (id: number) => void
}

let seq = 0

export const useToasts = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (t, ms = 4000) => {
    const id = ++seq
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }))
    setTimeout(() => get().dismiss(id), ms)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = (t: Omit<Toast, 'id'>, ms?: number) => useToasts.getState().push(t, ms)
