import { Swords, Timer, Trophy } from "lucide-react"
import { PwaClient } from "@/components/pwa-client"
import { HomeHowToPlayCard } from "@/components/home-how-to-play-card"

const STATS = [
  { icon: Swords, label: "2–4 jucători" },
  { icon: Timer, label: "Runde de 60s" },
  { icon: Trophy, label: "1–? runde" },
] as const

export function HomeHeroRo() {
  return (
    <div className="flex flex-col gap-6 md:col-span-5">
      <div className="space-y-3 text-center md:text-left">
        <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
          Fii primul care ghicește cuvântul
        </h1>

        <p className="mx-auto max-w-prose text-base text-muted-foreground md:mx-0 md:text-lg">
          Aceeași definiție pentru toți. Până la 4 jucători — cel mai rapid câștigă runda.
        </p>
        <PwaClient className="justify-center md:justify-start" />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center md:gap-4">
        {STATS.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="rounded-xl border bg-card p-3 md:p-4 md:shadow-sm"
          >
            <Icon className="mx-auto mb-1 h-5 w-5 text-primary" aria-hidden />
            <p className="text-xs text-muted-foreground md:text-sm">{label}</p>
          </div>
        ))}
      </div>

      <HomeHowToPlayCard className="hidden border-2 md:block" />
    </div>
  )
}
