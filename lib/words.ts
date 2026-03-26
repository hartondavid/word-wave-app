// Normalize a string by removing diacritics, used for loose comparison
export function removeDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

// Try to place a letter in the progress string
// Returns new progress if letter can be placed, null if not valid
export function tryPlaceLetter(
  letter: string,
  currentProgress: string,
  answer: string
): string | null {
  const letterNorm = removeDiacritics(letter.toLowerCase())
  const progressArray = currentProgress.split("")

  for (let i = 0; i < answer.length; i++) {
    const answerNorm = removeDiacritics(answer[i].toLowerCase())
    if (answerNorm === letterNorm && progressArray[i] === "_") {
      progressArray[i] = answer[i]
      return progressArray.join("")
    }
  }

  return null
}

export function isWordComplete(progress: string): boolean {
  return !progress.includes("_")
}

/** Număr de poziții trecute de la `_` la literă între două progresuri (aceeași lungime). */
export function countNewlyFilledLetters(before: string, after: string): number {
  const n = Math.min(before.length, after.length)
  let c = 0
  for (let i = 0; i < n; i++) {
    if (before[i] === "_" && after[i] !== "_") c++
  }
  return c
}

/** Extrage doar literele Unicode din transcriere (fără spații/punctuație). */
export function normalizeSpeechLetters(text: string): string {
  return Array.from(text.normalize("NFC"))
    .filter((ch) => /\p{L}/u.test(ch))
    .join("")
}

/**
 * Cheie comparabilă pentru voce: fără diacritice + echivalențe ș/ț (inclusiv forme vechi ş/ţ).
 * Folosește doar litere (la fel ca transcrierea) ca să nu strice potrivirea la cratime în răspuns.
 */
export function normalizeForSpeechCompare(raw: string): string {
  let s = removeDiacritics(raw.toLowerCase().normalize("NFC"))
  s = s
    .replace(/[\u0219\u015f\u0218\u015e]/g, "s")
    .replace(/[\u021b\u0163\u021a\u0162]/g, "t")
  return s
}

/** Distanță Levenshtein (răspunsuri scurte). */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const prev = new Array<number>(n + 1)
  const cur = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 0; i < m; i++) {
    cur[0] = i + 1
    for (let j = 0; j < n; j++) {
      const cost = a[i] === b[j] ? 0 : 1
      cur[j + 1] = Math.min(cur[j]! + 1, prev[j + 1]! + 1, prev[j]! + cost)
    }
    for (let j = 0; j <= n; j++) prev[j] = cur[j]!
  }
  return prev[n]!
}

/** Acceptă răspunsul dacă apare în șir cu 1–2 litere greșite (limită după lungime). */
function fuzzyAnswerInSpoken(spokenKey: string, answerKey: string): boolean {
  const n = answerKey.length
  if (n < 3) return false
  const maxDist = n <= 8 ? 1 : 2
  if (Math.abs(spokenKey.length - n) <= 1 && levenshtein(spokenKey, answerKey) <= maxDist) {
    return true
  }
  for (let len = Math.max(2, n - 1); len <= Math.min(spokenKey.length, n + 2); len++) {
    for (let i = 0; i + len <= spokenKey.length; i++) {
      const slice = spokenKey.slice(i, i + len)
      if (levenshtein(slice, answerKey) <= maxDist) return true
    }
  }
  return false
}

function speechMatchesAnswer(spokenKey: string, answerKey: string): boolean {
  if (answerKey.length === 0) return false
  if (spokenKey === answerKey) return true
  if (answerKey.length >= 2 && spokenKey.endsWith(answerKey)) return true
  if (answerKey.length >= 2 && spokenKey.startsWith(answerKey)) return true
  if (answerKey.length >= 3 && spokenKey.includes(answerKey)) return true
  return fuzzyAnswerInSpoken(spokenKey, answerKey)
}

/** Completează toate `_` dacă literele deja afișate coincid cu răspunsul. */
function fillMatchingBlanks(progress: string, answer: string): string | null {
  if (progress.length !== answer.length) return null
  const arr = progress.split("")
  for (let i = 0; i < answer.length; i++) {
    if (arr[i] !== "_") {
      if (removeDiacritics(arr[i].toLowerCase()) !== removeDiacritics(answer[i].toLowerCase())) {
        return null
      }
    }
  }
  for (let i = 0; i < answer.length; i++) {
    if (arr[i] === "_") arr[i] = answer[i]
  }
  return arr.join("")
}

/**
 * Voce: cuvânt întreg sau frază care îl conține; toleranță la diacritice/ș-ț, cratime,
 * până la 1–2 litere greșite pe cuvânt (motorul STT) și până la 5 alternative din eveniment.
 */
export function applySpeechTranscriptToProgress(
  transcript: string,
  currentProgress: string,
  answer: string
): string | null {
  const letters = normalizeSpeechLetters(transcript)
  if (letters.length === 0) return null

  const spokenKey = normalizeForSpeechCompare(letters)
  const answerKey = normalizeForSpeechCompare(normalizeSpeechLetters(answer))

  if (answerKey.length === 0) return null

  if (!speechMatchesAnswer(spokenKey, answerKey)) return null

  return fillMatchingBlanks(currentProgress, answer)
}

/** Încearcă mai multe transcrieri (alternative STT); prima care potrivește câștigă. */
export function applySpeechTranscriptsToProgress(
  transcripts: string[],
  currentProgress: string,
  answer: string
): string | null {
  for (const t of transcripts) {
    const next = applySpeechTranscriptToProgress(t, currentProgress, answer)
    if (next) return next
  }
  return null
}

export function calculateProgress(input: string, answer: string): string {
  const result: string[] = []
  const inputLower = input.toLowerCase()
  const answerLower = answer.toLowerCase()

  for (let i = 0; i < answerLower.length; i++) {
    if (i < inputLower.length && inputLower[i] === answerLower[i]) {
      result.push(answerLower[i].toUpperCase())
    } else {
      result.push("_")
    }
  }

  return result.join("")
}

export function isCorrectAnswer(input: string, answer: string): boolean {
  return input.toLowerCase().trim() === answer.toLowerCase().trim()
}
