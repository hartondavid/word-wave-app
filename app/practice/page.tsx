"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  startPracticeRound,
  finalizePracticeRound,
  tryResumePracticeSession,
} from "@/app/practice/actions"
import {
  tryPlaceLetter,
  isWordComplete,
  countNewlyFilledLetters,
  revealRandomAnswerLetter,
} from "@/lib/words"
import { SCORE_PER_LETTER, WIN_SCORE } from "@/lib/game-types"
import {
  playCorrectLetterSound,
  playWrongLetterSound,
  playWordCompleteSound,
  playWordIncompleteFailureSound,
} from "@/lib/play-correct-letter-sound"
import { startGameAmbientWaves, stopGameAmbientWaves } from "@/lib/game-ambient-waves"
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
  speechLocaleForRoundLanguage,
} from "@/lib/speech-word-match"
import type { CategoryKey } from "@/lib/game-types"
import { CATEGORIES } from "@/lib/game-types"
import { currentLocaleFromPathname } from "@/lib/locale-switch-paths"
import { categoryTitleForLocale } from "@/lib/home-play-form-strings"
import { gameUiStrings } from "@/lib/game-ui-strings"
import { speechUiStrings } from "@/lib/speech-ui-strings"
import { ArrowLeft, RotateCcw, Trophy, Mic } from "lucide-react"
import { cn } from "@/lib/utils"
import Confetti from "react-confetti"
import { LetterCellDelayBorder } from "@/components/letter-cell-delay-border"
import {
  LetterHistoryPanel,
  LetterHistoryToggleButton,
} from "@/components/letter-history-over-timer"
import { CorrectLetterChar, useCorrectLetterFx } from "@/components/correct-letter-fx"
import { LetterSoundToggle } from "@/components/letter-sound-toggle"
import { AmbientWavesToggle } from "@/components/ambient-waves-toggle"
import { FinishedPlayerScoreRow } from "@/components/game-finished-score-row"

const PRACTICE_TIMER_SECONDS_OPTIONS = [30, 60] as const
type PracticeTimerSeconds = (typeof PRACTICE_TIMER_SECONDS_OPTIONS)[number]
const DEFAULT_PRACTICE_TIMER_SECONDS: PracticeTimerSeconds = 30

function normalizePracticeTimerSeconds(raw: unknown): PracticeTimerSeconds {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? parseInt(raw, 10) : NaN
  if (n === 30 || n === 60) return n
  return DEFAULT_PRACTICE_TIMER_SECONDS
}

/** Culoare litere ghicite — Practice (single player) */
const PRACTICE_PLAYER_COLOR = "#22C55E"
/** Accent verde deschis pentru inelul animat la lockout (greșeală) */
const PRACTICE_DELAY_RING_HIGHLIGHT = "#86efac"
/** Praf + pop la litere dezvăluite automat (timeout / eșec rundă) */
const PRACTICE_AUTO_REVEAL_FX_COLOR = "#dc2626"

const PRACTICE_SESSION_KEY = "wordmatch_practice_session_v1"
const PRACTICE_HINT_LETTERS_PER_ROUND = 3

type PracticeSessionSnapshot = {
  progress: string
  timeLeft: number
  round: number
  score: number
  wordLength: number
  category: string
  language: string
  roundTimerSeconds?: number
  hintLettersRemaining?: number
}

function readStoredField<T>(field: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const stored = localStorage.getItem("wordmatch_player")
    if (!stored) return fallback
    const val = JSON.parse(stored)[field]
    return val !== undefined && val !== null ? val : fallback
  } catch {
    return fallback
  }
}

function normalizeHintLettersRemaining(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return PRACTICE_HINT_LETTERS_PER_ROUND
  const n = Math.floor(raw)
  if (n < 0 || n > PRACTICE_HINT_LETTERS_PER_ROUND) return PRACTICE_HINT_LETTERS_PER_ROUND
  return n
}

export default function PracticePage() {
  const [playerName, setPlayerName] = useState("")
  /** Fixed defaults on first paint so SSR HTML matches the client (prefs applied in bootstrap effect). */
  const [category, setCategory] = useState("general")
  const [language, setLanguage] = useState("en")
  const [totalRounds, setTotalRounds] = useState(10)
  /** Definition + length for UI; `answerWordRef` holds the word for instant local typing (server cookie still used on finalize). */
  const [roundMeta, setRoundMeta] = useState<{
    definition: string
    wordLength: number
  } | null>(null)
  const answerWordRef = useRef("")
  const [progress, setProgress] = useState("")
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [practiceTimerSeconds, setPracticeTimerSeconds] = useState<PracticeTimerSeconds>(
    DEFAULT_PRACTICE_TIMER_SECONDS
  )
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_PRACTICE_TIMER_SECONDS)
  const [gameStatus, setGameStatus] = useState<
    | "loading"
    | "playing"
    | "resolving"
    | "revealing"
    | "won"
    | "timeout"
    | "lost"
    | "finished"
  >("loading")
  const [isShaking, setIsShaking] = useState(false)
  /** Scurt flash roșu deschis pe fundal la literă greșită */
  const [wrongKeyFlash, setWrongKeyFlash] = useState(false)
  const wrongFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  // Letters auto-revealed when time expires (shown in red)
  const [revealProgress, setRevealProgress] = useState("")
  const hiddenInputRef = useRef<HTMLInputElement>(null)
  const wordMaskRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef("")
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shouldShakeRef = useRef(false)
  // Prevents double-firing: keydown sets this true so onChange skips the same key
  const keyHandledRef = useRef(false)
  const handleNextRoundRef = useRef<() => void>(() => {})
  /** Oprește dublarea finalizării (timp 0 + greșeală în același moment). */
  const roundConcludedRef = useRef(false)
  /** După literă greșită la tastatură: scurt lockout (microfonul nu folosește asta). */
  const WRONG_LETTER_LOCK_MS = 3000
  const consecutiveWrongRef = useRef(0)
  const lockedUntilRef = useRef(0)
  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const speechListeningRef = useRef(false)
  const [speechListeningUi, setSpeechListeningUi] = useState(false)
  /** Inel roșu animat peste contur, doar pe casete goale în timpul lockout */
  const [wrongLetterDelayRing, setWrongLetterDelayRing] = useState(false)
  const wrongLetterDelayRingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [typedLetterHistory, setTypedLetterHistory] = useState<string[]>([])
  const [letterHistoryOpen, setLetterHistoryOpen] = useState(false)
  const [practiceHintsEnabled, setPracticeHintsEnabled] = useState(false)
  const [hintLettersRemaining, setHintLettersRemaining] = useState(PRACTICE_HINT_LETTERS_PER_ROUND)
  const hintLettersRemainingRef = useRef(PRACTICE_HINT_LETTERS_PER_ROUND)
  const restoreTypingFocus = useCallback(() => {
    hiddenInputRef.current?.focus()
  }, [])
  const {
    cellBursts: correctLetterBursts,
    triggerAt: triggerCorrectLetterFxAt,
    reset: resetCorrectLetterFx,
  } = useCorrectLetterFx()
  const handleLetterInputRef = useRef<((letter: string) => void | Promise<void>) | null>(null)
  const gameStatusRef = useRef(gameStatus)
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const siteLocale = currentLocaleFromPathname(pathname)
  const ui = useMemo(() => gameUiStrings(siteLocale), [siteLocale])

  /** Mesaje microfon / rundă — după limba site-ului (/ro vs EN). */
  const practiceSpeechUi = useMemo(
    () => speechUiStrings(siteLocale === "ro" ? "ro" : "en"),
    [siteLocale]
  )

  useEffect(() => {
    gameStatusRef.current = gameStatus
  }, [gameStatus])

  useEffect(() => {
    return () => {
      if (wrongFlashTimeoutRef.current) clearTimeout(wrongFlashTimeoutRef.current)
      if (wrongLetterDelayRingTimeoutRef.current) clearTimeout(wrongLetterDelayRingTimeoutRef.current)
    }
  }, [])

  const triggerWrongKeyFlash = useCallback(() => {
    playWrongLetterSound()
    if (wrongFlashTimeoutRef.current) clearTimeout(wrongFlashTimeoutRef.current)
    setWrongKeyFlash(true)
    wrongFlashTimeoutRef.current = setTimeout(() => {
      setWrongKeyFlash(false)
      wrongFlashTimeoutRef.current = null
    }, 220)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem("wordmatch_player")
    const home = siteLocale === "ro" ? "/ro" : "/"
    if (stored) {
      const data = JSON.parse(stored)
      setPlayerName(data.name || ui.defaultPlayerName)
    } else {
      router.push(home)
    }
  }, [router, siteLocale, ui.defaultPlayerName])

  const loadNewWord = useCallback(
    async (
      overrideCategory?: string,
      overrideLanguage?: string,
      overrideTimerSeconds?: PracticeTimerSeconds
    ) => {
    const cat = overrideCategory ?? category
    const lang = overrideLanguage ?? language
    const roundDuration = overrideTimerSeconds ?? practiceTimerSeconds
    try {
      sessionStorage.removeItem(PRACTICE_SESSION_KEY)
    } catch {
      /* ignore */
    }
    setGameStatus("loading")
    resetCorrectLetterFx()
    answerWordRef.current = ""
    const meta = await startPracticeRound(cat, lang)
    answerWordRef.current = meta.word
    setRoundMeta({ definition: meta.definition, wordLength: meta.wordLength })
    const initProgress = "_".repeat(meta.wordLength)
    progressRef.current = initProgress
    consecutiveWrongRef.current = 0
    lockedUntilRef.current = 0
    if (wrongLetterDelayRingTimeoutRef.current) {
      clearTimeout(wrongLetterDelayRingTimeoutRef.current)
      wrongLetterDelayRingTimeoutRef.current = null
    }
    setWrongLetterDelayRing(false)
    setTypedLetterHistory([])
    setLetterHistoryOpen(false)
    setProgress(initProgress)
    setRevealProgress("_".repeat(meta.wordLength))
    hintLettersRemainingRef.current = PRACTICE_HINT_LETTERS_PER_ROUND
    setHintLettersRemaining(PRACTICE_HINT_LETTERS_PER_ROUND)
    setTimeLeft(roundDuration)
    roundConcludedRef.current = false
    setGameStatus("playing")
  },
    [category, language, practiceTimerSeconds, resetCorrectLetterFx]
  )

  useEffect(() => {
    if (gameStatus !== "playing") {
      try {
        speechRecognitionRef.current?.abort()
      } catch {
        /* ignore */
      }
      speechRecognitionRef.current = null
      speechListeningRef.current = false
      setSpeechListeningUi(false)
    }
  }, [gameStatus])

  useEffect(() => {
    if (gameStatus === "loading" || gameStatus === "finished") {
      stopGameAmbientWaves(true)
      return
    }
    if (gameStatus === "playing") {
      startGameAmbientWaves()
      return
    }
    if (
      gameStatus === "won" ||
      gameStatus === "timeout" ||
      gameStatus === "lost" ||
      gameStatus === "revealing" ||
      gameStatus === "resolving"
    ) {
      return
    }
    stopGameAmbientWaves(true)
  }, [gameStatus])

  useEffect(() => {
    return () => stopGameAmbientWaves(true)
  }, [])

  useEffect(() => {
    return () => {
      try {
        speechRecognitionRef.current?.abort()
      } catch {
        /* ignore */
      }
    }
  }, [])

  // La încărcare: aplică prefs din localStorage + reia rundă dacă cookie + sessionStorage coincid.
  useEffect(() => {
    const cat = readStoredField("category", "general")
    const lang = readStoredField("language", "en")
    const maxR = readStoredField("max_rounds", 10)
    const timerSec = normalizePracticeTimerSeconds(
      readStoredField("practice_round_seconds", DEFAULT_PRACTICE_TIMER_SECONDS)
    )
    setCategory(cat)
    setLanguage(lang)
    setTotalRounds(maxR)
    setPracticeTimerSeconds(timerSec)
    const hintsPref = readStoredField("practice_hints_enabled", false)
    setPracticeHintsEnabled(typeof hintsPref === "boolean" ? hintsPref : true)

    let cancelled = false
    ;(async () => {
      const resume = await tryResumePracticeSession()
      if (cancelled) return
      let stored: PracticeSessionSnapshot | null = null
      try {
        const raw = sessionStorage.getItem(PRACTICE_SESSION_KEY)
        if (raw) stored = JSON.parse(raw) as PracticeSessionSnapshot
      } catch {
        stored = null
      }
      if (
        resume &&
        stored &&
        stored.wordLength === resume.wordLength &&
        stored.category === cat &&
        stored.language === lang &&
        typeof stored.progress === "string" &&
        stored.progress.length === resume.wordLength
      ) {
        answerWordRef.current = resume.word
        setRoundMeta({ definition: resume.definition, wordLength: resume.wordLength })
        progressRef.current = stored.progress
        setProgress(stored.progress)
        setRevealProgress("_".repeat(resume.wordLength))
        const resumeCap =
          typeof stored.roundTimerSeconds === "number" &&
          PRACTICE_TIMER_SECONDS_OPTIONS.includes(stored.roundTimerSeconds as PracticeTimerSeconds)
            ? stored.roundTimerSeconds
            : timerSec
        setTimeLeft(
          typeof stored.timeLeft === "number"
            ? Math.max(0, Math.min(resumeCap, stored.timeLeft))
            : timerSec
        )
        setRound(typeof stored.round === "number" ? stored.round : 1)
        setScore(typeof stored.score === "number" ? stored.score : 0)
        const hr = normalizeHintLettersRemaining(stored.hintLettersRemaining)
        hintLettersRemainingRef.current = hr
        setHintLettersRemaining(hr)
        setGameStatus("playing")
        return
      }
      await loadNewWord(cat, lang, timerSec)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap o singură dată la mount; loadNewWord folosește override-uri
  }, [])

  useEffect(() => {
    if (gameStatus !== "playing" || !roundMeta) return
    try {
      const snap: PracticeSessionSnapshot = {
        progress: progressRef.current,
        timeLeft,
        round,
        score,
        wordLength: roundMeta.wordLength,
        category,
        language,
        roundTimerSeconds: practiceTimerSeconds,
        hintLettersRemaining,
      }
      sessionStorage.setItem(PRACTICE_SESSION_KEY, JSON.stringify(snap))
    } catch {
      /* ignore */
    }
  }, [
    gameStatus,
    roundMeta,
    progress,
    timeLeft,
    round,
    score,
    category,
    language,
    practiceTimerSeconds,
    hintLettersRemaining,
  ])

  useEffect(() => {
    if (gameStatus === "won" || gameStatus === "timeout" || gameStatus === "lost" || gameStatus === "finished") {
      try {
        sessionStorage.removeItem(PRACTICE_SESSION_KEY)
      } catch {
        /* ignore */
      }
    }
  }, [gameStatus])

  useEffect(() => {
    if (gameStatus !== "playing") return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [gameStatus])

  /** Finalizare rundă pierdută (timp expirat sau răspuns greșit): reveal roșu ca la timeout. */
  const runPracticeFailure = useCallback(
    async (mode: "time" | "wrong", life: { cancelled: boolean }) => {
      const rm = roundMeta
      if (!rm) return
      const cur = progressRef.current
      const res = await finalizePracticeRound("timeout", cur)
      if (life.cancelled) return
      const endStatus = mode === "time" ? ("timeout" as const) : ("lost" as const)
      if (!res.ok) {
        const w = answerWordRef.current
        if (w.length === rm.wordLength) {
          for (let i = 0; i < w.length; i++) {
            if (cur[i] === "_" && w[i] !== "_") triggerCorrectLetterFxAt(i)
          }
          setRevealProgress(w)
        }
        setGameStatus(endStatus)
        return
      }
      const slots = res.revealSlots ?? []
      if (slots.length === 0) {
        setGameStatus(endStatus)
        return
      }
      setGameStatus("revealing")
      const base = "_".repeat(rm.wordLength)
      setRevealProgress(base)
      slots.forEach((slot, idx) => {
        setTimeout(() => {
          if (life.cancelled) return
          triggerCorrectLetterFxAt(slot.index)
          setRevealProgress((prev) => {
            const arr = prev.split("")
            arr[slot.index] = slot.char
            return arr.join("")
          })
        }, (idx + 1) * 150)
      })
      setTimeout(() => {
        if (!life.cancelled) setGameStatus(endStatus)
      }, slots.length * 150 + 500)
    },
    [roundMeta, triggerCorrectLetterFxAt]
  )

  const beginPracticeRoundFailure = useCallback(
    (mode: "time" | "wrong") => {
      if (!roundMeta) return null
      if (roundConcludedRef.current) return null
      roundConcludedRef.current = true
      playWordIncompleteFailureSound()
      hiddenInputRef.current?.blur()
      try {
        speechRecognitionRef.current?.abort()
      } catch {
        /* ignore */
      }
      speechRecognitionRef.current = null
      speechListeningRef.current = false
      setSpeechListeningUi(false)
      const life = { cancelled: false }
      setGameStatus("resolving")
      void runPracticeFailure(mode, life)
      return life
    },
    [roundMeta, runPracticeFailure]
  )

  // Timer 0: același flux ca la greșeală (oprește timpul + litere roșii).
  // (Nu includem `gameStatus` în deps — altfel cleanup anulează async-ul după `resolving`.)
  useEffect(() => {
    if (timeLeft !== 0 || !roundMeta) return
    if (gameStatusRef.current !== "playing") return
    const life = beginPracticeRoundFailure("time")
    if (!life) return
    return () => {
      life.cancelled = true
    }
  }, [timeLeft, roundMeta, beginPracticeRoundFailure])

  const handleLetterInput = useCallback(
    async (letter: string) => {
      if (gameStatus !== "playing" || !roundMeta) return
      if (Date.now() < lockedUntilRef.current) return

      const word = answerWordRef.current
      if (!word || word.length !== roundMeta.wordLength) return

      const cur = progressRef.current
      const next = tryPlaceLetter(letter, cur, word)

      if (!next) {
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
        return
      }

      consecutiveWrongRef.current = 0
      shouldShakeRef.current = false
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current)
      setIsShaking(false)
      if (isWordComplete(next)) playWordCompleteSound()
      else playCorrectLetterSound()
      for (let i = 0; i < next.length; i++) {
        if (cur[i] === "_" && next[i] !== "_") {
          triggerCorrectLetterFxAt(i)
        }
      }
      progressRef.current = next
      setProgress(next)
      const placed = countNewlyFilledLetters(cur, next)
      if (placed > 0) {
        setScore((prev) => prev + placed * SCORE_PER_LETTER)
      }

      if (isWordComplete(next)) {
        roundConcludedRef.current = true
        setGameStatus("resolving")
        const fin = await finalizePracticeRound("won", next)
        if (!fin.ok) {
          await loadNewWord()
          return
        }
        hiddenInputRef.current?.blur()
        setShowConfetti(true)
        setGameStatus("won")
        setTimeout(() => setShowConfetti(false), 2500)
      }
    },
    [roundMeta, gameStatus, loadNewWord, triggerWrongKeyFlash, triggerCorrectLetterFxAt]
  )

  const requestHintLetter = useCallback(async () => {
    if (!practiceHintsEnabled) return
    if (gameStatus !== "playing" || !roundMeta || roundConcludedRef.current) return
    if (hintLettersRemainingRef.current <= 0) return

    const word = answerWordRef.current
    const cur = progressRef.current
    if (!word || word.length !== roundMeta.wordLength || cur.length !== word.length) return

    const out = revealRandomAnswerLetter(cur, word)
    if (!out) return

    hintLettersRemainingRef.current -= 1
    setHintLettersRemaining(hintLettersRemainingRef.current)

    const { next, index } = out
    if (isWordComplete(next)) playWordCompleteSound()
    else playCorrectLetterSound()
    triggerCorrectLetterFxAt(index)
    progressRef.current = next
    setProgress(next)

    if (isWordComplete(next)) {
      roundConcludedRef.current = true
      setGameStatus("resolving")
      const fin = await finalizePracticeRound("won", next)
      if (!fin.ok) {
        await loadNewWord()
        return
      }
      hiddenInputRef.current?.blur()
      setShowConfetti(true)
      setGameStatus("won")
      setTimeout(() => setShowConfetti(false), 2500)
    }
  }, [practiceHintsEnabled, gameStatus, roundMeta, loadNewWord, triggerCorrectLetterFxAt])

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
    if (gameStatus !== "playing" || !roundMeta) return
    if (roundConcludedRef.current) return
    if (!isBrowserSpeechRecognitionSupported()) return
    if (speechListeningRef.current) return
    try {
      speechRecognitionRef.current?.abort()
    } catch {
      /* ignore */
    }
    const locale = speechLocaleForRoundLanguage(language)
    const rec = newSpeechRecognitionForLang(locale)
    if (!rec) return
    speechRecognitionRef.current = rec
    speechListeningRef.current = true
    setSpeechListeningUi(true)

    rec.onresult = (event) => {
      const word = answerWordRef.current
      const cur = progressRef.current
      if (!word || !cur) return
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
        shouldShakeRef.current = false
        if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current)
        setIsShaking(false)
        if (isWordComplete(next)) playWordCompleteSound()
        else playCorrectLetterSound()
        for (let i = 0; i < next.length; i++) {
          if (cur[i] === "_" && next[i] !== "_") {
            triggerCorrectLetterFxAt(i)
          }
        }
        progressRef.current = next
        setProgress(next)
        const placedVoice = countNewlyFilledLetters(cur, next)
        if (placedVoice > 0) {
          setScore((prev) => prev + placedVoice * SCORE_PER_LETTER)
        }
        if (isWordComplete(next)) {
          void (async () => {
            roundConcludedRef.current = true
            setGameStatus("resolving")
            const fin = await finalizePracticeRound("won", next)
            if (!fin.ok) {
              await loadNewWord()
              return
            }
            hiddenInputRef.current?.blur()
            setShowConfetti(true)
            setGameStatus("won")
            setTimeout(() => setShowConfetti(false), 2500)
          })()
        }
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
      triggerWrongKeyFlash()
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
      beginPracticeRoundFailure("wrong")
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
  }, [
    gameStatus,
    roundMeta,
    language,
    triggerWrongKeyFlash,
    loadNewWord,
    beginPracticeRoundFailure,
    triggerCorrectLetterFxAt,
  ])

  // Auto-focus hidden input when round starts (shows mobile keyboard), blur when it ends
  useEffect(() => {
    if (gameStatus === "playing") {
      queueMicrotask(() => hiddenInputRef.current?.focus())
    } else {
      hiddenInputRef.current?.blur()
    }
  }, [gameStatus])

  // Scroll word mask into view when keyboard opens
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => {
      if (window.innerHeight - vv.height > 100) {
        setTimeout(() => wordMaskRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 200)
      }
    }
    vv.addEventListener("resize", onResize)
    return () => vv.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    if (gameStatus !== "playing" || !roundMeta) return
    const onKey = (e: KeyboardEvent) => {
      if (/^\p{L}$/u.test(e.key)) {
        keyHandledRef.current = true
        void handleLetterInput(e.key)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [gameStatus, roundMeta, handleLetterInput])

  // Enter = Next Round / See Results (single player — same as multiplayer UX)
  useEffect(() => {
    if (gameStatus !== "won" && gameStatus !== "timeout" && gameStatus !== "lost") return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat) return
      const t = e.target as HTMLElement | null
      if (t?.closest("input:not([type=hidden]), textarea, [contenteditable=true]")) return
      e.preventDefault()
      handleNextRoundRef.current()
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [gameStatus])

  function handleNextRound() {
    if (round >= totalRounds) { setGameStatus("finished"); return }
    setRound((prev) => prev + 1)
    loadNewWord()
  }

  handleNextRoundRef.current = handleNextRound

  function handleRestart() {
    setScore(0)
    setRound(1)
    loadNewWord()
  }

  // ── FINISHED ────────────────────────────────────────────────────────────────

  if (gameStatus === "finished") {
    const maxBarScore = Math.max(WIN_SCORE, score, 1)
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-secondary/30 p-4 outline-none"
      >
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{ui.practiceComplete}</h2>
              <p className="mt-2 text-muted-foreground">
                {totalRounds} {totalRounds === 1 ? ui.roundSingular : ui.roundPlural}
              </p>
            </div>
            <div className="space-y-2 text-left">
              <FinishedPlayerScoreRow
                rank={1}
                name={playerName || ui.you}
                color={PRACTICE_PLAYER_COLOR}
                finalScore={score}
                isMe
                maxForBar={maxBarScore}
                youSuffix={ui.finishedYouSuffix}
                ptsSuffix={ui.finishedPts}
              />
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push(siteLocale === "ro" ? "/ro" : "/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {ui.home}
              </Button>
              <Button onClick={handleRestart}>
                <RotateCcw className="w-4 h-4 mr-2" />
                {ui.playAgain}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  // ── PLAYING ─────────────────────────────────────────────────────────────────

  const definitionText = roundMeta?.definition ?? ""
  const definitionExtraBreaks = (definitionText.match(/\n/g) || []).length
  const approxDefinitionLines = Math.max(
    1,
    Math.ceil(definitionText.length / 36) + definitionExtraBreaks
  )
  const defCardVerticalPad =
    approxDefinitionLines <= 2
      ? "pt-5 pb-4"
      : approxDefinitionLines <= 4
        ? "pt-6 pb-5"
        : "pt-7 pb-6"

  return (
    <main
      id="main-content"
      className={cn(
        "relative h-dvh flex flex-col overflow-hidden bg-gradient-to-b from-background to-secondary/30 outline-none",
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
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}

      {/* Sticky top bar — mirrors game page */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 pt-3 pb-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => router.push(siteLocale === "ro" ? "/ro" : "/")}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {ui.exit}
          </Button>

          <div className="flex flex-col items-center gap-0">
            <span className="text-sm font-semibold text-muted-foreground tabular-nums">
              {ui.roundProgress(round, totalRounds)}
            </span>
            {category && CATEGORIES[category as CategoryKey] && (
              <div
                className="flex items-center gap-1 text-xs leading-tight text-muted-foreground/70 max-w-[min(12rem,55vw)] justify-center"
                suppressHydrationWarning
              >
                <span className="text-xs leading-none shrink-0 inline-block" aria-hidden>
                  {CATEGORIES[category as CategoryKey].emoji}
                </span>
                <span className="truncate">
                  {categoryTitleForLocale(category as CategoryKey, siteLocale === "ro" ? "ro" : "en")}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <div
              className="tabular-nums text-[12px] sm:text-base font-bold px-2.5 py-1 rounded-full min-w-[2.75rem] text-center leading-snug"
              style={{
                color: PRACTICE_PLAYER_COLOR,
                backgroundColor: `color-mix(in srgb, ${PRACTICE_PLAYER_COLOR} 14%, transparent)`,
              }}
            >
              {score} {ui.pts}
            </div>
            <AmbientWavesToggle />
            <LetterSoundToggle />
          </div>
        </div>
      </div>

      {/* Main content — tap anywhere to re-focus keyboard on iOS */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-none flex flex-col items-stretch justify-start px-4 pt-5 pb-6 max-w-2xl mx-auto w-full gap-5"
        onClick={() => {
          if (gameStatus === "playing") hiddenInputRef.current?.focus()
        }}
      >

        {/* Definiție + bară jos în card: tastatură | panou | microfon */}
        <div className="flex w-full flex-col">
        <Card
          className={cn(
            "relative w-full gap-0 py-0 shadow-sm border-2 transition-[border-color] duration-200",
            wrongKeyFlash
              ? "border-red-500 dark:border-red-400"
              : gameStatus === "playing" && timeLeft <= 10
                ? "border-[#fecaca] animate-[practiceUrgentBorder_0.75s_ease-in-out_infinite]"
                : "border-border"
          )}
        >
          <CardContent
            className={cn(
              "px-4",
              gameStatus === "loading" ? "py-8" : defCardVerticalPad,
              gameStatus === "playing" && "relative px-10 pt-8 pb-6 sm:px-12"
            )}
          >
            {gameStatus === "loading" ? (
              <div className="h-16 flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="flex w-full flex-col items-center">
                {gameStatus === "playing" && practiceHintsEnabled && hintLettersRemaining > 0 ? (
                  <div
                    className="absolute left-2 top-2 z-10 sm:left-3 sm:top-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      type="button"
                      variant="secondary"
                      title={ui.hintRevealTitle}
                      aria-label={ui.hintRevealAria(hintLettersRemaining)}
                      className={cn(
                        "flex size-6 min-h-6 min-w-6 shrink-0 items-center justify-center rounded-md border-2 p-0 shadow-md transition-opacity",
                        "text-[11px] font-bold tabular-nums leading-none",
                        "hover:opacity-90"
                      )}
                      style={{
                        borderColor: PRACTICE_PLAYER_COLOR,
                        backgroundColor: `color-mix(in srgb, ${PRACTICE_PLAYER_COLOR} 14%, transparent)`,
                        color: PRACTICE_PLAYER_COLOR,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        void requestHintLetter()
                      }}
                    >
                      {hintLettersRemaining}
                    </Button>
                  </div>
                ) : null}
                {gameStatus === "playing" && (
                  <p
                    className={cn(
                      "w-full text-center text-lg sm:text-xl font-bold tabular-nums leading-none",
                      timeLeft <= 10 ? "text-red-400" : "text-muted-foreground"
                    )}
                  >
                    {timeLeft}s
                  </p>
                )}
                <p
                  className={cn(
                    "w-full text-center text-base sm:text-lg",
                    gameStatus === "playing" && "mt-1",
                    approxDefinitionLines > 4 ? "leading-tight" : "leading-snug"
                  )}
                >
                  {roundMeta?.definition}
                </p>
              </div>
            )}
          </CardContent>
          {gameStatus === "playing" && (
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
                  ui={ui.letterHistory}
                  className="mx-0 max-h-[3.25rem] w-auto max-w-[8.75rem] sm:max-w-[15rem]"
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
                        ? practiceSpeechUi.micTapToStop
                        : practiceSpeechUi.micTitlePractice
                    }
                    aria-label={
                      speechListeningUi ? practiceSpeechUi.micTapToStop : practiceSpeechUi.micAria
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

        {/* Word mask — hidden input placed here so browser auto-scroll targets this area */}
        <div ref={wordMaskRef} className="relative flex justify-center gap-2 sm:gap-3 flex-wrap">
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
                  if (!keyHandledRef.current) void handleLetterInput(ch)
                  keyHandledRef.current = false
                }
                e.target.value = ""
              }
            }}
          />
          {progress.split("").map((ch, i) => {
            const playerFilled = ch !== "_"
            const revealCh = revealProgress[i] ?? "_"
            const autoFilled = !playerFilled && revealCh !== "_"
            const myColor = PRACTICE_PLAYER_COLOR
            const cellStyle = playerFilled
              ? {
                  borderColor: `${myColor}80`,
                  background: `${myColor}18`,
                }
              : undefined
            const cellIsEmptyFree = !playerFilled && !autoFilled
            const delayRingThisCell =
              wrongLetterDelayRing && gameStatus === "playing" && cellIsEmptyFree
            return (
              <LetterCellDelayBorder
                key={i}
                active={delayRingThisCell}
                ringColor={PRACTICE_PLAYER_COLOR}
                ringHighlightColor={PRACTICE_DELAY_RING_HIGHLIGHT}
                boxClassName="w-12 h-12 sm:w-16 sm:h-16 transition-colors duration-150"
                innerClassName={cn(
                  "border-2 transition-colors duration-150",
                  cellIsEmptyFree && "border-muted-foreground/20 bg-muted/30",
                  autoFilled && "border-red-500 bg-red-500/10"
                )}
                innerStyle={cellStyle}
              >
                {playerFilled
                  ? (
                    <CorrectLetterChar
                      ch={ch}
                      color={myColor}
                      cellIndex={i}
                      burstId={correctLetterBursts.get(i)}
                      className="text-xl sm:text-2xl"
                    />
                    )
                  : autoFilled
                    ? (
                    <CorrectLetterChar
                      ch={revealCh}
                      color={PRACTICE_AUTO_REVEAL_FX_COLOR}
                      cellIndex={i}
                      burstId={correctLetterBursts.get(i)}
                      className="text-xl sm:text-2xl"
                    />
                      )
                    : <span className="text-muted-foreground/20 text-sm sm:text-base select-none">_</span>
                }
              </LetterCellDelayBorder>
            )
          })}
        </div>

        {/* Instruction / Round result */}
        {gameStatus === "playing" && (
          <p className="text-sm text-muted-foreground text-center">
            {isBrowserSpeechRecognitionSupported()
              ? practiceSpeechUi.practiceHintPlaying
              : practiceSpeechUi.practiceHintNoMic}
          </p>
        )}

        {(gameStatus === "won" || gameStatus === "timeout" || gameStatus === "lost") && (
          <div className="w-full min-w-0 space-y-4 text-center">
            <div className={cn(
              "flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl px-4 py-3 sm:h-12 sm:px-6 sm:py-0",
              gameStatus === "won"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive"
            )}>
              {gameStatus === "won" ? (
                <p className="text-center text-base font-semibold leading-tight">{practiceSpeechUi.practiceWonRound}</p>
              ) : gameStatus === "timeout" ? (
                <p className="text-center text-base font-semibold leading-tight">{practiceSpeechUi.practiceTimeUp}</p>
              ) : (
                <p className="text-center text-base font-semibold leading-tight">{practiceSpeechUi.practiceWrongWord}</p>
              )}
            </div>
            <Button onClick={handleNextRound} className="w-full h-12" size="lg">
              {round >= totalRounds ? practiceSpeechUi.practiceSeeResults : practiceSpeechUi.practiceNextRound}
            </Button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        /* Roșu deschis care clipește (sub 10s) */
        @keyframes practiceUrgentBorder {
          0%, 100% { border-color: #fecaca; }
          50% { border-color: #f87171; }
        }
      `}</style>
    </main>
  )
}
