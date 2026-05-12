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
    seoContent: (
      <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-left mt-16 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Welcome to WordWave: The Ultimate Multiplayer Word Guessing Game</h2>
        <div>
          <h3 className="text-xl font-semibold mt-6 mb-3">What is WordWave?</h3>
          <p className="text-muted-foreground leading-relaxed">
            WordWave is a fast-paced, competitive multiplayer word game designed to test your vocabulary, memory, and typing speed. Unlike traditional turn-based games, WordWave operates in real-time. Everyone in the lobby receives the exact same definition simultaneously, and the race is on. The player earns points for each correctly guessed letter. Whoever collects the most points wins the game. Whether you're playing a quick 1-on-1 match or hosting a large game night with friends, WordWave provides an adrenaline-pumping experience that keeps your brain sharp.
          </p>
        </div>
        <div>
          <h3 className="text-xl font-semibold mt-6 mb-3">How to Play and Win</h3>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Getting started is simple. You can either create a new room and share the four-letter code with your friends, or join an existing room. Once everyone is ready, the host starts the game. A definition will appear on screen, along with empty slots indicating the length of the hidden word. To maximize your chances of winning:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong>Read Fast:</strong> Quickly parse the definition for key clues.</li>
            <li><strong>Watch the Length:</strong> Use the letter placeholders to eliminate synonyms that don't fit.</li>
            <li><strong>Type Immediately:</strong> Don't hesitate. Start typing your best guess; you can always correct it if you're wrong.</li>
            <li><strong>Practice:</strong> Use our Solo Practice mode to familiarize yourself with the dictionaries.</li>
          </ul>
        </div>
        <div>
          <h3 className="text-xl font-semibold mt-6 mb-3">Why Play Word Games?</h3>
          <p className="text-muted-foreground leading-relaxed">
            Playing word puzzles isn't just about entertainment; it's a fantastic mental workout. Engaging in active recall improves memory retention and expands your vocabulary in a fun, stress-free environment. WordWave also supports bilingual play, allowing you to switch between English and Romanian dictionaries, challenging your linguistic flexibility. Start a game today and experience the thrill of the wave!
          </p>
        </div>
      </div>
    )
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
    seoContent: (
      <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-left mt-16 space-y-6">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Bun venit la WordWave: Cel mai bun joc multiplayer de ghicit cuvinte</h2>
        <div>
          <h3 className="text-xl font-semibold mt-6 mb-3">Ce este WordWave?</h3>
          <p className="text-muted-foreground leading-relaxed">
            WordWave este un joc de cuvinte multiplayer rapid și competitiv, conceput pentru a-ți testa vocabularul, memoria și viteza de tastare. Spre deosebire de jocurile tradiționale bazate pe ture, WordWave funcționează în timp real. Toți cei din cameră primesc exact aceeași definiție simultan, iar cursa începe. Jucătorul primește puncte pentru fiecare literă ghicită. Cine adună cele mai multe puncte câștigă jocul. Indiferent dacă joci un meci rapid 1 la 1 sau organizezi o seară mare de jocuri cu prietenii, WordWave oferă o experiență plină de adrenalină care îți menține mintea ageră.
          </p>
        </div>
        <div>
          <h3 className="text-xl font-semibold mt-6 mb-3">Cum să joci și să câștigi</h3>
          <p className="text-muted-foreground leading-relaxed mb-3">
            Începerea jocului este simplă. Poți fie să creezi o cameră nouă și să împarți codul de patru litere prietenilor tăi, fie să te alături unei camere existente. Odată ce toată lumea este pregătită, gazda începe meciul. O definiție va apărea pe ecran, alături de spații goale care indică lungimea cuvântului ascuns. Pentru a-ți maximiza șansele de câștig:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong>Citește Rapid:</strong> Analizează rapid definiția pentru a găsi indicii cheie.</li>
            <li><strong>Atenție la Lungime:</strong> Folosește spațiile pentru litere pentru a elimina sinonimele care nu se potrivesc.</li>
            <li><strong>Tastează Imediat:</strong> Nu ezita. Începe să tastezi cea mai bună presupunere a ta; o poți corecta oricând dacă greșești.</li>
            <li><strong>Antrenează-te:</strong> Folosește modul nostru de Antrenament Solo pentru a te familiariza cu dicționarele.</li>
          </ul>
        </div>
        <div>
          <h3 className="text-xl font-semibold mt-6 mb-3">De ce să joci jocuri de cuvinte?</h3>
          <p className="text-muted-foreground leading-relaxed">
            Rezolvarea puzzle-urilor de cuvinte nu este doar despre divertisment; este un antrenament mental fantastic. Implicarea în reamintirea activă îmbunătățește reținerea memoriei și îți extinde vocabularul într-un mediu distractiv și fără stres. WordWave suportă, de asemenea, jocul bilingv, permițându-ți să comuți între dicționarele de engleză și română, provocându-ți flexibilitatea lingvistică. Începe un joc astăzi și simte fiorul valului!
          </p>
        </div>
      </div>
    )
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

      {CONTENT[locale].seoContent}
    </section>
  )
}
