"use client"

import { useCallback, useEffect, useState } from "react"
import { Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  isLetterSoundEnabled,
  primeLetterSoundOnUserGesture,
  setLetterSoundEnabled,
} from "@/lib/play-correct-letter-sound"

export function LetterSoundToggle({ className }: { className?: string }) {
  const [on, setOn] = useState(true)

  useEffect(() => {
    setOn(isLetterSoundEnabled())
  }, [])

  const toggle = useCallback(() => {
    primeLetterSoundOnUserGesture()
    const next = !on
    setLetterSoundEnabled(next)
    setOn(next)
  }, [on])

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-sm"
      className={cn("shrink-0 rounded-full", className)}
      aria-pressed={on}
      title={on ? "Mute letter sounds" : "Unmute letter sounds"}
      aria-label={on ? "Mute letter sounds" : "Unmute letter sounds"}
      onClick={toggle}
    >
      {on ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </Button>
  )
}
