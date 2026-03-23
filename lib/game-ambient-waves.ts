/**
 * Ambient playlist: `waves.mp3` → `waves2.mp3` → `waves3.mp3` → repeat, during active play.
 * Controlled separately from letter SFX via `isAmbientWavesEnabled()`.
 */
const AMBIENT_WAVES_STORAGE_KEY = "wordmatch_ambient_waves_enabled"

export function isAmbientWavesEnabled(): boolean {
  if (typeof window === "undefined") return true
  try {
    const v = localStorage.getItem(AMBIENT_WAVES_STORAGE_KEY)
    if (v === null) return true
    return v === "1" || v === "true"
  } catch {
    return true
  }
}

export function setAmbientWavesEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(AMBIENT_WAVES_STORAGE_KEY, enabled ? "1" : "0")
  } catch {
    /* ignore */
  }
}

const WAVE_TRACKS = ["/waves.mp3", "/waves2.mp3", "/waves3.mp3"] as const

const WAVES_TARGET_VOLUME = 0.32

let ambientDesired = false
let trackIndex = 0
let wavesAudio: HTMLAudioElement | null = null
let fadeTimer: number | null = null

function clearFadeTimer(): void {
  if (fadeTimer != null) {
    window.clearInterval(fadeTimer)
    fadeTimer = null
  }
}

function handleWavesEnded(): void {
  if (!ambientDesired || !isAmbientWavesEnabled()) return
  trackIndex = (trackIndex + 1) % WAVE_TRACKS.length
  const a = wavesAudio
  if (!a) return
  a.src = WAVE_TRACKS[trackIndex]
  a.volume = WAVES_TARGET_VOLUME
  void a.play().catch(() => {
    /* ignore */
  })
}

function getWavesAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null
  if (!wavesAudio) {
    wavesAudio = new Audio()
    wavesAudio.preload = "auto"
    wavesAudio.loop = false
    wavesAudio.addEventListener("ended", handleWavesEnded)
  }
  return wavesAudio
}

function rampVolume(
  a: HTMLAudioElement,
  from: number,
  to: number,
  ms: number,
  onDone?: () => void
): void {
  clearFadeTimer()
  const steps = Math.max(10, Math.floor(ms / 35))
  let i = 0
  a.volume = Math.min(1, Math.max(0, from))
  fadeTimer = window.setInterval(() => {
    i++
    const t = Math.min(1, i / steps)
    const v = from + (to - from) * t
    a.volume = Math.min(1, Math.max(0, v))
    if (i >= steps) {
      a.volume = Math.min(1, Math.max(0, to))
      clearFadeTimer()
      onDone?.()
    }
  }, 35)
}

/**
 * After a user gesture, retries playback if autoplay blocked the initial `play()` (browser policy).
 */
export function resumeAmbientWavesIfBlocked(): void {
  if (!ambientDesired || !isAmbientWavesEnabled()) return
  const a = getWavesAudio()
  if (!a || !a.paused) return
  if (!a.currentSrc) {
    a.src = WAVE_TRACKS[trackIndex]
  }
  clearFadeTimer()
  const from = a.volume
  void a
    .play()
    .then(() => {
      rampVolume(a, from, WAVES_TARGET_VOLUME, 1400)
    })
    .catch(() => {
      /* still blocked */
    })
}

/**
 * Call when entering an active round (practice playing / multiplayer playing / home).
 */
export function startGameAmbientWaves(): void {
  ambientDesired = true
  if (!isAmbientWavesEnabled()) return
  const a = getWavesAudio()
  if (!a) return

  clearFadeTimer()
  trackIndex = 0
  a.src = WAVE_TRACKS[0]
  a.volume = 0
  void a
    .play()
    .then(() => {
      rampVolume(a, 0, WAVES_TARGET_VOLUME, 1400)
    })
    .catch(() => {
      /* autoplay blocked — resumeAmbientWavesIfBlocked runs on next user gesture */
    })
}

/**
 * @param leavePlaying — true when round ended / left game (clears “desired” so unmute won’t play in lobby)
 */
export function stopGameAmbientWaves(leavePlaying = false, fadeMs = 900): void {
  if (leavePlaying) ambientDesired = false
  const a = wavesAudio
  if (!a) return

  clearFadeTimer()
  const from = a.volume
  if (from <= 0.001 && a.paused) return

  rampVolume(a, from, 0, fadeMs, () => {
    try {
      a.pause()
    } catch {
      /* ignore */
    }
  })
}

/** Call after toggling ambient waves in UI. */
export function applyAmbientWavesPreference(): void {
  if (!isAmbientWavesEnabled()) {
    clearFadeTimer()
    const a = wavesAudio
    if (a) {
      a.pause()
      a.volume = 0
    }
    return
  }
  if (!ambientDesired) return
  const a = getWavesAudio()
  if (!a) return
  clearFadeTimer()
  if (a.paused) {
    if (!a.currentSrc) {
      a.src = WAVE_TRACKS[trackIndex]
    }
    void a.play().catch(() => {})
    rampVolume(a, a.volume, WAVES_TARGET_VOLUME, 800)
  } else {
    rampVolume(a, a.volume, WAVES_TARGET_VOLUME, 500)
  }
}
