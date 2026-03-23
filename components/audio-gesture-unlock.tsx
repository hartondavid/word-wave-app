"use client"

import { useEffect } from "react"
import { primeLetterSoundOnUserGesture } from "@/lib/play-correct-letter-sound"

/**
 * Browsers block audio until a user gesture. Listens for the first pointer/key event so
 * wave ambience (and letter SFX context) can start without requiring the waves toggle.
 */
export function AudioGestureUnlock() {
  useEffect(() => {
    const unlock = () => {
      primeLetterSoundOnUserGesture()
    }
    const opts = { capture: true, passive: true } as const
    window.addEventListener("pointerdown", unlock, opts)
    window.addEventListener("keydown", unlock, opts)
    return () => {
      window.removeEventListener("pointerdown", unlock, opts)
      window.removeEventListener("keydown", unlock, opts)
    }
  }, [])

  return null
}
