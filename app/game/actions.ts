"use server"

import { createClient } from "@/lib/supabase/server"
import type { CategoryPresetId, GameRoom } from "@/lib/game-types"
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

function categoryPresetFromRoom(r: GameRoom): CategoryPresetId | null {
  const p = r.category_preset
  return p === "images" || p === "definitions" ? p : null
}



/**
 * Alege cuvântul pe server și actualizează camera în Supabase.
 * `languageHint` — trimis de gazdă din localStorage când coloana `language` lipsește din DB;
 * altfel se folosește `room.language`.
 * `categoryPresetHint` — de la gazdă (slot 1) când `category_preset` lipsește în DB dar e în localStorage.
 */
export async function serverStartNewRound(
  roomCode: string,
  languageHint?: string | null,
  categoryPresetHint?: string | null
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
  let preset = categoryPresetFromRoom(r)
  if (preset == null && categoryPresetHint != null && String(categoryPresetHint).trim() !== "") {
    const h = String(categoryPresetHint).trim().toLowerCase()
    if (h === "images" || h === "definitions") preset = h
  }
  const word = await resolveWordPairForRound(r.category, playLang, preset)
  const init = "_".repeat(word.word.length)
  const roundSeconds = effectiveRoundDurationSeconds(r)

  const imageUrl =
    word.image != null && String(word.image).trim() !== "" ? String(word.image).trim() : null

  const update: Record<string, unknown> = {
    language: playLang,
    current_word: word.word,
    current_definition: word.definition,
    current_image: imageUrl,
    round_winner: null,
    game_status: "playing",
    current_round: (r.current_round ?? 0) + 1,
    round_end_time: new Date(Date.now() + roundSeconds * 1000).toISOString(),
    round_end_reason: null,
  }

  const { error: upErr } = await supabase.from("game_rooms").update(update).eq("room_code", code)
  if (upErr) return { ok: false, error: upErr.message }

  // Reset all players in the room for the new round
  const { error: pErr } = await supabase.from("players")
    .update({ 
      progress: init, 
      is_ready: false, 
      speech_eliminated: false 
    })
    .eq("room_code", code)
  
  if (pErr) console.error("Reset players error:", pErr.message)

  return { ok: true }
}

