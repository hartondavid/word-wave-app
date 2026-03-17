export interface GameRoom {
  id: string
  room_code: string
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
  game_status: 'waiting' | 'ready' | 'playing' | 'round_end' | 'finished'
  round_number: number
  round_winner: string | null
  timer_end: string | null
  created_at: string
}

export interface WordPair {
  definition: string
  word: string
}

export const ROUND_DURATION = 60 // seconds per round
export const TOTAL_ROUNDS = 10 // best of 10
export const WIN_SCORE = 6 // first to 6 wins (majority)
