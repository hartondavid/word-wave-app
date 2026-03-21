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

/** Opțional: word_en / definition_en lângă word / definition (RO). */
interface BilingualFlat extends WordPair {
  word_en?: string
  definition_en?: string
}

function unwrapCategoryDefinitions(raw: unknown): (MultilingualEntry | WordPair | BilingualFlat)[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>
    const keys = ["data", "entries", "items", "results", "content", "words"] as const
    for (const k of keys) {
      const v = o[k]
      if (Array.isArray(v) && v.length > 0) return v as (MultilingualEntry | WordPair | BilingualFlat)[]
    }
  }
  throw new Error("expected array of word entries or wrapped array")
}

/**
 * Returnează perechea pentru limba cerută.
 * - `definitions` / `words` (obiecte per limbă)
 * - sau `word`+`definition` (RO) cu opțional `word_en` / `definition_en`
 * - pentru `en` fără traducere: fallback la RO ca să nu rupă jocul
 */
function extractPair(
  entry: MultilingualEntry | WordPair | BilingualFlat,
  language: string
): WordPair | null {
  const lang = (language || "ro").trim().toLowerCase()

  if ("definitions" in entry && entry.definitions && Object.keys(entry.definitions).length > 0) {
    const e = entry as MultilingualEntry
    const def =
      e.definitions[lang] ?? e.definitions["en"] ?? e.definitions["ro"] ?? ""
    const word =
      e.words?.[lang] ?? e.words?.["en"] ?? e.words?.["ro"] ?? e.word ?? ""
    if (!def.trim() || !word.trim()) return null
    return { word: word.trim(), definition: def.trim() }
  }

  const flat = entry as BilingualFlat
  if (!flat.word?.trim() || !flat.definition?.trim()) return null

  if (lang === "en") {
    const w = flat.word_en?.trim()
    const d = flat.definition_en?.trim()
    if (w && d) {
      return { word: w.toLowerCase(), definition: d }
    }
    return { word: flat.word.trim(), definition: flat.definition.trim() }
  }

  return { word: flat.word.trim(), definition: flat.definition.trim() }
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

  const shuffled = [...defs].sort(() => Math.random() - 0.5)
  for (const entry of shuffled) {
    const pair = extractPair(entry, language)
    if (pair) return pair
  }
  throw new Error("no entry for language")
}
