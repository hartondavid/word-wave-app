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
