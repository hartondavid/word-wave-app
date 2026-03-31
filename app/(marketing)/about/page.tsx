import type { Metadata } from "next"
import { LegalProse } from "@/components/legal-prose"
import { alternatesEnCanonical } from "@/lib/seo-alternates"

export const metadata: Metadata = {
  title: "About WordWave",
  description:
    "WordWave is a real-time multiplayer word guessing game: shared definitions, room codes, practice mode, and optional voice input.",
  alternates: alternatesEnCanonical("/about", "/ro/about"),
}

export default function AboutPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground">About WordWave</h1>
      <LegalProse>
        <p>
          WordWave is a browser-based word guessing game built for quick sessions with friends or family. Everyone sees the
          same short definition; your job is to uncover the hidden word before anyone else. Matches support two to four
          players in a single room, with a host who chooses category, language, and how many rounds you want to play.
        </p>
        <p>
          The game is designed around low friction: you pick a nickname, create or join a room with a four-character code,
          and you are in the lobby. When all seats are filled and players mark themselves ready, rounds begin. Each round
          gives you a timed window to type letters (or, where supported, to use the microphone to say the whole word).
          Coloured progress lines let you see how opponents are doing without revealing the answer outright.
        </p>
        <p>
          Practice mode exists so you can warm up alone. It uses the same word pipeline as multiplayer rooms but without
          score pressure from other humans—ideal for learning categories or testing latency on a new device.
        </p>
        <p>
          WordWave is an independent project. We care about fair play, readable typography on phones, and keeping the
          experience free of intrusive pop-ups. If you run a classroom, a stream, or a casual game night, we hope the
          combination of short rounds and simple rules makes it easy to rotate players in and out.
        </p>
        <p>
          For gameplay details, see <a href="/rules" className="font-medium text-primary underline underline-offset-4">Rules</a>
          . For data practices, see{" "}
          <a href="/privacy" className="font-medium text-primary underline underline-offset-4">Privacy</a>. To reach us, use{" "}
          <a href="/contact" className="font-medium text-primary underline underline-offset-4">Contact</a>.
        </p>
      </LegalProse>
    </div>
  )
}
