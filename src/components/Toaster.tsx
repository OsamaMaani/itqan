import { AnimatePresence, motion } from 'motion/react'
import { useToasts } from '../lib/toast'

export function Toaster() {
  const { toasts, dismiss } = useToasts()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-text px-4 py-3 text-sm font-semibold text-bg shadow-2xl"
          >
            {t.emoji && <span className="text-lg">{t.emoji}</span>}
            <span>{t.message}</span>
            {t.action && (
              <button onClick={() => { t.action!.run(); dismiss(t.id) }} className="ms-2 rounded-lg bg-bg/15 px-2.5 py-1 text-xs font-bold hover:bg-bg/25">
                {t.action.label}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
