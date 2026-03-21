/**
 * Potrivire voce pentru cuvânt: un singur flux pentru Practice și multiplayer.
 * (colectare transcrieri + `applySpeechTranscriptsToProgress` din `lib/words.ts`)
 */
import { languageForMultiplayerRoom } from "@/lib/game-types"
import {
  collectSpeechTranscripts,
  speechLocaleForLanguage,
  type SpeechRecognitionResultEventLike,
} from "@/lib/speech-letter"
import { applySpeechTranscriptsToProgress } from "@/lib/words"

/** Multiplayer: limba camerei; dacă lipsește în DB, folosește limba jucătorului (localStorage). */
export function speechLocaleForMultiplayerMic(
  roomLanguage: string | null | undefined,
  playerLanguage: string | null | undefined
): string {
  const fromRoom = roomLanguage != null && String(roomLanguage).trim() !== ""
  const raw = fromRoom ? roomLanguage : playerLanguage
  return speechLocaleForLanguage(languageForMultiplayerRoom(raw))
}

/** @deprecated Folosește speechLocaleForMultiplayerMic(room, player) în multiplayer. */
export function speechLocaleForRoundLanguage(lang: string | null | undefined): string {
  return speechLocaleForLanguage(languageForMultiplayerRoom(lang))
}

/** Rezultat din Web Speech API → progres nou sau null dacă nu se potrivește. */
export function applySpeechRecognitionResultToProgress(
  event: SpeechRecognitionResultEventLike,
  currentProgress: string,
  answer: string
): string | null {
  const transcripts = collectSpeechTranscripts(event)
  return applySpeechTranscriptsToProgress(transcripts, currentProgress, answer)
}
