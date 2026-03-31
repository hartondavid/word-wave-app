import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Game room",
  description: "WordWave multiplayer room — race to guess the word from the same definition.",
  robots: { index: false, follow: true },
}

export default function GameRoomLayout({ children }: { children: React.ReactNode }) {
  return children
}
