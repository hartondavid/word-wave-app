"use server"

import { cookies } from "next/headers"
import { resolveWordPairForRound } from "@/lib/server/resolve-round-word"
import {
  COOKIE_NAME,
  sealPracticeRound,
  unsealPracticeRound,
  isValidProgressAgainstWord,
} from "@/lib/server/practice-session"
import { tryPlaceLetter, isWordComplete } from "@/lib/words"

export type PracticeRoundPublic = {
  definition: string
  wordLength: number
}

export type PracticePlacement = { index: number; char: string }

/** Mid-round: only new cells for this guess — no full word / definition. */
export type PracticeLetterResult =
  | { ok: true; placements: PracticePlacement[]; complete: boolean }
  | { ok: false; reason: "no_session" | "invalid_progress" | "bad_letter" }

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

/** Start round: stores answer in httpOnly cookie; response has no `word`. */
export async function startPracticeRound(
  category: string,
  language: string
): Promise<PracticeRoundPublic> {
  const pair = await resolveWordPairForRound(category || null, language)
  const sealed = sealPracticeRound(pair.word, pair.definition)
  const store = await cookies()
  store.set(COOKIE_NAME, sealed, practiceCookieOptions())
  return {
    definition: pair.definition,
    wordLength: pair.word.length,
  }
}

export async function submitPracticeLetter(
  letter: string,
  currentProgress: string
): Promise<PracticeLetterResult> {
  const store = await cookies()
  const raw = store.get(COOKIE_NAME)?.value
  if (!raw) return { ok: false, reason: "no_session" }
  const secret = unsealPracticeRound(raw)
  if (!secret) return { ok: false, reason: "no_session" }
  const { word } = secret
  if (!isValidProgressAgainstWord(currentProgress, word)) {
    return { ok: false, reason: "invalid_progress" }
  }
  const next = tryPlaceLetter(letter, currentProgress, word)
  if (!next) return { ok: false, reason: "bad_letter" }

  const placements: PracticePlacement[] = []
  for (let i = 0; i < next.length; i++) {
    if (currentProgress[i] === "_" && next[i] !== "_") {
      placements.push({ index: i, char: next[i] })
    }
  }

  return {
    ok: true,
    placements,
    complete: isWordComplete(next),
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
