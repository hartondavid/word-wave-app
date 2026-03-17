-- Drop existing tables and recreate for WordDuel
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS game_rooms CASCADE;

-- Create game_rooms table for WordDuel
CREATE TABLE game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL UNIQUE,
  game_status TEXT NOT NULL DEFAULT 'waiting' CHECK (game_status IN ('waiting', 'ready', 'playing', 'round_end', 'finished')),
  
  -- Players (2 players max)
  player1_id TEXT,
  player1_name TEXT,
  player1_score INTEGER DEFAULT 0,
  player1_progress TEXT DEFAULT '',
  player1_ready BOOLEAN DEFAULT false,
  
  player2_id TEXT,
  player2_name TEXT,
  player2_score INTEGER DEFAULT 0,
  player2_progress TEXT DEFAULT '',
  player2_ready BOOLEAN DEFAULT false,
  
  -- Current round
  current_round INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 10,
  current_definition TEXT,
  current_word TEXT,
  round_winner TEXT,
  round_end_time TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

-- Allow all operations (guest-based game)
CREATE POLICY "Allow all operations on game_rooms" ON game_rooms FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster room lookups
CREATE INDEX idx_game_rooms_code ON game_rooms(room_code);
CREATE INDEX idx_game_rooms_status ON game_rooms(game_status);
