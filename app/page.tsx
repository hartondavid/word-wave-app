"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { PLAYER_COLORS } from "@/lib/game-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Zap, Trophy, Timer, Swords } from "lucide-react"
import { cn } from "@/lib/utils"

function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export default function HomePage() {
  const [playerName, setPlayerName] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(2)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  async function handlePracticeSolo() {
    if (!playerName.trim()) { setError("Please enter your name"); return }
    localStorage.setItem("wordmatch_player", JSON.stringify({
      id: generatePlayerId(),
      name: playerName.trim(),
      mode: "practice",
    }))
    router.push("/practice")
  }

  async function handleCreateRoom() {
    if (!playerName.trim()) { setError("Please enter your name"); return }
    setIsLoading(true)
    setError("")
    try {
      const newRoomCode = generateRoomCode()
      const playerId = generatePlayerId()
      const basePayload: Record<string, unknown> = {
        room_code: newRoomCode,
        player1_id: playerId,
        player1_name: playerName.trim(),
        game_status: "waiting",
        current_round: 0,
      }

      // Try with max_players first (requires migration 005).
      // If the column doesn't exist yet, fall back silently to a 2-player room.
      let { error: roomError } = await supabase
        .from("game_rooms")
        .insert({ ...basePayload, max_players: maxPlayers })

      if (roomError) {
        const msg = (roomError as { message?: string }).message ?? ""
        if (msg.includes("max_players")) {
          // Column not yet migrated — retry without it
          const retry = await supabase.from("game_rooms").insert(basePayload)
          roomError = retry.error
          if (!retry.error) {
            console.warn("max_players column missing. Run scripts/005_add_4player_support.sql for 3–4 player support.")
          }
        }
      }

      if (roomError) {
        const msg = (roomError as { message?: string }).message ?? JSON.stringify(roomError)
        console.error("Create room error:", msg, roomError)
        setError(`Failed to create room: ${msg}`)
        setIsLoading(false)
        return
      }

      localStorage.setItem("wordmatch_player", JSON.stringify({
        id: playerId,
        name: playerName.trim(),
        roomCode: newRoomCode,
        playerSlot: 1,
      }))
      router.push(`/game/${newRoomCode}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("Create room exception:", err)
      setError(`Failed to create room: ${msg}`)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleJoinRoom() {
    if (!playerName.trim()) { setError("Please enter your name"); return }
    if (!roomCode.trim() || roomCode.trim().length !== 4) {
      setError("Please enter a valid 4-character room code")
      return
    }
    setIsLoading(true)
    setError("")
    try {
      const upperCode = roomCode.trim().toUpperCase()
      const playerId = generatePlayerId()

      const { data: room, error: roomError } = await supabase
        .from("game_rooms").select("*").eq("room_code", upperCode).single()

      if (roomError || !room) {
        setError("Room not found. Check the code and try again.")
        setIsLoading(false)
        return
      }

      // Check if game is already in progress
      if (room.game_status !== "waiting") {
        setError("Game already in progress.")
        setIsLoading(false)
        return
      }

      // When max_players column is missing (migration not run), fall back to 4
      // so the room isn't falsely reported as full.
      const mx = room.max_players ?? 4
      const filled = [room.player1_id, room.player2_id, room.player3_id, room.player4_id].filter(Boolean).length
      if (filled >= mx) {
        setError("Room is full. Try another room.")
        setIsLoading(false)
        return
      }

      let playerSlot: number
      let updateFields: Record<string, unknown>
      if (!room.player2_id) {
        playerSlot = 2; updateFields = { player2_id: playerId, player2_name: playerName.trim() }
      } else if (!room.player3_id) {
        playerSlot = 3; updateFields = { player3_id: playerId, player3_name: playerName.trim() }
      } else {
        playerSlot = 4; updateFields = { player4_id: playerId, player4_name: playerName.trim() }
      }

      const { error: updateError } = await supabase
        .from("game_rooms").update(updateFields).eq("room_code", upperCode)
      if (updateError) {
        const msg = (updateError as { message?: string }).message ?? JSON.stringify(updateError)
        console.error("Join room error:", msg, updateError)
        if (msg.includes("player3") || msg.includes("player4")) {
          setError("3–4 player support needs a DB migration. Run scripts/005_add_4player_support.sql in Supabase.")
        } else {
          setError(`Failed to join room: ${msg}`)
        }
        setIsLoading(false)
        return
      }

      localStorage.setItem("wordmatch_player", JSON.stringify({
        id: playerId,
        name: playerName.trim(),
        roomCode: upperCode,
        playerSlot,
      }))
      router.push(`/game/${upperCode}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("Join room exception:", err)
      setError(`Failed to join room: ${msg}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/30">
      <div className="w-full max-w-md space-y-6">

        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg">
            <Swords className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">WordMatch</h1>
          <p className="text-muted-foreground">Race to guess the word first. Up to 4 players.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: <Swords className="w-5 h-5 mx-auto mb-1 text-primary" />, label: "2–4 Players" },
            { icon: <Timer className="w-5 h-5 mx-auto mb-1 text-primary" />, label: "60s Rounds" },
            { icon: <Trophy className="w-5 h-5 mx-auto mb-1 text-primary" />, label: "Best of 10" },
          ].map(({ icon, label }) => (
            <div key={label} className="p-3 rounded-xl bg-card border">
              {icon}
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Main card */}
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle>Play Now</CardTitle>
            <CardDescription>Practice solo or duel with friends</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name input */}
            <div className="space-y-2">
              <label htmlFor="playerName" className="text-sm font-medium">Your Name</label>
              <Input
                id="playerName"
                placeholder="Enter your nickname"
                value={playerName}
                onChange={(e) => { setPlayerName(e.target.value); setError("") }}
                maxLength={15}
                onKeyDown={(e) => e.key === "Enter" && handlePracticeSolo()}
              />
            </div>

            {/* Practice */}
            <Button variant="outline" className="w-full" size="lg" onClick={handlePracticeSolo} disabled={isLoading}>
              <Zap className="w-4 h-4 mr-2" />
              Practice Solo
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Multiplayer</span>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Create Room</TabsTrigger>
                <TabsTrigger value="join">Join Room</TabsTrigger>
              </TabsList>

              {/* CREATE */}
              <TabsContent value="create" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Number of Players</p>
                  <div className="flex gap-2">
                    {([2, 3, 4] as const).map((n) => (
                      <button
                        key={n}
                        onClick={() => setMaxPlayers(n)}
                        className={cn(
                          "flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all",
                          maxPlayers === n
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-muted bg-muted/40 text-muted-foreground hover:border-muted-foreground/40"
                        )}
                      >
                        {n}
                        {/* Player color dots */}
                        <div className="flex justify-center gap-0.5 mt-1">
                          {Array.from({ length: n }).map((_, i) => (
                            <div
                              key={i}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: PLAYER_COLORS[i] }}
                            />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share the room code with {maxPlayers - 1} friend{maxPlayers > 2 ? "s" : ""} to start
                  </p>
                </div>
                <Button className="w-full" size="lg" onClick={handleCreateRoom} disabled={isLoading}>
                  {isLoading ? "Creating..." : `Create ${maxPlayers}-Player Room`}
                </Button>
              </TabsContent>

              {/* JOIN */}
              <TabsContent value="join" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label htmlFor="roomCode" className="text-sm font-medium">Room Code</label>
                  <Input
                    id="roomCode"
                    placeholder="ABCD"
                    value={roomCode}
                    onChange={(e) => { setRoomCode(e.target.value.toUpperCase()); setError("") }}
                    maxLength={4}
                    className="text-center text-2xl tracking-[0.5em] uppercase font-mono"
                    onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                  />
                </div>
                <Button className="w-full" size="lg" onClick={handleJoinRoom} disabled={isLoading}>
                  {isLoading ? "Joining..." : "Join Game"}
                </Button>
              </TabsContent>
            </Tabs>

            {error && (
              <p className="text-sm text-destructive text-center font-medium">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* How to play */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-2 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground text-sm mb-2">How to Play</p>
            <p><span className="font-semibold text-foreground">1.</span> All players see the same word definition</p>
            <p><span className="font-semibold text-foreground">2.</span> Press letter keys to fill in the word</p>
            <p><span className="font-semibold text-foreground">3.</span> Colored lines show enemy progress</p>
            <p><span className="font-semibold text-foreground">4.</span> First to complete the word wins the round!</p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
