"use client"

import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Roșu pentru inelul animat (peste bordura inițială). */
export const WRONG_DELAY_RING_COLOR = "#ef4444"

/** Mască = contur dreptunghi rotunjit (ca caseta), nu cerc — se întinde pe toată caseta. */
const DELAY_RING_MASK = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="2.5" y="2.5" width="95" height="95" rx="20" ry="20" fill="none" stroke="white" stroke-width="3"/></svg>'
)}")`

export type LetterCellDelayBorderProps = {
  active: boolean
  ringColor: string
  boxClassName: string
  innerClassName: string
  innerStyle?: CSSProperties
  children: ReactNode
}

/**
 * Conturul normal rămâne pe stratul interior; în timpul lockout, inelul roșu animat
 * este desenat deasupra (z-index mai mare), mascat la margine.
 */
export function LetterCellDelayBorder({
  active,
  ringColor,
  boxClassName,
  innerClassName,
  innerStyle,
  children,
}: LetterCellDelayBorderProps) {
  return (
    <div className={cn("relative shrink-0 rounded-xl", active && "overflow-hidden", boxClassName)}>
      <div
        className={cn(
          "relative z-[1] flex h-full w-full min-h-0 items-center justify-center overflow-hidden select-none rounded-xl",
          innerClassName
        )}
        style={innerStyle}
      >
        {children}
      </div>
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-xl"
          style={{
            WebkitMaskImage: DELAY_RING_MASK,
            WebkitMaskSize: "100% 100%",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskImage: DELAY_RING_MASK,
            maskSize: "100% 100%",
            maskRepeat: "no-repeat",
            maskPosition: "center",
          }}
        >
          <span
            className="letter-delay-border-spin absolute left-1/2 top-1/2 h-[260%] w-[260%] min-h-0 min-w-0 -translate-x-1/2 -translate-y-1/2"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg 292deg, ${ringColor} 305deg, #fca5a5 320deg, ${ringColor} 335deg, transparent 360deg)`,
            }}
          />
        </span>
      )}
    </div>
  )
}
