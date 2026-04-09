"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { RoundHistoryItem } from "@/lib/round-history"

type RoundHistoryCarouselProps = {
  items: RoundHistoryItem[]
  /** Optional header shown above the carousel. */
  header?: React.ReactNode
  /** Default color for found letters (practice: player color). */
  foundColor?: string
  /** Optional per-item color (multiplayer: winner color). */
  foundColorForItem?: (item: RoundHistoryItem) => string | undefined
}

function isComplete(progress: string | undefined, answer: string): boolean {
  if (!progress) return false
  if (progress.length !== answer.length) return false
  return !progress.includes("_")
}

export function RoundHistoryCarousel({
  items,
  header,
  foundColor = "hsl(var(--primary))",
  foundColorForItem,
}: RoundHistoryCarouselProps) {
  const guessedCount = useMemo(() => {
    return items.filter((it) => isComplete(it.myProgress, it.answerWord)).length
  }, [items])

  if (!items.length) return null

  return (
    <div className="space-y-2">
      {header ?? (
        <div className="text-left text-sm text-muted-foreground">
          Guessed <span className="font-semibold text-foreground">{guessedCount}</span>/{items.length}
        </div>
      )}

      <div className="w-full overflow-x-auto scrollbar-none">
        <div className="flex w-max gap-3 pr-1 snap-x snap-mandatory">
          {items.map((it) => (
            <Card
              key={it.round}
              className="w-[15.5rem] shrink-0 snap-start border border-border/60 bg-card/95 shadow-sm"
            >
              <CardContent className="p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-semibold text-muted-foreground tabular-nums">
                      Round {it.round}
                    </p>
                    <p className="mt-0.5 line-clamp-3 text-sm leading-snug">
                      {it.definition}
                    </p>
                  </div>
                  {it.imageUrl ? (
                    <div className="shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted/30">
                      <img
                        src={it.imageUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-12 w-12 object-cover"
                      />
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap justify-center gap-1.5">
                  {it.answerWord.split("").map((ansCh, idx) => {
                    const color = foundColorForItem?.(it) ?? foundColor
                    const p = it.myProgress ?? ""
                    const ch = p[idx] ?? "_"
                    const found = ch !== "_"
                    const missed = !found
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex h-9 w-9 select-none items-center justify-center rounded-lg border-2 text-base font-extrabold",
                          found
                            ? "shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
                            : missed
                              ? "border-muted-foreground/20 bg-muted/30 text-muted-foreground"
                              : "border-border"
                        )}
                        style={
                          found
                            ? {
                                borderColor: `${color}80`,
                                background: `${color}18`,
                                color,
                              }
                            : missed
                              ? undefined
                              : undefined
                        }
                        title={found ? "Found" : "Missed"}
                      >
                        {(found ? ch : ansCh).toUpperCase()}
                      </div>
                    )
                  })}
                </div>

                <div className="mt-2 text-left text-[11px] text-muted-foreground">
                  {isComplete(it.myProgress, it.answerWord) ? "Guessed" : "Not guessed"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

