import type { Metadata, Viewport } from "next"

export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
}

export const metadata: Metadata = {
  title: "Game room",
  description: "Cameră WordWave multiplayer: ghicește cuvântul înaintea celorlalți jucători.",
  robots: { index: false, follow: true },
}

export default function RoGameLayout({ children }: { children: React.ReactNode }) {
  return children
}
