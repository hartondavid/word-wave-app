"use client"

import { useEffect } from "react"
import { startGameAmbientWaves, stopGameAmbientWaves } from "@/lib/game-ambient-waves"

/**
 * Ensures ambient background sounds (waves) are requested on every page.
 * Actual playback depends on browser gesture policy and user preference toggle.
 */
export function AmbientWavesBackground() {
  useEffect(() => {
    startGameAmbientWaves()
    // We don't stop on unmount here because this component lives in the RootLayout
    // and stays mounted during navigation.
  }, [])

  return null
}
