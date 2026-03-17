-- Game rooms table for WordMatch multiplayer
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  player1_name TEXT,
  player2_name TEXT,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  current_round INTEGER DEFAULT 1,
  total_rounds INTEGER DEFAULT 5,
  current_word TEXT,
  current_definition TEXT,
  revealed_letters TEXT DEFAULT '',
  game_status TEXT DEFAULT 'waiting' CHECK (game_status IN ('waiting', 'playing', 'round_end', 'finished')),
  round_winner TEXT,
  round_start_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

-- Allow all operations (public game, no auth required)
CREATE POLICY "Allow all operations on game_rooms" ON game_rooms FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;

-- Index for fast room code lookups
CREATE INDEX IF NOT EXISTS idx_game_rooms_room_code ON game_rooms(room_code);
