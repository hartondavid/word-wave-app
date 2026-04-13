"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { RoundHistoryItem } from "@/lib/round-history"
import type { PlayerSlot } from "@/lib/game-types"
import { PLAYER_COLORS } from "@/lib/game-types"

/** Same hue as `text-red-500` / round-end timeout reveal in game UI. */
const UNGUESSED_LETTER_COLOR = "#EF4444"

type RoundHistoryCarouselProps = {
  items: RoundHistoryItem[]
  /** Optional header shown above the carousel. */
  header?: React.ReactNode
  /** Default color for found letters (practice: player color). */
  foundColor?: string
  /** Optional per-item color when `slotProgressBySlot` is missing (legacy). */
  foundColorForItem?: (item: RoundHistoryItem) => string | undefined
}

function isComplete(progress: string | undefined, answer: string): boolean {
  if (!answer.length) return false
  const p = padProgressMask(progress, answer.length)
  return !p.includes("_")
}

function padProgressMask(progress: string | undefined, len: number): string {
  const p = progress ?? ""
  if (p.length >= len) return p.slice(0, len)
  return p + "_".repeat(len - p.length)
}

type MultiplayerCell = {
  char: string
  /** Player color hex, or red for unguessed. */
  color: string
  unguessed: boolean
}

function multiplayerLetterCell(
  it: RoundHistoryItem,
  idx: number,
  answerWord: string
): MultiplayerCell {
  const L = answerWord.length
  const ansCh = answerWord[idx] ?? "_"
  const mySlot = it.viewerSlot ?? 1
  const bySlot = it.slotProgressBySlot ?? {}
  const pad = (s?: string) => padProgressMask(s, L)

  const myP = pad(it.myProgress)
  if (myP[idx] !== "_") {
    return { char: myP[idx]!, color: PLAYER_COLORS[mySlot - 1], unguessed: false }
  }

  const winnerSlot = it.winnerSlot
  if (winnerSlot != null && winnerSlot !== mySlot) {
    const wp = pad(bySlot[winnerSlot])
    const wch = wp[idx] ?? "_"
    const ch = wch !== "_" ? wch : ansCh
    return { char: ch, color: PLAYER_COLORS[winnerSlot - 1], unguessed: false }
  }

  const otherSlots = ([1, 2, 3, 4] as PlayerSlot[])
    .filter((s) => s !== mySlot && bySlot[s] != null)
    .sort((a, b) => a - b)
  for (const s of otherSlots) {
    const p = pad(bySlot[s])
    if (p[idx] !== "_") {
      return { char: p[idx]!, color: PLAYER_COLORS[s - 1], unguessed: false }
    }
  }

  return { char: ansCh, color: UNGUESSED_LETTER_COLOR, unguessed: true }
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
                  {it.answerWord.split("").map((_letter, idx) => {
                    const ansCh = it.answerWord[idx] ?? "_"
                    const useMulti =
                      it.slotProgressBySlot != null &&
                      it.viewerSlot != null &&
                      Object.keys(it.slotProgressBySlot).length > 0

                    if (useMulti) {
                      const cell = multiplayerLetterCell(it, idx, it.answerWord)
                      return (
                        <div
                          key={idx}
                          className="flex h-9 w-9 select-none items-center justify-center rounded-lg border-2 text-base font-extrabold shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
                          style={
                            cell.unguessed
                              ? {
                                  borderColor: `${UNGUESSED_LETTER_COLOR}99`,
                                  background: `${UNGUESSED_LETTER_COLOR}18`,
                                  color: UNGUESSED_LETTER_COLOR,
                                }
                              : {
                                  borderColor: `${cell.color}80`,
                                  background: `${cell.color}18`,
                                  color: cell.color,
                                }
                          }
                          title={cell.unguessed ? "Not guessed" : "Found"}
                        >
                          {cell.char.toUpperCase()}
                        </div>
                      )
                    }

                    const color = foundColorForItem?.(it) ?? foundColor
                    const p = padProgressMask(it.myProgress, it.answerWord.length)
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

