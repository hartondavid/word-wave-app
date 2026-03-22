"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  PLAYER_COLORS,
  CATEGORIES,
  LANGUAGES,
  TOTAL_ROUNDS,
  languageForMultiplayerRoom,
  type CategoryKey,
  type LanguageKey,
} from "@/lib/game-types"
import { syncGameRoomLanguage } from "@/app/game/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Zap, Trophy, Timer, Swords } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Alege primul slot liber pentru join: întâi 2→4 (invitați), apoi 1 (dacă gazda a plecat).
 * Limitează la sloturile 1..maxPlayers.
 */
function pickJoinPlayerSlot(
  room: {
    player1_id?: string | null
    player2_id?: string | null
    player3_id?: string | null
    player4_id?: string | null
  },
  maxPlayers: number
): 1 | 2 | 3 | 4 | null {
  const mx = Math.min(Math.max(maxPlayers, 2), 4)
  const ids = [room.player1_id, room.player2_id, room.player3_id, room.player4_id]
  const filled = ids.filter(Boolean).length
  if (filled >= mx) return null
  const order = ([2, 3, 4, 1] as const).filter(s => s <= mx)
  for (const s of order) {
    const id = ids[s - 1]
    if (!id) return s
  }
  return null
}

const JOINABLE_GAME_STATUSES = new Set(["waiting", "playing", "round_end", "finished"])

const MSG_NAME_REQUIRED = "Please enter your name"
const MSG_NAME_TAKEN =
  "This name is already taken in the room."

/** Rând minimal din `game_rooms` pentru verificarea numelui la join. */
type RoomRowForNameCheck = {
  player1_id?: string | null
  player1_name?: string | null
  player2_id?: string | null
  player2_name?: string | null
  player3_id?: string | null
  player3_name?: string | null
  player4_id?: string | null
  player4_name?: string | null
}

/**
 * True dacă un jucător activ (are id) folosește deja același nume.
 * Comparare după trim, fără diferență majuscule/minuscule: "Alex" = "alex".
 */
function isDisplayNameTakenInRoom(room: RoomRowForNameCheck, candidate: string): boolean {
  const t = candidate.trim().toLocaleLowerCase()
  const pairs: [string | null | undefined, string | null | undefined][] = [
    [room.player1_id, room.player1_name],
    [room.player2_id, room.player2_name],
    [room.player3_id, room.player3_name],
    [room.player4_id, room.player4_name],
  ]
  for (const [id, name] of pairs) {
    if (!id || name == null || name === "") continue
    if (name.trim().toLocaleLowerCase() === t) return true
  }
  return false
}

export default function HomePage() {
  const [playerName, setPlayerName] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(2)
  const [maxRoundsInput, setMaxRoundsInput] = useState<string>(String(TOTAL_ROUNDS))
  const [roundsError, setRoundsError] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("general")
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageKey>("en")
  const [activeTab, setActiveTab] = useState<"create" | "join">("create")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  /** Mesaj de validare afișat sub câmpul Your Name. */
  const [nameFieldError, setNameFieldError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  async function handlePracticeSolo() {
    if (!playerName.trim()) {
      setNameFieldError(MSG_NAME_REQUIRED)
      return
    }
    const rounds = parseInt(maxRoundsInput, 10)
    localStorage.setItem("wordmatch_player", JSON.stringify({
      id: generatePlayerId(),
      name: playerName.trim(),
      mode: "practice",
      category: selectedCategory,
      language: selectedLanguage,
      max_rounds: !isNaN(rounds) && rounds > 0 ? rounds : 10,
    }))
    router.push("/practice")
  }

  async function handleCreateRoom() {
    if (!playerName.trim()) {
      setNameFieldError(MSG_NAME_REQUIRED)
      return
    }
    const maxRounds = parseInt(maxRoundsInput, 10)
    if (!maxRoundsInput.trim() || isNaN(maxRounds) || maxRounds <= 0) {
      setRoundsError("Number of rounds must be at least 1")
      return
    }
    setIsLoading(true)
    setError("")
    setNameFieldError("")
    try {
      const newRoomCode = generateRoomCode()
      const playerId = generatePlayerId()
      const roomLanguage = languageForMultiplayerRoom(selectedLanguage)
      const basePayload: Record<string, unknown> = {
        room_code: newRoomCode,
        player1_id: playerId,
        player1_name: playerName.trim(),
        game_status: "waiting",
        current_round: 0,
        total_rounds: maxRounds,   // existing column — no migration needed
      }

      // Optional columns added by migrations 005/006; removed from payload if
      // the column doesn't exist yet and retried automatically.
      const OPTIONAL_COLUMNS = ["language", "category", "max_players"] as const
      const optionalValues: Record<string, unknown> = {
        max_players: maxPlayers,
        category: selectedCategory,
        language: roomLanguage,
      }

      let payload = { ...basePayload, ...optionalValues }
      let { error: roomError } = await supabase.from("game_rooms").insert(payload)

      for (const col of OPTIONAL_COLUMNS) {
        if (!roomError) break
        const msg = ((roomError as { message?: string }).message ?? "").toLowerCase()
        if (msg.includes(col.toLowerCase())) {
          console.warn(`${col} column missing — run the relevant migration script`)
          const { [col]: _removed, ...rest } = payload
          payload = rest
          const r = await supabase.from("game_rooms").insert(payload)
          roomError = r.error
        }
      }

      if (roomError) {
        const msg = (roomError as { message?: string }).message ?? JSON.stringify(roomError)
        console.error("Create room error:", msg, roomError)
        setError(`Failed to create room: ${msg}`)
        setIsLoading(false)
        return
      }

      // Asigură că limba/categoria ajung în DB (unele insert-uri fără coloane opționale lasă NULL).
      const { error: patchErr } = await supabase
        .from("game_rooms")
        .update({
          language: roomLanguage,
          category: selectedCategory,
          max_players: maxPlayers,
        })
        .eq("room_code", newRoomCode)
      if (patchErr) {
        console.warn("Room language/category patch:", patchErr.message)
      }

      const syncLang = await syncGameRoomLanguage(newRoomCode, selectedLanguage)
      if (!syncLang.ok) {
        console.warn("syncGameRoomLanguage:", syncLang.error)
      }

      localStorage.setItem("wordmatch_player", JSON.stringify({
        id: playerId,
        name: playerName.trim(),
        roomCode: newRoomCode,
        playerSlot: 1,
        language: roomLanguage,
        category: selectedCategory,
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
    if (!playerName.trim()) {
      setNameFieldError(MSG_NAME_REQUIRED)
      return
    }
    if (!roomCode.trim() || roomCode.trim().length !== 4) {
      setError("Please enter a valid 4-character room code")
      return
    }
    setIsLoading(true)
    setError("")
    setNameFieldError("")
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

      if (!JOINABLE_GAME_STATUSES.has(room.game_status)) {
        setError("Nu te poți alătura camerei în acest moment.")
        setIsLoading(false)
        return
      }

      if (isDisplayNameTakenInRoom(room as RoomRowForNameCheck, playerName)) {
        setNameFieldError(MSG_NAME_TAKEN)
        setIsLoading(false)
        return
      }

      // When max_players column is missing (migration not run), fall back to 4
      // so the room isn't falsely reported as full.
      const mx = room.max_players ?? 4
      const playerSlot = pickJoinPlayerSlot(room, mx)
      if (playerSlot === null) {
        setError("Camera este plină. Încearcă alt cod.")
        setIsLoading(false)
        return
      }

      const updateFields: Record<string, unknown> = {
        [`player${playerSlot}_id`]: playerId,
        [`player${playerSlot}_name`]: playerName.trim(),
        [`player${playerSlot}_score`]: 0,
        [`player${playerSlot}_ready`]: false,
      }

      // Intrare în timpul rundei: progres aliniat cu cuvântul curent
      if ((room.game_status === "playing" || room.game_status === "round_end") && room.current_word) {
        updateFields[`player${playerSlot}_progress`] = "_".repeat(room.current_word.length)
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
          <div className="inline-flex items-center justify-center mb-4">
            <Image src="/logo.png" alt="WordWave logo" width={300} height={300} className="rounded-2xl" priority />
          </div>
          
          <p className="text-muted-foreground">Race to guess the word first. Up to 4 players.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: <Swords className="w-5 h-5 mx-auto mb-1 text-primary" />, label: "2–4 Players" },
            { icon: <Timer className="w-5 h-5 mx-auto mb-1 text-primary" />, label: "60s Rounds" },
            { icon: <Trophy className="w-5 h-5 mx-auto mb-1 text-primary" />, label: "1–? Rounds" },
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
            <CardDescription>Practice solo or multiplayer with friends</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name input */}
            <div className="space-y-2">
              <label
                htmlFor="playerName"
                className={cn("text-sm font-medium", nameFieldError && "text-destructive")}
              >
                Your Name
              </label>
              <Input
                id="playerName"
                placeholder="Enter your nickname"
                value={playerName}
                aria-invalid={!!nameFieldError}
                aria-describedby={nameFieldError ? "playerName-error" : undefined}
                onChange={(e) => {
                  setPlayerName(e.target.value)
                  setError("")
                  setNameFieldError("")
                }}
                maxLength={15}
                onKeyDown={(e) => e.key === "Enter" && handlePracticeSolo()}
              />
              {nameFieldError ? (
                <p id="playerName-error" className="text-xs text-destructive" role="alert">
                  {nameFieldError}
                </p>
              ) : null}
            </div>

            {/* Category selector — hidden when joining */}
            {activeTab === "create" && (
              <div className="space-y-2">
                <label htmlFor="categorySelect" className="text-sm font-medium">Category</label>
                <select
                  id="categorySelect"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as CategoryKey)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {(Object.entries(CATEGORIES) as [CategoryKey, { category: string; emoji: string }][]).map(([key, { category, emoji }]) => (
                    <option key={key} value={key}>{emoji} {category}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Language — vizibil doar la Create (Practice + cameră nouă folosesc aceeași selecție) */}
            {activeTab === "create" && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Definition &amp; word language</p>
                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label="Definition and word language"
                >
                  {(Object.entries(LANGUAGES) as [LanguageKey, { label: string; flag: string }][]).map(([key, { label, flag }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedLanguage(key)}
                      aria-pressed={selectedLanguage === key}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                        selectedLanguage === key
                          ? "border-2 border-blue-500 text-foreground bg-transparent"
                          : "border bg-muted/40 text-muted-foreground border-transparent hover:border-muted-foreground/30 hover:bg-muted/70",
                      )}
                    >
                      {flag} {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Round count input — hidden when joining (only host sets rounds) */}
            {activeTab === "create" && (
              <div className="space-y-2">
                <label htmlFor="maxRounds" className="text-sm font-medium">
                  Number of Rounds <span className="text-muted-foreground font-normal">(min 1)</span>
                </label>
                <Input
                  id="maxRounds"
                  type="number"
                  min={1}
                  placeholder="e.g. 10"
                  value={maxRoundsInput}
                  onChange={(e) => {
                    const raw = e.target.value
                    setMaxRoundsInput(raw)
                    const val = parseInt(raw, 10)
                    if (!raw.trim() || isNaN(val) || val <= 0) {
                      setRoundsError("Number of rounds must be at least 1")
                    } else {
                      setRoundsError("")
                    }
                  }}
                  className={cn("text-center font-bold", roundsError && "border-destructive focus-visible:ring-destructive")}
                />
                {roundsError && (
                  <p className="text-xs text-destructive">{roundsError}</p>
                )}
              </div>
            )}

            {/* Practice */}
            <Button
              variant="default"
              className="w-full bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500/40 dark:bg-green-600 dark:hover:bg-green-700"
              size="lg"
              onClick={handlePracticeSolo}
              disabled={isLoading}
            >
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
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as "create" | "join")
                setRoundsError("")
                setNameFieldError("")
              }}
              className="w-full"
            >
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
                            ? "border-[3px] border-blue-500 text-foreground bg-transparent"
                            : "border-2 border-muted bg-muted/40 text-muted-foreground hover:border-muted-foreground/40"
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
                  {isLoading ? "Creating..." : `Create ${maxPlayers} Players Room`}
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
