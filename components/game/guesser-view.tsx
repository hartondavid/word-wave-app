"use client"

import { Player, GameRoom } from "@/lib/game-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, HelpCircle, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface GuesserViewProps {
  room: GameRoom
  players: Player[]
  timeRemaining: number
  currentPlayerName: string
}

export function GuesserView({ 
  room, 
  players, 
  timeRemaining, 
  currentPlayerName 
}: GuesserViewProps) {
  const isLowTime = timeRemaining <= 10
  const clueGiver = players.find(p => p.id === room.current_clue_giver)

  return (
    <div className="min-h-screen flex flex-col p-4 bg-gradient-to-b from-background to-secondary/30">
      {/* Header with Timer */}
      <div className="flex items-center justify-between mb-6">
        <Badge variant="outline" className="text-base px-3 py-1">
          Round {room.round_number}
        </Badge>
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full font-mono text-xl font-bold",
          isLowTime ? "bg-destructive/10 text-destructive animate-pulse" : "bg-primary/10 text-primary"
        )}>
          <Clock className="w-5 h-5" />
          {timeRemaining}s
        </div>
      </div>

      {/* Your Role */}
      <Card className="mb-4 border-accent border-2 bg-accent/5">
        <CardContent className="py-3 text-center">
          <p className="text-sm text-muted-foreground">You are a</p>
          <p className="text-xl font-bold text-accent-foreground">Guesser</p>
        </CardContent>
      </Card>

      {/* Clue Giver Info */}
      <Card className="mb-4">
        <CardContent className="py-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Clue Giver</p>
            <p className="font-semibold text-lg">{clueGiver?.player_name || "..."}</p>
          </div>
        </CardContent>
      </Card>

      {/* Main Card - Mystery Word */}
      <Card className="flex-1 flex flex-col mb-4">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
            Listen and Guess
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <HelpCircle className="w-16 h-16 text-primary" />
          </div>
          <p className="text-xl text-center text-muted-foreground text-balance">
            Listen to {clueGiver?.player_name}{"'"}s clues and shout out your guess!
          </p>
        </CardContent>
      </Card>

      {/* Hint about forbidden words */}
      <Card className="mb-4 bg-muted/50">
        <CardContent className="py-3 text-center text-sm text-muted-foreground">
          The clue giver cannot use 5 forbidden words related to the answer!
        </CardContent>
      </Card>

      {/* Scoreboard */}
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-sm">Scores</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex flex-wrap gap-2">
            {players
              .sort((a, b) => b.score - a.score)
              .map((player) => (
                <Badge 
                  key={player.id} 
                  variant={player.player_name === currentPlayerName ? "default" : "secondary"} 
                  className="text-sm"
                >
                  {player.player_name}: {player.score}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
