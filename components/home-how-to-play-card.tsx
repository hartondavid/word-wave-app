import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function HomeHowToPlayCard({ className }: { className?: string }) {
  return (
    <Card className={cn(className)}>
      <CardContent className="space-y-2 pt-4 pb-4 text-sm text-muted-foreground">
        <h2 className="mb-2 text-sm font-semibold text-foreground">How to Play</h2>
        <p>
          <span className="font-semibold text-foreground">1.</span> All players see the same word definition
        </p>
        <p>
          <span className="font-semibold text-foreground">2.</span> Press letter keys to fill in the word
        </p>
        <p>
          <span className="font-semibold text-foreground">3.</span> Colored lines show enemy progress
        </p>
        <p>
          <span className="font-semibold text-foreground">4.</span> First to complete the word wins the round!
        </p>
      </CardContent>
    </Card>
  )
}
