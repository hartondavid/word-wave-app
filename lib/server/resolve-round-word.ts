import { pickRandomWordPairFromCategoryFile } from "@/lib/server/category-word-pick"
import type { WordPair } from "@/lib/game-types"
import { SPECIFIC_CATEGORIES } from "@/lib/game-types"
import { fetchWordPair } from "@/lib/words"

/** Rezolvă perechea pentru rundă — doar pe server (folosit de Server Actions). */
export async function resolveWordPairForRound(
  category: string | null | undefined,
  language: string
): Promise<WordPair> {
  if (!category) return fetchWordPair()
  if (category === "general") {
    const key = SPECIFIC_CATEGORIES[Math.floor(Math.random() * SPECIFIC_CATEGORIES.length)]
    try {
      return pickRandomWordPairFromCategoryFile(key, language)
    } catch {
      return fetchWordPair()
    }
  }
  try {
    return pickRandomWordPairFromCategoryFile(category, language)
  } catch {
    return fetchWordPair()
  }
}
