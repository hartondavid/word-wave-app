import { pickRandomWordPairFromCategoryFile } from "@/lib/server/category-word-pick"
import type { WordPair } from "@/lib/game-types"
import { SPECIFIC_CATEGORIES } from "@/lib/game-types"

/**
 * Încearcă categorii în ordine aleatoare până reușește o pereche (fără API extern).
 */
function pickFromRandomCategories(
  language: string,
  avoidCategory?: string
): WordPair {
  let pool = [...SPECIFIC_CATEGORIES]
  if (avoidCategory && pool.length > 1) {
    pool = pool.filter((k) => k !== avoidCategory)
  }
  const order = [...pool].sort(() => Math.random() - 0.5)
  let lastErr: Error | undefined
  for (const key of order) {
    try {
      return pickRandomWordPairFromCategoryFile(key, language)
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw lastErr ?? new Error("Nu s-au putut încărca cuvinte din categorii.")
}

/** Rezolvă perechea pentru rundă — doar din `data/categories/*.json` (Server Actions). */
export async function resolveWordPairForRound(
  category: string | null | undefined,
  language: string
): Promise<WordPair> {
  const lang = language?.trim() || "ro"
  const cat = category?.trim()

  if (!cat || cat === "general") {
    return pickFromRandomCategories(lang)
  }

  try {
    return pickRandomWordPairFromCategoryFile(cat, lang)
  } catch {
    return pickFromRandomCategories(lang, cat)
  }
}
