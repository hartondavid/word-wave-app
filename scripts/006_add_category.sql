-- Add category column to game_rooms for the dynamic category system
ALTER TABLE game_rooms
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
