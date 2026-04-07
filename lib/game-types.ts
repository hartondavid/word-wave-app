export type PlayerSlot = 1 | 2 | 3 | 4

/** Preset listă categorii (home / cameră): definiții vs. poze. */
export type CategoryPresetId = "definitions" | "images"

export interface GameRoom {
  id: string
  room_code: string
  max_players: number
  category?: string | null
  /** Mod listă categorii la creare: `images` → „Toate” trage doar din `data/categories/images/`. */
  category_preset?: CategoryPresetId | null
  language?: string | null

  current_word: string | null
  current_definition: string | null
  /** URL imagine pentru runda curentă (categorii cu poze); null dacă nu există. */
  current_image?: string | null

  player1_id: string | null
  player1_name: string | null
  player1_progress: string | null
  player1_score: number
  player1_ready: boolean

  player2_id: string | null
  player2_name: string | null
  player2_progress: string | null
  player2_score: number
  player2_ready: boolean

  player3_id?: string | null
  player3_name?: string | null
  player3_progress?: string | null
  player3_score?: number
  player3_ready?: boolean

  player4_id?: string | null
  player4_name?: string | null
  player4_progress?: string | null
  player4_score?: number
  player4_ready?: boolean

  game_status: 'waiting' | 'ready' | 'playing' | 'round_end' | 'finished'
  current_round: number
  total_rounds: number
  round_winner: string | null
  /** Când nu e câștigător: timeout (timp) sau all_speech_wrong (toți au greșit la microfon). */
  round_end_reason?: string | null
  round_end_time: string | null
  /** Secunde per rundă de tastare (30 sau 60); setat de gazdă la creare. Lipsește în DB vechi → 60. */
  round_duration_seconds?: number | null

  player1_speech_eliminated?: boolean | null
  player2_speech_eliminated?: boolean | null
  player3_speech_eliminated?: boolean | null
  player4_speech_eliminated?: boolean | null
  created_at: string
  updated_at: string
}

export interface WordPair {
  definition: string
  word: string
  /** URL opțional (ex. din `data/categories/images/*.json`) — afișat lângă definiție în Practice. */
  image?: string
}

export const ROUND_DURATION = 60
export const TOTAL_ROUNDS = 10

/** Durata efectivă a rundei multiplayer din rândul camerei (fallback 60). */
export function effectiveRoundDurationSeconds(
  room: Pick<GameRoom, "round_duration_seconds">
): number {
  const v = room.round_duration_seconds
  if (v === 30 || v === 60) return v
  return ROUND_DURATION
}
/** Puncte primite la fiecare literă corectă plasată (multiplayer + practice). */
export const SCORE_PER_LETTER = 10
/** Primul jucător care atinge acest total de puncte câștigă meciul (sau se termină după `total_rounds` runde). */
export const WIN_SCORE = 500

// P1 Blue | P2 Amber | P3 Emerald | P4 Violet
export const PLAYER_COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6'] as const

export const LANGUAGES = {
  en: { label: "English" },
  ro: { label: "Română" },
} as const

export type LanguageKey = keyof typeof LANGUAGES

/** Limbi suportate pentru runde multiplayer (cuvinte/definiții). */
export type MultiplayerLanguageKey = "en" | "ro"

/**
 * Limba salvată în cameră pentru multiplayer: doar engleză sau română.
 * Orice altă selecție (ex. ES/FR/DE) sau valoare necunoscută → engleză.
 */
export function languageForMultiplayerRoom(
  selection: LanguageKey | string | null | undefined
): MultiplayerLanguageKey {
  const raw = (selection ?? "en").toString().trim().toLowerCase()
  if (raw === "ro") return "ro"
  return "en"
}

export const CATEGORIES = {
  general:    { category: 'All',         emoji: '🌐' },
  emotii:     { category: 'Emotions',    emoji: '😊' },
  relatii:    { category: 'Relationships', emoji: '🤝' },
  timp:       { category: 'Time',        emoji: '⏰' },
  succes:     { category: 'Success',     emoji: '🏆' },
  valori:     { category: 'Values',      emoji: '⚖️' },
  caracter:   { category: 'Character',   emoji: '🎭' },
  minte:      { category: 'Mind',        emoji: '🧠' },
  corp:       { category: 'Body',        emoji: '🫀' },
  munca:      { category: 'Work',        emoji: '💼' },
  familie:    { category: 'Family',      emoji: '👨‍👩‍👧' },
  prietenie:  { category: 'Friendship',  emoji: '🤗' },
  iubire:     { category: 'Love',        emoji: '❤️' },
  libertate:  { category: 'Freedom',     emoji: '🕊️' },
  credinta:   { category: 'Faith',       emoji: '🙏' },
  sanatate:   { category: 'Health',      emoji: '💊' },
  educatie:   { category: 'Education',   emoji: '📚' },
  foods:      { category: 'Food',        emoji: '🍎' },
  natura:     { category: 'Nature',      emoji: '🌿' },
  animals:    { category: 'Animals',     emoji: '🦁' },
  architecture: { category: 'Architecture', emoji: '🏗️' },
  technology: { category: 'Technology',  emoji: '💻' },
  societate:  { category: 'Society',     emoji: '🏛️' },
  filosofie:  { category: 'Philosophy',  emoji: '💭' },
  persoana:   { category: 'Self',        emoji: '👤' },
} as const

export type CategoryKey = keyof typeof CATEGORIES

/** Liste cu poze: `data/categories/images/<key>.json`. Restul categoriilor: `data/categories/definitions/`. */
export const CATEGORY_IMAGE_FILE_KEYS = [
  "animals",
  "foods",
  "architecture",
  "natura",
  "technology",
] as const satisfies readonly CategoryKey[]
export type CategoryImageFileKey = (typeof CATEGORY_IMAGE_FILE_KEYS)[number]

/**
 * 20 categorii pentru modul definiții: Toate + 19 tematice (fără `animals`, `foods`, `hobbies` — axate pe imagini).
 * Fără `persoana` pentru a păstra exact 20 intrări în listă.
 */
export const CATEGORY_PRESET_DEFINITION_KEYS: readonly CategoryKey[] = [
  "general",
  "emotii",
  "relatii",
  "timp",
  "succes",
  "valori",
  "caracter",
  "minte",
  "corp",
  "munca",
  "familie",
  "prietenie",
  "iubire",
  "libertate",
  "credinta",
  "sanatate",
  "educatie",
  "natura",
  "societate",
  "filosofie",
] as const

/** Categorii pentru modul poze (inclusiv Toate + cele din Cloudinary `word-wave/*`). */
export const CATEGORY_PRESET_IMAGE_KEYS: readonly CategoryKey[] = [
  "general",
  "animals",
  "foods",
  "architecture",
  "natura",
  "technology",
] as const

export function categoryKeysForPreset(preset: CategoryPresetId): CategoryKey[] {
  return preset === "definitions"
    ? [...CATEGORY_PRESET_DEFINITION_KEYS]
    : [...CATEGORY_PRESET_IMAGE_KEYS]
}

// All specific category keys (excludes 'general')
export const SPECIFIC_CATEGORIES = Object.keys(CATEGORIES).filter(k => k !== 'general') as Exclude<CategoryKey, 'general'>[]

/**
 * Pool pentru categoria „Toate” (`general`): în modul poze, doar fișiere `images/`;
 * altfel toate categoriile specifice (comportament clasic).
 */
export function categoryKeysForRandomGeneral(
  preset: CategoryPresetId | null | undefined
): Exclude<CategoryKey, "general">[] {
  if (preset === "images") {
    return [...CATEGORY_IMAGE_FILE_KEYS]
  }
  return [...SPECIFIC_CATEGORIES]
}

/** Toți jucătorii activi au fost eliminați la microfon (cuvânt greșit) în runda curentă. */
export function allActivePlayersSpeechEliminated(room: GameRoom): boolean {
  const slots: PlayerSlot[] = []
  if (room.player1_id) slots.push(1)
  if (room.player2_id) slots.push(2)
  if (room.player3_id) slots.push(3)
  if (room.player4_id) slots.push(4)
  if (slots.length === 0) return false
  for (const s of slots) {
    const k = `player${s}_speech_eliminated`
    if ((room as unknown as Record<string, unknown>)[k] !== true) return false
  }
  return true
}
