"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Keyboard, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type LetterHistoryProps = {
  letters: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Mesaj când lista e goală (panou deschis) */
  emptyHint?: string
  /** Refocus la inputul ascuns după toggle/închidere — păstrează tastatura pe mobil */
  restoreTypingFocus?: () => void
  /** Clase pe containerul panoului (ex. în bară cu butoanele). */
  className?: string
}

type ToggleProps = Pick<
  LetterHistoryProps,
  "letters" | "open" | "onOpenChange" | "restoreTypingFocus"
> & {
  /** În rând cu panoul + microfon în card; altfel colț stânga-jos absolut. */
  embedded?: boolean
}

/**
 * Implicit: colț stânga-jos absolut pe card. Cu `embedded`, în același rând cu panoul și microfonul.
 */
export function LetterHistoryToggleButton({
  letters,
  open,
  onOpenChange,
  restoreTypingFocus,
  embedded = false,
}: ToggleProps) {
  const last = letters.length > 0 ? letters[letters.length - 1] : null

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-sm"
      className={cn(
        "z-20 size-6 min-h-6 min-w-6 rounded-full p-0 shadow-md border border-border/80 transition-[box-shadow] duration-150",
        embedded ? "relative shrink-0" : "absolute bottom-1 left-1",
        open && "ring-1 ring-primary/30"
      )}
      aria-expanded={open}
      aria-label={last ? `Wrong letters, last: ${last.toUpperCase()}` : "Wrong letters"}
      title="History keys"
      onPointerDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.stopPropagation()
        onOpenChange(!open)
        queueMicrotask(() => restoreTypingFocus?.())
      }}
    >
      <Keyboard className="h-3.5 w-3.5 shrink-0 text-red-500" />
    </Button>
  )
}

/**
 * Panou în flux — sub card sau în bară (footer) în card, cu `className`.
 */
export function LetterHistoryPanel({
  letters,
  open,
  onOpenChange,
  emptyHint = "No wrong letters yet",
  restoreTypingFocus,
  className,
}: LetterHistoryProps) {
  const [index, setIndex] = useState(0)
  const prevLen = useRef(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const indexRef = useRef(0)
  const [scrollEdges, setScrollEdges] = useState({ atLeft: true, atRight: true })

  const safeIndex = letters.length ? Math.min(index, letters.length - 1) : 0
  indexRef.current = safeIndex

  const measureScrollEdges = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const atLeft = el.scrollLeft <= 2
    const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
    setScrollEdges((prev) => (prev.atLeft === atLeft && prev.atRight === atRight ? prev : { atLeft, atRight }))
  }, [])

  const scrollStep = () => {
    const el = scrollRef.current
    return Math.max(36, Math.floor((el?.clientWidth ?? 120) * 0.45))
  }

  const scrollStripLeft = () => {
    scrollRef.current?.scrollBy({ left: -scrollStep(), behavior: "smooth" })
  }
  const scrollStripRight = () => {
    scrollRef.current?.scrollBy({ left: scrollStep(), behavior: "smooth" })
  }

  useEffect(() => {
    if (letters.length === 0) {
      setIndex(0)
      prevLen.current = 0
      return
    }
    if (letters.length > prevLen.current) {
      setIndex(letters.length - 1)
    } else if (letters.length < prevLen.current) {
      setIndex(Math.max(0, letters.length - 1))
    }
    prevLen.current = letters.length
  }, [letters])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false)
        e.preventDefault()
        return
      }
      if (letters.length === 0) return
      const i = indexRef.current
      const el = scrollRef.current
      if (e.key === "ArrowLeft") {
        if (i > 0) setIndex((x) => Math.max(0, x - 1))
        else if (el && el.scrollLeft > 2) scrollStripLeft()
        e.preventDefault()
      } else if (e.key === "ArrowRight") {
        if (i < letters.length - 1) setIndex((x) => Math.min(letters.length - 1, x + 1))
        else if (el && el.scrollLeft + el.clientWidth < el.scrollWidth - 2) scrollStripRight()
        e.preventDefault()
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [open, letters.length, onOpenChange, restoreTypingFocus])

  useEffect(() => {
    if (!open || letters.length === 0) return
    queueMicrotask(measureScrollEdges)
  }, [open, letters.length, measureScrollEdges])

  useEffect(() => {
    if (!open || letters.length === 0) return
    const el = itemRefs.current[safeIndex]
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" })
    queueMicrotask(measureScrollEdges)
  }, [safeIndex, open, letters.length, measureScrollEdges])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Wrong letters"
      tabIndex={-1}
      className={cn(
        "relative z-10 mx-auto flex w-full max-w-[11.5rem] sm:max-w-[13rem] max-h-[3.75rem] sm:max-h-[4rem] flex-col rounded-lg border border-border bg-muted/30 px-0.5 py-px shadow-sm outline-none backdrop-blur-sm dark:bg-muted/20",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {letters.length === 0 ? (
        <div className="flex items-center justify-end gap-1.5 px-1.5 py-1">
          <p className="min-w-0 flex-1 text-center text-[11px] leading-tight text-muted-foreground">
            {emptyHint}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-4 w-4 shrink-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
            aria-label="Close wrong letters"
            onPointerDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation()
              onOpenChange(false)
              queueMicrotask(() => restoreTypingFocus?.())
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-stretch gap-0.5 px-0.5 py-px">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-5 w-5 shrink-0 self-center border-red-200/80 p-0"
            disabled={safeIndex <= 0 && scrollEdges.atLeft}
            aria-label="Previous letter or scroll strip"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              if (safeIndex > 0) setIndex((i) => Math.max(0, i - 1))
              else scrollStripLeft()
              queueMicrotask(() => restoreTypingFocus?.())
            }}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <div
            ref={scrollRef}
            onScroll={measureScrollEdges}
            className="min-h-0 min-w-0 flex-1 touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain py-px [-webkit-overflow-scrolling:touch] scrollbar-none"
            aria-label="All wrong letters — swipe horizontally"
          >
            <div className="flex w-max min-w-full flex-nowrap items-center justify-center gap-px">
              {letters.map((ch, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    itemRefs.current[i] = el
                  }}
                  className={cn(
                    "flex h-4 min-w-[1rem] shrink-0 select-none items-center justify-center rounded border px-px text-[9px] font-black leading-none sm:min-w-[1.125rem] sm:text-[10px]",
                    i === safeIndex
                      ? "border-red-500 bg-red-500/15 text-red-600 ring-1 ring-red-500/50"
                      : "border-red-300/60 bg-red-500/5 text-red-500"
                  )}
                  aria-current={i === safeIndex ? "true" : undefined}
                >
                  {ch.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-4 w-4 shrink-0 self-center text-muted-foreground hover:bg-transparent hover:text-foreground"
            aria-label="Close wrong letters"
            onPointerDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation()
              onOpenChange(false)
              queueMicrotask(() => restoreTypingFocus?.())
            }}
          >
            <X className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-5 w-5 shrink-0 self-center border-red-200/80 p-0"
            disabled={safeIndex >= letters.length - 1 && scrollEdges.atRight}
            aria-label="Next letter or scroll strip"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              if (safeIndex < letters.length - 1) setIndex((i) => Math.min(letters.length - 1, i + 1))
              else scrollStripRight()
              queueMicrotask(() => restoreTypingFocus?.())
            }}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
