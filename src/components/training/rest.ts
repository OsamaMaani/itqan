import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * The rest timer between sets (ADR-027). Device-local — its own localStorage key, outside `Data`,
 * never synced or migrated: a rest is a minute or two on the device in your hand.
 */
interface Rest {
  /** epoch ms when the rest ends; null = not resting */
  endsAt: number | null
  totalMs: number
  start: (seconds: number) => void
  add: (seconds: number) => void
  stop: () => void
}

export const useRest = create<Rest>()(
  persist(
    (set, get) => ({
      endsAt: null,
      totalMs: 0,
      start: (seconds) => set(seconds > 0 ? { endsAt: Date.now() + seconds * 1000, totalMs: seconds * 1000 } : { endsAt: null, totalMs: 0 }),
      add: (seconds) => {
        const { endsAt, totalMs } = get()
        if (!endsAt) return
        const next = Math.max(Date.now(), endsAt + seconds * 1000)
        set({ endsAt: next, totalMs: Math.max(1000, totalMs + seconds * 1000) })
      },
      stop: () => set({ endsAt: null, totalMs: 0 }),
    }),
    { name: 'itqan-rest', storage: createJSONStorage(() => localStorage), partialize: (s) => ({ endsAt: s.endsAt, totalMs: s.totalMs }) },
  ),
)
