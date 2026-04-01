"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Switch } from "@/components/ui/switch"
import { Zap } from "lucide-react"
import { HomeHowToPlayCard } from "@/components/home-how-to-play-card"
import { startGameAmbientWaves, stopGameAmbientWaves } from "@/lib/game-ambient-waves"
import { cn } from "@/lib/utils"
import { currentLocaleFromPathname } from "@/lib/locale-switch-paths"
import {
  categoryLabelForLocale,
  getHomePlayFormStrings,
  getHowToPlayStrings,
  type HomePlayFormStrings,
} from "@/lib/home-play-form-strings"

function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

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

const MIN_NAME_LENGTH = 2

function validatePlayerName(raw: string, t: HomePlayFormStrings): string {
  const trimmed = raw.trim()
  if (!trimmed) return t.nameRequired
  if (trimmed.length < MIN_NAME_LENGTH) return t.nameTooShort
  return ""
}

type PracticeRoundTimerSeconds = 30 | 60

function persistPracticeRoundSecondsPartial(sec: PracticeRoundTimerSeconds) {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem("wordmatch_player")
    const o: Record<string, unknown> = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    o.practice_round_seconds = sec
    localStorage.setItem("wordmatch_player", JSON.stringify(o))
  } catch {
    /* ignore */
  }
}

function persistPracticeHintsEnabledPartial(on: boolean) {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem("wordmatch_player")
    const o: Record<string, unknown> = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    o.practice_hints_enabled = on
    localStorage.setItem("wordmatch_player", JSON.stringify(o))
  } catch {
    /* ignore */
  }
}

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

export function HomePlayClient() {
  const pathname = usePathname() ?? ""
  const formLocale = currentLocaleFromPathname(pathname) === "ro" ? "ro" : "en"
  const t = getHomePlayFormStrings(formLocale)
  const howToPlay = getHowToPlayStrings(formLocale)

  const [playerName, setPlayerName] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(2)
  const [maxRoundsInput, setMaxRoundsInput] = useState<string>(String(TOTAL_ROUNDS))
  const [practiceRoundSeconds, setPracticeRoundSeconds] = useState<PracticeRoundTimerSeconds>(30)
  const [practiceHintsEnabled, setPracticeHintsEnabled] = useState(false)
  const [roundsError, setRoundsError] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("general")
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageKey>("en")
  const [activeTab, setActiveTab] = useState<"create" | "join">("create")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [nameFieldError, setNameFieldError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    startGameAmbientWaves()
    return () => stopGameAmbientWaves(true)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const j = new URLSearchParams(window.location.search).get("join")?.trim()
    if (!j || !/^[A-Za-z0-9]{4}$/.test(j)) return
    setActiveTab("join")
    setRoomCode(j.toUpperCase())
    window.history.replaceState(null, "", window.location.pathname || "/")
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const prev = localStorage.getItem("wordmatch_player")
      if (!prev) return
      const j = JSON.parse(prev) as {
        practice_round_seconds?: unknown
        practice_hints_enabled?: unknown
      }
      if (j.practice_round_seconds === 30 || j.practice_round_seconds === 60) {
        setPracticeRoundSeconds(j.practice_round_seconds)
      }
      if (typeof j.practice_hints_enabled === "boolean") {
        setPracticeHintsEnabled(j.practice_hints_enabled)
      }
    } catch {
      /* ignore */
    }
  }, [])

  async function handlePracticeSolo() {
    const nameErr = validatePlayerName(playerName, t)
    if (nameErr) {
      setNameFieldError(nameErr)
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
      practice_round_seconds: practiceRoundSeconds,
      practice_hints_enabled: practiceHintsEnabled,
    }))
    router.push(formLocale === "ro" ? "/ro/practice" : "/practice")
  }

  async function handleCreateRoom() {
    const nameErr = validatePlayerName(playerName, t)
    if (nameErr) {
      setNameFieldError(nameErr)
      return
    }
    const maxRounds = parseInt(maxRoundsInput, 10)
    if (!maxRoundsInput.trim() || isNaN(maxRounds) || maxRounds <= 0) {
      setRoundsError(t.roundsMin1)
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
        total_rounds: maxRounds,
      }

      const OPTIONAL_COLUMNS = ["language", "category", "max_players", "round_duration_seconds"] as const
      const optionalValues: Record<string, unknown> = {
        max_players: maxPlayers,
        category: selectedCategory,
        language: roomLanguage,
        round_duration_seconds: practiceRoundSeconds,
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
        setError(t.failedCreate(msg))
        setIsLoading(false)
        return
      }

      const { error: patchErr } = await supabase
        .from("game_rooms")
        .update({
          language: roomLanguage,
          category: selectedCategory,
          max_players: maxPlayers,
          round_duration_seconds: practiceRoundSeconds,
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
        practice_hints_enabled: practiceHintsEnabled,
      }))
      router.push(formLocale === "ro" ? `/ro/game/${newRoomCode}` : `/game/${newRoomCode}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("Create room exception:", err)
      setError(t.failedCreate(msg))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleJoinRoom() {
    const nameErr = validatePlayerName(playerName, t)
    if (nameErr) {
      setNameFieldError(nameErr)
      return
    }
    if (!roomCode.trim() || roomCode.trim().length !== 4) {
      setError(t.roomCodeInvalid)
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
        setError(t.roomNotFound)
        setIsLoading(false)
        return
      }

      if (!JOINABLE_GAME_STATUSES.has(room.game_status)) {
        setError(t.cannotJoinNow)
        setIsLoading(false)
        return
      }

      if (isDisplayNameTakenInRoom(room as RoomRowForNameCheck, playerName)) {
        setNameFieldError(t.nameTaken)
        setIsLoading(false)
        return
      }

      const mx = room.max_players ?? 4
      const playerSlot = pickJoinPlayerSlot(room, mx)
      if (playerSlot === null) {
        setError(t.roomFull)
        setIsLoading(false)
        return
      }

      const updateFields: Record<string, unknown> = {
        [`player${playerSlot}_id`]: playerId,
        [`player${playerSlot}_name`]: playerName.trim(),
        [`player${playerSlot}_score`]: 0,
        [`player${playerSlot}_ready`]: false,
      }

      if ((room.game_status === "playing" || room.game_status === "round_end") && room.current_word) {
        updateFields[`player${playerSlot}_progress`] = "_".repeat(room.current_word.length)
      }

      const { error: updateError } = await supabase
        .from("game_rooms").update(updateFields).eq("room_code", upperCode)
      if (updateError) {
        const msg = (updateError as { message?: string }).message ?? JSON.stringify(updateError)
        console.error("Join room error:", msg, updateError)
        if (msg.includes("player3") || msg.includes("player4")) {
          setError(t.migration34)
        } else {
          setError(t.failedJoin(msg))
        }
        setIsLoading(false)
        return
      }

      localStorage.setItem("wordmatch_player", JSON.stringify({
        id: playerId,
        name: playerName.trim(),
        roomCode: upperCode,
        playerSlot,
        practice_hints_enabled: practiceHintsEnabled,
      }))
      router.push(formLocale === "ro" ? `/ro/game/${upperCode}` : `/game/${upperCode}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("Join room exception:", err)
      setError(t.failedJoin(msg))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 md:col-span-7" lang={formLocale === "ro" ? "ro" : "en"}>
      <Card className="border-2 md:shadow-md">
        <CardHeader className="pb-4">
          <CardTitle>{t.cardTitle}</CardTitle>
          <CardDescription>{t.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="playerName"
              className={cn("text-sm font-medium", nameFieldError && "text-destructive")}
            >
              {t.yourName}
            </label>
            <Input
              id="playerName"
              placeholder={t.nicknamePlaceholder}
              value={playerName}
              aria-invalid={!!nameFieldError}
              aria-describedby={nameFieldError ? "playerName-error" : undefined}
              onChange={(e) => {
                setPlayerName(e.target.value)
                setError("")
                setNameFieldError("")
              }}
              maxLength={15}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return
                if (activeTab === "create") void handlePracticeSolo()
                else void handleJoinRoom()
              }}
            />
            {nameFieldError ? (
              <p id="playerName-error" className="text-xs text-destructive font-medium" role="alert">
                {nameFieldError}
              </p>
            ) : null}
          </div>

          {activeTab === "create" && (
            <div className="space-y-2">
              <label htmlFor="categorySelect" className="text-sm font-medium">{t.category}</label>
              <select
                id="categorySelect"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as CategoryKey)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {(Object.entries(CATEGORIES) as [CategoryKey, { category: string; emoji: string }][]).map(([key, { category, emoji }]) => (
                  <option key={key} value={key}>
                    {categoryLabelForLocale(key, category, emoji, formLocale)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === "create" && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t.definitionLanguage}</p>
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label={t.definitionLanguageAria}
              >
                {(Object.entries(LANGUAGES) as [LanguageKey, { label: string }][]).map(([key, { label }]) => (
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
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "create" && (
            <div className="space-y-2">
              <label htmlFor="maxRounds" className="text-sm font-medium">
                {t.numberOfRounds}{" "}
                <span className="text-muted-foreground font-normal">{t.roundsMinHint}</span>
              </label>
              <Input
                id="maxRounds"
                type="number"
                min={1}
                placeholder={t.roundsPlaceholder}
                value={maxRoundsInput}
                onChange={(e) => {
                  const raw = e.target.value
                  setMaxRoundsInput(raw)
                  const val = parseInt(raw, 10)
                  if (!raw.trim() || isNaN(val) || val <= 0) {
                    setRoundsError(t.roundsMin1)
                  } else {
                    setRoundsError("")
                  }
                }}
                className={cn("text-center font-bold", roundsError && "border-destructive focus-visible:ring-destructive")}
              />
              {roundsError && (
                <p className="text-xs text-destructive">{roundsError}</p>
              )}
              <div className="space-y-2 pt-1">
                <p className="text-sm font-medium">{t.roundTimer}</p>

                <ToggleGroup
                  type="single"
                  value={String(practiceRoundSeconds)}
                  onValueChange={(v) => {
                    if (v !== "30" && v !== "60") return
                    const sec = Number(v) as PracticeRoundTimerSeconds
                    setPracticeRoundSeconds(sec)
                    persistPracticeRoundSecondsPartial(sec)
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  aria-label={t.roundTimerAria}
                >
                  <ToggleGroupItem value="30" className="flex-1 text-xs sm:text-sm">
                    {t.sec30}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="60" className="flex-1 text-xs sm:text-sm">
                    {t.sec60}
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="space-y-2 pt-1">
                <p id="home-letter-hints-label" className="text-sm font-medium">
                  {t.letterHints}
                </p>
                <div className="flex w-full items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2.5">
                  <p
                    id="home-practice-hints-desc"
                    className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground"
                  >
                    {t.letterHintsHint}
                  </p>
                  <Switch
                    id="home-practice-hints"
                    checked={practiceHintsEnabled}
                    onCheckedChange={(on) => {
                      setPracticeHintsEnabled(on)
                      persistPracticeHintsEnabledPartial(on)
                    }}
                    className="shrink-0"
                    aria-labelledby="home-letter-hints-label"
                    aria-describedby="home-practice-hints-desc"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "create" && (
            <>
              <Button
                variant="default"
                className="w-full bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500/40 dark:bg-green-600 dark:hover:bg-green-700"
                size="lg"
                onClick={handlePracticeSolo}
                disabled={isLoading}
              >
                <Zap className="w-4 h-4 mr-2" />
                {t.practiceSolo}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t.multiplayerDivider}</span>
                </div>
              </div>
            </>
          )}

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
              <TabsTrigger value="create">{t.createRoomTab}</TabsTrigger>
              <TabsTrigger value="join">{t.joinRoomTab}</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4 pt-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">{t.numberOfPlayers}</p>
                <div className="flex gap-2">
                  {([2, 3, 4] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMaxPlayers(n)}
                      aria-pressed={maxPlayers === n}
                      aria-label={t.playerCountButtonAria(n)}
                      className={cn(
                        "flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all",
                        maxPlayers === n
                          ? "border-[3px] border-blue-500 text-foreground bg-transparent"
                          : "border-2 border-muted bg-muted/40 text-muted-foreground hover:border-muted-foreground/40"
                      )}
                    >
                      {n}
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
                  {t.shareCodeWithFriends(maxPlayers)}
                </p>
              </div>

              <Button className="w-full" size="lg" onClick={handleCreateRoom} disabled={isLoading}>
                {isLoading ? t.creating : t.createRoomButton(maxPlayers)}
              </Button>
              <div
                className="space-y-1 min-h-[1.25rem]"
                aria-live="polite"
                aria-label={t.createRoomValidationAria}
              >
                {nameFieldError ? (
                  <p className="text-xs text-destructive text-center font-medium" role="alert">
                    {nameFieldError}
                  </p>
                ) : null}
                {roundsError ? (
                  <p className="text-xs text-destructive text-center font-medium" role="alert">
                    {roundsError}
                  </p>
                ) : null}
              </div>
            </TabsContent>

            <TabsContent value="join" className="space-y-4 pt-4">
              <div className="space-y-2">
                <label htmlFor="roomCode" className="text-sm font-medium">{t.roomCode}</label>
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
                {isLoading ? t.joining : t.joinGame}
              </Button>
            </TabsContent>
          </Tabs>

          {error && (
            <p className="text-sm text-destructive text-center font-medium">{error}</p>
          )}
        </CardContent>
      </Card>

      <HomeHowToPlayCard className="border md:shadow-sm md:hidden" strings={howToPlay} />
    </div>
  )
}
