"use server"

import { cookies } from "next/headers"
import { resolveWordPairForRound } from "@/lib/server/resolve-round-word"
import {
  COOKIE_NAME,
  sealPracticeRound,
  unsealPracticeRound,
  isValidProgressAgainstWord,
} from "@/lib/server/practice-session"
import { isWordComplete } from "@/lib/words"
import type { CategoryPresetId } from "@/lib/game-types"

export type PracticeRoundPublic = {
  definition: string
  wordLength: number
  /** Sent to client for instant local validation (practice only; cookie still authoritative for finalize). */
  word: string
  /** URL imagine din intrarea categoriei (`image`), dacă există. */
  image?: string
}

export type PracticePlacement = { index: number; char: string }

export type PracticeRevealSlot = { index: number; char: string }

/** End of round: single payload with word, definition, optional reveal sequence. */
export type PracticeFinalizeResult =
  | {
      ok: true
      word: string
      definition: string
      revealSlots?: PracticeRevealSlot[]
    }
  | { ok: false }

function practiceCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60,
  }
}

/**
 * Dacă există sesiune Practice validă (cookie), întoarce definiția + lungimea fără a genera cuvânt nou.
 * Folosit la refresh ca întrebarea să rămână aceeași.
 */
export async function tryResumePracticeSession(): Promise<PracticeRoundPublic | null> {
  const store = await cookies()
  const raw = store.get(COOKIE_NAME)?.value
  if (!raw) return null
  const secret = unsealPracticeRound(raw)
  if (!secret) return null
  return {
    definition: secret.definition,
    wordLength: secret.word.length,
    word: secret.word,
    ...(secret.image ? { image: secret.image } : {}),
  }
}

/** Start round: stores answer in httpOnly cookie; response has no `word`. */
export async function startPracticeRound(
  category: string,
  language: string,
  categoryPreset?: CategoryPresetId | null
): Promise<PracticeRoundPublic> {
  const pair = await resolveWordPairForRound(category || null, language, categoryPreset ?? null)
  const sealed = sealPracticeRound(pair.word, pair.definition, pair.image ?? null)
  const store = await cookies()
  store.set(COOKIE_NAME, sealed, practiceCookieOptions())
  return {
    definition: pair.definition,
    wordLength: pair.word.length,
    word: pair.word,
    ...(pair.image ? { image: pair.image } : {}),
  }
}

/**
 * Call once when the round ends (win or timeout).
 * Returns word + definition (+ reveal slots for timeout) and clears the session cookie.
 */
export async function finalizePracticeRound(
  kind: "won" | "timeout",
  progress: string
): Promise<PracticeFinalizeResult> {
  const store = await cookies()
  const raw = store.get(COOKIE_NAME)?.value
  if (!raw) return { ok: false }
  const secret = unsealPracticeRound(raw)
  if (!secret) return { ok: false }
  const { word, definition } = secret

  if (!isValidProgressAgainstWord(progress, word)) {
    store.delete(COOKIE_NAME)
    return { ok: false }
  }

  if (kind === "won") {
    if (!isWordComplete(progress)) {
      store.delete(COOKIE_NAME)
      return { ok: false }
    }
    store.delete(COOKIE_NAME)
    return { ok: true, word, definition }
  }

  // timeout
  const revealSlots: PracticeRevealSlot[] = []
  for (let i = 0; i < word.length; i++) {
    if (progress[i] === "_") {
      revealSlots.push({ index: i, char: word[i] })
    }
  }
  store.delete(COOKIE_NAME)
  return { ok: true, word, definition, revealSlots }
}
