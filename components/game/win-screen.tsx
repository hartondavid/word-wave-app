"use client"

import { useEffect, useState } from "react"
import { Player } from "@/lib/game-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Medal, Star, Home } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface WinScreenProps {
  players: Player[]
  currentPlayerName: string
}

interface Confetti {
  id: number
  left: number
  delay: number
  color: string
}

export function WinScreen({ players, currentPlayerName }: WinScreenProps) {
  const router = useRouter()
  const [confetti, setConfetti] = useState<Confetti[]>([])
  
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  const winner = sortedPlayers[0]
  const isCurrentPlayerWinner = winner?.player_name === currentPlayerName

  useEffect(() => {
    // Generate confetti
    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"]
    const newConfetti: Confetti[] = []
    for (let i = 0; i < 50; i++) {
      newConfetti.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }
    setConfetti(newConfetti)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/30 relative overflow-hidden">
      {/* Confetti Animation */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 rounded-sm animate-bounce"
          style={{
            left: `${piece.left}%`,
            top: "-20px",
            backgroundColor: piece.color,
            animation: `fall 3s linear ${piece.delay}s infinite`,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>

      <div className="w-full max-w-md space-y-6 z-10">
        {/* Winner Announcement */}
        <Card className="border-2 border-primary bg-primary/5 text-center">
          <CardHeader>
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-2">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {isCurrentPlayerWinner ? "You Win!" : `${winner?.player_name} Wins!`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-primary">{winner?.score} points</p>
            {isCurrentPlayerWinner && (
              <div className="flex items-center justify-center gap-1 mt-2 text-muted-foreground">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span>WordMatch Champion!</span>
                <Star className="w-4 h-4 fill-primary text-primary" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Final Standings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Final Standings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg",
                  index === 0 ? "bg-primary/10 border border-primary/20" :
                  index === 1 ? "bg-secondary" :
                  "bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    {index === 0 ? (
                      <Trophy className="w-6 h-6 text-primary" />
                    ) : index === 1 ? (
                      <Medal className="w-6 h-6 text-muted-foreground" />
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>
                    )}
                  </div>
                  <span className={cn(
                    "font-medium",
                    player.player_name === currentPlayerName && "text-primary"
                  )}>
                    {player.player_name}
                    {player.player_name === currentPlayerName && " (You)"}
                  </span>
                </div>
                <span className="font-bold">{player.score} pts</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Play Again Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={() => router.push("/")}
        >
          <Home className="w-5 h-5 mr-2" />
          Play Again
        </Button>
      </div>
    </div>
  )
}
