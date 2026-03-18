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

// Built-in fallback pairs per category — used when the JSON file hasn't been
// generated yet (before running generate-all-categories.js).
const FALLBACK_BY_CATEGORY: Record<string, WordPair[]> = {
  animals: [
    { word: "cat",    definition: "Animal that meows and chases mice" },
    { word: "dog",    definition: "Animal that barks" },
    { word: "lion",   definition: "King of the jungle" },
    { word: "bird",   definition: "Animal with wings and feathers" },
    { word: "fish",   definition: "Animal that lives in water and has gills" },
    { word: "bear",   definition: "Large furry animal that hibernates in winter" },
    { word: "wolf",   definition: "Wild canine that howls at the moon" },
    { word: "eagle",  definition: "Large bird of prey with sharp talons" },
    { word: "frog",   definition: "Small amphibian that jumps and croaks" },
    { word: "shark",  definition: "Large predatory fish with sharp teeth" },
  ],
  food: [
    { word: "apple",    definition: "Red or green fruit that keeps doctors away" },
    { word: "bread",    definition: "Baked food made from flour and yeast" },
    { word: "cake",     definition: "Sweet dessert for birthdays" },
    { word: "milk",     definition: "White liquid from cows" },
    { word: "rice",     definition: "Small white grains eaten across Asia" },
    { word: "soup",     definition: "Hot liquid food cooked in a pot" },
    { word: "cheese",   definition: "Dairy product made from curdled milk" },
    { word: "pasta",    definition: "Italian food made from flour and water" },
    { word: "mango",    definition: "Tropical orange fruit with a big seed" },
    { word: "honey",    definition: "Sweet golden syrup made by bees" },
  ],
  objects: [
    { word: "book",   definition: "Bound collection of written pages" },
    { word: "chair",  definition: "Piece of furniture for sitting" },
    { word: "clock",  definition: "Device that shows what time it is" },
    { word: "lamp",   definition: "Device that gives off light" },
    { word: "key",    definition: "Small metal tool used to open locks" },
    { word: "mirror", definition: "Reflective surface used to see yourself" },
    { word: "phone",  definition: "Device for making calls" },
    { word: "door",   definition: "Barrier that opens and closes an entrance" },
    { word: "pen",    definition: "Tool for writing with ink" },
    { word: "bag",    definition: "Container carried by hand or on the back" },
  ],
  people: [
    { word: "doctor",  definition: "Person who treats illness and heals patients" },
    { word: "teacher", definition: "Person who educates students" },
    { word: "chef",    definition: "Person who cooks food professionally" },
    { word: "pilot",   definition: "Person who flies an aircraft" },
    { word: "nurse",   definition: "Person who cares for sick patients" },
    { word: "judge",   definition: "Person who decides legal cases in court" },
    { word: "farmer",  definition: "Person who grows crops and raises animals" },
    { word: "actor",   definition: "Person who performs roles on stage or screen" },
    { word: "king",    definition: "Male ruler of a kingdom" },
    { word: "archer",  definition: "Person who shoots arrows with a bow" },
  ],
  places: [
    { word: "school",   definition: "Building where students learn" },
    { word: "hospital", definition: "Building where sick people are treated" },
    { word: "beach",    definition: "Place with sand and waves" },
    { word: "forest",   definition: "Large area covered with trees" },
    { word: "mountain", definition: "Very tall rocky landform" },
    { word: "library",  definition: "Place to borrow books" },
    { word: "castle",   definition: "Large fortified building from medieval times" },
    { word: "island",   definition: "Piece of land completely surrounded by water" },
    { word: "desert",   definition: "Very dry sandy landscape with little rain" },
    { word: "river",    definition: "Long body of water that flows to the sea" },
  ],
  nature: [
    { word: "tree",   definition: "Tall plant with a trunk and leaves" },
    { word: "rain",   definition: "Water droplets falling from clouds" },
    { word: "snow",   definition: "Frozen water falling from the sky" },
    { word: "cloud",  definition: "White fluffy mass of water vapour in the sky" },
    { word: "sun",    definition: "Star at the center of our solar system" },
    { word: "moon",   definition: "Earth's natural satellite" },
    { word: "fire",   definition: "Hot glowing result of combustion" },
    { word: "rock",   definition: "Hard solid mineral material" },
    { word: "flower", definition: "Colourful bloom of a plant" },
    { word: "wind",   definition: "Moving air you can feel but not see" },
  ],
  vehicles: [
    { word: "car",        definition: "Four-wheeled motor vehicle for roads" },
    { word: "bus",        definition: "Large vehicle that carries many passengers" },
    { word: "train",      definition: "Vehicle that runs on rails" },
    { word: "plane",      definition: "Vehicle that flies in the sky" },
    { word: "boat",       definition: "Small vessel that travels on water" },
    { word: "bike",       definition: "Vehicle with two wheels and pedals" },
    { word: "truck",      definition: "Large vehicle for carrying heavy loads" },
    { word: "ship",       definition: "Large vessel that sails across the ocean" },
    { word: "rocket",     definition: "Vehicle that launches into space" },
    { word: "helicopter", definition: "Aircraft that lifts off using rotating blades" },
  ],
  clothes: [
    { word: "shirt",   definition: "Garment worn on the upper body" },
    { word: "shoes",   definition: "Footwear worn to protect your feet" },
    { word: "hat",     definition: "Head covering worn for fashion or sun protection" },
    { word: "jacket",  definition: "Short coat worn over other clothes" },
    { word: "dress",   definition: "One-piece garment worn by women" },
    { word: "coat",    definition: "Long outer garment worn in cold weather" },
    { word: "boots",   definition: "Footwear that covers the ankle and lower leg" },
    { word: "gloves",  definition: "Garment worn on the hands for warmth" },
    { word: "scarf",   definition: "Long fabric worn around the neck for warmth" },
    { word: "suit",    definition: "Matching jacket and trousers for formal occasions" },
  ],
  sports: [
    { word: "soccer",    definition: "Sport played with a round ball and two goals" },
    { word: "tennis",    definition: "Sport played with rackets and a yellow ball" },
    { word: "boxing",    definition: "Combat sport fought with fists and gloves" },
    { word: "golf",      definition: "Sport where you hit a ball into a hole" },
    { word: "rugby",     definition: "Contact sport played with an oval ball" },
    { word: "hockey",    definition: "Sport played on ice or grass with a stick" },
    { word: "swimming",  definition: "Sport where you move through water using your body" },
    { word: "cycling",   definition: "Sport or activity of riding a bicycle" },
    { word: "skiing",    definition: "Sport of sliding down snow on long runners" },
    { word: "archery",   definition: "Sport of shooting arrows at a target" },
  ],
  body: [
    { word: "hand",     definition: "Part of the arm below the wrist with fingers" },
    { word: "heart",    definition: "Organ that pumps blood through your body" },
    { word: "eye",      definition: "Organ used for seeing" },
    { word: "nose",     definition: "Organ used for smelling and breathing" },
    { word: "ear",      definition: "Organ used for hearing" },
    { word: "mouth",    definition: "Opening in the face used for eating and speaking" },
    { word: "knee",     definition: "Joint in the middle of your leg" },
    { word: "thumb",    definition: "Shortest and thickest finger on the hand" },
    { word: "spine",    definition: "Column of bones running down your back" },
    { word: "skull",    definition: "Bony structure that protects the brain" },
  ],
}

function getRandomFallback(category: string): WordPair {
  const pairs = FALLBACK_BY_CATEGORY[category]
  if (pairs && pairs.length > 0) {
    return pairs[Math.floor(Math.random() * pairs.length)]
  }
  return getRandomLocalPair()
}

// Fetch a definition from a pre-generated static JSON file in /public/<category>.json.
// Falls back to built-in category-specific pairs so the category always matches.
export async function getDefinitionByCategory(category: string): Promise<WordPair> {
  try {
    // Absolute URL avoids path-resolution issues in all environments
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const res = await fetch(`${origin}/${category}.json`, { cache: "no-store" })
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${category}.json`)
    const defs: WordPair[] = await res.json()
    if (!Array.isArray(defs) || defs.length === 0) throw new Error(`${category}.json is empty`)
    const pair = defs[Math.floor(Math.random() * defs.length)]
    if (!pair?.word || !pair?.definition) throw new Error("invalid pair in JSON")
    return pair
  } catch (err) {
    console.warn(`[WordWave] category JSON failed — using built-in fallback. Reason: ${err}`)
    return getRandomFallback(category)
  }
}

// All specific category keys (must stay in sync with CATEGORIES in game-types.ts)
const SPECIFIC_CATEGORY_KEYS = [
  'animals','food','objects','people','places','nature','vehicles','clothes','sports','body',
]

// Pick a random definition from ALL categories combined.
async function getDefinitionForGeneral(): Promise<WordPair> {
  const randomCategory = SPECIFIC_CATEGORY_KEYS[Math.floor(Math.random() * SPECIFIC_CATEGORY_KEYS.length)]
  return getDefinitionByCategory(randomCategory)
}

// Unified word fetcher:
//   general  → random pick across all categories
//   specific → uses that category's JSON (falls back to built-in pairs)
//   null/undefined → Open Trivia API
export async function fetchWordPairForCategory(category?: string | null): Promise<WordPair> {
  if (!category) return fetchWordPair()
  if (category === 'general') return getDefinitionForGeneral()
  return getDefinitionByCategory(category)
}
