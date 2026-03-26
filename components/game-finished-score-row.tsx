"use client"

import { useEffect, useState } from "react"

const DURATION_MS = 1600

type FinishedPlayerScoreRowProps = {
  rank: number
  name: string
  color: string
  finalScore: number
  isMe: boolean
  /** Scorul maxim pentru 100% pe bară (ex. WIN_SCORE sau leaderul). */
  maxForBar: number
}

/**
 * Rând clasament final: nume + puncte numărate animat + bară progres în culoarea jucătorului.
 */
export function FinishedPlayerScoreRow({
  rank,
  name,
  color,
  finalScore,
  isMe,
  maxForBar,
}: FinishedPlayerScoreRowProps) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    let cancelled = false
    const start = performance.now()
    const tick = (now: number) => {
      if (cancelled) return
      const t = Math.min(1, (now - start) / DURATION_MS)
      const eased = 1 - (1 - t) * (1 - t)
      setShown(Math.round(finalScore * eased))
      if (t < 1) requestAnimationFrame(tick)
      else setShown(finalScore)
    }
    requestAnimationFrame(tick)
    return () => {
      cancelled = true
    }
  }, [finalScore])

  const denom = Math.max(1, maxForBar)
  const pct = Math.min(100, (shown / denom) * 100)

  return (
    <div className="rounded-xl bg-muted/50 px-4 py-3 text-left">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="w-5 shrink-0 text-right text-sm font-bold text-muted-foreground">
            #{rank}
          </span>
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />
          <span className="truncate font-semibold">
            {name}
            {isMe ? " (You)" : ""}
          </span>
        </div>
        <span className="shrink-0 tabular-nums text-lg font-bold">{shown} pts</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-100 ease-linear"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            boxShadow: `0 0 12px ${color}55`,
          }}
        />
      </div>
    </div>
  )
}
