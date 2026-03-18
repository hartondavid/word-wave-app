-- Migration 008: add language column for multilingual definitions
ALTER TABLE game_rooms
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

UPDATE game_rooms SET language = 'en' WHERE language IS NULL;
