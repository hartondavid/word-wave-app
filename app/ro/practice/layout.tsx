import type { Metadata } from "next"
import { alternatesRoCanonical } from "@/lib/seo-alternates"

export const metadata: Metadata = {
  title: "Practice",
  description:
    "Exersează WordWave singur: aceeași mecanică ca în multiplayer, fără cod de cameră. Alege categoria, limba și numărul de runde.",
  alternates: alternatesRoCanonical("/practice", "/ro/practice"),
  openGraph: {
    title: "Practice WordWave",
    description: "Mod solo pentru a exersa ghicitul de cuvinte în ritmul tău.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Practice WordWave",
    description: "Exersează singur înainte de jocul multiplayer.",
  },
}

export default function RoPracticeLayout({ children }: { children: React.ReactNode }) {
  return children
}
