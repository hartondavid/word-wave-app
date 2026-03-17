"use client"

import { useEffect, useState, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { GameRoom, Player, ROUND_DURATION, WIN_SCORE } from "@/lib/game-types"
import { getRandomCards } from "@/lib/words"
import { Lobby } from "@/components/game/lobby"
import { ClueGiverView } from "@/components/game/clue-giver-view"
import { GuesserView } from "@/components/game/guesser-view"
import { WinScreen } from "@/components/game/win-screen"
import { Spinner } from "@/components/ui/spinner"

interface GamePageProps {
  params: Promise<{ roomCode: string }>
}

export default function GamePage({ params }: GamePageProps) {
  const { roomCode } = use(params)
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayer, setCurrentPlayer] = useState<{ name: string; isHost: boolean } | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(ROUND_DURATION)
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Get current player from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("wordmatch_player")
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.roomCode === roomCode) {
        setCurrentPlayer(parsed)
      } else {
        router.push("/")
      }
    } else {
      router.push("/")
    }
  }, [roomCode, router])

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      const [roomResult, playersResult] = await Promise.all([
        supabase.from("game_rooms").select("*").eq("room_code", roomCode).single(),
        supabase.from("players").select("*").eq("room_code", roomCode),
      ])

      if (roomResult.data) setRoom(roomResult.data)
      if (playersResult.data) setPlayers(playersResult.data)
      setIsLoading(false)
    }
    fetchData()
  }, [roomCode, supabase])

  // Subscribe to realtime updates
  useEffect(() => {
    const roomChannel = supabase
      .channel(`room-${roomCode}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_rooms", filter: `room_code=eq.${roomCode}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setRoom(payload.new as GameRoom)
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_code=eq.${roomCode}` },
        async () => {
          // Refetch all players on any change
          const { data } = await supabase.from("players").select("*").eq("room_code", roomCode)
          if (data) setPlayers(data)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(roomChannel)
    }
  }, [roomCode, supabase])

  // Timer countdown
  useEffect(() => {
    if (room?.game_status !== "playing" || !room.timer_end) return

    const interval = setInterval(() => {
      const endTime = new Date(room.timer_end!).getTime()
      const now = Date.now()
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000))
      setTimeRemaining(remaining)

      if (remaining === 0) {
        handleTimerEnd()
      }
    }, 100)

    return () => clearInterval(interval)
  }, [room?.timer_end, room?.game_status])

  const getCurrentPlayerId = useCallback(() => {
    if (!currentPlayer) return null
    const player = players.find(p => p.player_name === currentPlayer.name)
    return player?.id || null
  }, [currentPlayer, players])

  const isClueGiver = room?.current_clue_giver === getCurrentPlayerId()

  async function handleStartGame() {
    setIsStarting(true)
    try {
      await startNewRound()
    } finally {
      setIsStarting(false)
    }
  }

  async function startNewRound() {
    const card = getRandomCards(1)[0]
    const currentPlayerId = getCurrentPlayerId()
    
    // Select next clue giver (rotate through players)
    const playerIds = players.map(p => p.id)
    const currentIndex = playerIds.indexOf(room?.current_clue_giver || "")
    const nextIndex = (currentIndex + 1) % playerIds.length
    const nextClueGiver = playerIds[nextIndex] || currentPlayerId

    const timerEnd = new Date(Date.now() + ROUND_DURATION * 1000).toISOString()

    await supabase
      .from("game_rooms")
      .update({
        current_word: card.word,
        taboo_words: card.tabooWords,
        current_clue_giver: nextClueGiver,
        game_status: "playing",
        round_number: (room?.round_number || 0) + 1,
        timer_end: timerEnd,
      })
      .eq("room_code", roomCode)
  }

  async function handleCorrectGuess() {
    // Award points to all guessers (everyone except clue giver)
    const guessers = players.filter(p => p.id !== room?.current_clue_giver)
    
    for (const guesser of guessers) {
      await supabase
        .from("players")
        .update({ score: guesser.score + 1 })
        .eq("id", guesser.id)
    }

    // Also award point to clue giver
    const clueGiver = players.find(p => p.id === room?.current_clue_giver)
    if (clueGiver) {
      await supabase
        .from("players")
        .update({ score: clueGiver.score + 1 })
        .eq("id", clueGiver.id)
    }

    // Check for winner
    const updatedPlayers = await supabase.from("players").select("*").eq("room_code", roomCode)
    const hasWinner = updatedPlayers.data?.some(p => p.score >= WIN_SCORE)

    if (hasWinner) {
      await supabase
        .from("game_rooms")
        .update({ game_status: "game_over" })
        .eq("room_code", roomCode)
    } else {
      // Start next round with new word
      await startNewRound()
    }
  }

  async function handleSkipWord() {
    // Get new word and continue
    const card = getRandomCards(1)[0]
    
    await supabase
      .from("game_rooms")
      .update({
        current_word: card.word,
        taboo_words: card.tabooWords,
      })
      .eq("room_code", roomCode)
  }

  async function handleTimerEnd() {
    // Check for winner first
    const hasWinner = players.some(p => p.score >= WIN_SCORE)

    if (hasWinner) {
      await supabase
        .from("game_rooms")
        .update({ game_status: "game_over" })
        .eq("room_code", roomCode)
    } else {
      // Start new round with next clue giver
      await startNewRound()
    }
  }

  if (isLoading || !currentPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Room not found</p>
      </div>
    )
  }

  // Game over - show win screen
  if (room.game_status === "game_over") {
    return <WinScreen players={players} currentPlayerName={currentPlayer.name} />
  }

  // Waiting for players - show lobby
  if (room.game_status === "waiting") {
    return (
      <Lobby
        roomCode={roomCode}
        players={players}
        isHost={currentPlayer.isHost}
        onStartGame={handleStartGame}
        isStarting={isStarting}
      />
    )
  }

  // Game in progress
  if (isClueGiver) {
    return (
      <ClueGiverView
        room={room}
        players={players}
        timeRemaining={timeRemaining}
        onCorrectGuess={handleCorrectGuess}
        onSkipWord={handleSkipWord}
      />
    )
  }

  return (
    <GuesserView
      room={room}
      players={players}
      timeRemaining={timeRemaining}
      currentPlayerName={currentPlayer.name}
    />
  )
}
