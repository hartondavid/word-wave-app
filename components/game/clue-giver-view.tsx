"use client"

import { Player, GameRoom } from "@/lib/game-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Check, X, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface ClueGiverViewProps {
  room: GameRoom
  players: Player[]
  timeRemaining: number
  onCorrectGuess: () => void
  onSkipWord: () => void
}

export function ClueGiverView({ 
  room, 
  players, 
  timeRemaining, 
  onCorrectGuess, 
  onSkipWord 
}: ClueGiverViewProps) {
  const isLowTime = timeRemaining <= 10

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
      <Card className="mb-4 border-primary border-2 bg-primary/5">
        <CardContent className="py-3 text-center">
          <p className="text-sm text-muted-foreground">You are the</p>
          <p className="text-xl font-bold text-primary">Clue Giver</p>
        </CardContent>
      </Card>

      {/* Main Word Card */}
      <Card className="flex-1 flex flex-col mb-4">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">
            Describe this word
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center">
          <div className="text-4xl md:text-5xl font-bold text-center mb-8 text-balance">
            {room.current_word}
          </div>

          {/* Taboo Words */}
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-2 mb-3 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Don't say these words:</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {room.taboo_words?.map((word, index) => (
                <div
                  key={index}
                  className="px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-center font-medium text-destructive"
                >
                  {word}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="lg"
          className="h-14 border-destructive/50 text-destructive hover:bg-destructive/10"
          onClick={onSkipWord}
        >
          <X className="w-5 h-5 mr-2" />
          Skip
        </Button>
        <Button
          size="lg"
          className="h-14 bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={onCorrectGuess}
        >
          <Check className="w-5 h-5 mr-2" />
          Got It!
        </Button>
      </div>

      {/* Scoreboard */}
      <Card className="mt-4">
        <CardHeader className="py-2">
          <CardTitle className="text-sm">Scores</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex flex-wrap gap-2">
            {players
              .sort((a, b) => b.score - a.score)
              .map((player) => (
                <Badge key={player.id} variant="secondary" className="text-sm">
                  {player.player_name}: {player.score}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
