import type { Metadata } from "next"
import { LegalProse } from "@/components/legal-prose"
import { alternatesEnCanonical } from "@/lib/seo-alternates"

export const metadata: Metadata = {
  title: "How to Play — Rules",
  description:
    "Official WordWave rules: rounds, scoring, ready checks, keyboard and microphone input, and fair play for multiplayer rooms.",
  alternates: alternatesEnCanonical("/rules", "/ro/rules"),
}

export default function RulesPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground">How to Play</h1>
      <LegalProse>
        <h2>Goal</h2>
        <p>
          Each round shows one definition. The answer is a word of fixed length, shown as blanks. Every correct letter
          you place earns 10 points. Complete the word first to win the round. The match ends when someone reaches the
          point target or after the agreed number of rounds—highest score wins.
        </p>
        <h2>Creating or joining a room</h2>
        <p>
          The host enters a display name, picks a category and definition language, sets the number of rounds, and chooses
          how many players (2–4) the room supports. A room code is generated; share it or use the invite link so friends can
          join from the home page. Guests enter the same code and their own nicknames. Names should be unique within the
          room so scores stay unambiguous.
        </p>
        <h2>Lobby and ready check</h2>
        <p>
          While you wait, the lobby lists who has joined. When the room is full, each player toggles ready. Any player can
          start the next round once everyone is ready after a round ends—there is no single “admin” button required for
          continuation after the first game start.
        </p>
        <h2>During a round</h2>
        <p>
          Use letter keys to fill blanks in order. Wrong letters are tracked so you can review them. On supported browsers,
          you can use the microphone to say the entire word; partial speech that does not match the answer may lock you out
          of the round for fairness. When time runs out, the round ends with no winner for that round.
        </p>
        <h2>Practice mode</h2>
        <p>
          Practice is single-player. You get the same style of definition and timer without other humans. It is the best way
          to learn controls before hosting a party.
        </p>
        <h2>Fair play</h2>
        <p>
          Do not use external tools that reveal answers to other players in real time. In a stream setting, delay your
          broadcast if you want to avoid spoiling the word for your audience. If someone leaves mid-match, the room may end
          or continue depending on remaining players—see in-game messaging for the exact case.
        </p>
      </LegalProse>
    </div>
  )
}
