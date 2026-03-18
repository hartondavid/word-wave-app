"use client"

import { useEffect, useState, useCallback, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { GameRoom, PlayerSlot } from "@/lib/game-types"
import { ROUND_DURATION, WIN_SCORE, TOTAL_ROUNDS, PLAYER_COLORS } from "@/lib/game-types"
import { fetchWordPair, tryPlaceLetter, isWordComplete } from "@/lib/words"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { Copy, Check, Timer, Trophy, ArrowLeft, Swords } from "lucide-react"
import Confetti from "react-confetti"

interface PlayerInfo {
  id: string
  name: string
  roomCode: string
  playerSlot: PlayerSlot
}

interface GamePageProps {
  params: Promise<{ roomCode: string }>
}

// ── slot helpers ──────────────────────────────────────────────────────────────

function slotData(slot: PlayerSlot, room: GameRoom) {
  const m = {
    1: { id: room.player1_id, name: room.player1_name, score: room.player1_score ?? 0, progress: room.player1_progress, ready: room.player1_ready },
    2: { id: room.player2_id, name: room.player2_name, score: room.player2_score ?? 0, progress: room.player2_progress, ready: room.player2_ready },
    3: { id: room.player3_id, name: room.player3_name, score: room.player3_score ?? 0, progress: room.player3_progress, ready: room.player3_ready },
    4: { id: room.player4_id, name: room.player4_name, score: room.player4_score ?? 0, progress: room.player4_progress, ready: room.player4_ready },
  }
  return m[slot]
}

function activeSlots(room: GameRoom): PlayerSlot[] {
  return ([1, 2, 3, 4] as PlayerSlot[]).filter(s => !!slotData(s, room).id)
}

function isFull(room: GameRoom): boolean {
  return activeSlots(room).length >= (room.max_players ?? 2)
}

function allReady(room: GameRoom): boolean {
  const a = activeSlots(room)
  return a.length >= 2 && a.every(s => slotData(s, room).ready)
}

// ── component ─────────────────────────────────────────────────────────────────

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
  // tracks which positions just received a new enemy hit (for pulse)
  const [newEnemyHits, setNewEnemyHits] = useState<Set<number>>(new Set())
  const prevProgressRef = useRef<Record<number, string>>({})
  const startGameRef = useRef(false)
  const router = useRouter()
  const supabase = createClient()

  // ── effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const stored = localStorage.getItem("wordmatch_player")
    if (!stored) { router.push("/"); return }
    const parsed = JSON.parse(stored)
    if (parsed.roomCode === roomCode) setPlayerInfo(parsed)
    else router.push("/")
  }, [roomCode, router])

  useEffect(() => {
    supabase.from("game_rooms").select("*").eq("room_code", roomCode).single()
      .then(({ data }) => { if (data) setRoom(data); setIsLoading(false) })
  }, [roomCode, supabase])

  useEffect(() => {
    const ch = supabase
      .channel(`room-${roomCode}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "game_rooms", filter: `room_code=eq.${roomCode}` },
        (payload) => {
          if (payload.eventType !== "UPDATE" && payload.eventType !== "INSERT") return
          const r = payload.new as GameRoom
          setRoom(prev => {
            // Detect new enemy hits for pulse animation
            if (prev?.game_status === "playing") {
              const newHits = new Set<number>()
              ;([1, 2, 3, 4] as PlayerSlot[]).forEach(s => {
                const oldP = slotData(s, prev).progress ?? ""
                const newP = slotData(s, r).progress ?? ""
                for (let i = 0; i < newP.length; i++) {
                  if (oldP[i] === "_" && newP[i] !== "_") newHits.add(i)
                }
              })
              if (newHits.size > 0) {
                setNewEnemyHits(newHits)
                setTimeout(() => setNewEnemyHits(new Set()), 600)
              }
            }
            return r
          })
          if (r.game_status === "round_end" && r.round_winner) {
            setShowConfetti(true)
            setTimeout(() => setShowConfetti(false), 3000)
          }
          if (r.game_status === "playing") setLastPlacedIndex(null)
        })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [roomCode, supabase])

  // Watch for all players ready → start game
  useEffect(() => {
    if (!room || !playerInfo) return
    if (room.game_status !== "waiting") return
    if (!isFull(room) || !allReady(room) || startGameRef.current) return
    startGameRef.current = true
    startNewRound()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    room?.player1_ready, room?.player2_ready, room?.player3_ready, room?.player4_ready,
    room?.player1_id, room?.player2_id, room?.player3_id, room?.player4_id,
    room?.game_status,
  ])

  // Timer countdown
  useEffect(() => {
    if (room?.game_status !== "playing" || !room.round_end_time) return
    const iv = setInterval(() => {
      const rem = Math.max(0, Math.ceil((new Date(room.round_end_time!).getTime() - Date.now()) / 1000))
      setTimeRemaining(rem)
      if (rem === 0) handleTimerEnd()
    }, 100)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.round_end_time, room?.game_status])

  // Keyboard input
  useEffect(() => {
    if (room?.game_status !== "playing" || !room.current_word) return
    const onKey = (e: KeyboardEvent) => { if (/^[a-zA-Z]$/.test(e.key)) handleLetterInput(e.key) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    room?.game_status, room?.current_word,
    room?.player1_progress, room?.player2_progress, room?.player3_progress, room?.player4_progress,
    playerInfo,
  ])

  // ── derived values ─────────────────────────────────────────────────────────

  const mySlot = (playerInfo?.playerSlot ?? 1) as PlayerSlot
  const myName = room ? slotData(mySlot, room).name : null

  // ── handlers ───────────────────────────────────────────────────────────────

  const handleLetterInput = useCallback(async (letter: string) => {
    if (!room || !playerInfo || room.game_status !== "playing" || !room.current_word) return
    const cur = slotData(mySlot, room).progress
    if (!cur) return
    const next = tryPlaceLetter(letter, cur, room.current_word)
    if (next) {
      for (let i = 0; i < next.length; i++) {
        if (cur[i] === "_" && next[i] !== "_") { setLastPlacedIndex(i); break }
      }
      const pf = `player${mySlot}_progress`
      if (isWordComplete(next)) {
        const sf = `player${mySlot}_score`
        const newScore = (slotData(mySlot, room).score ?? 0) + 1
        const isOver = newScore >= WIN_SCORE || room.current_round >= TOTAL_ROUNDS
        await supabase.from("game_rooms").update({
          [pf]: next,
          [sf]: newScore,
          round_winner: slotData(mySlot, room).name!,
          game_status: isOver ? "finished" : "round_end",
        }).eq("room_code", roomCode)
      } else {
        await supabase.from("game_rooms").update({ [pf]: next }).eq("room_code", roomCode)
      }
    } else {
      setIsShaking(true)
      setTimeout(() => setIsShaking(false), 500)
    }
  }, [room, mySlot, roomCode, supabase, playerInfo])

  async function handleTimerEnd() {
    if (!room) return
    await supabase.from("game_rooms").update({
      round_winner: null,
      game_status: room.current_round >= TOTAL_ROUNDS ? "finished" : "round_end",
    }).eq("room_code", roomCode)
  }

  async function handleToggleReady() {
    if (!room || !playerInfo) return
    await supabase.from("game_rooms")
      .update({ [`player${mySlot}_ready`]: !slotData(mySlot, room).ready })
      .eq("room_code", roomCode)
  }

  async function startNewRound() {
    if (!room) return
    const word = await fetchWordPair()
    const init = "_".repeat(word.word.length)
    const active = activeSlots(room)

    // Build update payload dynamically — only include player3/4 columns when
    // those slots are actually occupied (i.e. migration 005 has been applied).
    const update: Record<string, unknown> = {
      current_word: word.word,
      current_definition: word.definition,
      player1_progress: active.includes(1) ? init : null,
      player2_progress: active.includes(2) ? init : null,
      player1_ready: false,
      player2_ready: false,
      round_winner: null,
      game_status: "playing",
      current_round: (room.current_round ?? 0) + 1,
      round_end_time: new Date(Date.now() + ROUND_DURATION * 1000).toISOString(),
    }

    if (active.includes(3) || active.includes(4)) {
      update.player3_progress = active.includes(3) ? init : null
      update.player4_progress = active.includes(4) ? init : null
      update.player3_ready = false
      update.player4_ready = false
    }

    await supabase.from("game_rooms").update(update).eq("room_code", roomCode)
  }

  async function handlePlayAgain() {
    startGameRef.current = false
    prevProgressRef.current = {}
    const active = activeSlots(room!)

    const reset: Record<string, unknown> = {
      player1_score: 0, player2_score: 0,
      player1_ready: false, player2_ready: false,
      player1_progress: null, player2_progress: null,
      current_round: 0, game_status: "waiting",
      current_word: null, current_definition: null,
      round_winner: null,
    }

    if (active.some(s => s >= 3)) {
      reset.player3_score = 0
      reset.player4_score = 0
      reset.player3_ready = false
      reset.player4_ready = false
      reset.player3_progress = null
      reset.player4_progress = null
    }

    await supabase.from("game_rooms").update(reset).eq("room_code", roomCode)
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── render helpers ─────────────────────────────────────────────────────────

  function renderPlayerTopBar() {
    if (!room) return null
    const active = activeSlots(room)
    return (
      <div className="w-full">
        <div className="flex flex-wrap gap-2 justify-center">
          {active.map(slot => {
            const d = slotData(slot, room)
            const isMe = slot === mySlot
            const color = PLAYER_COLORS[slot - 1]
            return (
              <div
                key={slot}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all duration-200",
                  isMe ? "scale-[1.04] shadow-sm" : "opacity-65"
                )}
                style={{
                  borderColor: isMe ? color : "transparent",
                  background: `${color}${isMe ? "18" : "08"}`,
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight truncate max-w-[80px]">
                    {d.name ?? `P${slot}`}
                    {isMe && <span className="font-normal text-xs text-muted-foreground"> (you)</span>}
                  </p>
                  <p className="text-xs font-bold" style={{ color }}>{d.score} pts</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderWordMask() {
    if (!room?.current_word) return null
    const myProg = slotData(mySlot, room).progress ?? ""
    const active = activeSlots(room)

    return (
      <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
        {room.current_word.split("").map((_, i) => {
          const ch = myProg[i] ?? "_"
          const filled = ch !== "_"
          const isLast = i === lastPlacedIndex
          const isNewHit = newEnemyHits.has(i)

          // Other players who have hit this position
          const enemyHits = active
            .filter(s => s !== mySlot)
            .filter(s => {
              const p = slotData(s, room).progress
              return p && p[i] !== "_"
            })

          return (
            <div
              key={i}
              className={cn(
                "relative flex items-center justify-center overflow-hidden select-none transition-all duration-200",
                "w-12 h-[60px] sm:w-[72px] sm:h-[88px] rounded-xl border-2",
                filled
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-muted-foreground/20 bg-muted/30",
                isLast && "scale-110 ring-2 ring-emerald-500 ring-offset-2 z-10",
                isNewHit && !filled && "animate-[hitPulse_0.5s_ease-out]"
              )}
            >
              {/* Vertical colored stripes for enemy hits (behind letter) */}
              {!filled && enemyHits.map((slot, idx) => (
                <div
                  key={slot}
                  className="absolute top-0 bottom-0 transition-all duration-300"
                  style={{
                    width: 3,
                    background: PLAYER_COLORS[slot - 1],
                    left: 8 + idx * 9,
                  }}
                />
              ))}

              {/* My letter or placeholder */}
              {filled
                ? <span className="relative z-10 text-xl sm:text-3xl font-black text-emerald-600">{ch}</span>
                : <span className="text-muted-foreground/20 text-base sm:text-xl select-none">_</span>
              }
            </div>
          )
        })}
      </div>
    )
  }

  // ── page states ────────────────────────────────────────────────────────────

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
          <ArrowLeft className="w-4 h-4 mr-2" />Back Home
        </Button>
      </div>
    )
  }

  // ── FINISHED ──────────────────────────────────────────────────────────────

  if (room.game_status === "finished") {
    const sorted = activeSlots(room)
      .map(s => ({ slot: s, name: slotData(s, room).name!, score: slotData(s, room).score }))
      .sort((a, b) => b.score - a.score)
    const topScore = sorted[0]?.score ?? 0
    const isTie = sorted.filter(p => p.score === topScore).length > 1
    const winnerName = isTie ? null : sorted[0]?.name
    const iWon = winnerName === myName

    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/30">
        {iWon && <Confetti recycle={false} numberOfPieces={300} />}
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className={cn(
              "w-20 h-20 mx-auto rounded-full flex items-center justify-center",
              iWon ? "bg-amber-500/20" : "bg-muted"
            )}>
              <Trophy className={cn("w-10 h-10", iWon ? "text-amber-500" : "text-muted-foreground")} />
            </div>
            <h2 className="text-2xl font-bold">
              {winnerName ? `${winnerName} Wins!` : "It's a Tie!"}
            </h2>
            <div className="space-y-2">
              {sorted.map((p, idx) => (
                <div key={p.slot} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold text-muted-foreground w-5 text-right">#{idx + 1}</span>
                    <div className="w-3 h-3 rounded-full" style={{ background: PLAYER_COLORS[p.slot - 1] }} />
                    <span className="font-semibold">{p.name}{p.name === myName ? " (You)" : ""}</span>
                  </div>
                  <span className="font-bold text-lg">{p.score} pts</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />Home
              </Button>
              <Button onClick={handlePlayAgain}>Play Again</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    )
  }

  // ── WAITING (room not full) ────────────────────────────────────────────────

  if (room.game_status === "waiting" && !isFull(room)) {
    const maxP = room.max_players ?? 2
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/30">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Swords className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Waiting for Players</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {activeSlots(room).length} / {maxP} joined
              </p>
            </div>
            <div className="space-y-2">
              {Array.from({ length: maxP }).map((_, i) => {
                const s = (i + 1) as PlayerSlot
                const d = slotData(s, room)
                return (
                  <div key={s} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted/40">
                    <div
                      className="w-3 h-3 rounded-full transition-all duration-300"
                      style={{ background: PLAYER_COLORS[i], opacity: d.id ? 1 : 0.25 }}
                    />
                    <span className={cn("text-sm font-medium", !d.id && "text-muted-foreground/40 italic")}>
                      {d.name ?? `Waiting for player ${s}…`}
                    </span>
                    {d.id && <Check className="w-4 h-4 text-emerald-500 ml-auto" />}
                  </div>
                )
              })}
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Room Code</p>
              <div className="flex items-center justify-center gap-2">
                <div className="text-4xl font-mono font-bold tracking-[0.3em] bg-muted px-6 py-3 rounded-xl">
                  {roomCode}
                </div>
                <Button variant="outline" size="icon" onClick={handleCopyCode}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Spinner className="w-4 h-4" /> Waiting for players…
            </div>
            <Button variant="ghost" onClick={() => router.push("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />Leave Room
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  // ── READY CHECK ───────────────────────────────────────────────────────────

  if (room.game_status === "waiting" && isFull(room)) {
    const myReady = slotData(mySlot, room).ready
    const active = activeSlots(room)
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/30">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Swords className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Ready to Duel?</h2>
              <p className="text-sm text-muted-foreground mt-1">All players must be ready to start</p>
            </div>
            <div className={cn(
              "grid gap-3",
              active.length <= 2 ? "grid-cols-2" : active.length === 3 ? "grid-cols-3" : "grid-cols-2"
            )}>
              {active.map(slot => {
                const d = slotData(slot, room)
                return (
                  <div
                    key={slot}
                    className={cn(
                      "p-3 rounded-xl border-2 text-center transition-all",
                      d.ready ? "border-emerald-500 bg-emerald-500/10" : "border-muted"
                    )}
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PLAYER_COLORS[slot - 1] }} />
                      <p className="font-semibold text-sm truncate">{d.name}</p>
                    </div>
                    <p className={cn("text-xs font-medium", d.ready ? "text-emerald-600" : "text-muted-foreground")}>
                      {d.ready ? "Ready!" : "Not ready"}
                    </p>
                  </div>
                )
              })}
            </div>
            <Button
              className="w-full" size="lg"
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

  // ── ROUND END ─────────────────────────────────────────────────────────────

  if (room.game_status === "round_end") {
    const iWonRound = room.round_winner === myName
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/30">
        {showConfetti && iWonRound && <Confetti recycle={false} numberOfPieces={150} />}
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-5">
            {room.round_winner ? (
              <>
                <div className={cn(
                  "w-16 h-16 mx-auto rounded-full flex items-center justify-center",
                  iWonRound ? "bg-amber-500/20" : "bg-muted"
                )}>
                  <Trophy className={cn("w-8 h-8", iWonRound ? "text-amber-500" : "text-muted-foreground")} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    {iWonRound ? "You Win This Round!" : `${room.round_winner} Wins!`}
                  </h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    The word was:{" "}
                    <span className="font-bold text-foreground">{room.current_word?.toUpperCase()}</span>
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
                  <p className="text-muted-foreground mt-1 text-sm">
                    The word was:{" "}
                    <span className="font-bold text-foreground">{room.current_word?.toUpperCase()}</span>
                  </p>
                </div>
              </>
            )}
            <div className="flex justify-center gap-5 flex-wrap py-1">
              {activeSlots(room).map(slot => {
                const d = slotData(slot, room)
                return (
                  <div key={slot} className="text-center">
                    <div className="flex items-center gap-1 justify-center mb-0.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PLAYER_COLORS[slot - 1] }} />
                      <p className="text-xs text-muted-foreground truncate max-w-[72px]">{d.name}</p>
                    </div>
                    <p className="text-2xl font-bold">{d.score}</p>
                  </div>
                )
              })}
            </div>
            <p className="text-sm text-muted-foreground">Round {room.current_round} of {TOTAL_ROUNDS}</p>
            <Button className="w-full" size="lg" onClick={() => startNewRound()}>Next Round</Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────

  return (
    <main
      className={cn(
        "min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/30 outline-none",
        isShaking && "animate-[shake_0.3s_ease-in-out]"
      )}
      tabIndex={0}
    >
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b px-4 pt-3 pb-3 space-y-3">
        {/* Row: Exit · Round · Timer */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-1" />Exit
          </Button>
          <span className="text-sm font-medium text-muted-foreground">
            Round {room.current_round}/{TOTAL_ROUNDS}
          </span>
          <div className={cn(
            "flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg",
            timeRemaining <= 10 ? "bg-destructive/10 text-destructive animate-pulse" : "bg-muted"
          )}>
            <Timer className="w-3.5 h-3.5" />{timeRemaining}s
          </div>
        </div>

        {/* Player top bar */}
        {renderPlayerTopBar()}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pt-5 pb-6 max-w-2xl mx-auto w-full gap-5">

        {/* Definition */}
        <Card className="w-full shadow-sm">
          <CardContent className="pt-5 pb-5">
            <p className="text-base sm:text-lg text-center leading-relaxed text-balance">
              {room.current_definition}
            </p>
          </CardContent>
        </Card>

        {/* Word mask */}
        {renderWordMask()}

        {/* Legend */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">Press letter keys on your keyboard to guess!</p>
          {activeSlots(room).filter(s => s !== mySlot).length > 0 && (
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/55 flex-wrap">
              {activeSlots(room).filter(s => s !== mySlot).map(s => (
                <span key={s} className="flex items-center gap-1">
                  <span
                    className="inline-block w-[3px] h-3.5 rounded-full"
                    style={{ background: PLAYER_COLORS[s - 1] }}
                  />
                  {slotData(s, room).name}
                </span>
              ))}
              <span className="italic">= rival progress</span>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        @keyframes hitPulse {
          0%   { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.5); }
          60%  { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
          100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
      `}</style>
    </main>
  )
}
