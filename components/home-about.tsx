import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Sparkles, Users } from "lucide-react"

interface HomeAboutProps {
  locale: "en" | "ro"
}

const CONTENT = {
  en: {
    title: "Why Play WordWave?",
    description: "WordWave is more than just a game—it's a fast-paced vocabulary challenge designed for friends, families, and word enthusiasts.",
    benefits: [
      {
        title: "Competitive Multiplayer",
        text: "Play with up to n people simultaneously. Everyone gets the same definition, but only the fastest fingers win.",
        icon: Users,
      },
      {
        title: "Expand Your Vocabulary",
        text: "Discover new words and meanings in multiple categories, from general knowledge to specialized themes.",
        icon: BookOpen,
      },
      {
        title: "Daily Brain Exercise",
        text: "Keep your mind sharp with quick 60-second rounds that test your recall and speed.",
        icon: Sparkles,
      },
    ],
  },
  ro: {
    title: "De ce să joci WordWave?",
    description: "WordWave este mai mult decât un simplu joc—este o provocare de vocabular rapidă, creată pentru prieteni, familii și pasionații de cuvinte.",
    benefits: [
      {
        title: "Multiplayer Competitiv",
        text: "Joacă cu până la n de persoane simultan. Toată lumea primește aceeași definiție, dar doar cei mai rapizi câștigă.",
        icon: Users,
      },
      {
        title: "Extinde-ți Vocabularul",
        text: "Descoperă cuvinte și sensuri noi în multiple categorii, de la cultură generală la teme specializate.",
        icon: BookOpen,
      },
      {
        title: "Exercițiu Mental Zilnic",
        text: "Menține-ți mintea ageră cu runde rapide de 60 de secunde care îți testează memoria și viteza.",
        icon: Sparkles,
      },
    ],
  },
}

export function HomeAbout({ locale }: HomeAboutProps) {
  const { title, description, benefits } = CONTENT[locale]

  return (
    <section className="mx-auto mt-12 w-full max-w-6xl">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
        <p className="mt-3 text-base text-muted-foreground md:text-lg mx-auto max-w-3xl">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((benefit, i) => {
          const Icon = benefit.icon
          return (
            <Card key={i} className="border-none bg-secondary/20 shadow-none">
              <CardHeader className="pb-2">
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {benefit.text}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
