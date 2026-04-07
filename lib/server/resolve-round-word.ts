import { pickRandomWordPairFromCategoryFile } from "@/lib/server/category-word-pick"
import type { CategoryKey, CategoryPresetId, WordPair } from "@/lib/game-types"
import { categoryKeysForRandomGeneral } from "@/lib/game-types"

/**
 * Încearcă categorii în ordine aleatoare până reușește o pereche (fără API extern).
 */
function pickFromRandomCategories(
  language: string,
  options?: { avoidCategory?: string; pool?: Exclude<CategoryKey, "general">[] }
): WordPair {
  let pool =
    options?.pool && options.pool.length > 0
      ? [...options.pool]
      : [...categoryKeysForRandomGeneral(undefined)]
  const avoid = options?.avoidCategory
  if (avoid && pool.length > 1) {
    const filtered = pool.filter((k) => k !== avoid)
    if (filtered.length > 0) pool = filtered
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

/** Rezolvă perechea pentru rundă — din `data/categories/definitions/` și `.../images/` (Server Actions). */
export async function resolveWordPairForRound(
  category: string | null | undefined,
  language: string,
  categoryPreset?: CategoryPresetId | null
): Promise<WordPair> {
  const lang = language?.trim() || "en"
  const cat = category?.trim()
  const pool = categoryKeysForRandomGeneral(categoryPreset ?? null)

  if (!cat || cat === "general") {
    return pickFromRandomCategories(lang, { pool })
  }

  try {
    return pickRandomWordPairFromCategoryFile(cat, lang)
  } catch {
    return pickFromRandomCategories(lang, { avoidCategory: cat, pool })
  }
}
