"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { fetchWordPairForCategory, tryPlaceLetter, isWordComplete } from "@/lib/words"
import type { WordPair, CategoryKey } from "@/lib/game-types"
import { CATEGORIES } from "@/lib/game-types"
import { ArrowLeft, RotateCcw, Trophy, Timer, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import Confetti from "react-confetti"

const ROUND_DURATION = 60

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
  const [totalRounds] = useState<number>(() => readStoredField("max_rounds", 10))
  const [currentWord, setCurrentWord] = useState<WordPair | null>(null)
  const [progress, setProgress] = useState("")
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION)
  const [gameStatus, setGameStatus] = useState<"loading" | "playing" | "won" | "timeout" | "finished">("loading")
  const [isShaking, setIsShaking] = useState(false)
  const [lastPlacedIndex, setLastPlacedIndex] = useState<number | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const router = useRouter()

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
    const word = await fetchWordPairForCategory(category)
    setCurrentWord(word)
    setProgress("_".repeat(word.word.length))
    setLastPlacedIndex(null)
    setTimeLeft(ROUND_DURATION)
    setGameStatus("playing")
  }, [category])

  useEffect(() => { loadNewWord() }, [loadNewWord])

  useEffect(() => {
    if (gameStatus !== "playing") return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { setGameStatus("timeout"); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [gameStatus])

  const handleLetterInput = useCallback((letter: string) => {
    if (gameStatus !== "playing" || !currentWord || !progress) return
    const newProgress = tryPlaceLetter(letter, progress, currentWord.word)
    if (newProgress) {
      for (let i = 0; i < newProgress.length; i++) {
        if (progress[i] === "_" && newProgress[i] !== "_") { setLastPlacedIndex(i); break }
      }
      setProgress(newProgress)
      if (isWordComplete(newProgress)) {
        setScore((prev) => prev + 1)
        setGameStatus("won")
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 2500)
      }
    } else {
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
    }
  }, [currentWord, gameStatus, progress])

  useEffect(() => {
    if (gameStatus !== "playing" || !currentWord) return
    const onKey = (e: KeyboardEvent) => { if (/^[a-zA-Z]$/.test(e.key)) handleLetterInput(e.key) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [gameStatus, currentWord, handleLetterInput])

  function handleNextRound() {
    if (round >= totalRounds) { setGameStatus("finished"); return }
    setRound((prev) => prev + 1)
    loadNewWord()
  }

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
        "min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/30 outline-none",
        isShaking && "animate-[shake_0.3s_ease-in-out]"
      )}
      tabIndex={0}
    >
      {showConfetti && <Confetti recycle={false} numberOfPieces={150} />}

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
            {category && CATEGORIES[category as CategoryKey] && (
              <span className="text-xs text-muted-foreground/60">
                {CATEGORIES[category as CategoryKey].emoji} {CATEGORIES[category as CategoryKey].label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Timer */}
            <div className={cn(
              "flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg",
              timeLeft <= 10 ? "bg-destructive/10 text-destructive animate-pulse" : "bg-muted"
            )}>
              <Timer className="w-3.5 h-3.5" />{timeLeft}s
            </div>
            {/* Score */}
            <div className="flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-lg bg-muted">
              <Trophy className="w-3.5 h-3.5 text-primary" />{score}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pt-5 pb-6 max-w-2xl mx-auto w-full gap-5">

        {/* Definition */}
        <Card className="w-full shadow-sm">
          <CardContent className="pt-5 pb-5">
            {gameStatus === "loading" ? (
              <div className="h-20 flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <p className="text-base sm:text-lg text-center leading-relaxed text-balance">
                {currentWord?.definition}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Word mask */}
        <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
          {progress.split("").map((ch, i) => {
            const filled = ch !== "_"
            const isLast = i === lastPlacedIndex
            return (
              <div
                key={i}
                className={cn(
                  "relative flex items-center justify-center overflow-hidden select-none transition-all duration-200",
                  "w-12 h-[60px] sm:w-[72px] sm:h-[88px] rounded-xl border-2",
                  filled
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-muted-foreground/20 bg-muted/30",
                  isLast && "scale-110 ring-2 ring-emerald-500 ring-offset-2 z-10"
                )}
              >
                {filled
                  ? <span className="text-xl sm:text-3xl font-black text-emerald-600">{ch}</span>
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
                  Correct! The word was: <span className="font-black">{currentWord?.word.toUpperCase()}</span>
                </div>
              ) : (
                <span className="font-semibold">
                  {"Time's up! The word was: "}
                  <span className="font-black">{currentWord?.word.toUpperCase()}</span>
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
