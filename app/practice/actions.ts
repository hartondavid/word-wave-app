"use server"

import type { WordPair } from "@/lib/game-types"
import { resolveWordPairForRound } from "@/lib/server/resolve-round-word"

/** Practice: alegere cuvânt pe server — fără ruta GET /api/words în Network. */
export async function pickPracticeWord(
  category: string,
  language: string
): Promise<WordPair> {
  return resolveWordPairForRound(category || null, language)
}
