"use client"

import { useEffect, useState, useCallback, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { GameRoom } from "@/lib/game-types"
import { ROUND_DURATION, WIN_SCORE, TOTAL_ROUNDS } from "@/lib/game-types"
import { fetchWordPair, tryPlaceLetter, isWordComplete } from "@/lib/words"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { Copy, Check, Timer, Trophy, Users, ArrowLeft, Swords } from "lucide-react"
import Confetti from "react-confetti"

interface PlayerInfo {
  id: string
  name: string
  roomCode: string
  playerSlot: 1 | 2
}

interface GamePageProps {
  params: Promise<{ roomCode: string }>
}

export default function GamePage({ params }: GamePageProps) {
  const { roomCode } = use(params)
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(ROUND_DURATION)
  const [isLoading, setIsLoading] = useState(true)
  const [isShaking, setIsShaking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [lastPlacedIndex, setLastPlacedIndex] = useState<number | null>(null)
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Get current player from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("wordmatch_player")
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.roomCode === roomCode) {
        setPlayerInfo(parsed)
      } else {
        router.push("/")
      }
    } else {
      router.push("/")
    }
  }, [roomCode, router])

  // Fetch initial room data
  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("room_code", roomCode)
        .single()

      if (data) setRoom(data)
      setIsLoading(false)
    }
    fetchData()
  }, [roomCode, supabase])

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`room-${roomCode}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_rooms", filter: `room_code=eq.${roomCode}` },
        (payload) => {
          console.log("[v0] Realtime update received:", payload.eventType, payload.new)
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const newRoom = payload.new as GameRoom
            setRoom(newRoom)
            
            // Show confetti when round ends with a winner
            if (newRoom.game_status === "round_end" && newRoom.round_winner) {
              setShowConfetti(true)
              setTimeout(() => setShowConfetti(false), 3000)
            }
            
            // Reset when new round starts
            if (newRoom.game_status === "playing") {
              setLastPlacedIndex(null)
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[v0] Subscription status:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomCode, supabase])

  // Watch for both players ready - start game automatically
  const startGameRef = useRef(false)
  useEffect(() => {
    if (!room || !playerInfo) return
    if (room.game_status !== "waiting") return
    if (!room.player1_id || !room.player2_id) return
    
    console.log("[v0] Ready check - p1:", room.player1_ready, "p2:", room.player2_ready)
    
    // Both players are ready - start the game (only once)
    if (room.player1_ready && room.player2_ready && !startGameRef.current) {
      console.log("[v0] Both ready, starting game!")
      startGameRef.current = true
      startNewRound()
    }
  }, [room?.player1_ready, room?.player2_ready, room?.game_status, room?.player1_id, room?.player2_id])

  // Timer countdown
  useEffect(() => {
    if (room?.game_status !== "playing" || !room.round_end_time) return

    const interval = setInterval(() => {
      const endTime = new Date(room.round_end_time!).getTime()
      const now = Date.now()
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000))
      setTimeRemaining(remaining)

      if (remaining === 0) {
        handleTimerEnd()
      }
    }, 100)

    return () => clearInterval(interval)
  }, [room?.round_end_time, room?.game_status])

  // Handle keyboard input for letter placement
  useEffect(() => {
    if (room?.game_status !== "playing" || !room.current_word) return

    function handleKeyDown(e: KeyboardEvent) {
      // Only handle letter keys
      if (!/^[a-zA-Z]$/.test(e.key)) return
      
      handleLetterInput(e.key)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [room?.game_status, room?.current_word, room?.player1_progress, room?.player2_progress, playerInfo])

  // My player slot (1 or 2)
  const mySlot = playerInfo?.playerSlot || 1
  const opponentSlot = mySlot === 1 ? 2 : 1

  // Get my info
  const myName = mySlot === 1 ? room?.player1_name : room?.player2_name
  const myScore = mySlot === 1 ? room?.player1_score : room?.player2_score
  const myReady = mySlot === 1 ? room?.player1_ready : room?.player2_ready
  const myProgress = mySlot === 1 ? room?.player1_progress : room?.player2_progress

  // Get opponent info
  const opponentName = opponentSlot === 1 ? room?.player1_name : room?.player2_name
  const opponentScore = opponentSlot === 1 ? room?.player1_score : room?.player2_score
  const opponentReady = opponentSlot === 1 ? room?.player1_ready : room?.player2_ready
  const opponentProgress = opponentSlot === 1 ? room?.player1_progress : room?.player2_progress

  // Check if room is full
  const roomIsFull = room?.player1_id && room?.player2_id

  // Handle single letter input
  const handleLetterInput = useCallback(async (letter: string) => {
    if (!room || !playerInfo || room.game_status !== "playing" || !room.current_word) return

    const currentProgress = mySlot === 1 ? room.player1_progress : room.player2_progress
    if (!currentProgress) return

    // Try to place the letter
    const newProgress = tryPlaceLetter(letter, currentProgress, room.current_word)
    
    if (newProgress) {
      // Find which index was just filled
      for (let i = 0; i < newProgress.length; i++) {
        if (currentProgress[i] === "_" && newProgress[i] !== "_") {
          setLastPlacedIndex(i)
          break
        }
      }

      const progressField = mySlot === 1 ? "player1_progress" : "player2_progress"

      // Check if word is now complete - player wins!
      if (isWordComplete(newProgress)) {
        const scoreField = mySlot === 1 ? "player1_score" : "player2_score"
        const newScore = (mySlot === 1 ? room.player1_score : room.player2_score) + 1
        const winnerName = mySlot === 1 ? room.player1_name : room.player2_name
        const isGameFinished = newScore >= WIN_SCORE || room.current_round >= TOTAL_ROUNDS

        await supabase
          .from("game_rooms")
          .update({
            [progressField]: newProgress,
            [scoreField]: newScore,
            round_winner: winnerName,
            game_status: isGameFinished ? "finished" : "round_end",
          })
          .eq("room_code", roomCode)
      } else {
        // Just update progress
        await supabase
          .from("game_rooms")
          .update({ [progressField]: newProgress })
          .eq("room_code", roomCode)
      }
    } else {
      // Wrong letter - shake animation
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
    }
  }, [room, mySlot, roomCode, supabase, playerInfo])

  // Handle timer end - no winner for this round
  async function handleTimerEnd() {
    if (!room) return

    const isGameFinished = room.current_round >= TOTAL_ROUNDS

    await supabase
      .from("game_rooms")
      .update({
        round_winner: null,
        game_status: isGameFinished ? "finished" : "round_end",
      })
      .eq("room_code", roomCode)
  }

  // Handle ready toggle - just update ready status, the useEffect will handle starting the game
  async function handleToggleReady() {
    if (!room || !playerInfo) return

    const readyField = mySlot === 1 ? "player1_ready" : "player2_ready"
    const newReady = !myReady

    console.log("[v0] Toggling ready:", readyField, "to", newReady)

    await supabase
      .from("game_rooms")
      .update({ [readyField]: newReady })
      .eq("room_code", roomCode)
  }

  // Start new round
  async function startNewRound() {
    const word = await fetchWordPair()
    const timerEnd = new Date(Date.now() + ROUND_DURATION * 1000).toISOString()
    const initialProgress = "_".repeat(word.word.length)

    await supabase
      .from("game_rooms")
      .update({
        current_word: word.word,
        current_definition: word.definition,
        player1_progress: initialProgress,
        player2_progress: initialProgress,
        player1_ready: false,
        player2_ready: false,
        round_winner: null,
        game_status: "playing",
        current_round: (room?.current_round || 0) + 1,
        round_end_time: timerEnd,
      })
      .eq("room_code", roomCode)
  }

  // Handle next round
  async function handleNextRound() {
    await startNewRound()
  }

  // Copy room code
  function handleCopyCode() {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Restart game
  async function handlePlayAgain() {
    startGameRef.current = false // Reset so we can start a new game
    await supabase
      .from("game_rooms")
      .update({
        player1_score: 0,
        player2_score: 0,
        player1_ready: false,
        player2_ready: false,
        current_round: 0,
        game_status: "waiting",
        current_word: null,
        current_definition: null,
        player1_progress: null,
        player2_progress: null,
        round_winner: null,
      })
      .eq("room_code", roomCode)
  }

  // Render letter boxes for a player
  function renderLetterBoxes(progress: string | null, isMe: boolean) {
    if (!progress) return null

    return (
      <div className="flex justify-center gap-1.5 flex-wrap">
        {progress.split("").map((char, i) => {
          const isFilled = char !== "_"
          const isJustPlaced = isMe && i === lastPlacedIndex
          
          return (
            <div
              key={i}
              className={cn(
                "w-10 h-12 flex items-center justify-center text-xl font-bold rounded-lg border-2 transition-all duration-200",
                isFilled
                  ? isMe 
                    ? "bg-accent/20 border-accent text-accent-foreground" 
                    : "bg-accent/20 border-accent"
                  : "bg-muted/50 border-muted-foreground/30 text-muted-foreground",
                isJustPlaced && "scale-110 ring-2 ring-accent ring-offset-2"
              )}
            >
              {/* Show letter for self, show filled indicator for opponent */}
              {isMe ? (isFilled ? char : "_") : (isFilled ? "" : "_")}
            </div>
          )
        })}
      </div>
    )
  }

  if (isLoading || !playerInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">Room not found</p>
        <Button variant="outline" onClick={() => router.push("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back Home
        </Button>
      </div>
    )
  }

  // GAME FINISHED
  if (room.game_status === "finished") {
    const winner = room.player1_score > room.player2_score 
      ? room.player1_name 
      : room.player2_score > room.player1_score 
        ? room.player2_name 
        : null
    const iWon = winner === myName

    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/30">
        {iWon && <Confetti recycle={false} numberOfPieces={300} />}
        
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className={cn(
              "w-20 h-20 mx-auto rounded-full flex items-center justify-center",
              iWon ? "bg-accent/20" : winner ? "bg-muted" : "bg-muted"
            )}>
              <Trophy className={cn("w-10 h-10", iWon ? "text-accent" : "text-muted-foreground")} />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold">
                {winner ? `${winner} Wins!` : "It's a Tie!"}
              </h2>
              <p className="text-muted-foreground mt-2">
                Final Score: {room.player1_name} {room.player1_score} - {room.player2_score} {room.player2_name}
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
              <Button onClick={handlePlayAgain}>
                Play Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  // WAITING FOR OPPONENT / LOBBY
  if (room.game_status === "waiting" && !roomIsFull) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/30">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
            
            <div>
              <h2 className="text-xl font-bold">Waiting for Opponent</h2>
              <p className="text-muted-foreground mt-2">
                Share this code with a friend to start playing
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Room Code</p>
              <div className="flex items-center justify-center gap-2">
                <div className="text-4xl font-mono font-bold tracking-[0.3em] bg-muted px-6 py-3 rounded-lg">
                  {roomCode}
                </div>
                <Button variant="outline" size="icon" onClick={handleCopyCode}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Spinner className="w-4 h-4" />
              Waiting for player 2...
            </div>

            <Button variant="ghost" onClick={() => router.push("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Leave Room
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  // READY CHECK
  if (room.game_status === "waiting" && roomIsFull) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/30">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Swords className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Ready to Battle?</h2>
              <p className="text-muted-foreground mt-2">
                Both players must be ready to start
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={cn(
                "p-4 rounded-lg border-2 text-center transition-colors",
                room.player1_ready ? "border-accent bg-accent/10" : "border-muted"
              )}>
                <p className="font-semibold truncate">{room.player1_name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {room.player1_ready ? "Ready!" : "Not ready"}
                </p>
              </div>
              <div className={cn(
                "p-4 rounded-lg border-2 text-center transition-colors",
                room.player2_ready ? "border-accent bg-accent/10" : "border-muted"
              )}>
                <p className="font-semibold truncate">{room.player2_name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {room.player2_ready ? "Ready!" : "Not ready"}
                </p>
              </div>
            </div>

            <Button 
              className="w-full" 
              size="lg"
              variant={myReady ? "secondary" : "default"}
              onClick={handleToggleReady}
            >
              {myReady ? "Cancel Ready" : "I'm Ready!"}
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  // ROUND END
  if (room.game_status === "round_end") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/30">
        {showConfetti && room.round_winner === myName && (
          <Confetti recycle={false} numberOfPieces={150} />
        )}
        
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            {room.round_winner ? (
              <>
                <div className={cn(
                  "w-16 h-16 mx-auto rounded-full flex items-center justify-center",
                  room.round_winner === myName ? "bg-accent/20" : "bg-muted"
                )}>
                  <Trophy className={cn(
                    "w-8 h-8",
                    room.round_winner === myName ? "text-accent" : "text-muted-foreground"
                  )} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {room.round_winner === myName ? "You Win This Round!" : `${room.round_winner} Wins!`}
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    The word was: <span className="font-bold text-foreground">{room.current_word?.toUpperCase()}</span>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Timer className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{"Time's Up!"}</h2>
                  <p className="text-muted-foreground mt-2">
                    The word was: <span className="font-bold text-foreground">{room.current_word?.toUpperCase()}</span>
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-center gap-8 py-2">
              <div className="text-center">
                <p className="text-2xl font-bold">{room.player1_score}</p>
                <p className="text-sm text-muted-foreground">{room.player1_name}</p>
              </div>
              <div className="text-2xl font-bold text-muted-foreground">-</div>
              <div className="text-center">
                <p className="text-2xl font-bold">{room.player2_score}</p>
                <p className="text-sm text-muted-foreground">{room.player2_name}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Round {room.current_round} of {TOTAL_ROUNDS}
            </p>

            <Button className="w-full" size="lg" onClick={handleNextRound}>
              Next Round
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  // PLAYING
  return (
    <main 
      ref={gameContainerRef}
      className={cn(
        "min-h-screen flex flex-col p-4 bg-gradient-to-b from-background to-secondary/30 outline-none",
        isShaking && "animate-[shake_0.3s_ease-in-out]"
      )}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Exit
        </Button>
        <div className="text-sm font-medium">
          Round {room.current_round}/{TOTAL_ROUNDS}
        </div>
        <div className={cn(
          "flex items-center gap-2 text-lg font-bold px-3 py-1 rounded-lg",
          timeRemaining <= 10 ? "bg-destructive/10 text-destructive animate-pulse" : "bg-muted"
        )}>
          <Timer className="w-4 h-4" />
          {timeRemaining}s
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full space-y-6">
        {/* Scores */}
        <div className="w-full flex justify-between items-center px-4">
          <div className={cn(
            "text-center p-3 rounded-lg flex-1 max-w-[140px]",
            mySlot === 1 ? "bg-primary/10 ring-2 ring-primary" : "bg-muted"
          )}>
            <p className="font-semibold truncate">{room.player1_name}</p>
            <p className="text-2xl font-bold">{room.player1_score}</p>
          </div>
          <div className="text-2xl font-bold text-muted-foreground px-4">VS</div>
          <div className={cn(
            "text-center p-3 rounded-lg flex-1 max-w-[140px]",
            mySlot === 2 ? "bg-primary/10 ring-2 ring-primary" : "bg-muted"
          )}>
            <p className="font-semibold truncate">{room.player2_name}</p>
            <p className="text-2xl font-bold">{room.player2_score}</p>
          </div>
        </div>

        {/* Definition Card */}
        <Card className="w-full">
          <CardContent className="pt-6 pb-6">
            <p className="text-lg text-center leading-relaxed text-balance">
              {room.current_definition}
            </p>
          </CardContent>
        </Card>

        {/* Progress Displays Side by Side */}
        <div className="w-full grid grid-cols-2 gap-6">
          {/* Player 1 Progress */}
          <div className="space-y-3">
            <p className={cn(
              "text-sm font-medium text-center",
              mySlot === 1 ? "text-primary" : "text-muted-foreground"
            )}>
              {room.player1_name} {mySlot === 1 && "(You)"}
            </p>
            {renderLetterBoxes(room.player1_progress, mySlot === 1)}
          </div>

          {/* Player 2 Progress */}
          <div className="space-y-3">
            <p className={cn(
              "text-sm font-medium text-center",
              mySlot === 2 ? "text-primary" : "text-muted-foreground"
            )}>
              {room.player2_name} {mySlot === 2 && "(You)"}
            </p>
            {renderLetterBoxes(room.player2_progress, mySlot === 2)}
          </div>
        </div>

        {/* Keyboard instruction */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Press letter keys on your keyboard to guess!
          </p>
          <p className="text-xs text-muted-foreground/70">
            Each correct letter fills in its position. First to complete wins!
          </p>
        </div>
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
