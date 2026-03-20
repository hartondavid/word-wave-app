import type { SupabaseClient } from "@supabase/supabase-js"

/** Șterge rândul camerei după ce jocul s-a încheiat (game_status → finished). */
export async function deleteGameRoomRow(
  supabase: SupabaseClient,
  roomCode: string
): Promise<void> {
  const { error } = await supabase.from("game_rooms").delete().eq("room_code", roomCode)
  if (error) console.error("[game_rooms] delete:", error.message)
}
