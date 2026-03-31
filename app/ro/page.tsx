import dynamic from "next/dynamic"
import type { Metadata } from "next"
import { SiteNavbar } from "@/components/site-navbar"
import { HomeHeroRo } from "@/components/home-hero-ro"
import { alternatesRoCanonical } from "@/lib/seo-alternates"
import { getSiteUrl } from "@/lib/site-url"

const base = getSiteUrl()

export const metadata: Metadata = {
  title: "WordWave — joc multiplayer de ghicit cuvinte",
  description:
    "Aceeași definiție pentru toți, până la patru jucători, tastatură sau voce. Creează cameră cu cod sau exersează singur.",
  alternates: alternatesRoCanonical("/", "/ro"),
  openGraph: {
    title: "WordWave — joc multiplayer de ghicit cuvinte",
    description:
      "Ghicește cuvântul primul: cameră cu cod, categorii, runde cronometrate și voce opțională.",
    url: `${base}/ro`,
    locale: "ro_RO",
    siteName: "WordWave",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "WordWave — joc multiplayer de ghicit cuvinte",
    description:
      "Aceeași definiție pentru toți, până la patru jucători. Joacă în browser cu cod de cameră.",
  },
}

const HomePlayClient = dynamic(
  () => import("../home-play-client").then((m) => m.HomePlayClient),
  {
    loading: () => (
      <div
        className="flex flex-col gap-6 md:col-span-7"
        aria-busy="true"
        aria-label="Se încarcă formularul de joc"
      >
        <div className="min-h-[28rem] animate-pulse rounded-xl border-2 border-border bg-muted/30 md:min-h-[32rem]" />
      </div>
    ),
  },
)

export default function HomePageRo() {
  return (
    <>
      <SiteNavbar homePriorityLogo />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-background to-secondary/30 px-4 py-8 outline-none md:min-h-[calc(100dvh-6rem)] md:items-stretch md:justify-start md:py-10"
      >
        <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-6 md:max-w-6xl md:grid-cols-12 md:gap-x-12 md:gap-y-8">
          <HomeHeroRo />
          <HomePlayClient />
        </div>
      </main>
    </>
  )
}
