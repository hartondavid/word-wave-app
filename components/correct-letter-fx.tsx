"use client"

import { useCallback, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const DUST = [
  { dx: 22, dy: 0 },
  { dx: 16, dy: 16 },
  { dx: 0, dy: 22 },
  { dx: -16, dy: 16 },
  { dx: -22, dy: 0 },
  { dx: -16, dy: -16 },
  { dx: 0, dy: -22 },
  { dx: 16, dy: -16 },
  { dx: 20, dy: -10 },
  { dx: -20, dy: 10 },
]

export function CorrectLetterDust({ color }: { color: string }) {
  return (
    <span
      className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center"
      aria-hidden
    >
      {DUST.map((p, i) => (
        <span
          key={i}
          className="word-correct-dust-bit absolute left-1/2 top-1/2 rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 5px ${color}`,
            ["--dust-dx" as string]: `${p.dx}px`,
            ["--dust-dy" as string]: `${p.dy}px`,
            animationDelay: `${i * 22}ms`,
          }}
        />
      ))}
    </span>
  )
}

export function useCorrectLetterFx(durationMs = 650) {
  const [cellBursts, setCellBursts] = useState<Map<number, number>>(() => new Map())
  const idRef = useRef(0)
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const reset = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t))
    timersRef.current.clear()
    setCellBursts(new Map())
  }, [])

  const triggerAt = useCallback(
    (index: number) => {
      const prevT = timersRef.current.get(index)
      if (prevT) clearTimeout(prevT)
      const id = ++idRef.current
      setCellBursts((prev) => {
        const n = new Map(prev)
        n.set(index, id)
        return n
      })
      const t = setTimeout(() => {
        setCellBursts((prev) => {
          const n = new Map(prev)
          if (n.get(index) === id) n.delete(index)
          return n
        })
        timersRef.current.delete(index)
      }, durationMs)
      timersRef.current.set(index, t)
    },
    [durationMs]
  )

  return { cellBursts, triggerAt, reset }
}

export function CorrectLetterChar({
  ch,
  color,
  cellIndex,
  burstId,
  className,
}: {
  ch: string
  color: string
  cellIndex: number
  /** Id unic per burst; mai multe celule pot avea efect simultan (reveal eșalonat). */
  burstId: number | undefined
  className?: string
}) {
  const show = burstId != null && burstId > 0
  return (
    <span className="relative z-[3] flex h-full w-full items-center justify-center overflow-visible">
      {show ? <CorrectLetterDust color={color} /> : null}
      <span
        key={show ? `pop-${burstId}` : `lit-${cellIndex}`}
        className={cn(
          "relative z-[4] font-black",
          show && "animate-word-correct-pop",
          className
        )}
        style={{ color }}
      >
        {ch.toUpperCase()}
      </span>
    </span>
  )
}
