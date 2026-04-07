import type { Metadata, Viewport } from "next"
import { alternatesEnCanonical } from "@/lib/seo-alternates"

/** Aliniază comportamentul tastaturii cu Chrome (redimensionare conținut). */
export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
}

export const metadata: Metadata = {
  title: "Practice",
  description:
    "Practice WordWave solo: same flow as multiplayer without a room code. Pick category, language, and rounds.",
  alternates: alternatesEnCanonical("/practice", "/ro/practice"),
  openGraph: {
    title: "Practice WordWave",
    description: "Solo mode to train word guessing at your own pace.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Practice WordWave",
    description: "Train solo before jumping into multiplayer.",
  },
}

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return children
}
