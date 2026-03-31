import type { CategoryKey } from "@/lib/game-types"

export type HomePlayFormLocale = "en" | "ro"

const CATEGORY_LABELS_RO: Record<CategoryKey, string> = {
  general: "Toate",
  emotii: "Emoții",
  relatii: "Relații",
  timp: "Timp",
  succes: "Succes",
  valori: "Valori",
  caracter: "Caracter",
  minte: "Minte",
  corp: "Corp",
  munca: "Muncă",
  familie: "Familie",
  prietenie: "Prietenie",
  iubire: "Iubire",
  libertate: "Libertate",
  credinta: "Credință",
  sanatate: "Sănătate",
  educatie: "Educație",
  natura: "Natură",
  societate: "Societate",
  filosofie: "Filosofie",
  persoana: "Sine",
}

export function categoryLabelForLocale(
  key: CategoryKey,
  categoryEn: string,
  emoji: string,
  locale: HomePlayFormLocale
): string {
  if (locale === "en") return `${emoji} ${categoryEn}`
  return `${emoji} ${CATEGORY_LABELS_RO[key]}`
}

export type HomePlayFormStrings = {
  nameRequired: string
  nameTooShort: string
  nameTaken: string
  roundsMin1: string
  failedCreate: (msg: string) => string
  roomCodeInvalid: string
  roomNotFound: string
  cannotJoinNow: string
  roomFull: string
  migration34: string
  failedJoin: (msg: string) => string
  cardTitle: string
  cardDescription: string
  yourName: string
  nicknamePlaceholder: string
  category: string
  definitionLanguage: string
  definitionLanguageAria: string
  numberOfRounds: string
  roundsMinHint: string
  roundsPlaceholder: string
  roundTimer: string
  roundTimerAria: string
  sec30: string
  sec60: string
  letterHints: string
  letterHintsHint: string
  practiceSolo: string
  multiplayerDivider: string
  createRoomTab: string
  joinRoomTab: string
  numberOfPlayers: string
  playerCountButtonAria: (n: number) => string
  shareCodeWithFriends: (n: number) => string
  creating: string
  createRoomButton: (n: number) => string
  createRoomValidationAria: string
  roomCode: string
  joining: string
  joinGame: string
}

const STRINGS: Record<HomePlayFormLocale, HomePlayFormStrings> = {
  en: {
    nameRequired: "Please enter your name",
    nameTooShort: "Name must be at least 2 characters",
    nameTaken: "This name is already taken in the room.",
    roundsMin1: "Number of rounds must be at least 1",
    failedCreate: (msg) => `Failed to create room: ${msg}`,
    roomCodeInvalid: "Please enter a valid 4-character room code",
    roomNotFound: "Room not found. Check the code and try again.",
    cannotJoinNow: "You can't join this room right now.",
    roomFull: "Room is full. Try another code.",
    migration34:
      "3–4 player support needs a DB migration. Run scripts/005_add_4player_support.sql in Supabase.",
    failedJoin: (msg) => `Failed to join room: ${msg}`,
    cardTitle: "Play Now",
    cardDescription: "Practice solo or multiplayer with friends",
    yourName: "Your Name",
    nicknamePlaceholder: "Enter your nickname",
    category: "Category",
    definitionLanguage: "Definition & word language",
    definitionLanguageAria: "Definition and word language",
    numberOfRounds: "Number of Rounds",
    roundsMinHint: "(min 1)",
    roundsPlaceholder: "e.g. 10",
    roundTimer: "Round timer",
    roundTimerAria: "Round timer length for practice and new multiplayer rooms",
    sec30: "30 seconds",
    sec60: "60 seconds",
    letterHints: "Letter hints",
    letterHintsHint:
      "Show hint button in rounds (up to 3 random letters per round)",
    practiceSolo: "Practice Solo",
    multiplayerDivider: "Multiplayer",
    createRoomTab: "Create Room",
    joinRoomTab: "Join Room",
    numberOfPlayers: "Number of Players",
    playerCountButtonAria: (n) => `${n} players in the room`,
    shareCodeWithFriends: (maxPlayers) =>
      `Share the room code with ${maxPlayers - 1} friend${maxPlayers > 2 ? "s" : ""} to start`,
    creating: "Creating...",
    createRoomButton: (n) => `Create ${n} Players Room`,
    createRoomValidationAria: "Create room validation",
    roomCode: "Room Code",
    joining: "Joining...",
    joinGame: "Join Game",
  },
  ro: {
    nameRequired: "Introdu numele",
    nameTooShort: "Numele trebuie să aibă cel puțin 2 caractere",
    nameTaken: "Acest nume e deja folosit în cameră.",
    roundsMin1: "Numărul de runde trebuie să fie cel puțin 1",
    failedCreate: (msg) => `Nu s-a putut crea camera: ${msg}`,
    roomCodeInvalid: "Introdu un cod de cameră valid din 4 caractere",
    roomNotFound: "Camera nu a fost găsită. Verifică codul și încearcă din nou.",
    cannotJoinNow: "Nu te poți alătura camerei în acest moment.",
    roomFull: "Camera e plină. Încearcă alt cod.",
    migration34:
      "Suportul pentru 3–4 jucători necesită migrare în baza de date. Rulează scripts/005_add_4player_support.sql în Supabase.",
    failedJoin: (msg) => `Nu s-a putut intra în cameră: ${msg}`,
    cardTitle: "Joacă acum",
    cardDescription: "Exersează singur sau joacă multiplayer cu prietenii",
    yourName: "Numele tău",
    nicknamePlaceholder: "Pseudonim",
    category: "Categorie",
    definitionLanguage: "Limba definiției și a cuvântului",
    definitionLanguageAria: "Limba definiției și a cuvântului",
    numberOfRounds: "Număr de runde",
    roundsMinHint: "(min. 1)",
    roundsPlaceholder: "ex. 10",
    roundTimer: "Cronometru rundă",
    roundTimerAria: "Durata rundei pentru practică și camere multiplayer noi",
    sec30: "30 secunde",
    sec60: "60 secunde",
    letterHints: "Indicii cu litere",
    letterHintsHint:
      "Afișează butonul de indiciu în runde (până la 3 litere aleatoare pe rundă)",
    practiceSolo: "Practică singur",
    multiplayerDivider: "Multiplayer",
    createRoomTab: "Creează cameră",
    joinRoomTab: "Intră în cameră",
    numberOfPlayers: "Număr de jucători",
    playerCountButtonAria: (n) => `Cameră cu ${n} jucători`,
    shareCodeWithFriends: (maxPlayers) => {
      const n = maxPlayers - 1
      if (n === 1) return "Distribuie codul camerei cu un prieten ca să începeți"
      return `Distribuie codul camerei cu ${n} prieteni ca să începeți`
    },
    creating: "Se creează...",
    createRoomButton: (players) => `Creează cameră (${players} jucători)`,
    createRoomValidationAria: "Validare creare cameră",
    roomCode: "Cod cameră",
    joining: "Te alături...",
    joinGame: "Intră în joc",
  },
}

export function getHomePlayFormStrings(locale: HomePlayFormLocale): HomePlayFormStrings {
  return STRINGS[locale]
}
