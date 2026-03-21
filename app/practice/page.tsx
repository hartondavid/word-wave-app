"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  startPracticeRound,
  finalizePracticeRound,
  tryResumePracticeSession,
} from "@/app/practice/actions"
import { tryPlaceLetter, isWordComplete } from "@/lib/words"
import type { CategoryKey, LanguageKey } from "@/lib/game-types"
import { CATEGORIES, LANGUAGES } from "@/lib/game-types"
import { ArrowLeft, RotateCcw, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import Confetti from "react-confetti"

const ROUND_DURATION = 60
/** Culoare litere ghicite — Practice (single player) */
const PRACTICE_PLAYER_COLOR = "#22C55E"

const PRACTICE_SESSION_KEY = "wordmatch_practice_session_v1"

type PracticeSessionSnapshot = {
  progress: string
  timeLeft: number
  round: number
  score: number
  wordLength: number
  category: string
  language: string
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

export default function PracticePage() {
  const [playerName, setPlayerName] = useState("")
  const [category] = useState<string>(() => readStoredField("category", "general"))
  const [language] = useState<string>(() => readStoredField("language", "en"))
  const [totalRounds] = useState<number>(() => readStoredField("max_rounds", 10))
  /** Definition + length for UI; `answerWordRef` holds the word for instant local typing (server cookie still used on finalize). */
  const [roundMeta, setRoundMeta] = useState<{
    definition: string
    wordLength: number
  } | null>(null)
  const answerWordRef = useRef("")
  const [progress, setProgress] = useState("")
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION)
  const [gameStatus, setGameStatus] = useState<
    "loading" | "playing" | "resolving" | "revealing" | "won" | "timeout" | "finished"
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
  /** După prima literă greșită: lockout input (ms) */
  const WRONG_LETTER_LOCK_MS = 3000
  const consecutiveWrongRef = useRef(0)
  const lockedUntilRef = useRef(0)
  const gameStatusRef = useRef(gameStatus)
  const router = useRouter()

  useEffect(() => {
    gameStatusRef.current = gameStatus
  }, [gameStatus])

  useEffect(() => {
    return () => {
      if (wrongFlashTimeoutRef.current) clearTimeout(wrongFlashTimeoutRef.current)
    }
  }, [])

  const triggerWrongKeyFlash = useCallback(() => {
    if (wrongFlashTimeoutRef.current) clearTimeout(wrongFlashTimeoutRef.current)
    setWrongKeyFlash(true)
    wrongFlashTimeoutRef.current = setTimeout(() => {
      setWrongKeyFlash(false)
      wrongFlashTimeoutRef.current = null
    }, 140)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem("wordmatch_player")
    if (stored) {
      const data = JSON.parse(stored)
      setPlayerName(data.name || "Player")
    } else {
      router.push("/")
    }
  }, [router])

  const loadNewWord = useCallback(async () => {
    try {
      sessionStorage.removeItem(PRACTICE_SESSION_KEY)
    } catch {
      /* ignore */
    }
    setGameStatus("loading")
    answerWordRef.current = ""
    const meta = await startPracticeRound(category, language)
    answerWordRef.current = meta.word
    setRoundMeta({ definition: meta.definition, wordLength: meta.wordLength })
    const initProgress = "_".repeat(meta.wordLength)
    progressRef.current = initProgress
    consecutiveWrongRef.current = 0
    lockedUntilRef.current = 0
    setProgress(initProgress)
    setRevealProgress("_".repeat(meta.wordLength))
    setTimeLeft(ROUND_DURATION)
    setGameStatus("playing")
  }, [category, language])

  // La încărcare: reia aceeași rundă dacă cookie + sessionStorage coincid (refresh păstrează întrebarea).
  useEffect(() => {
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
        stored.category === category &&
        stored.language === language &&
        typeof stored.progress === "string" &&
        stored.progress.length === resume.wordLength
      ) {
        answerWordRef.current = resume.word
        setRoundMeta({ definition: resume.definition, wordLength: resume.wordLength })
        progressRef.current = stored.progress
        setProgress(stored.progress)
        setRevealProgress("_".repeat(resume.wordLength))
        setTimeLeft(
          typeof stored.timeLeft === "number"
            ? Math.max(0, Math.min(ROUND_DURATION, stored.timeLeft))
            : ROUND_DURATION
        )
        setRound(typeof stored.round === "number" ? stored.round : 1)
        setScore(typeof stored.score === "number" ? stored.score : 0)
        setGameStatus("playing")
        return
      }
      await loadNewWord()
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap o singură dată la mount
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
      }
      sessionStorage.setItem(PRACTICE_SESSION_KEY, JSON.stringify(snap))
    } catch {
      /* ignore */
    }
  }, [gameStatus, roundMeta, progress, timeLeft, round, score, category, language])

  useEffect(() => {
    if (gameStatus === "won" || gameStatus === "timeout" || gameStatus === "finished") {
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

  // Timer 0: un singur răspuns server (finalize) cu cuvânt + definiție + sloturi reveal
  // (Nu includem `gameStatus` în deps — altfel cleanup anulează async-ul după `resolving`.)
  useEffect(() => {
    if (timeLeft !== 0 || !roundMeta) return
    if (gameStatusRef.current !== "playing") return
    let cancelled = false
    setGameStatus("resolving")
    ;(async () => {
      const cur = progressRef.current
      const res = await finalizePracticeRound("timeout", cur)
      if (cancelled) return
      if (!res.ok) {
        setGameStatus("timeout")
        return
      }
      const slots = res.revealSlots ?? []
      if (slots.length === 0) {
        setGameStatus("timeout")
        return
      }
      setGameStatus("revealing")
      const base = "_".repeat(roundMeta.wordLength)
      setRevealProgress(base)
      slots.forEach((slot, idx) => {
        setTimeout(() => {
          if (cancelled) return
          setRevealProgress((prev) => {
            const arr = prev.split("")
            arr[slot.index] = slot.char
            return arr.join("")
          })
        }, (idx + 1) * 150)
      })
      setTimeout(() => {
        if (!cancelled) setGameStatus("timeout")
      }, slots.length * 150 + 500)
    })()
    return () => {
      cancelled = true
    }
  }, [timeLeft, roundMeta])

  const handleLetterInput = useCallback(
    async (letter: string) => {
      if (gameStatus !== "playing" || !roundMeta) return
      if (Date.now() < lockedUntilRef.current) return

      const word = answerWordRef.current
      if (!word || word.length !== roundMeta.wordLength) return

      const cur = progressRef.current
      const next = tryPlaceLetter(letter, cur, word)

      if (!next) {
        triggerWrongKeyFlash()
        consecutiveWrongRef.current++
        if (consecutiveWrongRef.current >= 1) {
          lockedUntilRef.current = Date.now() + WRONG_LETTER_LOCK_MS
          consecutiveWrongRef.current = 0
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
      progressRef.current = next
      setProgress(next)

      if (isWordComplete(next)) {
        setGameStatus("resolving")
        const fin = await finalizePracticeRound("won", next)
        if (!fin.ok) {
          await loadNewWord()
          return
        }
        hiddenInputRef.current?.blur()
        setShowConfetti(true)
        setScore((prev) => prev + 1)
        setGameStatus("won")
        setTimeout(() => setShowConfetti(false), 2500)
      }
    },
    [roundMeta, gameStatus, loadNewWord, triggerWrongKeyFlash]
  )

  // Auto-focus hidden input when round starts, blur when it ends
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
    if (gameStatus !== "won" && gameStatus !== "timeout") return
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
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/30">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Practice Complete!</h2>
              <p className="text-muted-foreground mt-2">
                {playerName && <span className="font-semibold">{playerName} — </span>}
                {score} / {totalRounds} correct
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />Home
              </Button>
              <Button onClick={handleRestart}>
                <RotateCcw className="w-4 h-4 mr-2" />Play Again
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
      ? "pt-1 pb-1.5"
      : approxDefinitionLines <= 4
        ? "pt-1.5 pb-2"
        : "pt-2 pb-2.5"

  return (
    <main
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
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-1" />Exit
          </Button>

          <div className="flex flex-col items-center gap-0.5">
            <span className="text-sm font-medium text-muted-foreground">
              Round {round}/{totalRounds}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
              {category && CATEGORIES[category as CategoryKey] && (
                <span suppressHydrationWarning>{CATEGORIES[category as CategoryKey].emoji} {CATEGORIES[category as CategoryKey].category}</span>
              )}
              {language && LANGUAGES[language as LanguageKey] && (
                <span suppressHydrationWarning>· {LANGUAGES[language as LanguageKey].flag}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Score */}
            <div className="flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-lg bg-muted">
              <Trophy className="w-3.5 h-3.5 text-primary" />{score}
            </div>
          </div>
        </div>
      </div>

      {/* Main content — tap anywhere to re-focus keyboard on iOS */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-none flex flex-col items-center justify-start px-4 pt-5 pb-6 max-w-2xl mx-auto w-full gap-5"
        onClick={() => { if (gameStatus === "playing") hiddenInputRef.current?.focus() }}
      >

        {/* Definiție + timp în același card; la urgență bordura cardului clipește roșu */}
        <Card
          className={cn(
            "w-full shadow-sm border-2 transition-[border-color] duration-200",
            gameStatus === "playing" && timeLeft <= 10
              ? "border-[#fecaca] animate-[practiceUrgentBorder_0.75s_ease-in-out_infinite]"
              : "border-border"
          )}
        >
          <CardContent className={cn("px-4", defCardVerticalPad)}>
            {gameStatus === "loading" ? (
              <div className="h-16 flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {gameStatus === "playing" && (
                  <p
                    className={cn(
                      "text-center text-lg sm:text-xl font-bold tabular-nums leading-none mb-1.5",
                      timeLeft <= 10 ? "text-red-400" : "text-muted-foreground"
                    )}
                  >
                    {timeLeft}s
                  </p>
                )}
                <p
                  className={cn(
                    "text-base sm:text-lg text-center text-balance",
                    approxDefinitionLines > 4 ? "leading-tight" : "leading-snug"
                  )}
                >
                  {roundMeta?.definition}
                </p>
              </>
            )}
          </CardContent>
        </Card>

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
            return (
              <div
                key={i}
                className={cn(
                  "relative flex items-center justify-center overflow-hidden select-none transition-colors duration-150",
                  "w-12 h-12 sm:w-16 sm:h-16 rounded-xl border-2",
                  !playerFilled && !autoFilled && "border-muted-foreground/20 bg-muted/30",
                  autoFilled && "border-red-500 bg-red-500/10"
                )}
                style={cellStyle}
              >
                {playerFilled
                  ? (
                    <span className="text-xl sm:text-2xl font-black" style={{ color: myColor }}>
                      {ch.toUpperCase()}
                    </span>
                    )
                  : autoFilled
                    ? <span className="text-xl sm:text-2xl font-black text-red-500">{revealCh.toUpperCase()}</span>
                    : <span className="text-muted-foreground/20 text-sm sm:text-base select-none">_</span>
                }
              </div>
            )
          })}
        </div>

        {/* Instruction / Round result */}
        {gameStatus === "playing" && (
          <p className="text-sm text-muted-foreground text-center">
            Press letter keys on your keyboard to guess!
          </p>
        )}

        {(gameStatus === "won" || gameStatus === "timeout") && (
          <div className="w-full space-y-4 text-center">
            <div className={cn(
              "py-4 px-6 rounded-xl",
              gameStatus === "won"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive"
            )}>
              {gameStatus === "won" ? (
                <p className="font-semibold text-lg text-center">You Won This Round!</p>
              ) : (
                <p className="font-semibold text-lg text-center">Time&apos;s Up!</p>
              )}
            </div>
            <Button onClick={handleNextRound} className="w-full h-12" size="lg">
              {round >= totalRounds ? "See Results" : "Next Round"}
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
