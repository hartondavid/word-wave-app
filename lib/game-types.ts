export type PlayerSlot = 1 | 2 | 3 | 4

export interface GameRoom {
  id: string
  room_code: string
  max_players: number
  category?: string | null

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

export const CATEGORIES = {
  general:  { label: 'General',  emoji: '🌐' },
  animals:  { label: 'Animals',  emoji: '🐾' },
  food:     { label: 'Food',     emoji: '🍕' },
  objects:  { label: 'Objects',  emoji: '📦' },
  people:   { label: 'People',   emoji: '👤' },
  places:   { label: 'Places',   emoji: '🌍' },
  nature:   { label: 'Nature',   emoji: '🌿' },
  vehicles: { label: 'Vehicles', emoji: '🚗' },
  clothes:  { label: 'Clothes',  emoji: '👕' },
  sports:   { label: 'Sports',   emoji: '⚽' },
  body:     { label: 'Body',     emoji: '🫀' },
} as const

export type CategoryKey = keyof typeof CATEGORIES

// All specific category keys (excludes 'general')
export const SPECIFIC_CATEGORIES = Object.keys(CATEGORIES).filter(k => k !== 'general') as Exclude<CategoryKey, 'general'>[]
