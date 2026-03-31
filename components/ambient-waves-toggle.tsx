"use client"

import { useCallback, useEffect, useState } from "react"
import { Waves, Slash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { primeLetterSoundOnUserGesture } from "@/lib/play-correct-letter-sound"
import {
  applyAmbientWavesPreference,
  isAmbientWavesEnabled,
  setAmbientWavesEnabled,
} from "@/lib/game-ambient-waves"

export function AmbientWavesToggle({ className }: { className?: string }) {
  const [on, setOn] = useState(true)

  useEffect(() => {
    setOn(isAmbientWavesEnabled())
  }, [])

  const toggle = useCallback(() => {
    primeLetterSoundOnUserGesture()
    const next = !on
    setAmbientWavesEnabled(next)
    setOn(next)
    applyAmbientWavesPreference()
  }, [on])

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-sm"
      className={cn("shrink-0 rounded-full", className)}
      aria-pressed={on}
      title={on ? "Mute wave ambience" : "Unmute wave ambience"}
      aria-label={on ? "Mute wave ambience" : "Unmute wave ambience"}
      onClick={toggle}
    >
      {on ? (
        <Waves className="h-4 w-4" aria-hidden />
      ) : (
        <span className="relative inline-flex h-4 w-4 items-center justify-center">
          <Waves className="h-4 w-4 opacity-35" aria-hidden />
          <Slash className="absolute h-4 w-4 text-destructive" strokeWidth={2.5} aria-hidden />
        </span>
      )}
    </Button>
  )
}
