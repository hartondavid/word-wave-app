"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Zap, Trophy, Swords, Timer } from "lucide-react"

function generateRoomCode(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export default function HomePage() {
  const [playerName, setPlayerName] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  async function handlePracticeSolo() {
    if (!playerName.trim()) {
      setError("Please enter your name")
      return
    }
    
    // Store player info and go to practice mode
    localStorage.setItem("wordmatch_player", JSON.stringify({
      id: generatePlayerId(),
      name: playerName.trim(),
      mode: "practice",
    }))
    
    router.push("/practice")
  }

  async function handleCreateRoom() {
    if (!playerName.trim()) {
      setError("Please enter your name")
      return
    }
    
    setIsLoading(true)
    setError("")
    
    try {
      const newRoomCode = generateRoomCode()
      const playerId = generatePlayerId()
      
      // Create the game room with player 1
      const { error: roomError } = await supabase
        .from("game_rooms")
        .insert({
          room_code: newRoomCode,
          player1_id: playerId,
          player1_name: playerName.trim(),
          player1_score: 0,
          player1_ready: false,
          player2_score: 0,
          player2_ready: false,
          game_status: "waiting",
          current_round: 0,
        })
      
      if (roomError) throw roomError
      
      // Store player info in localStorage for session
      localStorage.setItem("wordmatch_player", JSON.stringify({
        id: playerId,
        name: playerName.trim(),
        roomCode: newRoomCode,
        playerSlot: 1,
      }))
      
      router.push(`/game/${newRoomCode}`)
    } catch (err) {
      console.error(err)
      setError("Failed to create room. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleJoinRoom() {
    if (!playerName.trim()) {
      setError("Please enter your name")
      return
    }
    if (!roomCode.trim() || roomCode.trim().length !== 4) {
      setError("Please enter a valid 4-character room code")
      return
    }
    
    setIsLoading(true)
    setError("")
    
    try {
      const upperRoomCode = roomCode.trim().toUpperCase()
      const playerId = generatePlayerId()
      
      // Check if room exists and has space
      const { data: room, error: roomError } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("room_code", upperRoomCode)
        .single()
      
      if (roomError || !room) {
        setError("Room not found. Check the code and try again.")
        setIsLoading(false)
        return
      }
      
      if (room.player2_id) {
        setError("Room is full. Try another room.")
        setIsLoading(false)
        return
      }
      
      if (room.game_status !== "waiting") {
        setError("Game already in progress.")
        setIsLoading(false)
        return
      }
      
      // Join as player 2
      const { error: updateError } = await supabase
        .from("game_rooms")
        .update({
          player2_id: playerId,
          player2_name: playerName.trim(),
        })
        .eq("room_code", upperRoomCode)
      
      if (updateError) throw updateError
      
      // Store player info
      localStorage.setItem("wordmatch_player", JSON.stringify({
        id: playerId,
        name: playerName.trim(),
        roomCode: upperRoomCode,
        playerSlot: 2,
      }))
      
      router.push(`/game/${upperRoomCode}`)
    } catch (err) {
      console.error(err)
      setError("Failed to join room. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/30">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <Swords className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-balance">WordMatch</h1>
          <p className="text-muted-foreground text-balance">
            Head-to-head word guessing! Race to type the correct word first.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-lg bg-card border">
            <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">2 Players</p>
          </div>
          <div className="p-3 rounded-lg bg-card border">
            <Timer className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">60s Rounds</p>
          </div>
          <div className="p-3 rounded-lg bg-card border">
            <Trophy className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Best of 10</p>
          </div>
        </div>

        {/* Main Card */}
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle>Play Now</CardTitle>
            <CardDescription>Practice solo or challenge a friend</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Player Name Input */}
            <div className="space-y-2">
              <label htmlFor="playerName" className="text-sm font-medium">
                Your Name
              </label>
              <Input
                id="playerName"
                placeholder="Enter your nickname"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={15}
              />
            </div>

            {/* Practice Solo Button */}
            <Button 
              variant="outline"
              className="w-full" 
              size="lg"
              onClick={handlePracticeSolo}
              disabled={isLoading}
            >
              <Zap className="w-4 h-4 mr-2" />
              Practice Solo
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or play multiplayer</span>
              </div>
            </div>

            {/* Tabs for Create/Join */}
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Create Room</TabsTrigger>
                <TabsTrigger value="join">Join Room</TabsTrigger>
              </TabsList>
              
              <TabsContent value="create" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Create a room and share the code with a friend.
                </p>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleCreateRoom}
                  disabled={isLoading}
                >
                  {isLoading ? "Creating..." : "Create New Game"}
                </Button>
              </TabsContent>
              
              <TabsContent value="join" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label htmlFor="roomCode" className="text-sm font-medium">
                    Room Code
                  </label>
                  <Input
                    id="roomCode"
                    placeholder="ABCD"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={4}
                    className="text-center text-2xl tracking-[0.5em] uppercase font-mono"
                  />
                </div>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleJoinRoom}
                  disabled={isLoading}
                >
                  {isLoading ? "Joining..." : "Join Game"}
                </Button>
              </TabsContent>
            </Tabs>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-destructive text-center animate-pulse">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* How to Play */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">How to Play</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><span className="font-semibold text-foreground">1.</span> Both players see the same word definition</p>
            <p><span className="font-semibold text-foreground">2.</span> Type the correct word as fast as you can</p>
            <p><span className="font-semibold text-foreground">3.</span> First to complete the word wins the round!</p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
