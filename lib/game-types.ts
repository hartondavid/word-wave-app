export type PlayerSlot = 1 | 2 | 3 | 4

export interface GameRoom {
  id: string
  room_code: string
  max_players: number
  category?: string | null
  language?: string | null

  current_word: string | null
  current_definition: string | null

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
  round_end_time: string | null
  created_at: string
  updated_at: string
}

export interface WordPair {
  definition: string
  word: string
}

export const ROUND_DURATION = 60
export const TOTAL_ROUNDS = 10
export const WIN_SCORE = 6

// P1 Blue | P2 Amber | P3 Emerald | P4 Violet
export const PLAYER_COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6'] as const

export const LANGUAGES = {
  en: { label: 'English', flag: '🇬🇧' },
  ro: { label: 'Română', flag: '🇷🇴' },
  es: { label: 'Español', flag: '🇪🇸' },
  fr: { label: 'Français', flag: '🇫🇷' },
  de: { label: 'Deutsch', flag: '🇩🇪' },
} as const

export type LanguageKey = keyof typeof LANGUAGES

export const CATEGORIES = {
  general:    { label: 'Toate',       emoji: '🌐' },
  emotii:     { label: 'Emoții',     emoji: '😊' },
  relatii:    { label: 'Relații',    emoji: '🤝' },
  timp:       { label: 'Timp',       emoji: '⏰' },
  succes:     { label: 'Succes',     emoji: '🏆' },
  valori:     { label: 'Valori',     emoji: '⚖️' },
  caracter:   { label: 'Caracter',   emoji: '🎭' },
  minte:      { label: 'Minte',      emoji: '🧠' },
  corp:       { label: 'Corp',       emoji: '🫀' },
  munca:      { label: 'Muncă',      emoji: '💼' },
  familie:    { label: 'Familie',    emoji: '👨‍👩‍👧' },
  prietenie:  { label: 'Prietenie',  emoji: '🤗' },
  iubire:     { label: 'Iubire',     emoji: '❤️' },
  libertate:  { label: 'Libertate',  emoji: '🕊️' },
  credinta:   { label: 'Credință',   emoji: '🙏' },
  sanatate:   { label: 'Sănătate',   emoji: '💊' },
  educatie:   { label: 'Educație',   emoji: '📚' },
  natura:     { label: 'Natură',     emoji: '🌿' },
  societate:  { label: 'Societate',  emoji: '🏛️' },
  filosofie:  { label: 'Filosofie',  emoji: '💭' },
  persoana:   { label: 'Persoană',   emoji: '👤' },
} as const

export type CategoryKey = keyof typeof CATEGORIES

// All specific category keys (excludes 'general')
export const SPECIFIC_CATEGORIES = Object.keys(CATEGORIES).filter(k => k !== 'general') as Exclude<CategoryKey, 'general'>[]
