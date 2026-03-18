-- Add 4-player support to existing game_rooms table
ALTER TABLE game_rooms
  ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS player3_id TEXT,
  ADD COLUMN IF NOT EXISTS player3_name TEXT,
  ADD COLUMN IF NOT EXISTS player3_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS player3_progress TEXT,
  ADD COLUMN IF NOT EXISTS player3_ready BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS player4_id TEXT,
  ADD COLUMN IF NOT EXISTS player4_name TEXT,
  ADD COLUMN IF NOT EXISTS player4_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS player4_progress TEXT,
  ADD COLUMN IF NOT EXISTS player4_ready BOOLEAN DEFAULT false;

-- Backfill max_players for existing rooms
UPDATE game_rooms SET max_players = 2 WHERE max_players IS NULL;
