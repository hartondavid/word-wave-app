export interface Player {
  id: string
  room_code: string
  player_name: string
  score: number
  is_host: boolean
  created_at: string
}

export interface GameRoom {
  id: string
  room_code: string
  current_word: string | null
  taboo_words: string[] | null
  current_clue_giver: string | null
  game_status: 'waiting' | 'playing' | 'round_end' | 'game_over'
  round_number: number
  timer_end: string | null
  created_at: string
}

export interface GameState {
  room: GameRoom | null
  players: Player[]
  currentPlayer: Player | null
  isClueGiver: boolean
  timeRemaining: number
}

export const ROUND_DURATION = 60 // seconds
export const TOTAL_ROUNDS = 3
export const WIN_SCORE = 10
