import type { PlayerSlot } from "@/lib/game-types"

export type RoundHistoryEndReason =
  | "won"
  | "timeout"
  | "lost"
  | "round_end"
  | "unknown"

export type RoundHistoryItem = {
  round: number
  definition: string
  imageUrl?: string
  answerWord: string
  /** Player progress mask, same length as answerWord; unknown letters are '_' */
  myProgress?: string
  endReason: RoundHistoryEndReason
  winnerName?: string | null
  winnerSlot?: PlayerSlot | null
}

