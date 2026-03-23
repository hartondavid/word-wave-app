/**
 * Letter feedback via Web Audio API (no assets).
 * Scheduling runs only after the context is running (resume completes) so audio is audible
 * across Chrome, Safari, and mobile autoplay policies.
 */
import { resumeAmbientWavesIfBlocked } from "@/lib/game-ambient-waves"

const LETTER_SOUND_STORAGE_KEY = "wordmatch_letter_sound_enabled"

export function isLetterSoundEnabled(): boolean {
  if (typeof window === "undefined") return true
  try {
    const v = localStorage.getItem(LETTER_SOUND_STORAGE_KEY)
    if (v === null) return true
    return v === "1" || v === "true"
  } catch {
    return true
  }
}

export function setLetterSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(LETTER_SOUND_STORAGE_KEY, enabled ? "1" : "0")
  } catch {
    /* ignore */
  }
}

let sharedCtx: AudioContext | null = null

/** Shared context for SFX + ambient (single graph, one user unlock). */
export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!sharedCtx) sharedCtx = new AC()
  return sharedCtx
}

/**
 * Call on any user gesture (click/tap/key). Unlocks Web Audio and retries wave ambience if autoplay was blocked.
 */
export function primeLetterSoundOnUserGesture(): void {
  const ctx = getSharedAudioContext()
  if (ctx) void ctx.resume().catch(() => {})
  resumeAmbientWavesIfBlocked()
}

/**
 * Browsers start AudioContext as "suspended" until a user gesture; scheduling sounds
 * before resume() finishes often produces silence. We schedule after running.
 */
function runWhenAudioReady(ctx: AudioContext, schedule: (t0: number) => void): void {
  const fire = () => {
    try {
      schedule(ctx.currentTime)
    } catch {
      /* ignore */
    }
  }
  if (ctx.state === "running") {
    fire()
    return
  }
  void ctx
    .resume()
    .then(() => {
      fire()
    })
    .catch(() => {
      fire()
    })
}

/** Bright “sparkle” (triangle, rising fifth) for a correct letter. */
export function playCorrectLetterSound(): void {
  if (!isLetterSoundEnabled()) return
  const ctx = getSharedAudioContext()
  if (!ctx) return

  runWhenAudioReady(ctx, (t0) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = "triangle"
    osc.frequency.setValueAtTime(784, t0)
    osc.frequency.exponentialRampToValueAtTime(1180, t0 + 0.045)

    gain.gain.setValueAtTime(0, t0)
    gain.gain.linearRampToValueAtTime(0.14, t0 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.09)

    osc.start(t0)
    osc.stop(t0 + 0.095)
  })
}

/** Short low “thunk” (triangle, quick drop) for a wrong letter. */
export function playWrongLetterSound(): void {
  if (!isLetterSoundEnabled()) return
  const ctx = getSharedAudioContext()
  if (!ctx) return

  runWhenAudioReady(ctx, (t0) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = "triangle"
    osc.frequency.setValueAtTime(220, t0)
    osc.frequency.exponentialRampToValueAtTime(90, t0 + 0.09)

    gain.gain.setValueAtTime(0, t0)
    gain.gain.linearRampToValueAtTime(0.32, t0 + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.11)

    osc.start(t0)
    osc.stop(t0 + 0.12)
  })
}

function scheduleBlip(
  ctx: AudioContext,
  tStart: number,
  freq: number,
  duration: number,
  peakGain: number,
  wave: OscillatorType
): void {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.connect(g)
  g.connect(ctx.destination)
  osc.type = wave
  osc.frequency.setValueAtTime(freq, tStart)
  g.gain.setValueAtTime(0, tStart)
  g.gain.linearRampToValueAtTime(peakGain, tStart + 0.022)
  g.gain.exponentialRampToValueAtTime(0.0008, tStart + duration)
  osc.start(tStart)
  osc.stop(tStart + duration + 0.03)
}

/**
 * Ascending pentatonic “win” line (triangle) + bright sine tail when the word is completed (~1.4s).
 */
export function playWordCompleteSound(): void {
  if (!isLetterSoundEnabled()) return
  const ctx = getSharedAudioContext()
  if (!ctx) return

  runWhenAudioReady(ctx, (t0) => {
    const step = 0.17
    // G5 → A5 → C6 → D6 → E6 → G6 (major pentatonic)
    const pent: [number, number, number][] = [
      [783.99, 0.28, 0.075],
      [880, 0.28, 0.075],
      [1046.5, 0.28, 0.078],
      [1174.66, 0.3, 0.078],
      [1318.51, 0.32, 0.08],
    ]
    let t = t0
    for (const [freq, dur, peak] of pent) {
      scheduleBlip(ctx, t, freq, dur, peak, "triangle")
      t += step
    }
    scheduleBlip(ctx, t, 1567.98, 0.42, 0.085, "triangle")
    scheduleBlip(ctx, t + 0.12, 2093, 0.55, 0.055, "sine")
  })
}

/**
 * Descending line when the word was not completed in time / round lost (timeout, wrong speech, etc.).
 */
export function playWordIncompleteFailureSound(): void {
  if (!isLetterSoundEnabled()) return
  const ctx = getSharedAudioContext()
  if (!ctx) return

  runWhenAudioReady(ctx, (t0) => {
    const step = 0.16
    // A4 → G4 → E4 → D4 (somber fall)
    const fall: [number, number, number][] = [
      [440, 0.26, 0.08],
      [392, 0.26, 0.076],
      [329.63, 0.28, 0.072],
      [293.66, 0.36, 0.068],
    ]
    let t = t0
    for (const [freq, dur, peak] of fall) {
      scheduleBlip(ctx, t, freq, dur, peak, "triangle")
      t += step
    }
  })
}

/**
 * Another player won the round while local progress still has blanks (distinct from timeout sting).
 */
export function playOpponentWonRoundSound(): void {
  if (!isLetterSoundEnabled()) return
  const ctx = getSharedAudioContext()
  if (!ctx) return

  runWhenAudioReady(ctx, (t0) => {
    scheduleBlip(ctx, t0, 493.88, 0.15, 0.078, "triangle")
    scheduleBlip(ctx, t0 + 0.1, 392, 0.22, 0.073, "triangle")
    scheduleBlip(ctx, t0 + 0.22, 293.66, 0.26, 0.068, "triangle")
  })
}
