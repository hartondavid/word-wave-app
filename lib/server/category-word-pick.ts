import fs from "fs"
import path from "path"
import type { WordPair } from "@/lib/game-types"
import { SPECIFIC_CATEGORIES } from "@/lib/game-types"
import type { CategoryKey } from "@/lib/game-types"

/** Same shapes as în fișierele JSON — format vechi { word, definition } sau multilingual. */
interface MultilingualEntry {
  word: string
  words?: Record<string, string>
  definitions?: Record<string, string>
}

function unwrapCategoryDefinitions(raw: unknown): (MultilingualEntry | WordPair)[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>
    const keys = ["data", "entries", "items", "results", "content", "words"] as const
    for (const k of keys) {
      const v = o[k]
      if (Array.isArray(v) && v.length > 0) return v as (MultilingualEntry | WordPair)[]
    }
  }
  throw new Error("expected array of word entries or wrapped array")
}

function extractPair(entry: MultilingualEntry | WordPair, language: string): WordPair {
  if ("definitions" in entry && entry.definitions && Object.keys(entry.definitions).length > 0) {
    const def = entry.definitions[language] ?? entry.definitions["en"] ?? ""
    const word = entry.words?.[language] ?? entry.words?.["en"] ?? entry.word
    return { word, definition: def }
  }
  return entry as WordPair
}

function isAllowedCategory(category: string): category is Exclude<CategoryKey, "general"> {
  return SPECIFIC_CATEGORIES.includes(category as Exclude<CategoryKey, "general">)
}

/**
 * Citește `data/categories/<category>.json` (nu e în public → nu e accesibil direct din browser).
 * Returnează o singură pereche aleatoare pentru limbă.
 */
export function pickRandomWordPairFromCategoryFile(
  category: string,
  language: string
): WordPair {
  const key = category.trim().toLowerCase()
  if (!isAllowedCategory(key)) {
    throw new Error("invalid category")
  }

  const filePath = path.join(process.cwd(), "data", "categories", `${key}.json`)
  if (!fs.existsSync(filePath)) {
    throw new Error("category file missing")
  }

  const raw: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"))
  const defs = unwrapCategoryDefinitions(raw)
  if (defs.length === 0) throw new Error("empty category")

  const entry = defs[Math.floor(Math.random() * defs.length)]
  const pair = extractPair(entry, language)
  if (!pair.word || !pair.definition) throw new Error("invalid entry")
  return pair
}
