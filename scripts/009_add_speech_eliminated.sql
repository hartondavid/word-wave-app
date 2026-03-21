-- Eliminare la microfon (cuvânt greșit) per jucător + motiv sfârșit rundă fără câștigător
ALTER TABLE game_rooms
  ADD COLUMN IF NOT EXISTS player1_speech_eliminated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS player2_speech_eliminated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS player3_speech_eliminated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS player4_speech_eliminated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS round_end_reason TEXT NULL;

COMMENT ON COLUMN game_rooms.round_end_reason IS 'timeout | all_speech_wrong — doar când round_winner e null';
