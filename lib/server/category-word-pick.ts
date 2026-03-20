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

/**
 * Returnează null dacă intrarea nu are text pentru limba cerută.
 * Intrările doar { word, definition } sunt tratate ca română (dataset WordWave).
 */
function extractPair(entry: MultilingualEntry | WordPair, language: string): WordPair | null {
  if ("definitions" in entry && entry.definitions && Object.keys(entry.definitions).length > 0) {
    const def = entry.definitions[language] ?? entry.definitions["en"] ?? ""
    const word = entry.words?.[language] ?? entry.words?.["en"] ?? entry.word
    if (!def.trim() || !word.trim()) return null
    return { word, definition: def }
  }
  const plain = entry as WordPair
  if (!plain.word?.trim() || !plain.definition?.trim()) return null
  // Fără câmp multilingual → conținut românesc; acceptăm doar ro (sau lipsă → ro)
  if (language === "ro" || language === "") return plain
  return null
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

  // Amestecăm și căutăm o intrare compatibilă cu limba (ex. EN cere câmpuri multilingual)
  const shuffled = [...defs].sort(() => Math.random() - 0.5)
  for (const entry of shuffled) {
    const pair = extractPair(entry, language)
    if (pair) return pair
  }
  throw new Error("no entry for language")
}
