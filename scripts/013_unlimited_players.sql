-- WordMatch Master Migration: Unlimited Players & Full Schema Synchronization
-- This script ensures all tables and columns exist for the latest version of the app.

-- 1. Ensure game_rooms has all required columns
ALTER TABLE public.game_rooms 
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS category_preset TEXT DEFAULT 'definitions',
  ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS round_duration_seconds INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS current_image TEXT,
  ADD COLUMN IF NOT EXISTS round_end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS round_end_reason TEXT,
  ADD COLUMN IF NOT EXISTS player1_id TEXT,
  ADD COLUMN IF NOT EXISTS player1_name TEXT,
  ADD COLUMN IF NOT EXISTS player1_ready BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS player1_progress TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS player1_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS player1_speech_eliminated BOOLEAN DEFAULT false;

-- 2. Create players table if not exists
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL REFERENCES public.game_rooms(room_code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  is_host BOOLEAN DEFAULT false,
  user_id TEXT,
  progress TEXT DEFAULT '',
  is_ready BOOLEAN DEFAULT false,
  speech_eliminated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Ensure players table has all necessary columns for the unlimited player logic
ALTER TABLE public.players 
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS progress TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_ready BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS speech_eliminated BOOLEAN DEFAULT false;

-- 4. Add unique constraint so a user_id can only join a room once
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'players_room_code_user_id_key') THEN
    ALTER TABLE public.players ADD CONSTRAINT players_room_code_user_id_key UNIQUE (room_code, user_id);
  END IF;
END $$;

-- 5. RLS (Row Level Security) Configuration
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read players" ON public.players;
DROP POLICY IF EXISTS "Allow public insert players" ON public.players;
DROP POLICY IF EXISTS "Allow public update players" ON public.players;
DROP POLICY IF EXISTS "Allow public delete players" ON public.players;
CREATE POLICY "Allow public read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Allow public insert players" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update players" ON public.players FOR UPDATE USING (true);
CREATE POLICY "Allow public delete players" ON public.players FOR DELETE USING (true);

-- 6. Enable Realtime for both tables (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'game_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
  END IF;
END $$;
