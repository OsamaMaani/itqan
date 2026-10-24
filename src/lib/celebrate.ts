import confetti from 'canvas-confetti'
import { useStore } from './store'

let ctx: AudioContext | null = null

function tone(freq: number, start: number, dur: number, gain = 0.06) {
  if (!useStore.getState().settings.sound) return
  try {
    ctx ??= new AudioContext()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = freq
    const t = ctx.currentTime + start
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(gain, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(ctx.destination)
    o.start(t)
    o.stop(t + dur + 0.05)
  } catch {
    /* audio is a nicety; never let it throw */
  }
}

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const celebrate = {
  /** A small, satisfying tick for a completed task or habit. */
  tick() {
    tone(880, 0, 0.12)
    tone(1320, 0.06, 0.16, 0.04)
  },
  /** Every task and habit for today done. */
  allDone() {
    tone(660, 0, 0.2); tone(880, 0.1, 0.2); tone(1320, 0.2, 0.35)
    if (reduced()) return
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 }, colors: ['#34d399', '#2dd4bf', '#fbbf24', '#a78bfa'] })
  },
  levelUp() {
    tone(523, 0, 0.25); tone(659, 0.12, 0.25); tone(784, 0.24, 0.25); tone(1047, 0.36, 0.5)
    if (reduced()) return
    const end = Date.now() + 900
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors: ['#fbbf24', '#34d399'] })
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors: ['#fbbf24', '#34d399'] })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  },
  goal() {
    tone(392, 0, 0.3); tone(523, 0.15, 0.3); tone(784, 0.3, 0.6)
    if (reduced()) return
    confetti({ particleCount: 200, spread: 120, startVelocity: 45, origin: { y: 0.6 } })
  },
  /** A streak saver earned: a short, cool chime. */
  saver() {
    tone(988, 0, 0.18, 0.05); tone(1480, 0.09, 0.3, 0.04)
  },
  timerDone() {
    tone(784, 0, 0.3, 0.1); tone(988, 0.35, 0.3, 0.1); tone(1175, 0.7, 0.5, 0.1)
  },
}
