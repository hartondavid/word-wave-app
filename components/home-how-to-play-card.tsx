import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { HowToPlayStrings } from "@/lib/home-play-form-strings"

export function HomeHowToPlayCard({
  className,
  strings,
}: {
  className?: string
  strings: HowToPlayStrings
}) {
  const steps = [strings.step1, strings.step2, strings.step3, strings.step4] as const
  return (
    <Card className={cn(className)}>
      <CardContent className="space-y-2 pt-4 pb-4 text-sm text-muted-foreground">
        <h2 className="mb-2 text-sm font-semibold text-foreground">{strings.title}</h2>
        {steps.map((text, i) => (
          <p key={i}>
            <span className="font-semibold text-foreground">{i + 1}.</span> {text}
          </p>
        ))}
      </CardContent>
    </Card>
  )
}
