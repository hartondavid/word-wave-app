-- Preset listă categorii la creare cameră: definitions | images („Toate” în modul poze → doar JSON images/).
ALTER TABLE game_rooms
  ADD COLUMN IF NOT EXISTS category_preset TEXT;

COMMENT ON COLUMN game_rooms.category_preset IS 'definitions | images — pentru category=general, alege pool-ul de fișiere (definitions/ vs images/).';
