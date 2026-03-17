"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { fetchWordPair, calculateProgress, isCorrectAnswer } from "@/lib/words"
import type { WordPair } from "@/lib/game-types"
import { ArrowLeft, RotateCcw, Trophy, Timer, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const ROUND_DURATION = 60

export default function PracticePage() {
  const [playerName, setPlayerName] = useState("")
  const [currentWord, setCurrentWord] = useState<WordPair | null>(null)
  const [userInput, setUserInput] = useState("")
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION)
  const [gameStatus, setGameStatus] = useState<"loading" | "playing" | "won" | "timeout" | "finished">("loading")
  const [isShaking, setIsShaking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Load player info
  useEffect(() => {
    const stored = localStorage.getItem("wordmatch_player")
    if (stored) {
      const data = JSON.parse(stored)
      setPlayerName(data.name || "Player")
    } else {
      router.push("/")
    }
  }, [router])

  // Fetch new word
  const loadNewWord = useCallback(async () => {
    setGameStatus("loading")
    const word = await fetchWordPair()
    setCurrentWord(word)
    setUserInput("")
    setTimeLeft(ROUND_DURATION)
    setGameStatus("playing")
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // Initial load
  useEffect(() => {
    loadNewWord()
  }, [loadNewWord])

  // Timer countdown
  useEffect(() => {
    if (gameStatus !== "playing") return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameStatus("timeout")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStatus])

  // Handle input change
  function handleInputChange(value: string) {
    if (gameStatus !== "playing" || !currentWord) return

    // Only allow letters
    const cleaned = value.replace(/[^a-zA-Z]/g, "")
    setUserInput(cleaned)
  }

  // Handle submit
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (gameStatus !== "playing" || !currentWord) return

    if (isCorrectAnswer(userInput, currentWord.word)) {
      setScore((prev) => prev + 1)
      setGameStatus("won")
    } else {
      // Shake animation for wrong answer
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
    }
  }

  // Next round
  function handleNextRound() {
    if (round >= 10) {
      setGameStatus("finished")
      return
    }
    setRound((prev) => prev + 1)
    loadNewWord()
  }

  // Restart game
  function handleRestart() {
    setScore(0)
    setRound(1)
    loadNewWord()
  }

  // Calculate progress for display
  const progress = currentWord ? calculateProgress(userInput, currentWord.word) : ""

  // Finished screen
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
                You scored {score} out of 10 rounds
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button onClick={handleRestart}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Play Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col p-4 bg-gradient-to-b from-background to-secondary/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Exit
        </Button>
        <div className="text-sm font-medium">
          Round {round}/10
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Trophy className="w-4 h-4 text-primary" />
          {score}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full space-y-6">
        {/* Timer */}
        <div className={cn(
          "flex items-center gap-2 text-2xl font-bold",
          timeLeft <= 10 && "text-destructive animate-pulse"
        )}>
          <Timer className="w-6 h-6" />
          {timeLeft}s
        </div>

        {/* Definition Card */}
        <Card className="w-full">
          <CardContent className="pt-6 pb-6">
            {gameStatus === "loading" ? (
              <div className="h-20 flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <p className="text-lg text-center leading-relaxed">
                {currentWord?.definition}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Progress Display */}
        <div className="flex justify-center gap-2">
          {progress.split("").map((char, i) => (
            <div
              key={i}
              className={cn(
                "w-10 h-12 flex items-center justify-center text-2xl font-bold rounded-lg border-2 transition-all",
                char !== "_"
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-muted border-muted-foreground/20"
              )}
            >
              {char}
            </div>
          ))}
        </div>

        {/* Input Form */}
        {gameStatus === "playing" && (
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <Input
              ref={inputRef}
              value={userInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Type your answer..."
              className={cn(
                "text-center text-xl h-14 tracking-wider uppercase",
                isShaking && "animate-[shake_0.5s_ease-in-out]"
              )}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
            />
            <Button type="submit" className="w-full h-12" size="lg">
              Submit
            </Button>
          </form>
        )}

        {/* Round Result */}
        {(gameStatus === "won" || gameStatus === "timeout") && (
          <div className="w-full space-y-4 text-center">
            <div className={cn(
              "py-4 px-6 rounded-lg",
              gameStatus === "won" ? "bg-accent/20 text-accent-foreground" : "bg-destructive/10 text-destructive"
            )}>
              {gameStatus === "won" ? (
                <div className="flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" />
                  <span className="font-semibold">Correct! The word was: {currentWord?.word.toUpperCase()}</span>
                </div>
              ) : (
                <span className="font-semibold">{"Time's up! The word was: "}{currentWord?.word.toUpperCase()}</span>
              )}
            </div>
            <Button onClick={handleNextRound} className="w-full h-12" size="lg">
              {round >= 10 ? "See Results" : "Next Round"}
            </Button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </main>
  )
}
