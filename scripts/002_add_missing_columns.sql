-- Add missing columns to game_rooms for WordMatch multiplayer functionality
ALTER TABLE game_rooms 
ADD COLUMN IF NOT EXISTS round_number INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS taboo_words TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS current_clue_giver UUID,
ADD COLUMN IF NOT EXISTS timer_end TIMESTAMPTZ;

-- Create players table for multiplayer support
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL,
  player_name TEXT NOT NULL,
  is_host BOOLEAN DEFAULT false,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on players
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Allow all operations on players (public game, no auth required)
CREATE POLICY "Allow all operations on players" ON players FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for players table
ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- Index for fast room code lookups on players
CREATE INDEX IF NOT EXISTS idx_players_room_code ON players(room_code);
