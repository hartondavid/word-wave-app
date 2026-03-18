-- Migration 007: add max_rounds column
ALTER TABLE game_rooms
  ADD COLUMN IF NOT EXISTS max_rounds INTEGER DEFAULT 10;

UPDATE game_rooms SET max_rounds = 10 WHERE max_rounds IS NULL;
