"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { flushSync } from "react-dom"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  startPracticeRound,
  submitPracticeLetter,
  finalizePracticeRound,
} from "@/app/practice/actions"
import type { CategoryKey, LanguageKey } from "@/lib/game-types"
import { CATEGORIES, LANGUAGES, PLAYER_COLORS } from "@/lib/game-types"
import { ArrowLeft, RotateCcw, Trophy, Timer, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import Confetti from "react-confetti"

const ROUND_DURATION = 60
/** Aceeași culoare ca jucătorul 1 în multiplayer */
const PRACTICE_PLAYER_COLOR = PLAYER_COLORS[0]

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
  /** Public round data only — answer lives in httpOnly cookie on server. */
  const [roundMeta, setRoundMeta] = useState<{
    definition: string
    wordLength: number
  } | null>(null)
  /** Set only from `finalizePracticeRound` — word + def apar în Network la finalul rundei. */
  const [roundAnswer, setRoundAnswer] = useState<{
    word: string
    definition: string
  } | null>(null)
  const [progress, setProgress] = useState("")
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION)
  const [gameStatus, setGameStatus] = useState<
    "loading" | "playing" | "resolving" | "revealing" | "won" | "timeout" | "finished"
  >("loading")
  const [isShaking, setIsShaking] = useState(false)
  const [lastPlacedIndex, setLastPlacedIndex] = useState<number | null>(null)
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
  // Consecutive-wrong-letter penalty: 2 wrong in a row → 2s input lockout
  const consecutiveWrongRef = useRef(0)
  const lockedUntilRef = useRef(0)
  const handleNextRoundRef = useRef<() => void>(() => {})
  const letterBusyRef = useRef(false)
  const gameStatusRef = useRef(gameStatus)
  const router = useRouter()

  useEffect(() => {
    gameStatusRef.current = gameStatus
  }, [gameStatus])

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
    setGameStatus("loading")
    setRoundAnswer(null)
    const meta = await startPracticeRound(category, language)
    setRoundMeta(meta)
    const initProgress = "_".repeat(meta.wordLength)
    progressRef.current = initProgress
    consecutiveWrongRef.current = 0
    lockedUntilRef.current = 0
    setProgress(initProgress)
    setRevealProgress("_".repeat(meta.wordLength))
    setLastPlacedIndex(null)
    setTimeLeft(ROUND_DURATION)
    setGameStatus("playing")
  }, [category, language])

  useEffect(() => { loadNewWord() }, [loadNewWord])

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
    flushSync(() => setGameStatus("resolving"))
    ;(async () => {
      const cur = progressRef.current
      const res = await finalizePracticeRound("timeout", cur)
      if (cancelled) return
      if (!res.ok) {
        setGameStatus("timeout")
        return
      }
      setRoundAnswer({ word: res.word, definition: res.definition })
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
      if (letterBusyRef.current) return
      if (Date.now() < lockedUntilRef.current) return

      letterBusyRef.current = true
      try {
        const cur = progressRef.current
        const result = await submitPracticeLetter(letter, cur)

        if (!result.ok) {
          if (result.reason === "invalid_progress" || result.reason === "no_session") {
            await loadNewWord()
            return
          }
          consecutiveWrongRef.current++
          if (consecutiveWrongRef.current >= 1) {
            lockedUntilRef.current = Date.now() + 3000
            consecutiveWrongRef.current = 0
          }
          if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current)
          shouldShakeRef.current = true
          setIsShaking(false)
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              if (!shouldShakeRef.current) return
              setIsShaking(true)
              shakeTimeoutRef.current = setTimeout(() => setIsShaking(false), 300)
            })
          )
          return
        }

        let newProgress = cur
        for (const p of result.placements) {
          const arr = newProgress.split("")
          arr[p.index] = p.char
          newProgress = arr.join("")
        }
        consecutiveWrongRef.current = 0
        shouldShakeRef.current = false
        if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current)
        setIsShaking(false)
        if (result.placements.length > 0) {
          setLastPlacedIndex(result.placements[result.placements.length - 1].index)
        }
        progressRef.current = newProgress
        setProgress(newProgress)
        if (result.complete) {
          flushSync(() => setGameStatus("resolving"))
          const fin = await finalizePracticeRound("won", newProgress)
          if (!fin.ok) {
            await loadNewWord()
            return
          }
          setRoundAnswer({ word: fin.word, definition: fin.definition })
          hiddenInputRef.current?.blur()
          flushSync(() => {
            setShowConfetti(true)
          })
          setScore((prev) => prev + 1)
          setGameStatus("won")
          setTimeout(() => setShowConfetti(false), 5000)
        }
      } finally {
        letterBusyRef.current = false
      }
    },
    [roundMeta, gameStatus, loadNewWord]
  )

  // Auto-focus hidden input when round starts, blur when it ends
  useEffect(() => {
    if (gameStatus === "playing") {
      setTimeout(() => hiddenInputRef.current?.focus(), 150)
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

  return (
    <main
      className={cn(
        "h-dvh flex flex-col overflow-hidden bg-gradient-to-b from-background to-secondary/30 outline-none",
        isShaking && "animate-[shake_0.3s_ease-in-out]"
      )}
      tabIndex={0}
    >
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
                <span suppressHydrationWarning>{CATEGORIES[category as CategoryKey].emoji} {CATEGORIES[category as CategoryKey].label}</span>
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
        className="flex-1 overflow-y-auto flex flex-col items-center justify-start px-4 pt-5 pb-6 max-w-2xl mx-auto w-full gap-5"
        onClick={() => { if (gameStatus === "playing") hiddenInputRef.current?.focus() }}
      >

        {/* Timer */}
        <div className={cn(
          "flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-2 rounded-lg w-full",
          timeLeft <= 10 ? "bg-destructive/10 text-destructive animate-pulse" : "bg-muted"
        )}>
          <Timer className="w-3.5 h-3.5" />{timeLeft}s
        </div>

        {/* Definition */}
        <Card className="w-full shadow-sm">
          <CardContent className="pt-5 pb-5">
            {gameStatus === "loading" ? (
              <div className="h-20 flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <p className="text-base sm:text-lg text-center leading-relaxed text-balance">
                {roundMeta?.definition}
              </p>
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
            const isLast = i === lastPlacedIndex
            const myColor = PRACTICE_PLAYER_COLOR
            const cellStyle = playerFilled
              ? {
                  borderColor: `${myColor}80`,
                  background: `${myColor}18`,
                  ...(isLast && !autoFilled
                    ? { boxShadow: `0 0 0 2px ${myColor}, 0 0 0 4px hsl(var(--background))` }
                    : {}),
                }
              : undefined
            return (
              <div
                key={i}
                className={cn(
                  "relative flex items-center justify-center overflow-hidden select-none transition-all duration-200",
                  "w-12 h-[60px] sm:w-[72px] sm:h-[88px] rounded-xl border-2",
                  !playerFilled && !autoFilled && "border-muted-foreground/20 bg-muted/30",
                  autoFilled && "border-red-500 bg-red-500/10",
                  isLast && !autoFilled && playerFilled && "scale-110 z-10"
                )}
                style={cellStyle}
              >
                {playerFilled
                  ? (
                    <span className="text-xl sm:text-3xl font-black" style={{ color: myColor }}>
                      {ch.toUpperCase()}
                    </span>
                    )
                  : autoFilled
                    ? <span className="text-xl sm:text-3xl font-black text-red-500">{revealCh.toUpperCase()}</span>
                    : <span className="text-muted-foreground/20 text-base sm:text-xl select-none">_</span>
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
                <div className="flex items-center justify-center gap-2 font-semibold">
                  <Check className="w-5 h-5" />
                  Correct! The word was:{" "}
                  <span className="font-black">
                    {(roundAnswer?.word ?? progress).toUpperCase()}
                  </span>
                </div>
              ) : (
                <span className="font-semibold">
                  {"Time's up! The word was: "}
                  <span className="font-black">
                    {(roundAnswer?.word ?? revealProgress).toUpperCase()}
                  </span>
                </span>
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
      `}</style>
    </main>
  )
}
