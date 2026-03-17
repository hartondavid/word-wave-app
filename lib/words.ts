export interface WordCard {
  word: string
  tabooWords: string[]
}

export const wordCards: WordCard[] = [
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
]

export function getRandomCards(count: number): WordCard[] {
  const shuffled = [...wordCards].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function getCardByWord(word: string): WordCard | undefined {
  return wordCards.find(card => card.word === word)
}
