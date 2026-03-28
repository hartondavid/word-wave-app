-- Round timer length per room (seconds). Host sets 30 or 60 on create; default 60 for existing rows.
ALTER TABLE game_rooms
  ADD COLUMN IF NOT EXISTS round_duration_seconds integer NOT NULL DEFAULT 60;

COMMENT ON COLUMN game_rooms.round_duration_seconds IS 'Seconds per typing round (30 or 60).';
