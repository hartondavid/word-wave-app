import type { BlogPost } from "./types"
import { getPostLocale } from "./locale-utils"

/** Titluri și descrieri în română pentru indexul /ro/blog (articolele EN rămân pe /en/blog/[slug]). */
const EN_POST_ROMANIAN_LISTING: Record<string, { title: string; description: string }> = {
  "how-multiplayer-wordwave-works": {
    title: "Cum funcționează multiplayer-ul WordWave (camere, coduri, sincronizare)",
    description:
      "Ghid practic: cum creezi o cameră, distribui codul sau linkul de invitație, folosești „Ready” și ce se întâmplă când patru jucători concurează în timp real.",
  },
  "typing-strategies-fast-rounds": {
    title: "Strategii de tastare pentru runde rapide WordWave",
    description:
      "Poziția degetelor, disciplina după litere greșite și cum transformi definiția în litere corecte sub presiunea cronometrului de un minut.",
  },
  "voice-input-wordwave-best-practices": {
    title: "Microfonul în WordWave: sfaturi pentru recunoaștere pe cuvânt întreg",
    description:
      "Intrarea vocală e opțională. Când ajută, cum diferă browserele și de ce e mai bine să spui cuvântul întreg decât să scrii litere pe rând.",
  },
  "practice-mode-before-hosting-friends": {
    title: "De ce contează modul Practice înainte să fii gazdă",
    description:
      "Antrenamentul solo reflectă rundele reale fără presiune socială — ideal pentru categorii, cronometru și control.",
  },
  "word-categories-change-the-game": {
    title: "Cum schimbă categoriile de cuvinte dificultatea și atmosfera",
    description:
      "Alegerea categoriei influențează vocabularul, referințele culturale și cât de agresiv merită să ghicești.",
  },
  "game-night-checklist-wordwave": {
    title: "Listă pentru o seară de joc: WordWave fără haos",
    description:
      "Checklist în stil „printabil”: gustări, audio, linkuri și integrarea jucătorilor înainte să apeși „creează cameră”.",
  },
  "fair-play-etiquette-multiplayer-word-games": {
    title: "Fair-play și etichetă în jocurile de cuvinte în timp real",
    description:
      "Norme de respect: screen share, spoilere, revanșe și când e ok să abandonezi o rundă blocată.",
  },
  "timer-rounds-scoring-wordwave": {
    title: "Cronometre, runde și scor în WordWave explicate",
    description:
      "Ce se întâmplă la zero, cum se evită egalitățile ambigue și cum numărul de runde se leagă de ecranul de victorie.",
  },
  "brief-history-word-guessing-games": {
    title: "Scurt istoric al jocurilor de ghicit cuvinte online",
    description:
      "De la spânzurătoarea din clasă la browserele sincrone: de ce „bătăliile” de cuvinte în timp real au revenit în anii 2020.",
  },
  "invite-links-room-codes-safety": {
    title: "Linkuri de invitație, coduri de cameră și siguranță de bază",
    description:
      "Ce expune codul camerei, ce nu expune și cum distribui invitații în Discord public fără surprize neplăcute.",
  },
  "mobile-performance-low-latency-tips": {
    title: "Sfaturi pentru WordWave rapid pe mobil (latență mică)",
    description:
      "File deschise, mod economie baterie, tastaturi Bluetooth și rețea — cum reduci milisecundele la fiecare tastă.",
  },
  "definition-language-english-romanian-tips": {
    title: "Limba definițiilor: engleză, română și grupuri cu cititori diferiți",
    description:
      "Cum alege gazda limba indiciilor când unii citesc mai lent sau participă familii bilingve.",
  },
  "wordwave-in-classrooms-and-clubs": {
    title: "WordWave la clasă și în cluburi după școală",
    description:
      "Note pentru profesori: ritm, dificultate, grupuri de elevi și cum păstrezi energia competitivă pozitivă.",
  },
  "colour-progress-bars-and-accessibility": {
    title: "Barele colorate de progres dacă distingi cu greu culorile",
    description:
      "Cum citești progresul adversarilor și ce pot face gazdele ca să includă jucători cu daltonism.",
  },
}

/** Pentru /ro/blog: texte RO pentru listă; articolele markdown rămân cu titlul lor. */
export function romanianListingForPost(post: BlogPost): { title: string; description: string } {
  if (post.source === "markdown" && post.titleRo) {
    return {
      title: post.titleRo,
      description: post.descriptionRo ?? post.description,
    }
  }
  if (getPostLocale(post) === "ro") {
    return { title: post.title, description: post.description }
  }
  const mapped = EN_POST_ROMANIAN_LISTING[post.slug]
  if (mapped) return mapped
  return { title: post.title, description: post.description }
}
