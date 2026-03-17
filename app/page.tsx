"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Zap, Trophy, Sparkles } from "lucide-react"

function generateRoomCode(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let result = ""
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export default function HomePage() {
  const [playerName, setPlayerName] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  async function handleCreateRoom() {
    if (!playerName.trim()) {
      setError("Please enter your name")
      return
    }
    
    setIsLoading(true)
    setError("")
    
    try {
      const newRoomCode = generateRoomCode()
      
      // Create the game room
      const { error: roomError } = await supabase
        .from("game_rooms")
        .insert({
          room_code: newRoomCode,
          game_status: "waiting",
          round_number: 0,
        })
      
      if (roomError) throw roomError
      
      // Add the host player
      const { error: playerError } = await supabase
        .from("players")
        .insert({
          room_code: newRoomCode,
          player_name: playerName.trim(),
          is_host: true,
          score: 0,
        })
      
      if (playerError) throw playerError
      
      // Store player info in localStorage for session
      localStorage.setItem("wordmatch_player", JSON.stringify({
        name: playerName.trim(),
        roomCode: newRoomCode,
        isHost: true,
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
    if (!roomCode.trim()) {
      setError("Please enter a room code")
      return
    }
    
    setIsLoading(true)
    setError("")
    
    try {
      const upperRoomCode = roomCode.trim().toUpperCase()
      
      // Check if room exists
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
      
      if (room.game_status !== "waiting") {
        setError("Game already in progress. Try another room.")
        setIsLoading(false)
        return
      }
      
      // Add the player
      const { error: playerError } = await supabase
        .from("players")
        .insert({
          room_code: upperRoomCode,
          player_name: playerName.trim(),
          is_host: false,
          score: 0,
        })
      
      if (playerError) throw playerError
      
      // Store player info
      localStorage.setItem("wordmatch_player", JSON.stringify({
        name: playerName.trim(),
        roomCode: upperRoomCode,
        isHost: false,
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
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-balance">WordMatch</h1>
          <p className="text-muted-foreground text-balance">
            The multiplayer word guessing game where you describe without saying the forbidden words!
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-lg bg-card border">
            <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">2+ Players</p>
          </div>
          <div className="p-3 rounded-lg bg-card border">
            <Zap className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">60s Rounds</p>
          </div>
          <div className="p-3 rounded-lg bg-card border">
            <Trophy className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">First to 10</p>
          </div>
        </div>

        {/* Main Card */}
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle>Play Now</CardTitle>
            <CardDescription>Create a new room or join an existing one</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Player Name Input */}
            <div className="space-y-2">
              <label htmlFor="playerName" className="text-sm font-medium">
                Your Name
              </label>
              <Input
                id="playerName"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
              />
            </div>

            {/* Tabs for Create/Join */}
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Create Room</TabsTrigger>
                <TabsTrigger value="join">Join Room</TabsTrigger>
              </TabsList>
              
              <TabsContent value="create" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Create a new game room and share the code with friends.
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
                    className="text-center text-lg tracking-widest uppercase"
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
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* How to Play */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">How to Play</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p><span className="font-semibold text-foreground">1.</span> One player describes a word without using forbidden words</p>
            <p><span className="font-semibold text-foreground">2.</span> Others try to guess the word before time runs out</p>
            <p><span className="font-semibold text-foreground">3.</span> First team to 10 points wins!</p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
