import type { SiteLocale } from "@/lib/locale-switch-paths"

export type LetterHistoryUiLabels = {
  toggleTitle: string
  toggleAriaEmpty: string
  toggleAriaLast: (letter: string) => string
  panelAria: string
  panelEmptyHint: string
  closeWrongLetters: string
  prevLetterOrScroll: string
  nextLetterOrScroll: string
  stripSwipeAria: string
}

export type GameUiStrings = {
  exit: string
  home: string
  backHome: string
  playAgain: string
  leaveRoom: string
  pts: string
  roundProgress: (current: number, total: number) => string
  practiceComplete: string
  roundSingular: string
  roundPlural: string
  you: string
  /** Nume fallback dacă lipsește din localStorage */
  defaultPlayerName: string
  youParen: string
  playerFallback: (slot: number) => string
  hintRevealTitle: string
  hintRevealAria: (remaining: number) => string
  hintRevealTitleMultiplayer: string
  hintRevealAriaMultiplayer: (remaining: number) => string
  letterHistory: LetterHistoryUiLabels
  finishedYouSuffix: string
  finishedPts: string
  roomNotFound: string
  gameEnded: string
  winnerWins: (name: string) => string
  youWinRound: string
  youWinGame: string
  itsATie: string
  readyExclaim: string
  imReady: string
  imReadyWithCheck: string
  cancelReady: string
  nextRound: string
  waitingForPlayers: string
  waitingForPlayersEllipsis: string
  waitingForPlayersTitle: string
  joinedCount: (current: number, max: number) => string
  roomCode: string
  linkForPlayers: string
  copyRoomCode: string
  copyInviteLink: string
  copied: string
  copyLink: string
  loadingLink: string
  readyToStartTitle: string
  readyToStartSubtitle: string
  readyStatus: string
  notReadyStatus: string
  waitingForPlayerSlot: (slot: number) => string
  rivalProgressLegend: string
  gameContinuesBanner: string
  closeNoticeAria: string
}

function joinWord(locale: SiteLocale, parts: string[]): string {
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0]!
  if (locale === "ro") return `${parts.slice(0, -1).join(", ")} și ${parts[parts.length - 1]}`
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
}

/** Mesaj disconnect pe ecran finished (1–2 jucători). */
export function formatDisconnectMessage(names: string[], locale: SiteLocale): string {
  if (names.length === 0) return ""
  if (locale === "ro") {
    if (names.length === 1) return `${names[0]} a ieșit din joc`
    return `${joinWord(locale, names)} au ieșit din joc`
  }
  if (names.length === 1) return `${names[0]} left the game`
  return `${joinWord(locale, names)} left the game`
}

/** Titlu banderolă sau pauză când pleacă cineva. */
export function formatPlayerLeftPauseTitle(names: string[], locale: SiteLocale): string {
  if (names.length === 0) {
    return locale === "ro" ? "Un jucător a ieșit din joc" : "A player left the game"
  }
  return formatDisconnectMessage(names, locale)
}

export function formatPlayerReturnedNotice(
  names: string[],
  viewerName: string | null | undefined,
  locale: SiteLocale
): string {
  if (names.length === 0) return ""
  if (locale === "ro") {
    if (names.length === 1) {
      return names[0] === viewerName ? "Te-ai întors în joc" : `${names[0]} s-a întors în joc`
    }
    return `${joinWord(locale, names)} s-au întors în joc`
  }
  if (names.length === 1) {
    return names[0] === viewerName ? "You're back in the game" : `${names[0]} is back in the game`
  }
  return `${joinWord(locale, names)} are back in the game`
}

export function gameUiStrings(locale: SiteLocale): GameUiStrings {
  if (locale === "ro") {
    return {
      exit: "Ieșire",
      home: "Acasă",
      backHome: "Înapoi acasă",
      playAgain: "Joacă din nou",
      leaveRoom: "Părăsește camera",
      pts: "pct",
      roundProgress: (c, t) => `Runda ${c}/${t}`,
      practiceComplete: "Antrenament încheiat!",
      roundSingular: "rundă",
      roundPlural: "runde",
      you: "Tu",
      defaultPlayerName: "Jucător",
      youParen: " (tu)",
      playerFallback: (s) => `J${s}`,
      hintRevealTitle: "Dezvăluie o literă corectă aleatorie",
      hintRevealAria: (n) => `Indiciu: o literă (mai sunt ${n})`,
      hintRevealTitleMultiplayer: "Dezvăluie o literă aleatorie (fără puncte)",
      hintRevealAriaMultiplayer: (n) => `Indiciu: o literă (mai sunt ${n})`,
      letterHistory: {
        toggleTitle: "Istoric taste",
        toggleAriaEmpty: "Litere greșite",
        toggleAriaLast: (ch) => `Litere greșite, ultima: ${ch.toUpperCase()}`,
        panelAria: "Litere greșite",
        panelEmptyHint: "Încă nu ai litere greșite",
        closeWrongLetters: "Închide literele greșite",
        prevLetterOrScroll: "Litera anterioară sau derulează",
        nextLetterOrScroll: "Litera următoare sau derulează",
        stripSwipeAria: "Toate literele greșite — glisează orizontal",
      },
      finishedYouSuffix: " (tu)",
      finishedPts: "pct",
      roomNotFound: "Camera nu a fost găsită",
      gameEnded: "Jocul s-a încheiat.",
      winnerWins: (name) => `${name} a câștigat!`,
      youWinRound: "Ai câștigat runda!",
      youWinGame: "Ai câștigat!",
      itsATie: "Egalitate!",
      readyExclaim: "Gata!",
      imReady: "Sunt gata!",
      imReadyWithCheck: "Gata!",
      cancelReady: "Anulează gata",
      nextRound: "Runda următoare →",
      waitingForPlayers: "Așteptăm jucătorii…",
      waitingForPlayersEllipsis: "Așteptăm jucătorii…",
      waitingForPlayersTitle: "Așteptăm jucătorii",
      joinedCount: (c, m) => `${c} / ${m} conectați`,
      roomCode: "Cod cameră",
      linkForPlayers: "Link pentru jucători",
      copyRoomCode: "Copiază codul camerei",
      copyInviteLink: "Copiază linkul de invitație",
      copied: "Copiat",
      copyLink: "Copiază linkul",
      loadingLink: "Se încarcă linkul…",
      readyToStartTitle: "Gata de start?",
      readyToStartSubtitle: "Toți jucătorii trebuie să fie gata",
      readyStatus: "Gata!",
      notReadyStatus: "Nu e gata",
      waitingForPlayerSlot: (s) => `Așteptăm jucătorul ${s}…`,
      rivalProgressLegend: "= progres adversar",
      gameContinuesBanner: " — Jocul continuă.",
      closeNoticeAria: "Închide notificarea",
    }
  }

  return {
    exit: "Exit",
    home: "Home",
    backHome: "Back Home",
    playAgain: "Play Again",
    leaveRoom: "Leave Room",
    pts: "pts",
    roundProgress: (c, t) => `Round ${c}/${t}`,
    practiceComplete: "Practice Complete!",
    roundSingular: "round",
    roundPlural: "rounds",
    you: "You",
    defaultPlayerName: "Player",
    youParen: " (you)",
    playerFallback: (s) => `P${s}`,
    hintRevealTitle: "Reveal a random correct letter",
    hintRevealAria: (n) => `Hint: reveal one letter (${n} left)`,
    hintRevealTitleMultiplayer: "Reveal a random letter (no points)",
    hintRevealAriaMultiplayer: (n) => `Hint: one letter (${n} left)`,
    letterHistory: {
      toggleTitle: "History keys",
      toggleAriaEmpty: "Wrong letters",
      toggleAriaLast: (ch) => `Wrong letters, last: ${ch.toUpperCase()}`,
      panelAria: "Wrong letters",
      panelEmptyHint: "No wrong letters yet",
      closeWrongLetters: "Close wrong letters",
      prevLetterOrScroll: "Previous letter or scroll strip",
      nextLetterOrScroll: "Next letter or scroll strip",
      stripSwipeAria: "All wrong letters — swipe horizontally",
    },
    finishedYouSuffix: " (You)",
    finishedPts: "pts",
    roomNotFound: "Room not found",
    gameEnded: "The game has ended.",
    winnerWins: (name) => `${name} wins!`,
    youWinRound: "You Win!",
    youWinGame: "You win!",
    itsATie: "It's a tie!",
    readyExclaim: "Ready!",
    imReady: "I'm Ready!",
    imReadyWithCheck: "Ready!",
    cancelReady: "Cancel Ready",
    nextRound: "Next Round →",
    waitingForPlayers: "Waiting for players…",
    waitingForPlayersEllipsis: "Waiting for players…",
    waitingForPlayersTitle: "Waiting for Players",
    joinedCount: (c, m) => `${c} / ${m} joined`,
    roomCode: "Room Code",
    linkForPlayers: "Link for players",
    copyRoomCode: "Copy room code",
    copyInviteLink: "Copy invite link for guests",
    copied: "Copied",
    copyLink: "Copy link",
    loadingLink: "Loading link…",
    readyToStartTitle: "Ready to Start?",
    readyToStartSubtitle: "All players must be ready to start",
    readyStatus: "Ready!",
    notReadyStatus: "Not ready",
    waitingForPlayerSlot: (s) => `Waiting for player ${s}…`,
    rivalProgressLegend: "= rival progress",
    gameContinuesBanner: " — The game continues.",
    closeNoticeAria: "Dismiss notice",
  }
}
