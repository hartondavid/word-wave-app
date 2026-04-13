"use client"

import { useEffect, useState, useCallback, useRef, useMemo, use, useLayoutEffect, type CSSProperties } from "react"
import { flushSync } from "react-dom"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getClearSlotPayload, patchClearPlayerSlotKeepalive } from "@/lib/supabase/clear-player-slot-keepalive"
import { deleteGameRoomRow } from "@/lib/supabase/delete-game-room"
import type {
  CategoryPresetId,
  GameRoom,
  PlayerSlot,
  CategoryKey,
  LanguageKey,
} from "@/lib/game-types"
import {
  ROUND_DURATION,
  WIN_SCORE,
  SCORE_PER_LETTER,
  TOTAL_ROUNDS,
  PLAYER_COLORS,
  CATEGORIES,
  languageForMultiplayerRoom,
  allActivePlayersSpeechEliminated,
} from "@/lib/game-types"
import {
  tryPlaceLetter,
  isWordComplete,
  countNewlyFilledLetters,
  revealRandomAnswerLetter,
} from "@/lib/words"
import {
  playCorrectLetterSound,
  playWrongLetterSound,
  playWordCompleteSound,
  playWordIncompleteFailureSound,
  playOpponentWonRoundSound,
} from "@/lib/play-correct-letter-sound"
import { startGameAmbientWaves, stopGameAmbientWaves } from "@/lib/game-ambient-waves"
import { currentLocaleFromPathname } from "@/lib/locale-switch-paths"
import { categoryTitleForLocale } from "@/lib/home-play-form-strings"
import {
  formatDisconnectMessage,
  formatPlayerLeftPauseTitle,
  formatPlayerReturnedNotice,
  gameUiStrings,
} from "@/lib/game-ui-strings"
import { speechUiStrings } from "@/lib/speech-ui-strings"
import {
  collectSpeechTranscripts,
  firstLetterFromTranscript,
  isBrowserSpeechRecognitionSupported,
  isLastSpeechResultFinal,
  newSpeechRecognitionForLang,
  type SpeechRecognitionInstance,
} from "@/lib/speech-letter"
import {
  applySpeechRecognitionResultToProgress,
  speechLocaleForMultiplayerMic,
} from "@/lib/speech-word-match"
import { serverStartNewRound, syncGameRoomLanguage } from "@/app/game/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LetterCellDelayBorder } from "@/components/letter-cell-delay-border"
import { CorrectLetterChar, useCorrectLetterFx } from "@/components/correct-letter-fx"
import { LetterSoundToggle } from "@/components/letter-sound-toggle"
import { AmbientWavesToggle } from "@/components/ambient-waves-toggle"
import {
  LetterHistoryPanel,
  LetterHistoryToggleButton,
} from "@/components/letter-history-over-timer"
import { Spinner } from "@/components/ui/spinner"
import { cn, focusWithoutScroll } from "@/lib/utils"
import { Copy, Check, Timer, Trophy, ArrowLeft, AlertCircle, Mic, Link2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import Confetti from "react-confetti"
import { FinishedPlayerScoreRow } from "@/components/game-finished-score-row"
import { useSyncGameViewportHeight } from "@/hooks/use-sync-game-viewport-height"
import { RoundHistoryCarousel } from "@/components/round-history-carousel"
import type { RoundHistoryItem } from "@/lib/round-history"

interface PlayerInfo {
  id: string
  name: string
  roomCode: string
  playerSlot: PlayerSlot
  /** Set by host on create — used to patch DB if language/category didn’t persist. */
  language?: LanguageKey
  category?: CategoryKey
  /** Mod listă (poze vs definiții) — „Toate” + images = doar JSON-uri cu poze. */
  category_preset?: CategoryPresetId
  /** Same key as practice/home: hint button in rounds (default off if missing). */
  practice_hints_enabled?: boolean
}

interface GamePageProps {
  params: Promise<{ roomCode: string }>
}

// ── slot helpers ──────────────────────────────────────────────────────────────

function slotData(slot: PlayerSlot, room: GameRoom) {
  const m = {
    1: { id: room.player1_id, name: room.player1_name, score: room.player1_score ?? 0, progress: room.player1_progress, ready: room.player1_ready },
    2: { id: room.player2_id, name: room.player2_name, score: room.player2_score ?? 0, progress: room.player2_progress, ready: room.player2_ready },
    3: { id: room.player3_id, name: room.player3_name, score: room.player3_score ?? 0, progress: room.player3_progress, ready: room.player3_ready },
    4: { id: room.player4_id, name: room.player4_name, score: room.player4_score ?? 0, progress: room.player4_progress, ready: room.player4_ready },
  }
  return m[slot]
}

function activeSlots(room: GameRoom): PlayerSlot[] {
  return ([1, 2, 3, 4] as PlayerSlot[]).filter(s => !!slotData(s, room).id)
}

function isFull(room: GameRoom): boolean {
  return activeSlots(room).length >= (room.max_players ?? 2)
}

function allReady(room: GameRoom): boolean {
  const a = activeSlots(room)
  return a.length >= 2 && a.every(s => slotData(s, room).ready)
}

/** Names of players who had a slot in `prev` but no longer in `next` (same slot index cleared). */
function whoLeftPlayerNames(prev: GameRoom, next: GameRoom): string[] {
  const names: string[] = []
  for (const s of [1, 2, 3, 4] as PlayerSlot[]) {
    const before = slotData(s, prev)
    const after = slotData(s, next)
    if (before.id && !after.id && before.name) names.push(before.name)
  }
  return names
}

/** Slots that were occupied in `prev` but cleared in `next`. */
function whoLeftSlots(prev: GameRoom, next: GameRoom): PlayerSlot[] {
  const slots: PlayerSlot[] = []
  for (const s of [1, 2, 3, 4] as PlayerSlot[]) {
    const before = slotData(s, prev)
    const after = slotData(s, next)
    if (before.id && !after.id) slots.push(s)
  }
  return slots
}

function normalizePlayerName(n: string | null | undefined): string {
  return (n ?? "").trim().toLowerCase()
}

/**
 * La join, `app/page.tsx` generează un id nou de fiecare dată — reintrarea nu poate fi detectată doar după id.
 * Folosim același nume (normalizat) pe același slot după ce a fost golit.
 */
function isSamePlayerRejoin(
  pending: { id: string; name: string },
  afterId: string | null,
  afterName: string | null | undefined
): boolean {
  if (afterId && pending.id && afterId === pending.id) return true
  const pn = normalizePlayerName(pending.name)
  const an = normalizePlayerName(afterName)
  return pn.length > 0 && an.length > 0 && pn === an
}

/** Durată lockout tastatură după literă greșită (= durată inel animat). */
const WRONG_LETTER_LOCK_MS = 2000

/** Indicii literă aleatoare per rundă (fără puncte), ca în Practice. */
const MULTIPLAYER_HINT_LETTERS_PER_ROUND = 3

/** Praf + pop la litere completate automat (timeout / all speech wrong). */
const AUTO_REVEAL_FX_COLOR = "#dc2626"

/** Șterge sesiunea client (joc multiplayer) din localStorage. */
function clearWordmatchPlayerSession() {
  try {
    localStorage.removeItem("wordmatch_player")
  } catch {
    /* ignore */
  }
}

/** Amestecă #RRGGBB cu alb pentru highlight-ul gradientului inelului (mască lockout). */
function mixPlayerColorWithWhite(hex: string, whiteFraction: number): string {
  const n = hex.replace("#", "").slice(0, 6)
  if (n.length !== 6) return "#e5e7eb"
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  const t = Math.min(1, Math.max(0, whiteFraction))
  const blend = (c: number) => Math.round(c + (255 - c) * t)
  return `rgb(${blend(r)},${blend(g)},${blend(b)})`
}

// ── component ─────────────────────────────────────────────────────────────────

export default function GamePage({ params }: GamePageProps) {
  const { roomCode } = use(params)
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(ROUND_DURATION)
  const [isLoading, setIsLoading] = useState(true)
  const [isShaking, setIsShaking] = useState(false)
  /** Scurt flash roșu deschis pe fundal la literă greșită */
  const [wrongKeyFlash, setWrongKeyFlash] = useState(false)
  const wrongFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [copied, setCopied] = useState(false)
  const [joinRoomUrl, setJoinRoomUrl] = useState("")
  const [linkCopied, setLinkCopied] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  /** True until room reflects round_end — confetti shows immediately on local win */
  const [optimisticRoundWin, setOptimisticRoundWin] = useState(false)
  /** Set when opponents leave mid-round; shown on finished screen */
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(null)
  /** True când gazda pleacă dintr-un joc cu 2 jucători — ecran final doar cu Home */
  const [disconnectHidePlayAgain, setDisconnectHidePlayAgain] = useState(false)
  /** Banderolă sus ~3s: plecare (amber) sau reintrare același jucător (emerald) */
  const [topTransientNotice, setTopTransientNotice] = useState<{
    message: string
    kind: "departed" | "returned"
  } | null>(null)
  const [lastPlacedIndex, setLastPlacedIndex] = useState<number | null>(null)
  // tracks which positions just received a new enemy hit (for pulse)
  const [newEnemyHits, setNewEnemyHits] = useState<Set<number>>(new Set())
  // Optimistic local progress so the word mask updates immediately without
  // waiting for the Supabase subscription round-trip.
  const [myDisplayProgress, setMyDisplayProgress] = useState<string | null>(null)
  // Letters auto-revealed when time expires (shown in red)
  const [revealProgress, setRevealProgress] = useState<string | null>(null)
  const prevProgressRef = useRef<Record<number, string>>({})
  const startGameRef = useRef(false)
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const gameShellRef = useRef<HTMLElement>(null)
  const topBarRef = useRef<HTMLDivElement>(null)
  const [stickyTopPx, setStickyTopPx] = useState(0)
  const wordMaskRef = useRef<HTMLDivElement>(null)
  // Local progress ref to avoid race condition on rapid key presses
  const localProgressRef = useRef<string | null>(null)
  /** Scor local după ultimele +10/literă până vine rândul din Realtime (rapid typing). */
  const localLetterScoreRef = useRef<number | null>(null)
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shouldShakeRef = useRef(false)
  // Prevents double-firing: keydown sets this true so onChange skips the same key
  const keyHandledRef = useRef(false)
  // Consecutive-wrong-letter penalty: 2 wrong in a row → 2s input lockout
  const consecutiveWrongRef = useRef(0)
  const lockedUntilRef = useRef(0)
  const [wrongLetterDelayRing, setWrongLetterDelayRing] = useState(false)
  const wrongLetterDelayRingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hintLettersRemaining, setHintLettersRemaining] = useState(MULTIPLAYER_HINT_LETTERS_PER_ROUND)
  const hintLettersRemainingRef = useRef(MULTIPLAYER_HINT_LETTERS_PER_ROUND)
  const [multiplayerHintsEnabled, setMultiplayerHintsEnabled] = useState(false)
  const [typedLetterHistory, setTypedLetterHistory] = useState<string[]>([])
  const [letterHistoryOpen, setLetterHistoryOpen] = useState(false)
  const [roundHistory, setRoundHistory] = useState<RoundHistoryItem[]>([])
  const recordedRoundEndRef = useRef<number>(0)
  /** Previous `room` snapshot for detecting skipped `round_end` renders (Realtime batching). */
  const roundHistoryPrevRoomRef = useRef<GameRoom | null>(null)
  const restoreTypingFocus = useCallback(() => {
    focusWithoutScroll(hiddenInputRef.current)
  }, [])
  const {
    cellBursts: correctLetterBursts,
    triggerAt: triggerCorrectLetterFxAt,
    reset: resetCorrectLetterFx,
  } = useCorrectLetterFx()
  // Prevents handleTimerEnd from being called multiple times per round
  const timerEndCalledRef = useRef(false)
  /** For playOpponentWonRoundSound: only on playing → round_end transition */
  const prevGameStatusForOpponentWinSoundRef = useRef<string | null>(null)
  /** Toți jucătorii au greșit la microfon — animație + end round (un singur lanț per client). */
  const speechAllFailedEndInProgressRef = useRef(false)
  const [allPlayersSpeechWrongReveal, setAllPlayersSpeechWrongReveal] = useState(false)
  const startNewRoundRef = useRef<() => Promise<void>>(async () => {})
  const prevRoomSnapshotRef = useRef<GameRoom | null>(null)
  const disconnectHandledRef = useRef(false)
  /** După sync reușit limba/categorie gazdă → DB (lobby). */
  const hostRoomPrefsSyncedRef = useRef(false)
  const hostLobbySyncInFlightRef = useRef(false)
  const leaveEventKeyRef = useRef<string | null>(null)
  const rejoinEventKeyRef = useRef<string | null>(null)
  /** Slot golit → ultimul jucător plecat (id+nume); reintrare = același nume sau același id */
  const rejoinPendingBySlotRef = useRef<Map<PlayerSlot, { id: string; name: string }>>(new Map())
  const topNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeRemainingRef = useRef(ROUND_DURATION)
  /** True după Exit explicit — evită dublarea PATCH la pagehide */
  const leftVoluntarilyRef = useRef(false)
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const siteLocale = currentLocaleFromPathname(pathname)
  const ui = useMemo(() => gameUiStrings(siteLocale), [siteLocale])
  const homePath = siteLocale === "ro" ? "/ro" : "/"
  const supabase = createClient()
  /** Ultimul playerInfo fără a extinde deps la useEffect-ul de plecare/reintrare */
  const playerInfoRef = useRef<PlayerInfo | null>(null)
  playerInfoRef.current = playerInfo

  /** După o încercare vocală invalidă (cuvântul nu s-a potrivit): blocare tastatură + voce până la round_end. */
  const eliminatedFromRoundRef = useRef(false)
  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const speechListeningRef = useRef(false)
  const [speechListeningUi, setSpeechListeningUi] = useState(false)
  const [roundEliminated, setRoundEliminated] = useState(false)
  const handleLetterInputRef = useRef<((letter: string) => void | Promise<void>) | null>(null)

  /** Texte microfon / instrucțiuni — potrivirea e în lib/speech-word-match + lib/words. */
  const multiplayerSpeechUi = useMemo(
    () => speechUiStrings(siteLocale === "ro" ? "ro" : "en"),
    [siteLocale]
  )

  function dismissTopTransientNotice() {
    if (topNoticeTimeoutRef.current) {
      clearTimeout(topNoticeTimeoutRef.current)
      topNoticeTimeoutRef.current = null
    }
    setTopTransientNotice(null)
  }

  function scheduleTopTransientNotice(message: string, kind: "departed" | "returned") {
    if (topNoticeTimeoutRef.current) {
      clearTimeout(topNoticeTimeoutRef.current)
      topNoticeTimeoutRef.current = null
    }
    setTopTransientNotice({ message, kind })
    topNoticeTimeoutRef.current = setTimeout(() => {
      setTopTransientNotice(null)
      topNoticeTimeoutRef.current = null
    }, 3000)
  }

  function scheduleDepartedNotice(message: string) {
    scheduleTopTransientNotice(message, "departed")
  }

  useEffect(() => () => {
    if (topNoticeTimeoutRef.current) clearTimeout(topNoticeTimeoutRef.current)
  }, [])

  useEffect(() => {
    rejoinPendingBySlotRef.current.clear()
    rejoinEventKeyRef.current = null
    hostRoomPrefsSyncedRef.current = false
    hostLobbySyncInFlightRef.current = false
  }, [roomCode])

  useEffect(() => {
    if (typeof window === "undefined") return
    const base = siteLocale === "ro" ? "/ro" : ""
    setJoinRoomUrl(`${window.location.origin}${base}/?join=${encodeURIComponent(roomCode)}`)
  }, [roomCode, siteLocale])

  // ── effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const stored = localStorage.getItem("wordmatch_player")
    if (!stored) { router.push(homePath); return }
    const parsed = JSON.parse(stored)
    if (parsed.roomCode === roomCode) {
      setPlayerInfo(parsed)
      const h = parsed.practice_hints_enabled
      setMultiplayerHintsEnabled(typeof h === "boolean" ? h : false)
    } else router.push(homePath)
  }, [roomCode, router, homePath])

  // Golire slot la închidere tab / navigare (ceilalți văd plecarea în realtime)
  useEffect(() => {
    if (!playerInfo?.playerSlot) return
    const slot = playerInfo.playerSlot as PlayerSlot

    const onPageHide = (e: PageTransitionEvent) => {
      if (e.persisted) return
      if (leftVoluntarilyRef.current) return
      patchClearPlayerSlotKeepalive(roomCode, slot)
      clearWordmatchPlayerSession()
    }

    const onBeforeUnload = () => {
      if (leftVoluntarilyRef.current) return
      patchClearPlayerSlotKeepalive(roomCode, slot)
      clearWordmatchPlayerSession()
    }

    window.addEventListener("pagehide", onPageHide)
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => {
      window.removeEventListener("pagehide", onPageHide)
      window.removeEventListener("beforeunload", onBeforeUnload)
    }
  }, [roomCode, playerInfo?.playerSlot])

  // Navigare client (ex. fără buton Exit): demontare după >500ms = plecare reală (evită Strict Mode)
  useEffect(() => {
    if (!playerInfo?.playerSlot) return
    const slot = playerInfo.playerSlot as PlayerSlot
    const started = Date.now()
    return () => {
      if (Date.now() - started < 500) return
      if (leftVoluntarilyRef.current) return
      patchClearPlayerSlotKeepalive(roomCode, slot)
      clearWordmatchPlayerSession()
    }
  }, [roomCode, playerInfo?.playerSlot])

  timeRemainingRef.current = timeRemaining

  useEffect(() => {
    supabase.from("game_rooms").select("*").eq("room_code", roomCode).single()
      .then(({ data }) => { if (data) setRoom(data); setIsLoading(false) })
  }, [roomCode, supabase])

  // Gazdă: dacă în DB lipsește limba/categoria/category_preset sau diferă de localStorage, reparăm în lobby.
  useEffect(() => {
    if (!room || !playerInfo || playerInfo.playerSlot !== 1) return
    if (room.game_status !== "waiting") return
    if (hostRoomPrefsSyncedRef.current) return
    if (hostLobbySyncInFlightRef.current) return

    const wantLang = playerInfo.language
      ? languageForMultiplayerRoom(playerInfo.language)
      : undefined
    const wantCat = playerInfo.category
    const wantPreset: CategoryPresetId | undefined =
      playerInfo.category_preset === "images" || playerInfo.category_preset === "definitions"
        ? playerInfo.category_preset
        : undefined

    if (!wantLang && !wantCat && wantPreset === undefined) return

    const roomLang = languageForMultiplayerRoom(room.language)
    const roomCat = (room.category ?? "").toString().trim()
    const roomPreset: CategoryPresetId | undefined =
      room.category_preset === "images" || room.category_preset === "definitions"
        ? room.category_preset
        : undefined

    const langOk = !wantLang || roomLang === wantLang
    const catOk = !wantCat || roomCat === wantCat
    const presetOk = wantPreset === undefined || roomPreset === wantPreset
    if (langOk && catOk && presetOk) {
      hostRoomPrefsSyncedRef.current = true
      return
    }

    const langMismatch = !!(wantLang && roomLang !== wantLang)
    const catMismatch = !!(wantCat && roomCat !== wantCat)
    const presetMismatch = !!(wantPreset !== undefined && roomPreset !== wantPreset)

    hostLobbySyncInFlightRef.current = true
    void (async () => {
      try {
        if (langMismatch && wantLang) {
          const lr = await syncGameRoomLanguage(roomCode, wantLang)
          if (!lr.ok) {
            console.warn("syncGameRoomLanguage (lobby):", lr.error)
            return
          }
        }
        if (catMismatch && wantCat) {
          const { error: catErr } = await supabase
            .from("game_rooms")
            .update({ category: wantCat })
            .eq("room_code", roomCode)
          if (catErr) {
            console.warn("Host category sync:", catErr.message)
            return
          }
        }
        if (presetMismatch && wantPreset) {
          const { error: presetErr } = await supabase
            .from("game_rooms")
            .update({ category_preset: wantPreset })
            .eq("room_code", roomCode)
          if (presetErr) {
            console.warn("Host category_preset sync:", presetErr.message)
            return
          }
        }
        hostRoomPrefsSyncedRef.current = true
      } finally {
        hostLobbySyncInFlightRef.current = false
      }
    })()
  }, [room, playerInfo, roomCode, supabase])

  /** Invitați: aliniază category_preset din rândul camerei în state + localStorage (pentru hint la start rundă). */
  useEffect(() => {
    if (!room || !playerInfo) return
    const rp = room.category_preset
    if (rp !== "images" && rp !== "definitions") return
    if (playerInfo.category_preset === rp) return
    const next = { ...playerInfo, category_preset: rp }
    setPlayerInfo(next)
    try {
      const raw = localStorage.getItem("wordmatch_player")
      if (!raw) return
      const o = JSON.parse(raw) as Record<string, unknown>
      o.category_preset = rp
      localStorage.setItem("wordmatch_player", JSON.stringify(o))
    } catch {
      /* ignore */
    }
  }, [room, playerInfo])

  useEffect(() => {
    const ch = supabase
      .channel(`room-${roomCode}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "game_rooms", filter: `room_code=eq.${roomCode}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as GameRoom | undefined
            setRoom(prev => {
              if (oldRow?.game_status === "finished") return oldRow
              if (prev?.game_status === "finished") return prev
              return null
            })
            return
          }
          if (payload.eventType !== "UPDATE" && payload.eventType !== "INSERT") return
          const r = payload.new as GameRoom
          setRoom(prev => {
            // Detect new enemy hits for pulse animation
            if (prev?.game_status === "playing") {
              const newHits = new Set<number>()
              ;([1, 2, 3, 4] as PlayerSlot[]).forEach(s => {
                const oldP = slotData(s, prev).progress ?? ""
                const newP = slotData(s, r).progress ?? ""
                for (let i = 0; i < newP.length; i++) {
                  if (oldP[i] === "_" && newP[i] !== "_") newHits.add(i)
                }
              })
              if (newHits.size > 0) {
                setNewEnemyHits(newHits)
                setTimeout(() => setNewEnemyHits(new Set()), 600)
              }
            }
            return r
          })
          if (r.game_status === "round_end" && r.round_winner) {
            setShowConfetti(true)
            setTimeout(() => setShowConfetti(false), 2500)
          }
          if (r.game_status === "playing") setLastPlacedIndex(null)
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [roomCode, supabase])

  // Watch for all players ready → start game (doar gazda pornește runda + trimite limba din localStorage)
  useEffect(() => {
    if (!room || !playerInfo) return
    if (room.game_status !== "waiting") return
    if (!isFull(room) || !allReady(room) || startGameRef.current) return
    if (playerInfo.playerSlot !== 1) return
    startGameRef.current = true
    startNewRound()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    room?.player1_ready, room?.player2_ready, room?.player3_ready, room?.player4_ready,
    room?.player1_id, room?.player2_id, room?.player3_id, room?.player4_id,
    room?.game_status,
  ])

  // Timer countdown
  useEffect(() => {
    if (room?.game_status !== "playing" || !room.round_end_time) return
    const iv = setInterval(() => {
      const rem = Math.max(0, Math.ceil((new Date(room.round_end_time!).getTime() - Date.now()) / 1000))
      setTimeRemaining(rem)
    }, 100)
    return () => clearInterval(iv)
  }, [room?.round_end_time, room?.game_status])

  // Plecare jucător: 2→1 (gazdă sau invitat) → ecran finished / ≥3 jucători → banderolă 3s
  useEffect(() => {
    if (!room) return
    const prev = prevRoomSnapshotRef.current

    const enteredWaitingFromGame =
      room.game_status === "waiting" &&
      !!prev &&
      prev.game_status !== "waiting"

    if (room.game_status === "waiting") {
      disconnectHandledRef.current = false
      leaveEventKeyRef.current = null
      setDisconnectMessage(null)
      setDisconnectHidePlayAgain(false)
      // Nu reseta banderola la fiecare UPDATE în lobby — altfel mesajul „s-a întors” dispare instant
      if (enteredWaitingFromGame) {
        rejoinEventKeyRef.current = null
        dismissTopTransientNotice()
      }
    }

    if (prev) {
      // Marcăm sloturile golite (id + nume pentru detectarea reintrării)
      for (const s of [1, 2, 3, 4] as PlayerSlot[]) {
        const before = slotData(s, prev)
        const after = slotData(s, room)
        if (before.id && !after.id) {
          rejoinPendingBySlotRef.current.set(s, {
            id: before.id,
            name: before.name ?? "",
          })
        }
      }
      const returnedNames: string[] = []
      for (const s of [1, 2, 3, 4] as PlayerSlot[]) {
        const before = slotData(s, prev)
        const after = slotData(s, room)
        if (!before.id && after.id) {
          const pending = rejoinPendingBySlotRef.current.get(s)
          if (pending) {
            const displayName = (after.name ?? "").trim() || pending.name.trim()
            if (isSamePlayerRejoin(pending, after.id, after.name)) {
              rejoinPendingBySlotRef.current.delete(s)
              if (displayName) returnedNames.push(displayName)
            } else if (after.name && normalizePlayerName(after.name) !== normalizePlayerName(pending.name)) {
              // Alt jucător pe același slot (nume diferit)
              rejoinPendingBySlotRef.current.delete(s)
            }
            // Dacă lipsește încă numele în `after`, așteptăm următorul UPDATE (păstrăm pending)
          }
        }
      }
      // Id setat înaintea numelui: al doilea UPDATE pe același id umple numele
      for (const s of [1, 2, 3, 4] as PlayerSlot[]) {
        const before = slotData(s, prev)
        const after = slotData(s, room)
        const pending = rejoinPendingBySlotRef.current.get(s)
        if (!pending || !after.id || before.id !== after.id) continue
        if (!normalizePlayerName(before.name) && normalizePlayerName(after.name)) {
          if (isSamePlayerRejoin(pending, after.id, after.name)) {
            rejoinPendingBySlotRef.current.delete(s)
            returnedNames.push((after.name ?? "").trim())
          }
        }
      }
      if (returnedNames.length > 0) {
        const eventKey = `return-${room.updated_at ?? ""}-${returnedNames.join(",")}`
        if (rejoinEventKeyRef.current !== eventKey) {
          rejoinEventKeyRef.current = eventKey
          const viewerSlot = (playerInfoRef.current?.playerSlot ?? 1) as PlayerSlot
          const viewerName = slotData(viewerSlot, room).name
          scheduleTopTransientNotice(
            formatPlayerReturnedNotice(returnedNames, viewerName, siteLocale),
            "returned"
          )
        }
      }

      const prevN = activeSlots(prev).length
      const nextN = activeSlots(room).length
      const midGame = room.game_status === "playing" || room.game_status === "round_end"
      const left = whoLeftPlayerNames(prev, room)
      const leftSlots = whoLeftSlots(prev, room)
      const someoneLeft = prevN > nextN && left.length > 0 && midGame

      if (someoneLeft) {
        const eventKey = `${room.updated_at ?? ""}-${left.join(",")}-${prevN}->${nextN}`
        const alreadyHandled = leaveEventKeyRef.current === eventKey
        if (!alreadyHandled) {
          leaveEventKeyRef.current = eventKey
          const hostLeft = leftSlots.includes(1)

          // Gazda a ieșit, erau ≥3 jucători → banderolă sus ~3s; timpul merge în continuare
          if (hostLeft && prevN >= 3) {
            scheduleDepartedNotice(
              `${formatPlayerLeftPauseTitle(left, siteLocale)}${ui.gameContinuesBanner}`
            )
            prevRoomSnapshotRef.current = room
            return
          }

          // Gazda + un invitat (2 jucători) → ecran finished cu numele gazdei, doar Home
          if (hostLeft && prevN === 2 && nextN === 1 && !disconnectHandledRef.current) {
            disconnectHandledRef.current = true
            setDisconnectMessage(formatDisconnectMessage(left, siteLocale))
            setDisconnectHidePlayAgain(true)
            setRoom(r => (r ? { ...r, game_status: "finished", round_end_time: null } : r))
            void (async () => {
              const { error } = await supabase
                .from("game_rooms")
                .update({ game_status: "finished", round_end_time: null })
                .eq("room_code", roomCode)
              if (!error) await deleteGameRoomRow(supabase, roomCode)
            })()
            prevRoomSnapshotRef.current = room
            return
          }

          // ≥3 jucători înainte, încă ≥2 după plecare (non-gazdă) → banderolă; timpul merge
          if (prevN >= 3 && nextN >= 2) {
            scheduleDepartedNotice(formatPlayerLeftPauseTitle(left, siteLocale))
            prevRoomSnapshotRef.current = room
            return
          }

          // 2 jucători, invitatul pleacă → rămâne unul: încheiere directă (fără popup gazdă)
          if (prevN >= 2 && nextN === 1 && !disconnectHandledRef.current) {
            disconnectHandledRef.current = true
            setDisconnectMessage(formatDisconnectMessage(left, siteLocale))
            setRoom(r => (r ? { ...r, game_status: "finished", round_end_time: null } : r))
            void (async () => {
              const { error } = await supabase
                .from("game_rooms")
                .update({ game_status: "finished", round_end_time: null })
                .eq("room_code", roomCode)
              if (!error) await deleteGameRoomRow(supabase, roomCode)
            })()
          }
        }
      }
    }

    prevRoomSnapshotRef.current = room
  }, [room, roomCode, supabase, siteLocale, ui.gameContinuesBanner])

  // When timer hits 0, animate auto-reveal of remaining letters, then end the round
  useEffect(() => {
    if (timeRemaining !== 0 || !room || room.game_status !== "playing") return
    if (timerEndCalledRef.current) return
    timerEndCalledRef.current = true
    playWordIncompleteFailureSound()

    const cur = localProgressRef.current ?? slotData(mySlot, room).progress ?? ""
    const word = room.current_word ?? ""
    const positions: number[] = []
    for (let i = 0; i < word.length; i++) {
      if (cur[i] === "_") positions.push(i)
    }

    // Block input for the duration of the animation
    const animDuration = positions.length * 150 + 500
    lockedUntilRef.current = Date.now() + animDuration

    if (positions.length > 0) {
      setRevealProgress("_".repeat(word.length))
      positions.forEach((pos, idx) => {
        setTimeout(() => {
          triggerCorrectLetterFxAt(pos)
          setRevealProgress(prev => {
            if (!prev) return prev
            const arr = prev.split("")
            arr[pos] = word[pos]
            return arr.join("")
          })
        }, (idx + 1) * 150)
      })
    }

    setTimeout(() => void handleTimerEnd(), animDuration)
  }, [timeRemaining, triggerCorrectLetterFxAt])

  const endRoundNoWinner = useCallback(
    async (reason: "timeout" | "all_speech_wrong") => {
      const r = room
      if (!r) return
      const totalRounds = r.total_rounds ?? TOTAL_ROUNDS
      const update: Record<string, unknown> = {
        round_winner: null,
        round_end_reason: reason,
        game_status: r.current_round >= totalRounds ? "finished" : "round_end",
        player1_ready: false,
        player2_ready: false,
      }
      if (activeSlots(r).some(s => s >= 3)) {
        update.player3_ready = false
        update.player4_ready = false
      }
      const finished = r.current_round >= totalRounds
      let { error } = await supabase.from("game_rooms").update(update).eq("room_code", roomCode)
      if (error) {
        const msg = (error.message ?? "").toLowerCase()
        if (msg.includes("round_end_reason")) {
          const { round_end_reason: _drop, ...rest } = update
          const retry = await supabase.from("game_rooms").update(rest).eq("room_code", roomCode)
          error = retry.error
        }
      }
      if (!error && finished) await deleteGameRoomRow(supabase, roomCode)
    },
    [room, roomCode, supabase]
  )

  async function handleTimerEnd() {
    await endRoundNoWinner("timeout")
  }

  // Toți jucătorii activi eliminați la microfon → dezvăluire ca la Practice, apoi round_end.
  useEffect(() => {
    if (!room || room.game_status !== "playing") return
    if (!allActivePlayersSpeechEliminated(room)) return
    if (timerEndCalledRef.current) return
    if (speechAllFailedEndInProgressRef.current) return
    speechAllFailedEndInProgressRef.current = true
    timerEndCalledRef.current = true
    playWordIncompleteFailureSound()
    setAllPlayersSpeechWrongReveal(true)

    const slot = (playerInfo?.playerSlot ?? 1) as PlayerSlot
    const cur = localProgressRef.current ?? slotData(slot, room).progress ?? ""
    const word = room.current_word ?? ""
    const positions: number[] = []
    for (let i = 0; i < word.length; i++) {
      if (cur[i] === "_") positions.push(i)
    }

    const animDuration = Math.max(positions.length * 150 + 500, 500)
    lockedUntilRef.current = Date.now() + animDuration

    if (positions.length > 0) {
      setRevealProgress("_".repeat(word.length))
      positions.forEach((pos, idx) => {
        setTimeout(() => {
          triggerCorrectLetterFxAt(pos)
          setRevealProgress((prev) => {
            if (!prev) return prev
            const arr = prev.split("")
            arr[pos] = word[pos]
            return arr.join("")
          })
        }, (idx + 1) * 150)
      })
    }

    const t = setTimeout(() => void endRoundNoWinner("all_speech_wrong"), animDuration)
    return () => clearTimeout(t)
  }, [
    room?.game_status,
    room?.player1_speech_eliminated,
    room?.player2_speech_eliminated,
    room?.player3_speech_eliminated,
    room?.player4_speech_eliminated,
    room?.current_word,
    playerInfo?.playerSlot,
    endRoundNoWinner,
    triggerCorrectLetterFxAt,
  ])

  // Reset local progress, optimistic display and penalty counters at round start
  useEffect(() => {
    if (room?.game_status === "playing") {
      localProgressRef.current = null
      localLetterScoreRef.current = null
      setMyDisplayProgress(null)
      setRevealProgress(null)
      consecutiveWrongRef.current = 0
      lockedUntilRef.current = 0
      if (wrongLetterDelayRingTimeoutRef.current) {
        clearTimeout(wrongLetterDelayRingTimeoutRef.current)
        wrongLetterDelayRingTimeoutRef.current = null
      }
      setWrongLetterDelayRing(false)
      setTypedLetterHistory([])
      setLetterHistoryOpen(false)
      hintLettersRemainingRef.current = MULTIPLAYER_HINT_LETTERS_PER_ROUND
      setHintLettersRemaining(MULTIPLAYER_HINT_LETTERS_PER_ROUND)
      resetCorrectLetterFx()
      timerEndCalledRef.current = false
      speechAllFailedEndInProgressRef.current = false
      setAllPlayersSpeechWrongReveal(false)
      setOptimisticRoundWin(false)
      eliminatedFromRoundRef.current = false
      setRoundEliminated(false)
    }
  }, [room?.game_status, room?.current_word, resetCorrectLetterFx])

  useEffect(() => {
    if (room?.game_status !== "playing") {
      try {
        speechRecognitionRef.current?.abort()
      } catch {
        /* ignore */
      }
      speechRecognitionRef.current = null
      speechListeningRef.current = false
      setSpeechListeningUi(false)
    }
  }, [room?.game_status])

  useEffect(() => {
    return () => {
      try {
        speechRecognitionRef.current?.abort()
      } catch {
        /* ignore */
      }
      if (wrongFlashTimeoutRef.current) clearTimeout(wrongFlashTimeoutRef.current)
      if (wrongLetterDelayRingTimeoutRef.current) clearTimeout(wrongLetterDelayRingTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (roundEliminated) {
      hiddenInputRef.current?.blur()
      return
    }
    if (room?.game_status === "playing") {
      queueMicrotask(() => focusWithoutScroll(hiddenInputRef.current))
    } else {
      hiddenInputRef.current?.blur()
    }
  }, [room?.game_status, roundEliminated])

  useEffect(() => {
    const s = room?.game_status
    if (s === "playing") {
      startGameAmbientWaves()
      return
    }
    if (s === "round_end") {
      return
    }
    stopGameAmbientWaves(true)
  }, [room?.game_status])

  useEffect(() => {
    return () => stopGameAmbientWaves(true)
  }, [])

  // Scroll word mask into view when keyboard opens
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    let prevH = vv.height
    const onResize = () => {
      const keyboardOpen = window.innerHeight - vv.height > 100
      const openingNow = vv.height < prevH - 24
      prevH = vv.height
      if (keyboardOpen && openingNow) {
        setTimeout(() => wordMaskRef.current?.scrollIntoView({ block: "nearest" }), 120)
      }
    }
    vv.addEventListener("resize", onResize)
    return () => vv.removeEventListener("resize", onResize)
  }, [])

  // With document-level scrolling, avoid forcing root height.
  useSyncGameViewportHeight(gameShellRef, false)

  useLayoutEffect(() => {
    const el = topBarRef.current
    if (!el) return
    const update = () => setStickyTopPx(Math.max(0, Math.round(el.getBoundingClientRect().height)))
    update()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => update())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Keyboard input
  useEffect(() => {
    if (room?.game_status !== "playing" || !room.current_word) return
    const onKey = (e: KeyboardEvent) => {
      if (/^\p{L}$/u.test(e.key)) {
        keyHandledRef.current = true
        handleLetterInput(e.key)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    room?.game_status, room?.current_word,
    room?.player1_progress, room?.player2_progress, room?.player3_progress, room?.player4_progress,
    playerInfo,
  ])

  // Enter = Next Round when everyone is ready (orice jucător; limba vine din room / hint la startNewRound)
  useEffect(() => {
    if (!room || !playerInfo || room.game_status !== "round_end" || !allReady(room)) return
    // When the round ends, scroll to top so the (sticky) definition and header are fully visible.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat) return
      const t = e.target as HTMLElement | null
      if (t?.closest("input:not([type=hidden]), textarea, [contenteditable=true]")) return
      e.preventDefault()
      void startNewRoundRef.current()
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [room, playerInfo])

  // Snapshot finished rounds (client-side history) on `round_end` / match `finished`, and
  // backfill when Realtime delivers `round_end` + next `playing` in one paint (no `round_end` render).
  useEffect(() => {
    const prevSnap = roundHistoryPrevRoomRef.current
    roundHistoryPrevRoomRef.current = room

    if (!room || !playerInfo) return

    const appendFromSnapshot = (snap: GameRoom) => {
      const terminal = snap.game_status === "round_end" || snap.game_status === "finished"
      if (!terminal) return
      const r = snap.current_round
      if (!r || recordedRoundEndRef.current === r) return
      const answerWord = snap.current_word
      if (!answerWord) return
      recordedRoundEndRef.current = r

      const active = activeSlots(snap)
      const winnerName = snap.round_winner
      const winnerSlot =
        winnerName != null
          ? (active.find((s) => slotData(s, snap).name === winnerName) ?? null)
          : null
      const mySlot = (playerInfo.playerSlot ?? 1) as PlayerSlot
      const myProgress = slotData(mySlot, snap).progress ?? ""
      const slotProgressBySlot: Partial<Record<PlayerSlot, string>> = {}
      for (const s of active) {
        slotProgressBySlot[s] = slotData(s, snap).progress ?? ""
      }

      const item: RoundHistoryItem = {
        round: r,
        definition: snap.current_definition ?? "",
        imageUrl:
          snap.current_image != null && String(snap.current_image).trim() !== ""
            ? String(snap.current_image).trim()
            : undefined,
        answerWord,
        myProgress,
        endReason: "round_end",
        winnerName,
        winnerSlot,
        slotProgressBySlot,
        viewerSlot: mySlot,
      }
      setRoundHistory((h) => [...h, item])
    }

    appendFromSnapshot(room)

    if (
      room.game_status === "playing" &&
      prevSnap?.game_status === "round_end" &&
      typeof prevSnap.current_round === "number"
    ) {
      appendFromSnapshot(prevSnap)
    }
  }, [room, playerInfo])

  // ── derived values ─────────────────────────────────────────────────────────

  const mySlot = (playerInfo?.playerSlot ?? 1) as PlayerSlot
  const myName = room ? slotData(mySlot, room).name : null

  useEffect(() => {
    if (!room || !playerInfo) return

    const prev = prevGameStatusForOpponentWinSoundRef.current
    const cur = room.game_status
    prevGameStatusForOpponentWinSoundRef.current = cur

    if (cur !== "round_end" || !room.round_winner) return
    if (prev !== "playing") return

    const me = slotData(mySlot, room).name ?? playerInfo.name
    if (normalizePlayerName(room.round_winner) === normalizePlayerName(me)) return

    const prog = slotData(mySlot, room).progress ?? ""
    if (!prog.includes("_")) return

    playOpponentWonRoundSound()
  }, [room, playerInfo, mySlot])

  // ── handlers ───────────────────────────────────────────────────────────────

  // Restarts the shake animation even if it is already playing.
  // Using double-rAF so the browser has time to paint without the class
  // before re-adding it, which forces the CSS animation to restart.
  function triggerShake() {
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current)
    shouldShakeRef.current = true
    setIsShaking(false)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!shouldShakeRef.current) return
        setIsShaking(true)
        shakeTimeoutRef.current = setTimeout(() => setIsShaking(false), 220)
      })
    )
  }

  function cancelShake() {
    shouldShakeRef.current = false
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current)
    setIsShaking(false)
  }

  const triggerWrongKeyFlash = useCallback(() => {
    playWrongLetterSound()
    if (wrongFlashTimeoutRef.current) clearTimeout(wrongFlashTimeoutRef.current)
    setWrongKeyFlash(true)
    wrongFlashTimeoutRef.current = setTimeout(() => {
      setWrongKeyFlash(false)
      wrongFlashTimeoutRef.current = null
    }, 220)
  }, [])

  const commitProgressUpdate = useCallback(
    async (next: string, curBefore: string, opts?: { skipScore?: boolean }) => {
      if (!room || !playerInfo || !room.current_word) return
      consecutiveWrongRef.current = 0
      cancelShake()
      localProgressRef.current = next
      setMyDisplayProgress(next)
      let lastNew = -1
      for (let i = 0; i < next.length; i++) {
        if (curBefore[i] === "_" && next[i] !== "_") {
          lastNew = i
          triggerCorrectLetterFxAt(i)
        }
      }
      if (lastNew >= 0) setLastPlacedIndex(lastNew)
      const pf = `player${mySlot}_progress`
      const sf = `player${mySlot}_score`
      const lettersDelta = opts?.skipScore ? 0 : countNewlyFilledLetters(curBefore, next)
      const baseScore = localLetterScoreRef.current ?? (slotData(mySlot, room).score ?? 0)
      const newScore = baseScore + lettersDelta * SCORE_PER_LETTER
      localLetterScoreRef.current = newScore

      if (isWordComplete(next)) {
        hiddenInputRef.current?.blur()
        flushSync(() => {
          setOptimisticRoundWin(true)
          setShowConfetti(true)
        })
        setTimeout(() => setShowConfetti(false), 3000)
        const totalRounds = room.total_rounds ?? TOTAL_ROUNDS
        const isOver = newScore >= WIN_SCORE || room.current_round >= totalRounds
        const roundEndUpdate: Record<string, unknown> = {
          [pf]: next,
          [sf]: newScore,
          round_winner: slotData(mySlot, room).name!,
          game_status: isOver ? "finished" : "round_end",
          player1_ready: false,
          player2_ready: false,
        }
        if (activeSlots(room).some(s => s >= 3)) {
          roundEndUpdate.player3_ready = false
          roundEndUpdate.player4_ready = false
        }
        await supabase.from("game_rooms").update(roundEndUpdate).eq("room_code", roomCode)
      } else {
        await supabase.from("game_rooms").update({ [pf]: next, [sf]: newScore }).eq("room_code", roomCode)
      }
    },
    [room, mySlot, roomCode, supabase, playerInfo]
  )

  const requestMultiplayerHint = useCallback(async () => {
    if (!multiplayerHintsEnabled) return
    if (!room || !playerInfo || room.game_status !== "playing" || !room.current_word) return
    if (eliminatedFromRoundRef.current) return
    if (hintLettersRemainingRef.current <= 0) return
    const cur = localProgressRef.current ?? slotData(mySlot, room).progress ?? ""
    if (!cur || cur.length !== room.current_word.length) return
    const out = revealRandomAnswerLetter(cur, room.current_word)
    if (!out) return
    hintLettersRemainingRef.current -= 1
    setHintLettersRemaining(hintLettersRemainingRef.current)
    const { next } = out
    if (isWordComplete(next)) playWordCompleteSound()
    else playCorrectLetterSound()
    await commitProgressUpdate(next, cur, { skipScore: true })
  }, [multiplayerHintsEnabled, room, playerInfo, mySlot, commitProgressUpdate])

  const handleLetterInput = useCallback(async (letter: string) => {
    if (!room || !playerInfo || room.game_status !== "playing" || !room.current_word) return
    if (eliminatedFromRoundRef.current) return
    // Lockout: after a wrong letter, ignore input for a few seconds
    if (Date.now() < lockedUntilRef.current) return
    // Use localProgressRef to avoid stale state on rapid key presses
    const cur = localProgressRef.current ?? slotData(mySlot, room).progress
    if (!cur) return
    const next = tryPlaceLetter(letter, cur, room.current_word)
    if (next) {
      if (isWordComplete(next)) playWordCompleteSound()
      else playCorrectLetterSound()
      await commitProgressUpdate(next, cur)
    } else {
      setTypedLetterHistory((prev) => {
        const appended = [...prev, letter]
        if (prev.length === 0) queueMicrotask(() => setLetterHistoryOpen(true))
        return appended
      })
      triggerWrongKeyFlash()
      consecutiveWrongRef.current++
      if (consecutiveWrongRef.current >= 1) {
        lockedUntilRef.current = Date.now() + WRONG_LETTER_LOCK_MS
        consecutiveWrongRef.current = 0
        if (wrongLetterDelayRingTimeoutRef.current) clearTimeout(wrongLetterDelayRingTimeoutRef.current)
        setWrongLetterDelayRing(true)
        wrongLetterDelayRingTimeoutRef.current = setTimeout(() => {
          setWrongLetterDelayRing(false)
          wrongLetterDelayRingTimeoutRef.current = null
        }, WRONG_LETTER_LOCK_MS)
      }
      triggerShake()
    }
  }, [room, mySlot, roomCode, supabase, playerInfo, triggerWrongKeyFlash, commitProgressUpdate])

  handleLetterInputRef.current = handleLetterInput

  const stopSpeechListening = useCallback(() => {
    try {
      speechRecognitionRef.current?.abort()
    } catch {
      /* ignore */
    }
    speechListeningRef.current = false
    setSpeechListeningUi(false)
    speechRecognitionRef.current = null
  }, [])

  const startSpeechLetter = useCallback(() => {
    if (!room || room.game_status !== "playing" || !room.current_word) return
    if (eliminatedFromRoundRef.current) return
    if (!isBrowserSpeechRecognitionSupported()) return
    if (speechListeningRef.current) return
    try {
      speechRecognitionRef.current?.abort()
    } catch {
      /* ignore */
    }
    const locale = speechLocaleForMultiplayerMic(room.language, playerInfo?.language)
    const rec = newSpeechRecognitionForLang(locale)
    if (!rec) return
    speechRecognitionRef.current = rec
    speechListeningRef.current = true
    setSpeechListeningUi(true)

    // Voce: același flux ca Practice — lib/speech-word-match.ts → lib/words.ts
    rec.onresult = (event) => {
      const cur = localProgressRef.current ?? slotData(mySlot, room).progress
      const word = room.current_word
      if (!cur || !word) return
      const next = applySpeechRecognitionResultToProgress(event, cur, word)
      const ok = next != null && next !== cur

      if (ok) {
        speechListeningRef.current = false
        setSpeechListeningUi(false)
        try {
          rec.abort()
        } catch {
          /* ignore */
        }
        if (isWordComplete(next)) playWordCompleteSound()
        else playCorrectLetterSound()
        void commitProgressUpdate(next, cur)
        return
      }

      if (!isLastSpeechResultFinal(event)) return

      speechListeningRef.current = false
      setSpeechListeningUi(false)
      for (const t of collectSpeechTranscripts(event)) {
        const ch = firstLetterFromTranscript(t)
        if (!ch) continue
        if (tryPlaceLetter(ch, cur, word) === null) {
          setTypedLetterHistory((prev) => {
            const appended = [...prev, ch]
            if (prev.length === 0) queueMicrotask(() => setLetterHistoryOpen(true))
            return appended
          })
          break
        }
      }
      eliminatedFromRoundRef.current = true
      setRoundEliminated(true)
      if (wrongLetterDelayRingTimeoutRef.current) {
        clearTimeout(wrongLetterDelayRingTimeoutRef.current)
        wrongLetterDelayRingTimeoutRef.current = null
      }
      setWrongLetterDelayRing(false)
      hiddenInputRef.current?.blur()
      triggerWrongKeyFlash()
      triggerShake()
      const slot = (playerInfo?.playerSlot ?? 1) as PlayerSlot
      const patch: Record<string, unknown> = { [`player${slot}_speech_eliminated`]: true }
      void supabase
        .from("game_rooms")
        .update(patch)
        .eq("room_code", roomCode)
        .then(({ error }) => {
          if (error?.message?.toLowerCase().includes("speech_eliminated")) {
            console.warn("[game] Run scripts/009_add_speech_eliminated.sql to sync speech elimination")
          }
        })
    }

    rec.onerror = (event) => {
      speechListeningRef.current = false
      setSpeechListeningUi(false)
      if (event.error === "aborted" || event.error === "no-speech") return
    }

    rec.onend = () => {
      speechListeningRef.current = false
      setSpeechListeningUi(false)
      speechRecognitionRef.current = null
    }

    try {
      rec.start()
    } catch {
      speechListeningRef.current = false
      setSpeechListeningUi(false)
    }
  }, [room, mySlot, roomCode, supabase, playerInfo, triggerWrongKeyFlash, triggerShake, commitProgressUpdate])

  async function handleToggleReady() {
    if (!room || !playerInfo) return
    await supabase.from("game_rooms")
      .update({ [`player${mySlot}_ready`]: !slotData(mySlot, room).ready })
      .eq("room_code", roomCode)
  }

  async function startNewRound() {
    if (!room) return
    const rowLang = room.language != null && String(room.language).trim() !== "" ? String(room.language).trim() : ""
    const lsLang =
      playerInfo?.language != null && String(playerInfo.language).trim() !== ""
        ? String(playerInfo.language).trim()
        : ""
    const languageHint = rowLang !== "" ? rowLang : lsLang !== "" ? lsLang : undefined
    const rowHasPreset =
      room.category_preset === "images" || room.category_preset === "definitions"
    const piPreset =
      playerInfo?.category_preset === "images" || playerInfo?.category_preset === "definitions"
        ? playerInfo.category_preset
        : undefined
    const categoryPresetHint = rowHasPreset ? undefined : piPreset
    const result = await serverStartNewRound(roomCode, languageHint, categoryPresetHint)
    if (!result.ok) {
      console.error("startNewRound:", result.error)
    }
  }

  startNewRoundRef.current = startNewRound

  async function handlePlayAgain() {
    startGameRef.current = false
    prevProgressRef.current = {}
    const active = activeSlots(room!)

    const reset: Record<string, unknown> = {
      player1_score: 0, player2_score: 0,
      player1_ready: false, player2_ready: false,
      player1_progress: null, player2_progress: null,
      current_round: 0, game_status: "waiting",
      current_word: null, current_definition: null, current_image: null,
      round_winner: null,
      round_end_reason: null,
      player1_speech_eliminated: false,
      player2_speech_eliminated: false,
    }

    if (active.some(s => s >= 3)) {
      reset.player3_score = 0
      reset.player4_score = 0
      reset.player3_ready = false
      reset.player4_ready = false
      reset.player3_progress = null
      reset.player4_progress = null
      reset.player3_speech_eliminated = false
      reset.player4_speech_eliminated = false
    }

    let payload: Record<string, unknown> = { ...reset }
    let { data, error } = await supabase.from("game_rooms").update(payload).eq("room_code", roomCode).select()
    if (error) {
      const msg = (error.message ?? "").toLowerCase()
      if (msg.includes("speech_eliminated") || msg.includes("round_end_reason")) {
        const {
          round_end_reason: _r,
          player1_speech_eliminated: _a,
          player2_speech_eliminated: _b,
          player3_speech_eliminated: _c,
          player4_speech_eliminated: _d,
          ...rest
        } = payload
        payload = rest
        const retry = await supabase.from("game_rooms").update(payload).eq("room_code", roomCode).select()
        data = retry.data
        error = retry.error
      }
    }
    if (error) {
      const msg = (error.message ?? "").toLowerCase()
      if (msg.includes("current_image")) {
        const { current_image: _i, ...rest } = payload
        payload = rest
        const retry = await supabase.from("game_rooms").update(payload).eq("room_code", roomCode).select()
        data = retry.data
        error = retry.error
      }
    }
    if (error || !data?.length) {
      clearWordmatchPlayerSession()
      router.push(homePath)
      return
    }
    setRoom(data[0] as GameRoom)
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleCopyJoinLink() {
    if (!joinRoomUrl) return
    void navigator.clipboard.writeText(joinRoomUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  /** Clears this player's slot in Supabase so others detect disconnect; then home. */
  async function handleExitRoom() {
    leftVoluntarilyRef.current = true
    if (room && playerInfo?.playerSlot) {
      const slot = playerInfo.playerSlot as PlayerSlot
      const payload = getClearSlotPayload(slot)
      try {
        await supabase.from("game_rooms").update(payload).eq("room_code", roomCode)
      } catch (e) {
        console.error("leave room:", e)
        patchClearPlayerSlotKeepalive(roomCode, slot)
      }
    } else if (playerInfo?.playerSlot) {
      patchClearPlayerSlotKeepalive(roomCode, playerInfo.playerSlot as PlayerSlot)
    }
    clearWordmatchPlayerSession()
    router.push(homePath)
  }

  // Height syncing is handled above (disabled) to keep document-level scrolling.

  // ── render helpers ─────────────────────────────────────────────────────────

  function renderTopTransientNoticeBanner() {
    if (!topTransientNotice) return null
    const isReturn = topTransientNotice.kind === "returned"
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs sm:text-sm animate-in fade-in slide-in-from-top-1 duration-200",
          isReturn
            ? "bg-emerald-500/15 border-emerald-500/25"
            : "bg-amber-500/15 border-amber-500/25"
        )}
      >
        <Switch
          checked
          className="scale-[0.72] shrink-0"
          onCheckedChange={(on) => { if (!on) dismissTopTransientNotice() }}
          aria-label={ui.closeNoticeAria}
        />
        <span
          className={cn(
            "flex-1 font-medium leading-snug",
            isReturn ? "text-emerald-950 dark:text-emerald-100" : "text-amber-950 dark:text-amber-100"
          )}
        >
          {topTransientNotice.message}
        </span>
      </div>
    )
  }

  function renderPlayerTopBar() {
    if (!room) return null
    const active = activeSlots(room)
    return (
      <div className="w-full overflow-x-auto overflow-y-visible scrollbar-none py-0.5">
        <div className="mx-auto flex w-max max-w-full justify-center px-0.5 sm:px-1">
          <div className="flex w-max items-stretch gap-2 sm:gap-1.5">
          {active.map(slot => {
            const d = slotData(slot, room)
            const isMe = slot === mySlot
            const color = PLAYER_COLORS[slot - 1]
            return (
              <div
                key={slot}
                className={cn(
                  "box-border flex items-center gap-2 rounded-xl border-2 px-2.5 py-1.5 transition-all duration-200 sm:px-3 sm:py-2",
                  isMe
                    ? "shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.08]"
                    : "opacity-65 ring-1 ring-transparent"
                )}
                style={{
                  borderColor: isMe ? color : "transparent",
                  background: `${color}${isMe ? "18" : "08"}`,
                }}
              >
                <div
                  className="size-2 shrink-0 rounded-full sm:size-2.5"
                  style={{ background: color }}
                />
                <div className="min-w-0 text-left">
                  <p className="max-w-[min(12rem,70vw)] truncate text-xs font-bold leading-tight sm:max-w-[14rem] sm:text-sm">
                    {d.name ?? ui.playerFallback(slot)}
                    {isMe && (
                      <span className="font-normal text-[10px] text-muted-foreground sm:text-xs">{ui.youParen}</span>
                    )}
                  </p>
                  <p
                    className="text-[10px] font-bold tabular-nums leading-tight sm:text-xs"
                    style={{ color }}
                  >
                    {d.score} {ui.pts}
                  </p>
                </div>
              </div>
            )
          })}
          </div>
        </div>
      </div>
    )
  }

  function renderWordMask() {
    if (!room?.current_word) return null
    // Prefer local optimistic state so letters appear instantly on key press,
    // falling back to server state when no local update has happened yet.
    const myProg = myDisplayProgress ?? slotData(mySlot, room).progress ?? ""
    const myReveal = revealProgress ?? ""
    const active = activeSlots(room)
    const myColor = PLAYER_COLORS[mySlot - 1]

    // Find winner slot for round_end reveal
    const winnerSlot = room.round_winner
      ? active.find(s => slotData(s, room).name === room.round_winner) ?? null
      : null
    const winnerProgress = winnerSlot ? (slotData(winnerSlot, room).progress ?? "") : ""
    const winnerColor = winnerSlot ? PLAYER_COLORS[winnerSlot - 1] : null

    return (
      <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
        {room.current_word.split("").map((letter, i) => {
          const ch = myProg[i] ?? "_"
          const playerFilled = ch !== "_"
          const revealCh = myReveal[i] ?? "_"
          const autoFilled = !playerFilled && revealCh !== "_"
          const filled = playerFilled || autoFilled
          const isLast = i === lastPlacedIndex
          const isNewHit = newEnemyHits.has(i)

          // Round-end: determine how to display this letter
          if (isRoundEnd) {
            if (playerFilled) {
              // Current player guessed this letter → player's color
              return (
                <div
                  key={i}
                  className="relative flex items-center justify-center select-none w-12 h-12 sm:w-16 sm:h-16 rounded-xl border-2"
                  style={{ borderColor: `${myColor}80`, background: `${myColor}18` }}
                >
                  <span className="text-xl sm:text-3xl font-black" style={{ color: myColor }}>{ch.toUpperCase()}</span>
                </div>
              )
            }
            if (winnerSlot && winnerSlot !== mySlot) {
              // Opponent won — fill all remaining letters with winner's color
              const winCh = winnerProgress[i] ?? letter
              return (
                <div
                  key={i}
                  className="relative flex items-center justify-center select-none w-12 h-12 sm:w-16 sm:h-16 rounded-xl border-2"
                  style={{ borderColor: `${winnerColor}80`, background: `${winnerColor}18` }}
                >
                  <span className="text-xl sm:text-3xl font-black" style={{ color: winnerColor ?? undefined }}>
                    {winCh.toUpperCase()}
                  </span>
                </div>
              )
            }
            // Time expired — reveal word in red
            return (
              <div key={i} className="relative flex items-center justify-center select-none w-12 h-12 sm:w-16 sm:h-16 rounded-xl border-2 border-red-500 bg-red-500/10">
                <span className="text-xl sm:text-3xl font-black text-red-500">{letter.toUpperCase()}</span>
              </div>
            )
          }

          // Other players who have hit this position
          const enemyHits = active
            .filter(s => s !== mySlot)
            .filter(s => {
              const p = slotData(s, room).progress
              return p && p[i] !== "_"
            })

          const cellStyle: CSSProperties | undefined = playerFilled
            ? {
                borderColor: `${myColor}80`,
                background: `${myColor}18`,
                ...(isLast && !autoFilled
                  ? { boxShadow: `0 0 0 2px ${myColor}, 0 0 0 4px hsl(var(--background))` }
                  : {}),
              }
            : undefined

          const delayLockActive =
            wrongLetterDelayRing &&
            !roundEliminated &&
            !allPlayersSpeechWrongReveal &&
            room.game_status === "playing"
          const cellIsEmptyFree = !playerFilled && !autoFilled
          const delayRingThisCell = delayLockActive && cellIsEmptyFree

          return (
            <LetterCellDelayBorder
              key={i}
              active={delayRingThisCell}
              ringColor={myColor}
              ringHighlightColor={mixPlayerColorWithWhite(myColor, 0.42)}
              boxClassName={cn(
                "w-12 h-12 sm:w-16 sm:h-16 transition-all duration-200",
                isLast && !autoFilled && playerFilled && "scale-110 z-10",
                isNewHit && !filled && "animate-[hitPulse_0.5s_ease-out]"
              )}
              innerClassName={cn(
                "border-2 transition-all duration-200",
                cellIsEmptyFree && "border-muted-foreground/20 bg-muted/30",
                autoFilled && "border-red-500 bg-red-500/10"
              )}
              innerStyle={cellStyle}
            >
              {/* Vertical colored stripes for enemy hits (behind letter) */}
              {!filled && enemyHits.map((slot, idx) => (
                <div
                  key={slot}
                  className="absolute top-0 bottom-0 transition-all duration-300"
                  style={{
                    width: 3,
                    background: PLAYER_COLORS[slot - 1],
                    left: 8 + idx * 9,
                  }}
                />
              ))}

              {/* My letter or placeholder — aceeași culoare ca la final de rundă */}
              {playerFilled
                ? (
                  <CorrectLetterChar
                    ch={ch}
                    color={myColor}
                    cellIndex={i}
                    burstId={correctLetterBursts.get(i)}
                    className="text-xl sm:text-3xl"
                  />
                  )
                : autoFilled
                  ? (
                    <CorrectLetterChar
                      ch={revealCh}
                      color={AUTO_REVEAL_FX_COLOR}
                      cellIndex={i}
                      burstId={correctLetterBursts.get(i)}
                      className="text-xl sm:text-3xl"
                    />
                    )
                  : <span className="text-muted-foreground/20 text-base sm:text-xl select-none">_</span>
              }
            </LetterCellDelayBorder>
          )
        })}
      </div>
    )
  }

  // ── page states ────────────────────────────────────────────────────────────

  if (isLoading || !playerInfo) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-screen items-center justify-center bg-background outline-none"
      >
        <Spinner className="w-8 h-8" />
      </main>
    )
  }

  if (!room) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background outline-none"
      >
        <p className="text-muted-foreground">{ui.roomNotFound}</p>
        <Button
          variant="outline"
          onClick={() => {
            clearWordmatchPlayerSession()
            router.push(homePath)
          }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />{ui.backHome}
        </Button>
      </main>
    )
  }

  // ── FINISHED ──────────────────────────────────────────────────────────────

  if (room.game_status === "finished") {
    if (disconnectMessage) {
      return (
        <main
          id="main-content"
          tabIndex={-1}
          className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-secondary/30 p-4 outline-none"
        >
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold leading-snug">{disconnectMessage}</h2>
                <p className="text-muted-foreground">{ui.gameEnded}</p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => void handleExitRoom()}>
                  <ArrowLeft className="w-4 h-4 mr-2" />{ui.home}
                </Button>
                {!disconnectHidePlayAgain && (
                  <Button onClick={() => void handlePlayAgain()}>{ui.playAgain}</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      )
    }

    const sorted = activeSlots(room)
      .map(s => ({ slot: s, name: slotData(s, room).name!, score: slotData(s, room).score }))
      .sort((a, b) => b.score - a.score)
    const topScore = sorted[0]?.score ?? 0
    const isTie = sorted.filter(p => p.score === topScore).length > 1
    const winnerName = isTie ? null : sorted[0]?.name
    const iWon = winnerName === myName
    const maxBarScore = Math.max(WIN_SCORE, topScore, 1)

    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-secondary/30 p-4 outline-none"
      >
        {iWon && <Confetti recycle={false} numberOfPieces={500} />}
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className={cn(
              "w-20 h-20 mx-auto rounded-full flex items-center justify-center",
              iWon ? "bg-amber-500/20" : "bg-muted"
            )}>
              <Trophy className={cn("w-10 h-10", iWon ? "text-amber-500" : "text-muted-foreground")} />
            </div>
            <h2 className="text-2xl font-bold">
              {winnerName ? ui.winnerWins(winnerName) : ui.itsATie}
            </h2>
            <div className="space-y-2">
              {sorted.map((p, idx) => (
                <FinishedPlayerScoreRow
                  key={p.slot}
                  rank={idx + 1}
                  name={p.name}
                  color={PLAYER_COLORS[p.slot - 1]}
                  finalScore={p.score}
                  isMe={p.name === myName}
                  maxForBar={maxBarScore}
                  youSuffix={ui.finishedYouSuffix}
                  ptsSuffix={ui.finishedPts}
                />
              ))}
            </div>

            <div className="text-left">
              <RoundHistoryCarousel items={roundHistory} />
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => void handleExitRoom()}>
                <ArrowLeft className="w-4 h-4 mr-2" />{ui.home}
              </Button>
              <Button onClick={() => void handlePlayAgain()}>{ui.playAgain}</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  // ── WAITING (room not full) ────────────────────────────────────────────────

  if (room.game_status === "waiting" && !isFull(room)) {
    const maxP = room.max_players ?? 2
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-screen flex-col bg-gradient-to-b from-background to-secondary/30 outline-none"
      >
        {topTransientNotice && (
          <div className="w-full shrink-0 px-4 pt-3 pb-2 border-b border-border/60 bg-background/95 backdrop-blur-sm z-20">
            {renderTopTransientNoticeBanner()}
          </div>
        )}
        <div className="flex flex-1 flex-col items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-3 pb-4 text-center space-y-3">
            <div>
              <h2 className="text-xl font-bold">{ui.waitingForPlayersTitle}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {ui.joinedCount(activeSlots(room).length, maxP)}
              </p>
            </div>
            <div className="space-y-2">
              {Array.from({ length: maxP }).map((_, i) => {
                const s = (i + 1) as PlayerSlot
                const d = slotData(s, room)
                return (
                  <div key={s} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/40">
                    <div
                      className="w-3 h-3 rounded-full transition-all duration-300"
                      style={{ background: PLAYER_COLORS[i], opacity: d.id ? 1 : 0.25 }}
                    />
                    <span className={cn("text-sm font-medium", !d.id && "text-muted-foreground/40 italic")}>
                      {d.name ?? ui.waitingForPlayerSlot(s)}
                    </span>
                    {d.id && <Check className="w-4 h-4 text-emerald-500 ml-auto" />}
                  </div>
                )
              })}
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{ui.roomCode}</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <div className="text-4xl font-mono font-bold tracking-[0.3em] bg-muted px-6 py-3 rounded-xl">
                  {roomCode}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleCopyCode}
                    title={ui.copyRoomCode}
                    aria-label={ui.copyRoomCode}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={handleCopyJoinLink}
                    disabled={!joinRoomUrl}
                    title="Copy invite link for guests"
                    aria-label="Copy invite link for guests"
                  >
                    {linkCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2 pt-1 text-left">
                <p className="text-xs text-muted-foreground uppercase tracking-wider text-center">
                  {ui.linkForPlayers}
                </p>
                {joinRoomUrl ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
                    <a
                      href={joinRoomUrl}
                      className="text-sm font-mono text-primary break-all underline-offset-2 hover:underline"
                    >
                      {joinRoomUrl}
                    </a>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full shrink-0"
                      onClick={handleCopyJoinLink}
                    >
                      {linkCopied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          {ui.copied}
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4 mr-2" />
                          {ui.copyLink}
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="text-center text-xs text-muted-foreground">{ui.loadingLink}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Spinner className="w-4 h-4" /> {ui.waitingForPlayersEllipsis}
            </div>
            <Button variant="ghost" onClick={() => void handleExitRoom()}>
              <ArrowLeft className="w-4 h-4 mr-2" />{ui.leaveRoom}
            </Button>
          </CardContent>
        </Card>
        </div>
      </main>
    )
  }

  // ── READY CHECK ───────────────────────────────────────────────────────────

  if (room.game_status === "waiting" && isFull(room)) {
    const myReady = slotData(mySlot, room).ready
    const active = activeSlots(room)
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-screen flex-col bg-gradient-to-b from-background to-secondary/30 outline-none"
      >
        {topTransientNotice && (
          <div className="w-full shrink-0 px-4 pt-3 pb-2 border-b border-border/60 bg-background/95 backdrop-blur-sm z-20">
            {renderTopTransientNoticeBanner()}
          </div>
        )}
        <div className="flex flex-1 flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-3 pb-4 space-y-3">
            <div className="text-center">
              <h2 className="text-xl font-bold">{ui.readyToStartTitle}</h2>
              <p className="text-sm text-muted-foreground mt-1">{ui.readyToStartSubtitle}</p>
            </div>
            <div className={cn(
              "grid gap-3",
              active.length <= 2 ? "grid-cols-2" : active.length === 3 ? "grid-cols-3" : "grid-cols-2"
            )}>
              {active.map(slot => {
                const d = slotData(slot, room)
                return (
                  <div
                    key={slot}
                    className={cn(
                      "p-3 rounded-xl border-2 text-center transition-all",
                      d.ready ? "border-emerald-500 bg-emerald-500/10" : "border-muted"
                    )}
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PLAYER_COLORS[slot - 1] }} />
                      <p className="font-semibold text-sm truncate">{d.name}</p>
                    </div>
                    <p className={cn("text-xs font-medium", d.ready ? "text-emerald-600" : "text-muted-foreground")}>
                      {d.ready ? ui.readyStatus : ui.notReadyStatus}
                    </p>
                  </div>
                )
              })}
            </div>
            <Button
              className="w-full" size="lg"
              variant={myReady ? "secondary" : "default"}
              onClick={handleToggleReady}
            >
              {myReady ? ui.cancelReady : ui.imReady}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => void handleExitRoom()}>
              <ArrowLeft className="w-4 h-4 mr-2" />{ui.leaveRoom}
            </Button>
          </CardContent>
        </Card>
        </div>
      </main>
    )
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────

  const isRoundEnd = room.game_status === "round_end"
  const iWonRound = room.round_winner === myName
  const myReady = slotData(mySlot, room).ready
  const everyoneReady = allReady(room)

  /** Ca la practice: înălțime card definiție + timp după lungimea textului */
  const definitionText = room.current_definition ?? ""
  const definitionExtraBreaks = (definitionText.match(/\n/g) || []).length
  const roundImageUrl =
    room.current_image != null && String(room.current_image).trim() !== ""
      ? String(room.current_image).trim()
      : ""
  const imageLineBoost = roundImageUrl ? 3 : 0
  const approxDefinitionLines = Math.max(
    1,
    Math.ceil(definitionText.length / 36) + definitionExtraBreaks + imageLineBoost
  )
  const defCardVerticalPad =
    approxDefinitionLines <= 2
      ? "pt-5 pb-4"
      : approxDefinitionLines <= 4
        ? "pt-6 pb-5"
        : "pt-7 pb-6"

  /** Mai puțin spațiu vertical când răspunsul e deja complet (în rundă sau la round_end). */
  const defCardVerticalPadWordComplete =
    approxDefinitionLines <= 2
      ? "pt-3 pb-2"
      : approxDefinitionLines <= 4
        ? "pt-4 pb-3"
        : "pt-5 pb-4"

  const myProgressForPad = myDisplayProgress ?? slotData(mySlot, room).progress ?? ""
  const playingWordComplete =
    room.game_status === "playing" &&
    !!room.current_word &&
    myProgressForPad.length === room.current_word.length &&
    isWordComplete(myProgressForPad)

  const defCardPlayingVerticalPad = playingWordComplete ? defCardVerticalPadWordComplete : defCardVerticalPad

  const myPlayerColor = PLAYER_COLORS[mySlot - 1]

  return (
    <main
      ref={gameShellRef}
      id="main-content"
      className={cn(
        // Let the document scroll so mobile browser chrome can collapse.
        "relative min-h-dvh flex flex-col overflow-x-hidden bg-gradient-to-b from-background to-secondary/30 outline-none scrollbar-none",
        isShaking && "animate-[shake_0.3s_ease-in-out]"
      )}
      tabIndex={0}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-[100] bg-red-400/16 dark:bg-red-950/28 transition-opacity duration-[90ms] ease-out",
          wrongKeyFlash ? "opacity-100" : "opacity-0"
        )}
      />
      {showConfetti && (iWonRound || optimisticRoundWin) && (
        <Confetti recycle={false} numberOfPieces={300} />
      )}

      {/* Sticky top bar — același grid + stil ca practice (Exit | centru | sunet/ambient) */}
      <div
        ref={topBarRef}
        className="sticky top-0 z-30 shrink-0 border-b border-border/60 bg-background/90 shadow-[0_1px_0_hsl(var(--border)/0.35)] backdrop-blur-md supports-[backdrop-filter]:bg-background/80"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2.5 px-3 pt-2.5 pb-2 sm:px-4 sm:pt-3 sm:pb-2.5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 sm:gap-x-3">
            <div className="flex min-w-0 justify-start">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-1.5 h-9 shrink-0 px-2 text-muted-foreground hover:text-foreground sm:-ml-1 sm:h-8"
                onClick={() => void handleExitRoom()}
              >
                <ArrowLeft className="mr-1 size-4 shrink-0" aria-hidden />
                {ui.exit}
              </Button>
            </div>
            <div className="flex min-w-0 max-w-[min(16rem,52vw)] flex-col items-center gap-1 text-center sm:max-w-xs">
              <span className="text-sm font-semibold tabular-nums tracking-tight text-foreground sm:text-base">
                {ui.roundProgress(room.current_round, room.total_rounds ?? TOTAL_ROUNDS)}
              </span>
              {room.category && CATEGORIES[room.category as CategoryKey] && (
                <div
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/40 bg-muted/50 px-2.5 py-0.5 text-[11px] leading-tight text-muted-foreground sm:text-xs"
                  title={categoryTitleForLocale(room.category as CategoryKey, siteLocale === "ro" ? "ro" : "en")}
                  suppressHydrationWarning
                >
                  <span className="shrink-0 text-[13px] leading-none sm:text-sm" aria-hidden>
                    {CATEGORIES[room.category as CategoryKey].emoji}
                  </span>
                  <span className="min-w-0 truncate font-medium">
                    {categoryTitleForLocale(room.category as CategoryKey, siteLocale === "ro" ? "ro" : "en")}
                  </span>
                </div>
              )}
            </div>
            <div className="flex min-w-0 items-center justify-end gap-1 sm:gap-1.5">
              <AmbientWavesToggle />
              <LetterSoundToggle />
            </div>
          </div>

          {/* Player row — același spațiere ca practice */}
          {renderPlayerTopBar()}

          {renderTopTransientNoticeBanner()}
        </div>
      </div>

      {/* Conținut: scroll unic pe <main> (tastatură / browsere non-Chrome). */}
      <div
        className="flex w-full max-w-2xl flex-col items-stretch justify-start gap-5 px-4 pt-2 pb-6 mx-auto"
        onClick={() => {
          if (!isRoundEnd && !roundEliminated && !allPlayersSpeechWrongReveal) {
            focusWithoutScroll(hiddenInputRef.current)
          }
        }}
      >

        {isRoundEnd ? (
          <>
            {/* ── Definition (kept visible) ── */}
            <Card className="w-full shadow-sm">
              <CardContent className="px-6 py-4 sm:px-8 sm:py-5">
                <div className="flex w-full flex-col items-center text-center">
                  {roundImageUrl ? (
                    <div className="mb-3 flex w-full max-w-[13rem] justify-center overflow-hidden rounded-xl sm:max-w-[15rem]">
                      <img
                        src={roundImageUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-auto max-h-28 w-auto max-w-full rounded-xl object-contain sm:max-h-32"
                      />
                    </div>
                  ) : null}
                  <p className="text-base sm:text-lg text-center leading-relaxed">
                    {room.current_definition}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ── Word mask with letters filled in winner's color ── */}
            <div className="w-full flex justify-center">
              {renderWordMask()}
            </div>

            {/* ── Result header ── */}
            {room.round_winner ? (
              <div className={cn(
                "flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl px-4 py-3 text-center sm:h-12 sm:py-0",
                iWonRound ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-muted"
              )}>
                <div className="flex items-center justify-center gap-2 text-base font-semibold leading-tight">
                  <Trophy className="h-4 w-4 shrink-0" />
                  {iWonRound ? ui.youWinRound : ui.winnerWins(room.round_winner)}
                </div>
              </div>
            ) : (
              <div className="flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl bg-destructive/10 px-4 py-3 text-center text-destructive sm:h-12 sm:py-0">
                <div className="flex items-center justify-center gap-2 text-center text-base font-semibold leading-tight">
                  {room.round_end_reason !== "all_speech_wrong" && (
                    <Timer className="h-4 w-4 shrink-0" />
                  )}
                  {room.round_end_reason === "all_speech_wrong"
                    ? multiplayerSpeechUi.multiplayerRoundEndAllSpeechWrong
                    : multiplayerSpeechUi.multiplayerRoundEndTimeout}
                </div>
              </div>
            )}

            {/* ── Player ready cards ── */}
            <div className="grid grid-cols-2 gap-2 w-full">
              {activeSlots(room).map(slot => {
                const d = slotData(slot, room)
                const isReady = d.ready
                return (
                  <div
                    key={slot}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors",
                      isReady ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PLAYER_COLORS[slot - 1] }} />
                      <span className="text-sm font-medium truncate">{d.name}</span>
                    </div>
                    {isReady
                      ? <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    }
                  </div>
                )
              })}
            </div>


            {/* ── I'm Ready button ── */}
            <Button
              className={cn("h-12 w-full", myReady && "bg-emerald-600 hover:bg-emerald-700 text-white")}
              variant={myReady ? "default" : "outline"}
              size="lg"
              onClick={handleToggleReady}
            >
              {myReady ? <><Check className="w-4 h-4 mr-2" />{ui.readyExclaim}</> : ui.imReady}
            </Button>

            {/* ── Next Round — orice jucător când toți sunt Ready (gazda rămâne singura care pornește prima rundă din waiting) ── */}
            <Button
              className="h-12 w-full"
              size="lg"
              onClick={() => startNewRound()}
              disabled={!everyoneReady}
            >
              {everyoneReady ? ui.nextRound : ui.waitingForPlayers}
            </Button>
          </>
        ) : (
          <>
            {/* Definiție + bară jos în card: tastatură | panou | microfon */}
            <div className="flex w-full flex-col">
            <div className={cn("sticky z-20", room.game_status === "playing" && "pt-2")} style={{ top: stickyTopPx }}>
            <Card
              className={cn(
                "relative w-full gap-0 py-0 shadow-sm border-2 transition-[border-color] duration-200",
                wrongKeyFlash
                  ? "border-red-500 dark:border-red-400"
                  : timeRemaining <= 10
                    ? "border-[#fecaca] animate-[practiceUrgentBorder_0.75s_ease-in-out_infinite]"
                    : "border-border"
              )}
            >
              <CardContent
                className={cn(
                  "px-4",
                  defCardPlayingVerticalPad,
                  !roundEliminated &&
                    !allPlayersSpeechWrongReveal &&
                    cn(
                      "relative px-10 sm:px-12",
                      playingWordComplete ? "pt-4 pb-3" : "pt-8 pb-6"
                    )
                )}
              >
                <div className="flex w-full flex-col items-center text-center">
                  {!roundEliminated && !allPlayersSpeechWrongReveal && multiplayerHintsEnabled && hintLettersRemaining > 0 ? (
                    <div
                      className="absolute left-2 top-2 z-10 sm:left-3 sm:top-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        variant="secondary"
                        title={ui.hintRevealTitleMultiplayer}
                        aria-label={ui.hintRevealAriaMultiplayer(hintLettersRemaining)}
                        className="flex size-6 min-h-6 min-w-6 shrink-0 items-center justify-center rounded-md border-2 p-0 shadow-md text-[11px] font-bold tabular-nums leading-none"
                        style={{
                          borderColor: `${myPlayerColor}80`,
                          background: `${myPlayerColor}18`,
                          color: myPlayerColor,
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          void requestMultiplayerHint().finally(() => {
                            // Keep the mobile keyboard open after tapping hint.
                            focusWithoutScroll(hiddenInputRef.current)
                          })
                        }}
                      >
                        {hintLettersRemaining}
                      </Button>
                    </div>
                  ) : null}
                  <p
                    className={cn(
                      "w-full text-lg sm:text-xl font-bold tabular-nums leading-none",
                      timeRemaining <= 10 ? "text-red-400" : "text-muted-foreground"
                    )}
                  >
                    {timeRemaining}s
                  </p>
                  {roundImageUrl ? (
                    <div
                      className={cn(
                        "mt-2 flex w-full max-w-[13rem] justify-center overflow-hidden rounded-xl sm:max-w-[15rem]",
                        room.game_status === "playing" && "mt-2.5"
                      )}
                    >
                      <img
                        src={roundImageUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-auto max-h-28 w-auto max-w-full rounded-xl object-contain sm:max-h-32"
                      />
                    </div>
                  ) : null}
                  <p
                    className={cn(
                      "w-full text-center text-base sm:text-lg",
                      roundImageUrl ? "mt-2" : "mt-1",
                      approxDefinitionLines > 4 ? "leading-tight" : "leading-snug"
                    )}
                  >
                    {room.current_definition}
                  </p>
                </div>
              </CardContent>
              {!roundEliminated && !allPlayersSpeechWrongReveal && (
                <div className="relative z-10 flex w-full min-h-10 items-center justify-between gap-2 px-2 py-2 pb-2.5 pt-1.5 sm:px-3">
                  <LetterHistoryToggleButton
                    embedded
                    letters={typedLetterHistory}
                    open={letterHistoryOpen}
                    onOpenChange={setLetterHistoryOpen}
                    restoreTypingFocus={restoreTypingFocus}
                  />
                  <div className="flex min-h-6 min-w-0 flex-1 items-center justify-center px-1">
                    <LetterHistoryPanel
                      letters={typedLetterHistory}
                      open={letterHistoryOpen}
                      onOpenChange={setLetterHistoryOpen}
                      restoreTypingFocus={restoreTypingFocus}
                      className="mx-0 max-h-[3.25rem] w-auto max-w-[8.75rem] sm:max-w-[9.75rem]"
                    />
                  </div>
                  <div className="flex size-6 shrink-0 items-center justify-end">
                    {isBrowserSpeechRecognitionSupported() ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon-sm"
                        className="size-6 min-h-6 min-w-6 rounded-full p-0 shadow-md"
                        title={
                          speechListeningUi
                            ? multiplayerSpeechUi.micTapToStop
                            : multiplayerSpeechUi.micTitleMultiplayer
                        }
                        aria-label={
                          speechListeningUi ? multiplayerSpeechUi.micTapToStop : multiplayerSpeechUi.micAria
                        }
                        aria-pressed={speechListeningUi}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (speechListeningRef.current) stopSpeechListening()
                          else startSpeechLetter()
                        }}
                      >
                        <Mic className={cn("h-3 w-3", speechListeningUi && "animate-pulse text-red-500")} />
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}
            </Card>
            </div>
            </div>
            {roundEliminated && !allPlayersSpeechWrongReveal && (
              <p className="text-xs text-center text-destructive font-medium px-2">
                {multiplayerSpeechUi.multiplayerEliminatedLine}
              </p>
            )}

            {/* Word mask — hidden input placed here so browser auto-scroll targets this area */}
            <div ref={wordMaskRef} className="relative w-full flex justify-center">
              <input
                ref={hiddenInputRef}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="absolute opacity-0 w-px h-px top-1/2 left-1/2 pointer-events-none"
                style={{ fontSize: 16 }}
                onChange={(e) => {
                  const v = e.target.value
                  if (v) {
                    const ch = v[v.length - 1]
                    if (/\p{L}/u.test(ch)) {
                      // Skip if keydown already handled this keystroke (desktop)
                      if (!keyHandledRef.current) handleLetterInput(ch)
                      keyHandledRef.current = false
                    }
                    e.target.value = ""
                  }
                }}
              />
              {renderWordMask()}
            </div>

            {/* Legend */}
            <div className="text-center space-y-2">
              <p className="text-sm text-center px-2 text-muted-foreground">
                {allPlayersSpeechWrongReveal
                  ? multiplayerSpeechUi.multiplayerWaitRound
                  : roundEliminated
                    ? multiplayerSpeechUi.multiplayerWaitRound
                    : isBrowserSpeechRecognitionSupported()
                      ? multiplayerSpeechUi.multiplayerHintPlaying
                      : multiplayerSpeechUi.multiplayerHintNoMic}
              </p>
              {activeSlots(room).filter(s => s !== mySlot).length > 0 && (
                <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/55 flex-wrap">
                  {activeSlots(room).filter(s => s !== mySlot).map(s => (
                    <span key={s} className="flex items-center gap-1">
                      <span
                        className="inline-block w-[3px] h-3.5 rounded-full"
                        style={{ background: PLAYER_COLORS[s - 1] }}
                      />
                      {slotData(s, room).name}
                    </span>
                  ))}
                  <span className="italic">{ui.rivalProgressLegend}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        @keyframes hitPulse {
          0%   { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.5); }
          60%  { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
          100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
        @keyframes practiceUrgentBorder {
          0%, 100% { border-color: #fecaca; }
          50% { border-color: #f87171; }
        }
      `}</style>
    </main>
  )
}
