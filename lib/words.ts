import type { WordPair } from "./game-types"

// 50 fallback word pairs for offline/API failure
export const LOCAL_WORD_PAIRS: WordPair[] = [
  { definition: "Animal that meows and chases mice", word: "cat" },
  { definition: "You drink this when thirsty", word: "water" },
  { definition: "Largest planet in our solar system", word: "jupiter" },
  { definition: "Frozen water falling from sky", word: "snow" },
  { definition: "Yellow fruit monkeys love", word: "banana" },
  { definition: "King of the jungle", word: "lion" },
  { definition: "Hot drink made from beans", word: "coffee" },
  { definition: "Earth's natural satellite", word: "moon" },
  { definition: "Device for making phone calls", word: "phone" },
  { definition: "Red fruit used in ketchup", word: "tomato" },
  { definition: "Large body of salt water", word: "ocean" },
  { definition: "Flying mammal active at night", word: "bat" },
  { definition: "Tool for writing with ink", word: "pen" },
  { definition: "Frozen treat on a stick", word: "popsicle" },
  { definition: "Vehicle with two wheels", word: "bicycle" },
  { definition: "Tall plant with trunk and leaves", word: "tree" },
  { definition: "Building where you sleep at home", word: "house" },
  { definition: "Star at the center of our solar system", word: "sun" },
  { definition: "Sweet dessert for birthdays", word: "cake" },
  { definition: "Animal that barks", word: "dog" },
  { definition: "Writing tool that can be erased", word: "pencil" },
  { definition: "White liquid from cows", word: "milk" },
  { definition: "Colorful arc after rain", word: "rainbow" },
  { definition: "Game with black and white squares", word: "chess" },
  { definition: "Instrument with black and white keys", word: "piano" },
  { definition: "Portable computer", word: "laptop" },
  { definition: "Room where you cook food", word: "kitchen" },
  { definition: "Season after winter", word: "spring" },
  { definition: "Day after Monday", word: "tuesday" },
  { definition: "Opposite of day", word: "night" },
  { definition: "Place with sand and waves", word: "beach" },
  { definition: "Flying insect that makes honey", word: "bee" },
  { definition: "Meal eaten in the morning", word: "breakfast" },
  { definition: "Piece of furniture for sitting", word: "chair" },
  { definition: "Timepiece worn on wrist", word: "watch" },
  { definition: "Person who teaches students", word: "teacher" },
  { definition: "Sport with goals and a round ball", word: "soccer" },
  { definition: "Fruit that keeps doctors away", word: "apple" },
  { definition: "Month of Halloween", word: "october" },
  { definition: "Animal with a long neck", word: "giraffe" },
  { definition: "Striped animal like a horse", word: "zebra" },
  { definition: "Place to borrow books", word: "library" },
  { definition: "Day for gifts and a tree", word: "christmas" },
  { definition: "Meal eaten at midday", word: "lunch" },
  { definition: "Eight-legged sea creature", word: "octopus" },
  { definition: "Cloth worn on your feet", word: "socks" },
  { definition: "Vehicle that flies in the sky", word: "airplane" },
  { definition: "Green vegetable that looks like a tree", word: "broccoli" },
  { definition: "Round vegetable that makes you cry", word: "onion" },
  { definition: "Cold season with short days", word: "winter" },
]

// Get a random local word pair
export function getRandomLocalPair(): WordPair {
  const index = Math.floor(Math.random() * LOCAL_WORD_PAIRS.length)
  return LOCAL_WORD_PAIRS[index]
}

// Decode HTML entities from API response
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#039;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  }

  let decoded = text
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, "g"), char)
  }

  // Handle numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (_, num) => 
    String.fromCharCode(parseInt(num, 10))
  )
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => 
    String.fromCharCode(parseInt(hex, 16))
  )

  return decoded
}

// Fetch word from Open Trivia Database API with fallback
export async function fetchWordPair(): Promise<WordPair> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(
      "https://opentdb.com/api.php?amount=1&difficulty=easy&type=multiple",
      { signal: controller.signal }
    )
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error("API response not ok")
    }

    const data = await response.json()
    
    if (data.response_code !== 0 || !data.results || data.results.length === 0) {
      throw new Error("No results from API")
    }

    const trivia = data.results[0]
    const answer = decodeHTMLEntities(trivia.correct_answer).toLowerCase().trim()
    const question = decodeHTMLEntities(trivia.question)

    // Filter: only accept 3-7 letter single-word answers with only letters
    if (answer.length < 3 || answer.length > 7 || answer.includes(" ") || !/^[a-z]+$/.test(answer)) {
      return getRandomLocalPair()
    }

    return {
      definition: question,
      word: answer,
    }
  } catch {
    return getRandomLocalPair()
  }
}

// Try to place a letter in the progress string
// Returns new progress if letter can be placed, null if not valid
export function tryPlaceLetter(
  letter: string, 
  currentProgress: string, 
  answer: string
): string | null {
  const letterLower = letter.toLowerCase()
  const answerLower = answer.toLowerCase()
  const progressArray = currentProgress.split("")
  
  // Find the first unfilled position where this letter belongs
  for (let i = 0; i < answerLower.length; i++) {
    // If this position matches the letter and is still unfilled
    if (answerLower[i] === letterLower && progressArray[i] === "_") {
      progressArray[i] = letterLower.toUpperCase()
      return progressArray.join("")
    }
  }
  
  // Letter doesn't fit anywhere
  return null
}

// Check if all letters are filled (word is complete)
export function isWordComplete(progress: string): boolean {
  return !progress.includes("_")
}

// Calculate letter-by-letter progress display (for initial setup)
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

// Check if answer is complete and correct (legacy - still needed for direct typing)
export function isCorrectAnswer(input: string, answer: string): boolean {
  return input.toLowerCase().trim() === answer.toLowerCase().trim()
}
