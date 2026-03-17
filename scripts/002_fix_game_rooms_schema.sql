-- Add missing columns to game_rooms table
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS round_number INTEGER DEFAULT 0;
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS taboo_words TEXT[];
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS current_clue_giver UUID;
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS timer_end TIMESTAMPTZ;

-- Update game_status check constraint to include 'game_over'
ALTER TABLE game_rooms DROP CONSTRAINT IF EXISTS game_rooms_game_status_check;
ALTER TABLE game_rooms ADD CONSTRAINT game_rooms_game_status_check 
  CHECK (game_status IN ('waiting', 'playing', 'round_end', 'finished', 'game_over'));
