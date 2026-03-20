"use server"

import { createClient } from "@/lib/supabase/server"
import type { GameRoom } from "@/lib/game-types"
import { ROUND_DURATION } from "@/lib/game-types"
import { resolveWordPairForRound } from "@/lib/server/resolve-round-word"

function activeSlots(room: GameRoom): number[] {
  const s: number[] = []
  if (room.player1_id) s.push(1)
  if (room.player2_id) s.push(2)
  if (room.player3_id) s.push(3)
  if (room.player4_id) s.push(4)
  return s
}

/**
 * Alege cuvântul pe server și actualizează camera în Supabase.
 * Cuvântul e ales pe server; clientul nu mai apelează o rută REST dedicată pentru asta.
 * Notă: cuvântul rămâne vizibil în fluxul Realtime Supabase `game_rooms` — asta e necesar pentru joc.
 */
export async function serverStartNewRound(
  roomCode: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: room, error: fetchErr } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("room_code", roomCode)
    .single()

  if (fetchErr || !room) {
    return { ok: false, error: fetchErr?.message ?? "room_not_found" }
  }

  const r = room as GameRoom
  const word = await resolveWordPairForRound(r.category, r.language ?? "en")
  const init = "_".repeat(word.word.length)
  const active = activeSlots(r)

  const update: Record<string, unknown> = {
    current_word: word.word,
    current_definition: word.definition,
    player1_progress: active.includes(1) ? init : null,
    player2_progress: active.includes(2) ? init : null,
    player1_ready: false,
    player2_ready: false,
    round_winner: null,
    game_status: "playing",
    current_round: (r.current_round ?? 0) + 1,
    round_end_time: new Date(Date.now() + ROUND_DURATION * 1000).toISOString(),
  }

  if (active.some(slot => slot >= 3)) {
    update.player3_progress = active.includes(3) ? init : null
    update.player4_progress = active.includes(4) ? init : null
    update.player3_ready = false
    update.player4_ready = false
  }

  const { error: upErr } = await supabase.from("game_rooms").update(update).eq("room_code", roomCode)
  if (upErr) return { ok: false, error: upErr.message }
  return { ok: true }
}
