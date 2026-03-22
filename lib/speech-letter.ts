import type { LanguageKey } from "@/lib/game-types"

const SPEECH_LOCALE: Record<LanguageKey, string> = {
  en: "en-US",
  ro: "ro-RO",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
}

export function speechLocaleForLanguage(lang: string | null | undefined): string {
  const k = String(lang ?? "en")
    .trim()
    .toLowerCase() as LanguageKey
  return SPEECH_LOCALE[k] ?? "en-US"
}

/** Instanță minimală Web Speech API (tipuri incomplete în unele TS lib.dom). */
export type SpeechRecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
}

export type SpeechRecognitionResultEventLike = {
  resultIndex?: number
  results: {
    length: number
    [index: number]: {
      isFinal?: boolean
      length: number
      [index: number]: { transcript: string }
    }
  }
}

export type SpeechRecognitionErrorEventLike = {
  error: string
}

export function isBrowserSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
  return !!(w.SpeechRecognition ?? w.webkitSpeechRecognition)
}

/** Prima literă din transcriere (rostire literă cu literă). */
export function firstLetterFromTranscript(text: string): string | null {
  const t = text.normalize("NFC").trim()
  const m = t.match(/\p{L}/u)
  return m ? m[0] : null
}

type SpeechRecCtor = new () => SpeechRecognitionInstance

export function newSpeechRecognitionForLang(lang: string): SpeechRecognitionInstance | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecCtor
    webkitSpeechRecognition?: SpeechRecCtor
  }
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  if (!Ctor) return null
  const rec = new Ctor()
  rec.lang = lang
  rec.interimResults = false
  rec.continuous = false
  /** 3 = câteva alternative fără bug-uri raportate cu valori mari pe WebKit. */
  rec.maxAlternatives = 3
  return rec
}

/** Ultimul segment din eveniment e final (nu mai așteaptă tăcere pentru confirmare). */
export function isLastSpeechResultFinal(event: SpeechRecognitionResultEventLike): boolean {
  const n = event.results.length
  if (n === 0) return false
  const last = event.results[n - 1] as { isFinal?: boolean }
  return last.isFinal === true
}

/** Colectează toate variantele de transcriere din eveniment (alternative + segmente concatenate). */
export function collectSpeechTranscripts(event: SpeechRecognitionResultEventLike): string[] {
  const out = new Set<string>()
  const list = event.results
  const n = list.length

  const add = (s: string | undefined | null) => {
    const t = s?.trim()
    if (t) out.add(t)
  }

  if (n > 0) {
    add(list[n - 1]?.[0]?.transcript)
    if (n > 1) add(list[0]?.[0]?.transcript)
  }

  for (let r = 0; r < n; r++) {
    const res = list[r] as { length?: number; [k: number]: { transcript?: string } }
    if (!res) continue
    const altCount =
      typeof res.length === "number" && res.length > 0 ? res.length : 3
    for (let a = 0; a < altCount; a++) {
      add(res[a]?.transcript)
    }
  }

  if (n > 0) {
    let joined = ""
    for (let r = 0; r < n; r++) {
      joined += list[r]?.[0]?.transcript ?? ""
    }
    add(joined)
  }

  return [...out]
}
