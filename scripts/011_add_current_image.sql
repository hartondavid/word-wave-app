-- Round image URL for image-based categories (same source as practice WordPair.image).
ALTER TABLE game_rooms
  ADD COLUMN IF NOT EXISTS current_image TEXT;

COMMENT ON COLUMN game_rooms.current_image IS 'Optional image URL for the current round (Cloudinary etc.); cleared when word is cleared.';
