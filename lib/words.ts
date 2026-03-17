export interface WordCard {
  word: string
  tabooWords: string[]
}

// Fallback local words (50 pairs) - used when API fails or offline
export const localWordCards: WordCard[] = [
  { word: "BEACH", tabooWords: ["sand", "ocean", "sun", "water", "waves"] },
  { word: "PIZZA", tabooWords: ["cheese", "pepperoni", "Italian", "slice", "crust"] },
  { word: "BASKETBALL", tabooWords: ["hoop", "court", "dribble", "NBA", "ball"] },
  { word: "ELEPHANT", tabooWords: ["trunk", "big", "Africa", "gray", "ears"] },
  { word: "BIRTHDAY", tabooWords: ["cake", "candles", "party", "presents", "celebrate"] },
  { word: "SUPERHERO", tabooWords: ["cape", "powers", "save", "villain", "mask"] },
  { word: "CAMPING", tabooWords: ["tent", "fire", "outdoors", "sleep", "nature"] },
  { word: "CHOCOLATE", tabooWords: ["candy", "sweet", "brown", "cocoa", "dessert"] },
  { word: "RAINBOW", tabooWords: ["colors", "rain", "sky", "arc", "pot of gold"] },
  { word: "DENTIST", tabooWords: ["teeth", "drill", "cavity", "floss", "brush"] },
  { word: "VOLCANO", tabooWords: ["lava", "eruption", "mountain", "hot", "ash"] },
  { word: "ASTRONAUT", tabooWords: ["space", "rocket", "moon", "NASA", "suit"] },
  { word: "LIBRARY", tabooWords: ["books", "quiet", "read", "shelves", "borrow"] },
  { word: "SNOWMAN", tabooWords: ["snow", "carrot", "winter", "cold", "Frosty"] },
  { word: "GUITAR", tabooWords: ["strings", "music", "strum", "rock", "acoustic"] },
  { word: "PENGUIN", tabooWords: ["Antarctica", "ice", "waddle", "bird", "black and white"] },
  { word: "BREAKFAST", tabooWords: ["eggs", "morning", "cereal", "bacon", "toast"] },
  { word: "VAMPIRE", tabooWords: ["blood", "fangs", "Dracula", "bat", "night"] },
  { word: "ROLLERCOASTER", tabooWords: ["amusement park", "ride", "loops", "fast", "scary"] },
  { word: "WEDDING", tabooWords: ["bride", "groom", "ring", "marriage", "ceremony"] },
  { word: "PIRATE", tabooWords: ["ship", "treasure", "parrot", "eyepatch", "hook"] },
  { word: "SUNGLASSES", tabooWords: ["eyes", "shade", "summer", "UV", "cool"] },
  { word: "FIREFIGHTER", tabooWords: ["fire", "hose", "truck", "rescue", "helmet"] },
  { word: "KARAOKE", tabooWords: ["sing", "microphone", "lyrics", "song", "bar"] },
  { word: "MAGICIAN", tabooWords: ["magic", "trick", "rabbit", "hat", "wand"] },
  { word: "SKYSCRAPER", tabooWords: ["tall", "building", "city", "floors", "elevator"] },
  { word: "TORNADO", tabooWords: ["wind", "storm", "funnel", "destroy", "Kansas"] },
  { word: "SUSHI", tabooWords: ["fish", "rice", "Japan", "raw", "roll"] },
  { word: "DETECTIVE", tabooWords: ["mystery", "clues", "solve", "crime", "investigate"] },
  { word: "UNICORN", tabooWords: ["horn", "magical", "horse", "rainbow", "mythical"] },
  { word: "POPCORN", tabooWords: ["movie", "butter", "kernel", "snack", "theater"] },
  { word: "DINOSAUR", tabooWords: ["extinct", "prehistoric", "T-Rex", "fossils", "Jurassic"] },
  { word: "PHOTOGRAPHER", tabooWords: ["camera", "picture", "photo", "lens", "shoot"] },
  { word: "HAMBURGER", tabooWords: ["beef", "bun", "patty", "fast food", "grill"] },
  { word: "KOALA", tabooWords: ["Australia", "eucalyptus", "bear", "cute", "tree"] },
  { word: "LIGHTHOUSE", tabooWords: ["beacon", "ocean", "ships", "light", "coast"] },
  { word: "MERMAID", tabooWords: ["tail", "ocean", "fish", "swim", "Ariel"] },
  { word: "AIRPORT", tabooWords: ["plane", "fly", "terminal", "boarding", "travel"] },
  { word: "GIRAFFE", tabooWords: ["neck", "tall", "spots", "Africa", "zoo"] },
  { word: "TREEHOUSE", tabooWords: ["tree", "kids", "climb", "ladder", "fort"] },
  { word: "COFFEE", tabooWords: ["caffeine", "espresso", "morning", "beans", "Starbucks"] },
  { word: "HOSPITAL", tabooWords: ["doctor", "nurse", "sick", "emergency", "medicine"] },
  { word: "BUTTERFLY", tabooWords: ["wings", "caterpillar", "metamorphosis", "colorful", "insect"] },
  { word: "CARNIVAL", tabooWords: ["rides", "games", "cotton candy", "ferris wheel", "clown"] },
  { word: "MOTORCYCLE", tabooWords: ["bike", "helmet", "wheels", "Harley", "ride"] },
  { word: "AQUARIUM", tabooWords: ["fish", "tank", "water", "sharks", "marine"] },
  { word: "ORCHESTRA", tabooWords: ["music", "symphony", "conductor", "instruments", "classical"] },
  { word: "SUBMARINE", tabooWords: ["underwater", "navy", "periscope", "ocean", "dive"] },
  { word: "TREASURE", tabooWords: ["gold", "chest", "pirate", "map", "buried"] },
  { word: "WATERFALL", tabooWords: ["water", "cliff", "Niagara", "nature", "cascade"] },
]

interface TriviaResponse {
  response_code: number
  results: {
    category: string
    type: string
    difficulty: string
    question: string
    correct_answer: string
    incorrect_answers: string[]
  }[]
}

// Decode HTML entities from API response
function decodeHtml(html: string): string {
  const txt = document.createElement("textarea")
  txt.innerHTML = html
  return txt.value
}

// Extract keywords from a question to use as taboo words
function extractTabooWords(question: string, answer: string, incorrectAnswers: string[]): string[] {
  // Decode HTML entities
  const decodedQuestion = decodeHtml(question)
  const decodedAnswer = decodeHtml(answer)
  
  // Common words to exclude
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "what", "which", "who", "whom",
    "this", "that", "these", "those", "am", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might", "must",
    "shall", "can", "need", "dare", "ought", "used", "to", "of", "in", "for", "on",
    "with", "at", "by", "from", "as", "into", "through", "during", "before", "after",
    "above", "below", "between", "under", "again", "further", "then", "once", "here",
    "there", "when", "where", "why", "how", "all", "each", "few", "more", "most",
    "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than",
    "too", "very", "just", "also", "now", "and", "but", "or", "because", "if", "its",
    "following", "called", "known", "name", "named", "following", "word", "term"
  ])

  // Extract words from question (excluding the answer itself)
  const questionWords = decodedQuestion
    .replace(/[^a-zA-Z\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2)
    .filter(word => !stopWords.has(word.toLowerCase()))
    .filter(word => word.toLowerCase() !== decodedAnswer.toLowerCase())
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())

  // Add incorrect answers as taboo words (up to 2)
  const incorrectTaboo = incorrectAnswers
    .slice(0, 2)
    .map(a => decodeHtml(a))
    .filter(a => a.toLowerCase() !== decodedAnswer.toLowerCase())

  // Combine and dedupe
  const allWords = [...new Set([...incorrectTaboo, ...questionWords])]
  
  // Return first 5 unique taboo words
  return allWords.slice(0, 5)
}

// Fetch a word card from Open Trivia Database API
export async function fetchWordFromAPI(): Promise<WordCard | null> {
  try {
    const response = await fetch(
      "https://opentdb.com/api.php?amount=1&difficulty=easy&type=multiple",
      { 
        cache: "no-store",
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    )
    
    if (!response.ok) {
      throw new Error("API response not ok")
    }

    const data: TriviaResponse = await response.json()
    
    if (data.response_code !== 0 || !data.results.length) {
      throw new Error("No trivia results")
    }

    const trivia = data.results[0]
    const answer = decodeHtml(trivia.correct_answer).toUpperCase()
    const tabooWords = extractTabooWords(
      trivia.question,
      trivia.correct_answer,
      trivia.incorrect_answers
    )

    // Make sure we have at least 3 taboo words
    if (tabooWords.length < 3) {
      throw new Error("Not enough taboo words generated")
    }

    return {
      word: answer,
      tabooWords,
    }
  } catch (error) {
    console.error("Failed to fetch from trivia API:", error)
    return null
  }
}

// Get a random word card - tries API first, falls back to local
export async function getRandomWordCard(): Promise<WordCard> {
  // Try API first
  const apiCard = await fetchWordFromAPI()
  if (apiCard) {
    return apiCard
  }

  // Fallback to local words
  const randomIndex = Math.floor(Math.random() * localWordCards.length)
  return localWordCards[randomIndex]
}

// Synchronous fallback for immediate use (local only)
export function getRandomLocalCard(): WordCard {
  const randomIndex = Math.floor(Math.random() * localWordCards.length)
  return localWordCards[randomIndex]
}

// Legacy function for compatibility
export function getRandomCards(count: number): WordCard[] {
  const shuffled = [...localWordCards].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function getCardByWord(word: string): WordCard | undefined {
  return localWordCards.find(card => card.word === word)
}
