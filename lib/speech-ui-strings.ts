/**
 * Mesaje UI pentru microfon: același comportament ca în lib/words.applySpeechTranscriptToProgress
 * (doar cuvânt întreg / frază care îl conține — nu literă cu literă).
 */

export type SpeechUiLang = "ro" | "en"

export function speechUiLang(code: string | null | undefined): SpeechUiLang {
  const raw = (code ?? "en").toString().trim().toLowerCase()
  return raw === "ro" ? "ro" : "en"
}

export type SpeechUiStrings = {
  micTitlePractice: string
  micTitleMultiplayer: string
  micAria: string
  multiplayerEliminatedLine: string
  multiplayerWaitRound: string
  multiplayerHintPlaying: string
  multiplayerHintNoMic: string
  /** round_end fără câștigător — timp expirat */
  multiplayerRoundEndTimeout: string
  /** round_end fără câștigător — toți au greșit la microfon (ca Practice) */
  multiplayerRoundEndAllSpeechWrong: string
  practiceHintPlaying: string
  practiceHintNoMic: string
  practiceWonRound: string
  practiceTimeUp: string
  practiceWrongWord: string
  practiceNextRound: string
  practiceSeeResults: string
}

export function speechUiStrings(lang: SpeechUiLang): SpeechUiStrings {
  if (lang === "ro") {
    return {
      micTitlePractice:
        "Rostește răspunsul întreg (nu o literă). O încercare greșită încheie runda și afișează cuvântul.",
      micTitleMultiplayer:
        "Rostește răspunsul întreg (nu o literă). O încercare greșită îți oprește tura până la sfârșitul runde.",
      micAria: "Rostește cuvântul întreg",
      multiplayerEliminatedLine:
        "Cuvântul rostit nu s-a potrivit — nu mai poți juca până se termină runda.",
      multiplayerWaitRound: "Așteaptă să se termine runda.",
      multiplayerHintPlaying:
        "Taste pentru litere; microfonul pentru cuvântul întreg (nu o singură literă).",
      multiplayerHintNoMic: "Folosește tastele pentru a completa cuvântul.",
      multiplayerRoundEndTimeout: "Timpul a expirat!",
      multiplayerRoundEndAllSpeechWrong: "Răspuns greșit la microfon — cuvântul a fost afișat.",
      practiceHintPlaying:
        "Taste pentru litere sau microfonul pentru cuvântul întreg (nu o singură literă).",
      practiceHintNoMic: "Folosește tastele pentru a completa cuvântul.",
      practiceWonRound: "Ai câștigat runda!",
      practiceTimeUp: "Timpul a expirat!",
      practiceWrongWord: "Răspuns greșit la microfon — cuvântul a fost afișat.",
      practiceNextRound: "Runda următoare",
      practiceSeeResults: "Vezi rezultatele",
    }
  }
  return {
    micTitlePractice:
      "Say the whole answer word (not one letter). A wrong try ends the round and reveals the answer.",
    micTitleMultiplayer:
      "Say the whole answer (not one letter). A wrong try ends your turn until the round ends.",
    micAria: "Say the whole word",
    multiplayerEliminatedLine:
      "Spoken word didn't match — you can't play until this round ends.",
    multiplayerWaitRound: "Wait for this round to finish.",
    multiplayerHintPlaying:
      "Letter keys to type; mic for the whole word (not a single letter).",
    multiplayerHintNoMic: "Press letter keys to fill in the word.",
    multiplayerRoundEndTimeout: "Time's Up!",
    multiplayerRoundEndAllSpeechWrong: "Wrong Word!",
    practiceHintPlaying:
      "Press letter keys, or use the mic to say the whole word (not a single letter).",
    practiceHintNoMic: "Press letter keys to fill in the word.",
    practiceWonRound: "You Win!",
    practiceTimeUp: "Time's Up!",
    practiceWrongWord: "Wrong Word!",
    practiceNextRound: "Next Round",
    practiceSeeResults: "See Results",
  }
}
