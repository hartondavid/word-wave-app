"use client"

import { Player } from "@/lib/game-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Copy, Check, Users, Crown } from "lucide-react"
import { useState } from "react"

interface LobbyProps {
  roomCode: string
  players: Player[]
  isHost: boolean
  onStartGame: () => void
  isStarting: boolean
}

export function Lobby({ roomCode, players, isHost, onStartGame, isStarting }: LobbyProps) {
  const [copied, setCopied] = useState(false)

  function copyRoomCode() {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canStart = players.length >= 2

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/30">
      <div className="w-full max-w-md space-y-6">
        {/* Room Code Card */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader className="pb-2 text-center">
            <CardDescription>Room Code</CardDescription>
            <CardTitle className="text-5xl font-mono tracking-[0.3em]">{roomCode}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={copyRoomCode}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Players Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Players
              </CardTitle>
              <Badge variant="secondary">{players.length} joined</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium">{player.name}</span>
                </div>
                {player.is_host && (
                  <Badge variant="outline" className="gap-1">
                    <Crown className="w-3 h-3" />
                    Host
                  </Badge>
                )}
              </div>
            ))}

            {players.length < 2 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Waiting for more players to join...
              </p>
            )}
          </CardContent>
        </Card>

        {/* Start Game Button */}
        {isHost ? (
          <div className="space-y-2">
            <Button
              className="w-full"
              size="lg"
              onClick={onStartGame}
              disabled={!canStart || isStarting}
            >
              {isStarting ? "Starting..." : "Start Game"}
            </Button>
            {!canStart && (
              <p className="text-sm text-muted-foreground text-center">
                Need at least 2 players to start
              </p>
            )}
          </div>
        ) : (
          <Card className="bg-muted/50">
            <CardContent className="py-4 text-center text-muted-foreground">
              Waiting for host to start the game...
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
