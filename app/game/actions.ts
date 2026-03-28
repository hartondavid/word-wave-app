"use server"

import { createClient } from "@/lib/supabase/server"
import type { GameRoom } from "@/lib/game-types"
import { effectiveRoundDurationSeconds, languageForMultiplayerRoom } from "@/lib/game-types"
import { resolveWordPairForRound } from "@/lib/server/resolve-round-word"

/**
 * Forțează limba camerei pe server (anon), după insert client sau dacă DB a rămas pe default `en`).
 */
export async function syncGameRoomLanguage(
  roomCode: string,
  language: string | null | undefined
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const code = roomCode.trim().toUpperCase()
  const lang = languageForMultiplayerRoom(language)
  const { error } = await supabase.from("game_rooms").update({ language: lang }).eq("room_code", code)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

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
 * `languageHint` — trimis de gazdă din localStorage când coloana `language` lipsește din DB;
 * altfel se folosește `room.language`.
 */
export async function serverStartNewRound(
  roomCode: string,
  languageHint?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const code = roomCode.trim().toUpperCase()
  const { data: room, error: fetchErr } = await supabase
    .from("game_rooms")
    .select("*")
    .eq("room_code", code)
    .single()

  if (fetchErr || !room) {
    return { ok: false, error: fetchErr?.message ?? "room_not_found" }
  }

  const r = room as GameRoom
  const hintTrim =
    languageHint != null && String(languageHint).trim() !== ""
      ? String(languageHint).trim()
      : ""
  // Hint de la gazdă (localStorage) când lipsește coloana `language` sau e goală în răspuns.
  const playLang = languageForMultiplayerRoom(hintTrim !== "" ? hintTrim : r.language)
  const word = await resolveWordPairForRound(r.category, playLang)
  const init = "_".repeat(word.word.length)
  const active = activeSlots(r)
  const roundSeconds = effectiveRoundDurationSeconds(r)

  const update: Record<string, unknown> = {
    language: playLang,
    current_word: word.word,
    current_definition: word.definition,
    player1_progress: active.includes(1) ? init : null,
    player2_progress: active.includes(2) ? init : null,
    player1_ready: false,
    player2_ready: false,
    round_winner: null,
    game_status: "playing",
    current_round: (r.current_round ?? 0) + 1,
    round_end_time: new Date(Date.now() + roundSeconds * 1000).toISOString(),
  }

  if (active.some(slot => slot >= 3)) {
    update.player3_progress = active.includes(3) ? init : null
    update.player4_progress = active.includes(4) ? init : null
    update.player3_ready = false
    update.player4_ready = false
  }

  Object.assign(update, {
    player1_speech_eliminated: false,
    player2_speech_eliminated: false,
    player3_speech_eliminated: false,
    player4_speech_eliminated: false,
    round_end_reason: null,
  })

  let payload: Record<string, unknown> = { ...update }
  let { error: upErr } = await supabase.from("game_rooms").update(payload).eq("room_code", code)

  // DB fără migrarea `008_add_language.sql`: coloana `language` lipsește — rundă merge fără ea.
  if (upErr) {
    const msg = (upErr.message ?? "").toLowerCase()
    if (msg.includes("language")) {
      const { language: _drop, ...withoutLang } = payload
      payload = withoutLang
      const retry = await supabase.from("game_rooms").update(payload).eq("room_code", code)
      upErr = retry.error
    }
  }

  // DB fără `009_add_speech_eliminated.sql`
  if (upErr) {
    const msg = (upErr.message ?? "").toLowerCase()
    if (msg.includes("speech_eliminated") || msg.includes("round_end_reason")) {
      const {
        player1_speech_eliminated: _a,
        player2_speech_eliminated: _b,
        player3_speech_eliminated: _c,
        player4_speech_eliminated: _d,
        round_end_reason: _r,
        ...rest
      } = payload
      payload = rest
      const retry = await supabase.from("game_rooms").update(payload).eq("room_code", code)
      upErr = retry.error
    }
  }

  if (upErr) return { ok: false, error: upErr.message }
  return { ok: true }
}
