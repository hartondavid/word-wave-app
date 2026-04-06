import fs from "fs"
import path from "path"
import type { WordPair } from "@/lib/game-types"
import { CATEGORY_IMAGE_FILE_KEYS, SPECIFIC_CATEGORIES } from "@/lib/game-types"
import type { CategoryKey } from "@/lib/game-types"

/** Same shapes as în fișierele JSON — format vechi { word, definition } sau multilingual. */
interface MultilingualEntry {
  word: string
  words?: Record<string, string>
  definitions?: Record<string, string>
  image?: string
}

/** Opțional: word_en / definition_en lângă word / definition (RO). */
interface BilingualFlat extends WordPair {
  word_en?: string
  definition_en?: string
  image?: string
}

function entryImageUrl(
  entry: MultilingualEntry | WordPair | BilingualFlat
): string | undefined {
  const raw =
    "image" in entry && typeof (entry as { image?: unknown }).image === "string"
      ? (entry as { image: string }).image.trim()
      : ""
  return raw || undefined
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
 * - sau `word`+`definition` (RO) cu opțional `word_en` / `definition_en` / `image`
 * - dacă lipsește definiția dar există `image`, definiția devine "" (indiciu doar vizual)
 * - pentru `en` fără traducere: fallback la RO ca să nu rupă jocul
 */
function extractPair(
  entry: MultilingualEntry | WordPair | BilingualFlat,
  language: string
): WordPair | null {
  const lang = (language || "en").trim().toLowerCase()

  const defs = "definitions" in entry ? entry.definitions : undefined
  if (defs && Object.keys(defs).length > 0) {
    const e = entry as MultilingualEntry
    const def = (defs[lang] ?? defs["en"] ?? defs["ro"] ?? "").trim()
    const word = (
      e.words?.[lang] ??
      e.words?.["en"] ??
      e.words?.["ro"] ??
      e.word ??
      ""
    ).trim()
    if (!word) return null
    const img = entryImageUrl(entry)
    if (!def && !img) return null
    return img
      ? { word, definition: def, image: img }
      : { word, definition: def }
  }

  const flat = entry as BilingualFlat
  const wordBase = flat.word?.trim()
  if (!wordBase) return null

  const img = entryImageUrl(flat)
  const roDef = (flat.definition ?? "").trim()
  const wEn = flat.word_en?.trim()
  const dEn = (flat.definition_en ?? "").trim()

  const hasTextClue = roDef.length > 0 || dEn.length > 0
  if (!hasTextClue && !img) return null

  if (lang === "en") {
    if (wEn && dEn) {
      return img
        ? { word: wEn.toLowerCase(), definition: dEn, image: img }
        : { word: wEn.toLowerCase(), definition: dEn }
    }
    if (wEn && img) {
      return { word: wEn.toLowerCase(), definition: dEn || roDef, image: img }
    }
    return img
      ? { word: wordBase, definition: roDef, image: img }
      : { word: wordBase, definition: roDef }
  }

  return img
    ? { word: wordBase, definition: roDef, image: img }
    : { word: wordBase, definition: roDef }
}

function isAllowedCategory(category: string): category is Exclude<CategoryKey, "general"> {
  return SPECIFIC_CATEGORIES.includes(category as Exclude<CategoryKey, "general">)
}

/**
 * Citește `data/categories/definitions/<category>.json` sau `.../images/` pentru animale / alimente / hobby-uri.
 */
export function pickRandomWordPairFromCategoryFile(
  category: string,
  language: string
): WordPair {
  const key = category.trim().toLowerCase()
  if (!isAllowedCategory(key)) {
    throw new Error("invalid category")
  }

  const sub =
    (CATEGORY_IMAGE_FILE_KEYS as readonly string[]).includes(key) ? "images" : "definitions"
  const filePath = path.join(process.cwd(), "data", "categories", sub, `${key}.json`)
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
