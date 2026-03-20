import type { PlayerSlot } from "@/lib/game-types"

export function getClearSlotPayload(slot: PlayerSlot): Record<string, unknown> {
  return {
    [`player${slot}_id`]: null,
    [`player${slot}_name`]: null,
    [`player${slot}_progress`]: null,
    [`player${slot}_ready`]: false,
    [`player${slot}_score`]: 0,
  }
}

/**
 * PATCH către REST Supabase cu keepalive — funcționează la pagehide / închidere tab
 * când clientul async nu mai apucă să termine request-ul.
 */
export function patchClearPlayerSlotKeepalive(roomCode: string, slot: PlayerSlot): void {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!baseUrl || !anonKey) return

  const url = `${baseUrl}/rest/v1/game_rooms?room_code=eq.${encodeURIComponent(roomCode)}`
  try {
    fetch(url, {
      method: "PATCH",
      keepalive: true,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(getClearSlotPayload(slot)),
    }).catch(() => {})
  } catch {
    /* ignore */
  }
}
